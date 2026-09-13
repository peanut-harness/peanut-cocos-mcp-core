import { existsSync, readFileSync } from "fs";
import { extname, resolve } from "path";

import type { IAssetCatalogEntry } from "./catalog-types.js";
import { AssetCatalogBuilder } from "./asset-catalog-builder.js";
import { FileAssetDependencyIndex } from "./file-asset-dependency-index.js";

/**
 * @description 缺失引用扫描输入。
 */
export interface IMissingReferenceScanInput {
  /** @description 路径子串过滤（可选）。 */
  readonly pathContains?: string;
  /** @description 类型分桶过滤（可选）。 */
  readonly type?: string;
  /** @description 返回条数上限；默认 50，最大 200。 */
  readonly limit?: number;
  /** @description 是否强制重建依赖图。 */
  readonly refreshIndex?: boolean;
}

/**
 * @description 一条缺失引用记录。
 */
export interface IMissingReferenceHit {
  /** @description 未能解析的 uuid。 */
  readonly uuid: string;
  /** @description 引用方 `db://` 路径。 */
  readonly referrerDbPath: string;
  /** @description 引用方类型分桶。 */
  readonly referrerType: string;
}

/**
 * @description 缺失引用扫描结果。
 */
export interface IMissingReferenceScanResult {
  /** @description 数据来源。 */
  readonly source: "file-graph";
  /** @description 命中列表。 */
  readonly hits: readonly IMissingReferenceHit[];
  /** @description 截断前总数。 */
  readonly total: number;
  /** @description 是否截断。 */
  readonly truncated: boolean;
}

/**
 * @description 节点级反向引用查询输入。
 */
export interface IReferencingNodeQueryInput {
  /**
   * @description 目标资源 uuid（标准或压缩）。
   * `missingOnly` 为 false 时必填；为 true 时可省略（扫全部缺失），或用作缺失 uuid 二次筛选。
   */
  readonly uuid?: string;
  /** @description 为 true 时只返回引用了工程内 unresolved uuid 的节点（对齐 PinK 33）。 */
  readonly missingOnly?: boolean;
  /** @description 限定扫描的 `db://` 或相对路径；省略则扫全部可序列化主资源。 */
  readonly assetPath?: string;
  /** @description 按节点路径末段名称子串二次筛选（大小写不敏感）。 */
  readonly nodeNameContains?: string;
  /** @description 按完整节点路径子串二次筛选（大小写不敏感）。 */
  readonly nodePathContains?: string;
  /** @description 返回条数上限；默认 50，最大 200。 */
  readonly limit?: number;
}

/**
 * @description 节点级引用命中。
 */
export interface IReferencingNodeHit {
  /** @description 资产 `db://` 路径。 */
  readonly assetDbPath: string;
  /** @description 节点路径；无法解析时为空字符串。 */
  readonly nodePath: string;
  /** @description 组件 `__type__`；节点自身字段时为空。 */
  readonly componentType: string;
  /** @description 字段名提示（若可识别）。 */
  readonly fieldHint: string;
  /** @description 命中的被引用 uuid（含 `@sub` 时保留原文）。 */
  readonly referencedUuid: string;
}

/**
 * @description 节点级反向引用查询结果。
 */
export interface IReferencingNodeQueryResult {
  /** @description 数据来源。 */
  readonly source: "serialized-hierarchy";
  /** @description 查询 uuid；`missingOnly` 且未指定时为空串。 */
  readonly uuid: string;
  /** @description 是否为缺失引用模式。 */
  readonly missingOnly: boolean;
  /** @description 命中。 */
  readonly hits: readonly IReferencingNodeHit[];
  /** @description 截断前总数。 */
  readonly total: number;
  /** @description 是否截断。 */
  readonly truncated: boolean;
}

/** @description 可扫描层级引用的扩展名。 */
const HIERARCHY_EXTENSIONS = new Set([".prefab", ".scene"]);

/**
 * @description 基于磁盘序列化图的缺失引用扫描与节点级反向查找。
 */
export class SerializedAssetReferenceScanner {
  /** @description 依赖图索引。 */
  private readonly _dependencyIndex: FileAssetDependencyIndex;

  /**
   * @description 构造扫描器。
   * @param dependencyIndex 可选依赖图；默认新建。
   */
  public constructor(
    dependencyIndex: FileAssetDependencyIndex = new FileAssetDependencyIndex(),
  ) {
    this._dependencyIndex = dependencyIndex;
  }

