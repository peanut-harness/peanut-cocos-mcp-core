import { existsSync, readFileSync } from "fs";
import { extname, join, resolve } from "path";

import { AssetCatalogBuilder } from "@peanut/pod-engine/assets";

import { LumenEngineDefaultUuidCatalog } from "./lumen-engine-default-uuid-catalog.js";
import { LumenSerializedBindingValidator } from "./lumen-serialized-binding-validator.js";

/**
 * @description Prefab/Scene 引用校验输入。
 */
export interface ILumenValidateRefsInput {
  /** @description 项目相对 `.prefab` / `.scene` 路径。 */
  readonly prefabRelativePath: string;
}

/**
 * @description 单条引用问题。
 */
export interface ILumenRefIssue {
  /** @description 问题类别。 */
  readonly kind:
    | "missingUuid"
    | "unboundSprite"
    | "emptyClickEvent"
    | "emptyNodeRef"
    | "badAnimPath"
    | "danglingId"
    | "wrongReferenceType"
    | "brokenOwnership"
    | "invalidClickEvent"
    | "wrongAssetType";
  /** @description 节点路径。 */
  readonly nodePath: string;
  /** @description 组件类型。 */
  readonly componentType: string;
  /** @description 字段提示。 */
  readonly fieldHint: string;
  /** @description 相关 uuid（若有）。 */
  readonly uuid: string;
  /** @description 人类可读说明。 */
  readonly message: string;
}

/**
 * @description 引用校验结果。
 */
export interface ILumenValidateRefsResult {
  /** @description 目标相对路径。 */
  readonly prefabRelativePath: string;
  /** @description 是否通过（无问题）。 */
  readonly ok: boolean;
  /** @description 问题列表。 */
  readonly issues: readonly ILumenRefIssue[];
  /** @description 按类别计数。 */
  readonly summary: Readonly<{
    missingUuid: number;
    unboundSprite: number;
    emptyClickEvent: number;
    emptyNodeRef: number;
    badAnimPath: number;
    danglingId: number;
    wrongReferenceType: number;
    brokenOwnership: number;
    invalidClickEvent: number;
    wrongAssetType: number;
    ignoredEngineDefaultUuid: number;
  }>;
  /** @description 因引擎/default_prefab 内置资源而忽略的缺失 uuid 条数说明。 */
  readonly ignoredEngineDefaults?: readonly ILumenRefIssue[];
}

/**
 * @description 对磁盘 Prefab/Scene 做资源引用和序列化绑定图健康检查。
 */