  /**
   * @description 扫描工程内所有 unresolved uuid 及其引用方。
   * @param projectRoot 工程根。
   * @param input 过滤与分页。
   * @returns 扫描结果。
   */
  public scanMissing(
    projectRoot: string,
    input: IMissingReferenceScanInput = {},
  ): IMissingReferenceScanResult {
    const cacheKey = resolve(projectRoot);
    if (input.refreshIndex === true) {
      FileAssetDependencyIndex.invalidate(cacheKey);
    }
    const catalog = new AssetCatalogBuilder().build(projectRoot);
    const entries = Object.values(catalog.uuidMap).filter(
      (entry) => entry.parentUuid.length === 0,
    );
    const pathFilter = input.pathContains?.trim().toLowerCase() ?? "";
    const typeFilter = input.type?.trim() ?? "";
    const limit = clampLimit(input.limit);
    const hits: IMissingReferenceHit[] = [];
    for (const entry of entries) {
      if (
        pathFilter.length > 0 &&
        !entry.path.toLowerCase().includes(pathFilter)
      ) {
        continue;
      }
      if (typeFilter.length > 0 && entry.type !== typeFilter) {
        continue;
      }
      let unresolved: readonly string[] = [];
      try {
        const result = this._dependencyIndex.query(projectRoot, {
          dbPath: `db://${entry.path}`,
          direction: "dependencies",
          refreshIndex: false,
        });
        unresolved = result.unresolvedUuids;
      } catch {
        continue;
      }
      for (const uuid of unresolved) {
        hits.push({
          uuid,
          referrerDbPath: `db://${entry.path}`,
          referrerType: entry.type,
        });
      }
    }
    hits.sort((left, right) => {
      const byPath = left.referrerDbPath.localeCompare(right.referrerDbPath);
      return byPath !== 0 ? byPath : left.uuid.localeCompare(right.uuid);
    });
    return {
      source: "file-graph",
      hits: hits.slice(0, limit),
      total: hits.length,
      truncated: hits.length > limit,
    };
  }

  /**
   * @description 在 Prefab/Scene 序列化中查找引用指定 uuid（或缺失 uuid）的节点/组件。
   * @param projectRoot 工程根。
   * @param input 查询输入。
   * @returns 节点级命中。
   */
  public findReferencingNodes(
    projectRoot: string,
    input: IReferencingNodeQueryInput,
  ): IReferencingNodeQueryResult {
    const missingOnly = input.missingOnly === true;
    const uuidFilter = typeof input.uuid === "string" ? input.uuid.trim() : "";
    if (!missingOnly && uuidFilter.length === 0) {
      throw new Error("uuid_required");
    }
    const limit = clampLimit(input.limit);
    const catalog = new AssetCatalogBuilder().build(projectRoot);
    const known = new Set<string>();
    for (const entry of Object.values(catalog.uuidMap)) {
      known.add(entry.uuid);
      known.add(entry.compressedUuid);
    }
    const matchUuid = (candidate: string): boolean => {
      if (missingOnly) {
        if (isUuidKnown(candidate, known)) {
          return false;
        }
        if (uuidFilter.length === 0) {
          return true;
        }
        return uuidEquals(candidate, uuidFilter);
      }
      return uuidEquals(candidate, uuidFilter);
    };
    const entries = this._selectHierarchyEntries(
      Object.values(catalog.uuidMap),
      input.assetPath,
    );
    let hits: IReferencingNodeHit[] = [];
    for (const entry of entries) {
      const absolutePath = resolve(projectRoot, entry.path);
      hits.push(
        ...this._scanHierarchyFile(
          absolutePath,
          `db://${entry.path}`,
          matchUuid,
        ),
      );
    }
    hits = this._applyNodeFilters(hits, input);
    return {
      source: "serialized-hierarchy",
      uuid: uuidFilter,
      missingOnly,
      hits: hits.slice(0, limit),
      total: hits.length,
      truncated: hits.length > limit,
    };
  }

  /**
   * @description 按节点名 / 路径二次筛选命中。
   * @param hits 原始命中。
   * @param input 查询输入。
   * @returns 过滤后命中。
   */
  private _applyNodeFilters(
    hits: readonly IReferencingNodeHit[],
    input: IReferencingNodeQueryInput,
  ): IReferencingNodeHit[] {
    const nameNeedle = input.nodeNameContains?.trim().toLowerCase() ?? "";
    const pathNeedle = input.nodePathContains?.trim().toLowerCase() ?? "";
    if (nameNeedle.length === 0 && pathNeedle.length === 0) {
      return [...hits];
    }
    return hits.filter((hit) => {
      const pathLower = hit.nodePath.toLowerCase();
      if (pathNeedle.length > 0 && !pathLower.includes(pathNeedle)) {
        return false;
      }
      if (nameNeedle.length > 0) {
        const segments = hit.nodePath
          .split("/")
          .filter((part) => part.length > 0);
        const leaf = segments[segments.length - 1] ?? "";
        if (
          !leaf.toLowerCase().includes(nameNeedle) &&
          !pathLower.includes(nameNeedle)
        ) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * @description 选择待扫描的 Prefab/Scene 主资源。
   * @param entries catalog 条目。
   * @param assetPath 可选路径过滤。
   * @returns 条目列表。
   */
  private _selectHierarchyEntries(
    entries: readonly IAssetCatalogEntry[],
    assetPath: string | undefined,
  ): IAssetCatalogEntry[] {
    const normalized = assetPath?.trim().replace(/^db:\/\//, "") ?? "";
    return entries.filter((entry) => {
      if (entry.parentUuid.length > 0) {
        return false;
      }
      if (!HIERARCHY_EXTENSIONS.has(extname(entry.path).toLowerCase())) {
        return false;
      }
      if (normalized.length === 0) {
        return true;
      }
      return entry.path === normalized || entry.path.endsWith(`/${normalized}`);
    });
  }

  /**
   * @description 扫描单个 Prefab/Scene 文件。
   * @param absolutePath 绝对路径。
   * @param assetDbPath db 路径。
   * @param matchUuid 目标 uuid 判定。
   * @returns 命中。
   */
  private _scanHierarchyFile(
    absolutePath: string,
    assetDbPath: string,
    matchUuid: (uuid: string) => boolean,
  ): IReferencingNodeHit[] {
    if (!existsSync(absolutePath)) {
      return [];
    }
    let entries: unknown;
    try {
      entries = JSON.parse(readFileSync(absolutePath, "utf8")) as unknown;
    } catch {
      return [];
    }
    if (!Array.isArray(entries)) {
      return [];
    }
    const records = entries as Array<Record<string, unknown>>;
    const pathByNodeIndex = this._buildNodePaths(records);
    const hits: IReferencingNodeHit[] = [];
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      if (record == null) {
        continue;
      }
      const type = typeof record.__type__ === "string" ? record.__type__ : "";
      if (type === "cc.Node") {
        const matched = this._findMatchingUuidField(record, matchUuid);
        if (matched != null) {
          hits.push({
            assetDbPath,
            nodePath: pathByNodeIndex.get(index) ?? "",
            componentType: "",
            fieldHint: matched.fieldHint,
            referencedUuid: matched.uuid,
          });
        }
        continue;
      }
      const hostNodeIndex = this._hostNodeIndex(records, index);
      if (hostNodeIndex == null) {
        continue;
      }
      const matched = this._findMatchingUuidField(record, matchUuid);
      if (matched == null) {
        continue;
      }
      hits.push({
        assetDbPath,
        nodePath: pathByNodeIndex.get(hostNodeIndex) ?? "",
        componentType: type,
        fieldHint: matched.fieldHint,
        referencedUuid: matched.uuid,
      });
    }
    return hits;
  }

  /**
   * @description 构建节点下标到路径映射。
   * @param records 序列化条目。
   * @returns 映射。
   */
  private _buildNodePaths(
    records: readonly Record<string, unknown>[],
  ): Map<number, string> {
    const pathByIndex = new Map<number, string>();
    const roots: number[] = [];
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      if (record?.__type__ !== "cc.Node") {
        continue;
      }
      if (!this._isChildNode(records, index)) {
        roots.push(index);
      }
    }
    for (const rootIndex of roots) {
      this._walkNode(records, rootIndex, "", pathByIndex);
    }
    return pathByIndex;
  }

  /**
   * @description 递归展开节点路径。
   * @param records 条目。
   * @param nodeIndex 节点下标。
   * @param parentPath 父路径。
   * @param pathByIndex 输出映射。
   * @returns 无。
   */
  private _walkNode(
    records: readonly Record<string, unknown>[],
    nodeIndex: number,
    parentPath: string,
    pathByIndex: Map<number, string>,
  ): void {
    const node = records[nodeIndex];
    if (node == null || node.__type__ !== "cc.Node") {
      return;
    }
    const name =
      typeof node._name === "string" && node._name.length > 0
        ? node._name
        : `Node${nodeIndex}`;
    const path = `${parentPath}/${name}`;
    pathByIndex.set(nodeIndex, path);
    const children = node._children;
    if (!Array.isArray(children)) {
      return;
    }
    for (const child of children) {
      if (child == null || typeof child !== "object") {
        continue;
      }
      const id = (child as { __id__?: unknown }).__id__;
      if (typeof id === "number") {
        this._walkNode(records, id, path, pathByIndex);
      }
    }
  }

  /**
   * @description 判断节点是否挂在其它节点的 `_children` 下。
   * @param records 条目。
   * @param nodeIndex 节点下标。
   * @returns 是否为子节点。
   */
  private _isChildNode(
    records: readonly Record<string, unknown>[],
    nodeIndex: number,
  ): boolean {
    for (const record of records) {
      if (record.__type__ !== "cc.Node" || !Array.isArray(record._children)) {
        continue;
      }
      for (const child of record._children) {
        if (
          child != null &&
          typeof child === "object" &&
          (child as { __id__?: unknown }).__id__ === nodeIndex
        ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * @description 解析组件所属节点下标。
   * @param records 条目。
   * @param componentIndex 组件下标。
   * @returns 节点下标；找不到返回 null。
   */
  private _hostNodeIndex(
    records: readonly Record<string, unknown>[],
    componentIndex: number,
  ): number | null {
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      if (
        record?.__type__ !== "cc.Node" ||
        !Array.isArray(record._components)
      ) {
        continue;
      }
      for (const component of record._components) {
        if (
          component != null &&
          typeof component === "object" &&
          (component as { __id__?: unknown }).__id__ === componentIndex
        ) {
          return index;
        }
      }
    }
    return null;
  }

  /**
   * @description 在对象树中查找匹配的 uuid，返回字段提示与原文。
   * @param value JSON 值。
   * @param matchUuid 目标判定。
   * @returns 字段提示与 uuid；未命中返回 null。
   */
  private _findMatchingUuidField(
    value: unknown,
    matchUuid: (uuid: string) => boolean,
  ): { fieldHint: string; uuid: string } | null {
    return this._findMatchingUuidFieldAt(value, matchUuid, "");
  }

  /**
   * @description 带路径上下文的 uuid 匹配查找。
   * @param value JSON 值。
   * @param matchUuid 目标判定。
   * @param path 当前字段路径。
   * @returns 字段提示与 uuid。
   */
  private _findMatchingUuidFieldAt(
    value: unknown,
    matchUuid: (uuid: string) => boolean,
    path: string,
  ): { fieldHint: string; uuid: string } | null {
    if (value == null || typeof value !== "object") {
      return null;
    }
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const hit = this._findMatchingUuidFieldAt(
          value[index],
          matchUuid,
          `${path}[${index}]`,
        );
        if (hit != null) {
          return hit;
        }
      }
      return null;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.__uuid__ === "string" && matchUuid(record.__uuid__)) {
      return {
        fieldHint: path.length > 0 ? path : "__uuid__",
        uuid: record.__uuid__,
      };
    }
    for (const [key, child] of Object.entries(record)) {
      if (key === "__id__" || key === "__type__") {
        continue;
      }
      const nextPath = path.length > 0 ? `${path}.${key}` : key;
      const hit = this._findMatchingUuidFieldAt(child, matchUuid, nextPath);
      if (hit != null) {
        return hit;
      }
    }
    return null;
  }
}

/**
 * @description 限制分页上限。
 * @param value 原始 limit。
 * @returns 夹紧后的 limit。
 * @oopException 纯值级夹紧。
 */
function clampLimit(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) {
    return 50;
  }
  const rounded = Math.floor(value);
  if (rounded < 1) {
    return 1;
  }
  return rounded > 200 ? 200 : rounded;
}

/**
 * @description 比较两个 uuid（基 uuid 或全文相等）。
 * @param left 左侧。
 * @param right 右侧。
 * @returns 是否相等。
 * @oopException 纯字符串辅助。
 */
function uuidEquals(left: string, right: string): boolean {
  if (left === right) {
    return true;
  }
  const leftBase = left.includes("@") ? left.slice(0, left.indexOf("@")) : left;
  const rightBase = right.includes("@")
    ? right.slice(0, right.indexOf("@"))
    : right;
  return leftBase === rightBase || left === rightBase || right === leftBase;
}

/**
 * @description 判断 uuid 是否已在 catalog 已知集合中。
 * @param uuid 候选。
 * @param known 已知集合。
 * @returns 是否已知。
 * @oopException 纯集合辅助。
 */
function isUuidKnown(uuid: string, known: ReadonlySet<string>): boolean {
  if (known.has(uuid)) {
    return true;
  }
  if (uuid.includes("@")) {
    return known.has(uuid.slice(0, uuid.indexOf("@")));
  }
  return false;
}