export class LumenHierarchyRefValidator {
  /**
   * @description 校验单个 Prefab/Scene。
   * @param projectRoot 工程根。
   * @param input 目标路径。
   * @returns 校验结果。
   */
  public validate(
    projectRoot: string,
    input: ILumenValidateRefsInput,
  ): ILumenValidateRefsResult {
    const relativePath = this._normalizeRelativePath(input.prefabRelativePath);
    const absolutePath = resolve(projectRoot, relativePath);
    if (!existsSync(absolutePath)) {
      throw new Error(`lumen_validate_refs_missing_file:${relativePath}`);
    }
    const extension = extname(relativePath).toLowerCase();
    if (extension !== ".prefab" && extension !== ".scene") {
      throw new Error(`lumen_validate_refs_unsupported:${relativePath}`);
    }
    let entries: unknown;
    try {
      entries = JSON.parse(readFileSync(absolutePath, "utf8")) as unknown;
    } catch {
      throw new Error(`lumen_validate_refs_invalid_json:${relativePath}`);
    }
    if (!Array.isArray(entries)) {
      throw new Error(`lumen_validate_refs_not_array:${relativePath}`);
    }
    const records = entries as Array<Record<string, unknown>>;
    const catalog = new AssetCatalogBuilder().build(projectRoot);
    const known = new Set<string>();
    for (const entry of Object.values(catalog.uuidMap)) {
      known.add(entry.uuid);
      known.add(entry.compressedUuid);
    }
    const pathByNodeIndex = this._buildNodePaths(records);
    const issues: ILumenRefIssue[] = [];
    issues.push(...new LumenSerializedBindingValidator().validate(projectRoot, records, catalog, pathByNodeIndex));
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      if (record == null) {
        continue;
      }
      const type = typeof record.__type__ === "string" ? record.__type__ : "";
      const hostNodeIndex =
        type === "cc.Node" ? index : this._hostNodeIndex(records, index);
      const nodePath =
        hostNodeIndex != null ? (pathByNodeIndex.get(hostNodeIndex) ?? "") : "";
      if (type === "cc.Sprite" && record._spriteFrame == null) {
        issues.push({
          kind: "unboundSprite",
          nodePath,
          componentType: type,
          fieldHint: "_spriteFrame",
          uuid: "",
          message: "Sprite._spriteFrame is null",
        });
      }
      if (type === "cc.Button") {
        const clickEvents = record.clickEvents;
        if (Array.isArray(clickEvents)) {
          for (
            let eventIndex = 0;
            eventIndex < clickEvents.length;
            eventIndex += 1
          ) {
            const eventRef = clickEvents[eventIndex];
            if (
              eventRef == null ||
              typeof eventRef !== "object" ||
              typeof (eventRef as { __id__?: unknown }).__id__ !== "number"
            ) {
              issues.push({
                kind: "emptyClickEvent",
                nodePath,
                componentType: type,
                fieldHint: `clickEvents[${eventIndex}]`,
                uuid: "",
                message: "clickEvents slot is empty or invalid",
              });
              continue;
            }
            const eventEntry = records[(eventRef as { __id__: number }).__id__];
            if (eventEntry == null || eventEntry.__type__ !== "cc.ClickEvent") {
              issues.push({
                kind: "emptyClickEvent",
                nodePath,
                componentType: type,
                fieldHint: `clickEvents[${eventIndex}]`,
                uuid: "",
                message: "clickEvents points to non-ClickEvent",
              });
              continue;
            }
            const handler =
              typeof eventEntry.handler === "string"
                ? eventEntry.handler.trim()
                : "";
            const hasTarget =
              eventEntry.target != null &&
              typeof eventEntry.target === "object" &&
              typeof (eventEntry.target as { __id__?: unknown }).__id__ ===
                "number";
            if (handler.length === 0 || !hasTarget) {
              issues.push({
                kind: "emptyClickEvent",
                nodePath,
                componentType: type,
                fieldHint: `clickEvents[${eventIndex}]`,
                uuid: "",
                message: "ClickEvent missing target or handler",
              });
            }
          }
        }
      }
      this._collectMissingUuids(record, known, nodePath, type, "", issues);
      this._collectEmptyNodeRefs(record, nodePath, type, "", issues);
      if (type === "cc.Animation") {
        this._collectBadAnimPaths(
          projectRoot,
          catalog,
          record,
          nodePath,
          pathByNodeIndex,
          issues,
        );
      }
    }
    const ignoredEngineDefaults: ILumenRefIssue[] = [];
    const reported: ILumenRefIssue[] = [];
    for (const issue of issues) {
      if (
        issue.kind === "missingUuid" &&
        issue.uuid.length > 0 &&
        LumenEngineDefaultUuidCatalog.isEngineDefault(issue.uuid)
      ) {
        ignoredEngineDefaults.push({
          ...issue,
          message: `${issue.message} (ignored:engine_default_prefab)`,
        });
        continue;
      }
      reported.push(issue);
    }
    const summary = {
      missingUuid: reported.filter((item) => item.kind === "missingUuid")
        .length,
      unboundSprite: reported.filter((item) => item.kind === "unboundSprite")
        .length,
      emptyClickEvent: reported.filter(
        (item) => item.kind === "emptyClickEvent",
      ).length,
      emptyNodeRef: reported.filter((item) => item.kind === "emptyNodeRef")
        .length,
      badAnimPath: reported.filter((item) => item.kind === "badAnimPath")
        .length,
      danglingId: reported.filter((item) => item.kind === "danglingId").length,
      wrongReferenceType: reported.filter(
        (item) => item.kind === "wrongReferenceType",
      ).length,
      brokenOwnership: reported.filter(
        (item) => item.kind === "brokenOwnership",
      ).length,
      invalidClickEvent: reported.filter(
        (item) => item.kind === "invalidClickEvent",
      ).length,
      wrongAssetType: reported.filter((item) => item.kind === "wrongAssetType")
        .length,
      ignoredEngineDefaultUuid: ignoredEngineDefaults.length,
    };
    return {
      prefabRelativePath: relativePath,
      ok: reported.length === 0,
      issues: reported,
      summary,
      ...(ignoredEngineDefaults.length > 0 ? { ignoredEngineDefaults } : {}),
    };
  }

  /**
   * @description 规范化相对路径。
   * @param value 输入。
   * @returns 相对路径。
   */
  private _normalizeRelativePath(value: string): string {
    const trimmed = value
      .trim()
      .replace(/^db:\/\//, "")
      .replace(/\\/g, "/");
    if (
      trimmed.length === 0 ||
      trimmed.includes("..") ||
      trimmed.startsWith("/")
    ) {
      throw new Error(`lumen_validate_refs_path_invalid:${value}`);
    }
    return trimmed;
  }

  /**
   * @description 收集缺失 uuid。
   * @param value JSON。
   * @param known 已知 uuid。
   * @param nodePath 节点路径。
   * @param componentType 组件类型。
   * @param path 字段路径。
   * @param issues 输出。
   * @returns 无。
   */
  private _collectMissingUuids(
    value: unknown,
    known: ReadonlySet<string>,
    nodePath: string,
    componentType: string,
    path: string,
    issues: ILumenRefIssue[],
  ): void {
    if (value == null || typeof value !== "object") {
      return;
    }
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        this._collectMissingUuids(
          value[index],
          known,
          nodePath,
          componentType,
          `${path}[${index}]`,
          issues,
        );
      }
      return;
    }
    const record = value as Record<string, unknown>;
    if (
      typeof record.__uuid__ === "string" &&
      record.__uuid__.length > 0 &&
      !known.has(record.__uuid__)
    ) {
      issues.push({
        kind: "missingUuid",
        nodePath,
        componentType,
        fieldHint: path.length > 0 ? path : "__uuid__",
        uuid: record.__uuid__,
        message: `unresolved uuid ${record.__uuid__}`,
      });
    }
    for (const [key, child] of Object.entries(record)) {
      if (key === "__id__" || key === "__type__") {
        continue;
      }
      const next = path.length > 0 ? `${path}.${key}` : key;
      this._collectMissingUuids(
        child,
        known,
        nodePath,
        componentType,
        next,
        issues,
      );
    }
  }

  /**
   * @description 收集疑似空节点引用（`{__id__:null}` 或显式 null 的常见引用字段）。
   * @param value JSON。
   * @param nodePath 节点路径。
   * @param componentType 组件类型。
   * @param path 字段路径。
   * @param issues 输出。
   * @returns 无。
   */
  private _collectEmptyNodeRefs(
    value: unknown,
    nodePath: string,
    componentType: string,
    path: string,
    issues: ILumenRefIssue[],
  ): void {
    if (value == null || typeof value !== "object" || Array.isArray(value)) {
      return;
    }
    const record = value as Record<string, unknown>;
    for (const [key, child] of Object.entries(record)) {
      if (key === "_spriteFrame" || key === "clickEvents") {
        continue;
      }
      const next = path.length > 0 ? `${path}.${key}` : key;
      if (
        child === null &&
        (key.endsWith("Node") || key === "node" || key === "target")
      ) {
        issues.push({
          kind: "emptyNodeRef",
          nodePath,
          componentType,
          fieldHint: next,
          uuid: "",
          message: `${next} is null`,
        });
        continue;
      }
      if (child != null && typeof child === "object" && !Array.isArray(child)) {
        const id = (child as { __id__?: unknown }).__id__;
        if (
          Object.prototype.hasOwnProperty.call(child, "__id__") &&
          (id === null || id === undefined) &&
          !Object.prototype.hasOwnProperty.call(child, "__uuid__")
        ) {
          issues.push({
            kind: "emptyNodeRef",
            nodePath,
            componentType,
            fieldHint: next,
            uuid: "",
            message: `${next}.__id__ is empty`,
          });
        }
      }
    }
  }

  /**
   * @description 对照 AnimationClip 曲线/轨道 path 与宿主节点子层级。
   * @param projectRoot 工程根。
   * @param catalog 资产目录。
   * @param records Prefab/Scene 条目。
   * @param animation 动画组件。
   * @param hostNodePath 宿主节点路径。
   * @param pathByNodeIndex 节点路径表。
   * @param issues 输出。
   * @returns 无。
   */
  private _collectBadAnimPaths(
    projectRoot: string,
    catalog: {
      readonly uuidMap: Readonly<
        Record<
          string,
          {
            readonly uuid: string;
            readonly compressedUuid: string;
            readonly path: string;
          }
        >
      >;
    },
    animation: Record<string, unknown>,
    hostNodePath: string,
    pathByNodeIndex: ReadonlyMap<number, string>,
    issues: ILumenRefIssue[],
  ): void {
    const relativeDescendants = this._relativeDescendantPaths(
      hostNodePath,
      pathByNodeIndex,
    );
    const clipUuids = this._extractAnimationClipUuids(animation);
    for (const clipUuid of clipUuids) {
      const clipPath = this._resolveCatalogPath(catalog, clipUuid);
      if (clipPath == null || !clipPath.toLowerCase().endsWith(".anim")) {
        continue;
      }
      const absoluteClip = resolve(projectRoot, clipPath);
      if (!existsSync(absoluteClip)) {
        continue;
      }
      let clipRecord: Record<string, unknown>;
      try {
        const parsed = JSON.parse(
          readFileSync(absoluteClip, "utf8"),
        ) as unknown;
        if (
          Array.isArray(parsed) &&
          parsed[0] != null &&
          typeof parsed[0] === "object"
        ) {
          clipRecord = parsed[0] as Record<string, unknown>;
        } else if (
          parsed != null &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
        ) {
          clipRecord = parsed as Record<string, unknown>;
        } else {
          continue;
        }
      } catch {
        continue;
      }
      const animPaths = this._extractAnimHierarchyPaths(clipRecord);
      for (const animPath of animPaths) {
        if (animPath.length === 0) {
          continue;
        }
        if (relativeDescendants.has(animPath)) {
          continue;
        }
        issues.push({
          kind: "badAnimPath",
          nodePath: hostNodePath,
          componentType: "cc.Animation",
          fieldHint: `clip:${clipPath}`,
          uuid: clipUuid,
          message: `animation path "${animPath}" not found under "${hostNodePath || "(root)"}"`,
        });
      }
    }
  }

  /**
   * @description 宿主节点下相对子孙路径集合（含直接子名）。
   * @param hostNodePath 宿主路径。
   * @param pathByNodeIndex 全树路径。
   * @returns 相对路径集合。
   */
  private _relativeDescendantPaths(
    hostNodePath: string,
    pathByNodeIndex: ReadonlyMap<number, string>,
  ): Set<string> {
    const relative = new Set<string>();
    for (const fullPath of pathByNodeIndex.values()) {
      if (hostNodePath.length === 0) {
        if (fullPath.length > 0) {
          relative.add(fullPath);
        }
        continue;
      }
      if (fullPath === hostNodePath) {
        continue;
      }
      if (fullPath.startsWith(`${hostNodePath}/`)) {
        relative.add(fullPath.slice(hostNodePath.length + 1));
      }
    }
    return relative;
  }

  /**
   * @description 从 Animation 组件提取 clip uuid。
   * @param animation 组件记录。
   * @returns uuid 列表。
   */
  private _extractAnimationClipUuids(
    animation: Record<string, unknown>,
  ): readonly string[] {
    const uuids = new Set<string>();
    const pushUuid = (value: unknown): void => {
      if (value == null || typeof value !== "object" || Array.isArray(value)) {
        return;
      }
      const uuid = (value as { __uuid__?: unknown }).__uuid__;
      if (typeof uuid === "string" && uuid.length > 0) {
        uuids.add(uuid);
      }
    };
    pushUuid(animation._defaultClip);
    pushUuid(animation.defaultClip);
    const clips = animation._clips ?? animation.clips;
    if (Array.isArray(clips)) {
      for (const clip of clips) {
        pushUuid(clip);
      }
    }
    return [...uuids];
  }

  /**
   * @description 目录 uuid → path。
   * @param catalog 目录。
   * @param uuid uuid。
   * @returns 相对路径。
   */
  private _resolveCatalogPath(
    catalog: {
      readonly uuidMap: Readonly<
        Record<
          string,
          {
            readonly uuid: string;
            readonly compressedUuid: string;
            readonly path: string;
          }
        >
      >;
    },
    uuid: string,
  ): string | null {
    const direct = catalog.uuidMap[uuid];
    if (direct != null) {
      return direct.path;
    }
    for (const entry of Object.values(catalog.uuidMap)) {
      if (entry.uuid === uuid || entry.compressedUuid === uuid) {
        return entry.path;
      }
    }
    return null;
  }

  /**
   * @description 从 AnimationClip 提取相对动画根的层级 path。
   * @param clipRecord clip JSON。
   * @returns path 列表。
   */
  private _extractAnimHierarchyPaths(
    clipRecord: Record<string, unknown>,
  ): readonly string[] {
    const paths = new Set<string>();
    const curveDatas = clipRecord.curveDatas;
    if (
      curveDatas != null &&
      typeof curveDatas === "object" &&
      !Array.isArray(curveDatas)
    ) {
      for (const key of Object.keys(curveDatas as Record<string, unknown>)) {
        if (key.length > 0) {
          paths.add(key.replace(/\\/gu, "/"));
        }
      }
    }
    this._walkAnimPathValue(clipRecord._curves, paths);
    this._walkAnimPathValue(clipRecord._tracks, paths);
    this._walkAnimPathValue(clipRecord.tracks, paths);
    return [...paths];
  }

  /**
   * @description 递归收集疑似节点 path。
   * @param value JSON。
   * @param paths 输出。
   * @returns 无。
   */
  private _walkAnimPathValue(value: unknown, paths: Set<string>): void {
    if (value == null) {
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        this._walkAnimPathValue(item, paths);
      }
      return;
    }
    if (typeof value !== "object") {
      return;
    }
    const record = value as Record<string, unknown>;
    if (
      typeof record.path === "string" &&
      this._looksLikeHierarchyPath(record.path)
    ) {
      paths.add(record.path.replace(/\\/gu, "/"));
    }
    if (
      Array.isArray(record.modifiers) &&
      typeof record.modifiers[0] === "string"
    ) {
      const first = record.modifiers[0];
      if (this._looksLikeHierarchyPath(first) || first.includes("/")) {
        paths.add(first.replace(/\\/gu, "/"));
      }
    }
    if (Array.isArray(record._paths)) {
      for (const item of record._paths) {
        if (typeof item === "string" && this._looksLikeHierarchyPath(item)) {
          paths.add(item.replace(/\\/gu, "/"));
        }
      }
    }
    if (
      record._path != null &&
      typeof record._path === "object" &&
      !Array.isArray(record._path)
    ) {
      this._walkAnimPathValue(record._path, paths);
    }
    for (const [key, child] of Object.entries(record)) {
      if (key === "__type__" || key === "__id__" || key === "__uuid__") {
        continue;
      }
      this._walkAnimPathValue(child, paths);
    }
  }

  /**
   * @description 判断字符串是否像相对层级 path（非属性名）。
   * @param value 候选。
   * @returns 是否像 path。
   */
  private _looksLikeHierarchyPath(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return false;
    }
    if (
      /\s/.test(trimmed) ||
      trimmed.includes("\\") ||
      trimmed.startsWith("db://") ||
      trimmed.includes("..")
    ) {
      return false;
    }
    const propertyNames = new Set([
      "position",
      "scale",
      "rotation",
      "eulerAngles",
      "angle",
      "opacity",
      "color",
      "width",
      "height",
      "anchorX",
      "anchorY",
      "active",
      "x",
      "y",
      "z",
    ]);
    if (propertyNames.has(trimmed)) {
      return false;
    }
    return true;
  }

  /**
   * @description 构建节点路径表。
   * @param records 条目。
   * @returns 映射。
   */
  private _buildNodePaths(
    records: readonly Record<string, unknown>[],
  ): Map<number, string> {
    const pathByIndex = new Map<number, string>();
    for (let index = 0; index < records.length; index += 1) {
      if (records[index]?.__type__ !== "cc.Node") {
        continue;
      }
      if (!this._isChildNode(records, index)) {
        this._walkNode(records, index, "", pathByIndex);
      }
    }
    return pathByIndex;
  }

  /**
   * @description 展开节点树。
   * @param records 条目。
   * @param nodeIndex 节点下标。
   * @param parentPath 父路径。
   * @param pathByIndex 输出。
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
    if (!Array.isArray(node._children)) {
      return;
    }
    for (const child of node._children) {
      if (child != null && typeof child === "object") {
        const id = (child as { __id__?: unknown }).__id__;
        if (typeof id === "number") {
          this._walkNode(records, id, path, pathByIndex);
        }
      }
    }
  }

  /**
   * @description 是否为子节点。
   * @param records 条目。
   * @param nodeIndex 下标。
   * @returns 是否子节点。
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
   * @description 组件宿主节点。
   * @param records 条目。
   * @param componentIndex 组件下标。
   * @returns 节点下标。
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
}

/**
 * @description 将相对路径接到工程根（校验用）。
 * @param projectRoot 工程根。
 * @param relativePath 相对路径。
 * @returns 绝对路径。
 * @oopException 纯路径拼接。
 */
export function resolveLumenValidateAbsolutePath(
  projectRoot: string,
  relativePath: string,
): string {
  return join(projectRoot, relativePath);
}
