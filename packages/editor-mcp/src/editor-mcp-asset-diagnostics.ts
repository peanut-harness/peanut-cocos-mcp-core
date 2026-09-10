import type {
  ContractPayload,
  IAssetFindReferencingNodesMcpInput,
  IAssetQueryCompatibleTypesMcpInput,
  IAssetQueryInheritanceMcpInput,
  IAssetQueryPropertySchemaMcpInput,
  IAssetResolveMcpInput,
  IAssetScanMissingReferencesMcpInput,
  IAssetSearchMcpInput,
} from "peanut-contracts";
import {
  AssetCatalogBuilder,
  AssetCatalogFastLookupApi,
  FileAssetDependencyIndex,
  SerializedAssetReferenceScanner,
} from "peanut-asset-catalog";
import { LumenScriptPropertyExtractor } from "@peanut/cocos-lumen";
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

/**
 * @description Editor MCP 资产诊断与搜索执行器（磁盘图，不依赖 live Creator message）。
 */
export class EditorMcpAssetDiagnostics {
  /** @description 引用扫描器。 */
  private readonly _scanner: SerializedAssetReferenceScanner;
  /** @description 依赖索引。 */
  private readonly _dependencies: FileAssetDependencyIndex;
  /** @description catalog 快查。 */
  private readonly _catalog: AssetCatalogFastLookupApi;

  /**
   * @description 构造诊断执行器。
   * @param scanner 可选扫描器。
   * @param dependencies 可选依赖索引。
   * @param catalog 可选快查。
   */
  public constructor(
    scanner: SerializedAssetReferenceScanner = new SerializedAssetReferenceScanner(),
    dependencies: FileAssetDependencyIndex = new FileAssetDependencyIndex(),
    catalog: AssetCatalogFastLookupApi = new AssetCatalogFastLookupApi(),
  ) {
    this._scanner = scanner;
    this._dependencies = dependencies;
    this._catalog = catalog;
  }

  /**
   * @description 扫描缺失引用。
   * @param projectRoot 工程根。
   * @param input 输入。
   * @returns 扫描结果。
   */
  public scanMissing(
    projectRoot: string,
    input: IAssetScanMissingReferencesMcpInput,
  ): unknown {
    return this._scanner.scanMissing(projectRoot, input);
  }

  /**
   * @description 查找引用节点。
   * @param projectRoot 工程根。
   * @param input 输入。
   * @returns 查询结果。
   */
  public findReferencingNodes(
    projectRoot: string,
    input: IAssetFindReferencingNodesMcpInput,
  ): unknown {
    return this._scanner.findReferencingNodes(projectRoot, input);
  }

  /**
   * @description uuid / path / url 互查。
   * @param projectRoot 工程根。
   * @param input 输入。
   * @returns 解析结果。
   */
  public resolve(projectRoot: string, input: IAssetResolveMcpInput): unknown {
    const uuid = input.uuid?.trim();
    const pathOrUrl = (input.path ?? input.url)?.trim().replace(/^db:\/\//, "");
    if (
      (uuid == null || uuid.length === 0) &&
      (pathOrUrl == null || pathOrUrl.length === 0)
    ) {
      throw new Error("asset_resolve_uuid_or_path_required");
    }
    const catalog = new AssetCatalogBuilder().build(projectRoot);
    const entries = Object.values(catalog.uuidMap);
    let hit =
      uuid != null && uuid.length > 0
        ? entries.find(
            (entry) => entry.uuid === uuid || entry.compressedUuid === uuid,
          )
        : undefined;
    if (hit == null && pathOrUrl != null && pathOrUrl.length > 0) {
      hit = entries.find(
        (entry) =>
          entry.parentUuid.length === 0 &&
          (entry.path === pathOrUrl || entry.path.endsWith(`/${pathOrUrl}`)),
      );
    }
    if (hit == null) {
      throw new Error(`asset_resolve_not_found:${uuid ?? pathOrUrl ?? ""}`);
    }
    const children = entries.filter((entry) => entry.parentUuid === hit.uuid);
    return {
      uuid: hit.uuid,
      compressedUuid: hit.compressedUuid,
      path: hit.path,
      dbPath: `db://${hit.path}`,
      url: `db://${hit.path}`,
      type: hit.type,
      parentUuid: hit.parentUuid,
      subAssets: children.map((child) => ({
        uuid: child.uuid,
        compressedUuid: child.compressedUuid,
        path: child.path,
        dbPath: `db://${child.path}`,
        type: child.type,
      })),
    };
  }

  /**
   * @description 多模式搜索。
   * @param projectRoot 工程根。
   * @param input 输入。
   * @returns 搜索结果。
   */
  public search(projectRoot: string, input: IAssetSearchMcpInput): unknown {
    const limit = clampSearchLimit(input.limit);
    const pathContains = input.pathContains?.trim() || undefined;
    const filterByFolder = <
      T extends { readonly path?: string; readonly referrerDbPath?: string },
    >(
      result: T | { readonly hits?: readonly T[]; readonly count?: number },
    ): unknown => {
      if (pathContains == null || pathContains.length === 0) {
        return result;
      }
      if (result == null || typeof result !== "object") {
        return result;
      }
      const record = result as {
        readonly hits?: readonly T[];
        readonly count?: number;
      };
      if (!Array.isArray(record.hits)) {
        return result;
      }
      const needle = pathContains.replace(/^db:\/\//, "").toLowerCase();
      const hits = record.hits.filter((hit) => {
        const path =
          typeof hit.path === "string"
            ? hit.path
            : typeof hit.referrerDbPath === "string"
              ? hit.referrerDbPath
              : "";
        return path
          .replace(/^db:\/\//, "")
          .toLowerCase()
          .includes(needle);
      });
      return {
        ...record,
        hits: hits.slice(0, limit),
        count: hits.length,
        pathContains,
      };
    };
    switch (input.mode) {
      case "name":
        return filterByFolder(
          this._catalog.lookup(projectRoot, {
            name: requireQuery(input.query),
            path: pathContains,
            limit,
          }),
        );
      case "uuid":
        return filterByFolder(
          this._catalog.lookup(projectRoot, {
            uuid: requireQuery(input.query),
            path: pathContains,
            limit,
          }),
        );
      case "path":
        return filterByFolder(
          this._catalog.lookup(projectRoot, {
            path: requireQuery(input.query),
            limit,
          }),
        );
      case "type":
        return filterByFolder(
          this._catalog.lookup(projectRoot, {
            type: requireQuery(input.query),
            path: pathContains,
            limit,
          }),
        );
      case "bundle":
        return filterByFolder(
          this._catalog.lookup(projectRoot, {
            type: "folder",
            name: requireQuery(input.query),
            path: pathContains,
            limit,
          }),
        );
      case "dependencies":
      case "dependents":
        return this._dependencies.query(projectRoot, {
          uuid: input.uuid?.trim() || undefined,
          dbPath: input.path?.trim() || undefined,
          direction: input.mode,
        });
      case "missing":
        return this._scanner.scanMissing(projectRoot, {
          pathContains: pathContains ?? (input.query?.trim() || undefined),
          limit,
        });
      default:
        throw new Error(`asset_search_mode_unsupported:${String(input.mode)}`);
    }
  }

  /**
   * @description 读取资产 `.meta` 并描述字段 schema。
   * @param projectRoot 工程根。
   * @param input 输入。
   * @returns 字段表。
   */
  public queryPropertySchema(
    projectRoot: string,
    input: IAssetQueryPropertySchemaMcpInput,
  ): unknown {
    const resolved = this.resolve(projectRoot, input) as {
      readonly uuid: string;
      readonly path: string;
      readonly type: string;
    };
    const metaPath = join(projectRoot, `${resolved.path}.meta`);
    if (!existsSync(metaPath)) {
      throw new Error(`asset_meta_not_found:${resolved.path}.meta`);
    }
    const raw = JSON.parse(readFileSync(metaPath, "utf8")) as unknown;
    if (!isRecord(raw)) {
      throw new Error(`asset_meta_invalid:${resolved.path}.meta`);
    }
    const fields = flattenMetaFields(raw, "");
    const base = {
      uuid: resolved.uuid,
      path: resolved.path,
      type: resolved.type,
      importer: typeof raw.importer === "string" ? raw.importer : "",
      metaPath: `${resolved.path}.meta`,
      source: "disk",
      fields,
      note: "Disk .meta schema only unless live overlay attached by router; component Inspector fields use lumen.schema.",
    };
    if (
      resolved.path.toLowerCase().endsWith(".mtl") ||
      resolved.type === "material" ||
      base.importer === "material"
    ) {
      return {
        ...base,
        editableVia: "lumen.assetSet",
        assetFields: [
          {
            name: "name",
            type: "string",
            description: "Material._name",
          },
          {
            name: "effectAsset",
            type: "uuid|null",
            description: "Bound effect uuid; empty clears",
          },
          {
            name: "technique",
            type: "number",
            description: "Material._techIdx",
          },
          {
            name: "defines",
            type: "array<object>",
            description: "Per-pass macro defines",
          },
          {
            name: "props",
            type: "array<object>",
            description: "Per-pass material props (texture uuids as string)",
          },
          {
            name: "states",
            type: "array<object>",
            description: "Per-pass render states",
          },
        ],
        note: `${base.note} Material body fields: use lumen.assetSet (name/effectAsset/technique/defines/props/states).`,
      };
    }
    return base;
  }

  /**
   * @description 在磁盘 schema 上叠 live AssetDB meta（若有）。
   * @param diskResult 磁盘结果。
   * @param liveMeta live meta 对象。
   * @returns 合并结果。
   */
  public mergeLivePropertySchema(
    diskResult: unknown,
    liveMeta: unknown,
  ): unknown {
    if (!isRecord(diskResult)) {
      return diskResult;
    }
    if (!isRecord(liveMeta)) {
      return { ...diskResult, source: "disk", liveAvailable: false };
    }
    const liveFields = flattenMetaFields(liveMeta, "");
    return {
      ...diskResult,
      source: "live",
      liveAvailable: true,
      fields: liveFields.length > 0 ? liveFields : diskResult.fields,
      liveKeys: Object.keys(liveMeta).slice(0, 40),
    };
  }

  /**
   * @description 查询 extends 与兼容子资源。
   * @param projectRoot 工程根。
   * @param input 输入。
   * @returns 继承信息。
   */
  public queryInheritance(
    projectRoot: string,
    input: IAssetQueryInheritanceMcpInput,
  ): unknown {
    const resolved = this.resolve(projectRoot, input) as {
      readonly uuid: string;
      readonly path: string;
      readonly type: string;
      readonly parentUuid: string;
      readonly subAssets: readonly {
        readonly uuid: string;
        readonly path: string;
        readonly type: string;
      }[];
    };
    const metaPath = join(projectRoot, `${resolved.path}.meta`);
    let importer = "";
    let extendsValue: string | null = null;
    let subMetas: readonly {
      readonly name: string;
      readonly uuid: string;
      readonly importer: string;
    }[] = [];
    if (existsSync(metaPath)) {
      const raw = JSON.parse(readFileSync(metaPath, "utf8")) as unknown;
      if (isRecord(raw)) {
        importer = typeof raw.importer === "string" ? raw.importer : "";
        if (typeof raw.extends === "string" && raw.extends.trim().length > 0) {
          extendsValue = raw.extends.trim();
        } else if (
          isRecord(raw.userData) &&
          typeof raw.userData.extends === "string"
        ) {
          extendsValue = raw.userData.extends.trim();
        }
        if (isRecord(raw.subMetas)) {
          subMetas = Object.entries(raw.subMetas)
            .filter((entry): entry is [string, Record<string, unknown>] =>
              isRecord(entry[1]),
            )
            .map(([name, value]) => ({
              name,
              uuid: typeof value.uuid === "string" ? value.uuid : "",
              importer:
                typeof value.importer === "string" ? value.importer : "",
            }));
        }
      }
    }
    const compatibleChildImporters = [
      ...new Set([
        ...compatibleChildrenForImporter(importer),
        ...subMetas
          .map((item) => item.importer)
          .filter((item) => item.length > 0),
      ]),
    ];
    return {
      uuid: resolved.uuid,
      path: resolved.path,
      type: resolved.type,
      importer,
      extends: extendsValue,
      parentUuid: resolved.parentUuid.length > 0 ? resolved.parentUuid : null,
      subAssets: resolved.subAssets,
      subMetas,
      compatibleChildImporters,
    };
  }

  /**
   * @description RefPicker 风格：按类型名 / 脚本字段 / 资源反查可绑类型。
   * @param projectRoot 工程根。
   * @param input 输入。
   * @returns 兼容类型。
   */
  public queryCompatibleTypes(
    projectRoot: string,
    input: IAssetQueryCompatibleTypesMcpInput,
  ): unknown {
    const limit =
      typeof input.limit === "number" && Number.isFinite(input.limit)
        ? Math.min(50, Math.max(1, Math.floor(input.limit)))
        : 20;
    if (
      typeof input.scriptRelativePath === "string" &&
      input.scriptRelativePath.trim().length > 0 &&
      typeof input.field === "string" &&
      input.field.trim().length > 0
    ) {
      const scriptAbsolute = resolve(
        projectRoot,
        input.scriptRelativePath.trim(),
      );
      if (!existsSync(scriptAbsolute)) {
        throw new Error(
          `asset_compatible_script_not_found:${input.scriptRelativePath}`,
        );
      }
      const extracted = LumenScriptPropertyExtractor.extractFromSource(
        readFileSync(scriptAbsolute, "utf8"),
      );
      const fieldName = input.field.trim();
      const field = extracted.fields.find((item) => item.apiName === fieldName);
      if (field == null) {
        return {
          mode: "script_field",
          scriptRelativePath: input.scriptRelativePath.trim(),
          field: fieldName,
          className: extracted.className,
          declaredType: null,
          compatibleTypes: [],
          skipped: extracted.skipped,
          note: "field_not_found_in_script_properties",
        };
      }
      const declaredType =
        field.refComponentType ??
        field.embeddedType ??
        field.typeRef ??
        String(field.kind);
      let catalogHints: readonly unknown[] = [];
      try {
        const bucket = catalogBucketForType(declaredType);
        const catalogResult = this._catalog.lookup(projectRoot, {
          ...(bucket == null ? {} : { type: bucket }),
          limit,
        });
        catalogHints = catalogResult.hits.slice(0, limit);
      } catch {
        catalogHints = [];
      }
      return {
        mode: "script_field",
        scriptRelativePath: input.scriptRelativePath.trim(),
        field: fieldName,
        className: extracted.className,
        declaredType,
        kind: field.kind,
        compatibleTypes: expandCompatibleTypeNames(declaredType),
        catalogHints,
      };
    }

    let typeName = input.typeName?.trim();
    if (
      (typeName == null || typeName.length === 0) &&
      (input.uuid != null || input.path != null || input.url != null)
    ) {
      const resolved = this.resolve(projectRoot, {
        uuid: input.uuid,
        path: input.path,
        url: input.url,
      }) as { readonly type: string };
      typeName = resolved.type;
    }
    if (typeName == null || typeName.length === 0) {
      throw new Error("asset_compatible_type_or_script_field_required");
    }
    const compatibleTypes = expandCompatibleTypeNames(typeName);
    const catalogType = catalogBucketForType(typeName);
    let catalogHints: unknown = { count: 0, hits: [] };
    try {
      catalogHints = this._catalog.lookup(projectRoot, {
        ...(catalogType == null ? {} : { type: catalogType }),
        limit,
      });
    } catch {
      catalogHints = { count: 0, hits: [], note: "catalog_unavailable" };
    }
    return {
      mode: "type_name",
      typeName,
      compatibleTypes,
      compatibleChildImporters: compatibleChildrenForImporter(typeName),
      catalogHints,
    };
  }

  /**
   * @description 解析 scanMissing 输入。
   * @param input 未校验输入。
   * @returns 输入。
   */
  public readScanMissingInput(
    input: ContractPayload | undefined,
  ): IAssetScanMissingReferencesMcpInput {
    if (input == null) {
      return {};
    }
    if (!isRecord(input)) {
      throw new Error("editor_mcp_invalid_operation_input");
    }
    return {
      pathContains:
        typeof input.pathContains === "string" ? input.pathContains : undefined,
      type: typeof input.type === "string" ? input.type : undefined,
      limit: typeof input.limit === "number" ? input.limit : undefined,
      refreshIndex: input.refreshIndex === true,
    };
  }

  /**
   * @description 解析 findReferencingNodes 输入。
   * @param input 未校验输入。
   * @returns 输入。
   */
  public readFindReferencingNodesInput(
    input: ContractPayload | undefined,
  ): IAssetFindReferencingNodesMcpInput {
    if (input == null || !isRecord(input)) {
      throw new Error("editor_mcp_invalid_operation_input");
    }
    const missingOnly = input.missingOnly === true;
    const uuid = typeof input.uuid === "string" ? input.uuid.trim() : "";
    if (!missingOnly && uuid.length === 0) {
      throw new Error("uuid_required");
    }
    return {
      uuid: uuid.length > 0 ? uuid : undefined,
      missingOnly: missingOnly || undefined,
      assetPath:
        typeof input.assetPath === "string" ? input.assetPath : undefined,
      nodeNameContains:
        typeof input.nodeNameContains === "string"
          ? input.nodeNameContains
          : undefined,
      nodePathContains:
        typeof input.nodePathContains === "string"
          ? input.nodePathContains
          : undefined,
      limit: typeof input.limit === "number" ? input.limit : undefined,
    };
  }

  /**
   * @description 解析 resolve 输入。
   * @param input 未校验输入。
   * @returns 输入。
   */
  public readResolveInput(
    input: ContractPayload | undefined,
  ): IAssetResolveMcpInput {
    if (input == null || !isRecord(input)) {
      throw new Error("asset_resolve_uuid_or_path_required");
    }
    return {
      uuid: typeof input.uuid === "string" ? input.uuid : undefined,
      path: typeof input.path === "string" ? input.path : undefined,
      url: typeof input.url === "string" ? input.url : undefined,
    };
  }

  /**
   * @description 解析 search 输入。
   * @param input 未校验输入。
   * @returns 输入。
   */
  public readSearchInput(
    input: ContractPayload | undefined,
  ): IAssetSearchMcpInput {
    if (input == null || !isRecord(input) || typeof input.mode !== "string") {
      throw new Error("asset_search_mode_required");
    }
    const mode = input.mode;
    if (
      mode !== "name" &&
      mode !== "uuid" &&
      mode !== "path" &&
      mode !== "type" &&
      mode !== "dependencies" &&
      mode !== "dependents" &&
      mode !== "missing" &&
      mode !== "bundle"
    ) {
      throw new Error(`asset_search_mode_unsupported:${mode}`);
    }
    return {
      mode,
      query: typeof input.query === "string" ? input.query : undefined,
      path: typeof input.path === "string" ? input.path : undefined,
      uuid: typeof input.uuid === "string" ? input.uuid : undefined,
      pathContains:
        typeof input.pathContains === "string" ? input.pathContains : undefined,
      limit: typeof input.limit === "number" ? input.limit : undefined,
    };
  }

  /**
   * @description 解析 propertySchema / inheritance 共用定位输入。
   * @param input 未校验输入。
   * @returns 定位输入。
   */
  public readAssetLocateInput(
    input: ContractPayload | undefined,
  ): IAssetQueryPropertySchemaMcpInput {
    return this.readResolveInput(input);
  }

  /**
   * @description 解析兼容类型查询输入。
   * @param input 未校验输入。
   * @returns 输入。
   */
  public readCompatibleTypesInput(
    input: ContractPayload | undefined,
  ): IAssetQueryCompatibleTypesMcpInput {
    if (input == null || !isRecord(input)) {
      throw new Error("asset_compatible_type_or_script_field_required");
    }
    return {
      typeName: typeof input.typeName === "string" ? input.typeName : undefined,
      scriptRelativePath:
        typeof input.scriptRelativePath === "string"
          ? input.scriptRelativePath
          : undefined,
      field: typeof input.field === "string" ? input.field : undefined,
      uuid: typeof input.uuid === "string" ? input.uuid : undefined,
      path: typeof input.path === "string" ? input.path : undefined,
      url: typeof input.url === "string" ? input.url : undefined,
      limit: typeof input.limit === "number" ? input.limit : undefined,
    };
  }
}

/**
 * @description 记录类型守卫。
 * @param value 未知值。
 * @returns 是否为对象记录。
 * @oopException 纯类型守卫。
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/**
 * @description 要求非空 query。
 * @param value 查询文本。
 * @returns 文本。
 * @oopException 纯校验。
 */
function requireQuery(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (trimmed.length === 0) {
    throw new Error("asset_search_query_required");
  }
  return trimmed;
}

/**
 * @description 搜索 limit 夹紧。
 * @param value 原始值。
 * @returns limit。
 * @oopException 纯夹紧。
 */
function clampSearchLimit(value: number | undefined): number {
  if (value == null || !Number.isFinite(value)) {
    return 20;
  }
  return Math.min(50, Math.max(1, Math.floor(value)));
}

/**
 * @description 展平 meta 字段为 schema 行。
 * @param value 节点。
 * @param prefix 路径前缀。
 * @returns 字段列表。
 * @oopException 纯值级展平。
 */
function flattenMetaFields(
  value: unknown,
  prefix: string,
): readonly {
  readonly path: string;
  readonly valueType: string;
  readonly sample: unknown;
  readonly description: string;
}[] {
  if (!isRecord(value)) {
    return [
      {
        path: prefix.length === 0 ? "(root)" : prefix,
        valueType: describeType(value),
        sample: summarizeSample(value),
        description: describeMetaPath(prefix),
      },
    ];
  }
  const rows: {
    path: string;
    valueType: string;
    sample: unknown;
    description: string;
  }[] = [];
  for (const [key, child] of Object.entries(value)) {
    const path = prefix.length === 0 ? key : `${prefix}.${key}`;
    if (isRecord(child) && key === "subMetas") {
      rows.push({
        path,
        valueType: "object",
        sample: Object.keys(child),
        description: "子资源表（displayName → meta）。",
      });
      for (const [subName, subValue] of Object.entries(child)) {
        if (!isRecord(subValue)) {
          continue;
        }
        for (const [subKey, leaf] of Object.entries(subValue)) {
          if (isRecord(leaf) || Array.isArray(leaf)) {
            continue;
          }
          const subPath = `${path}.${subName}.${subKey}`;
          rows.push({
            path: subPath,
            valueType: describeType(leaf),
            sample: summarizeSample(leaf),
            description: describeMetaPath(subKey),
          });
        }
      }
      continue;
    }
    if (isRecord(child) && (key === "userData" || key === "__data__")) {
      for (const [childKey, leaf] of Object.entries(child)) {
        const childPath = `${path}.${childKey}`;
        rows.push({
          path: childPath,
          valueType: describeType(leaf),
          sample: summarizeSample(leaf),
          description: describeMetaPath(childKey),
        });
      }
      continue;
    }
    if (isRecord(child) || Array.isArray(child)) {
      rows.push({
        path,
        valueType: Array.isArray(child) ? "array" : "object",
        sample: Array.isArray(child)
          ? child.slice(0, 3)
          : Object.keys(child).slice(0, 12),
        description: describeMetaPath(key),
      });
      continue;
    }
    rows.push({
      path,
      valueType: describeType(child),
      sample: summarizeSample(child),
      description: describeMetaPath(key),
    });
  }
  return rows;
}

/**
 * @description 描述 JS 值类型。
 * @param value 值。
 * @returns 类型名。
 * @oopException 纯类型探测。
 */
function describeType(value: unknown): string {
  if (value == null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
}

/**
 * @description 截断 sample。
 * @param value 值。
 * @returns sample。
 * @oopException 纯截断。
 */
function summarizeSample(value: unknown): unknown {
  if (typeof value === "string" && value.length > 120) {
    return `${value.slice(0, 117)}...`;
  }
  return value;
}

/**
 * @description meta 字段中文说明。
 * @param key 字段路径或名。
 * @returns 说明。
 * @oopException 纯查表。
 */
function describeMetaPath(key: string): string {
  const leaf = key.includes(".") ? (key.split(".").pop() ?? key) : key;
  const known: Record<string, string> = {
    uuid: "资源 UUID。",
    importer: "导入器类型。",
    ver: "meta schema 版本。",
    imported: "是否已导入。",
    files: "导入产物扩展名列表。",
    subMetas: "子资源表。",
    userData: "Importer 用户数据。",
    displayName: "子资源显示名。",
    name: "子资源逻辑名。",
    isBundle: "目录是否为 Asset Bundle。",
    type: "资源/贴图类型提示。",
    wrapMode: "贴图 wrap 模式。",
    filterMode: "贴图过滤模式。",
    extends: "继承/扩展标记（若有）。",
  };
  return known[leaf] ?? `meta 字段 ${leaf}`;
}

/**
 * @description importer 常见兼容子资源。
 * @param importer importer。
 * @returns 子 importer 列表。
 * @oopException 纯查表。
 */
function compatibleChildrenForImporter(importer: string): readonly string[] {
  switch (importer) {
    case "image":
      return ["sprite-frame", "texture"];
    case "gltf":
    case "fbx":
    case "glb":
      return ["mesh", "material", "skeleton", "animation"];
    case "spine-data":
      return ["spine"];
    case "dragonbones":
      return ["dragonbones-atlas"];
    case "ttf-font":
    case "bitmap-font":
      return ["font"];
    case "directory":
      return [];
    default:
      return [];
  }
}

/**
 * @description 类型名扩展为可绑别名列表。
 * @param typeName 类型。
 * @returns 兼容名。
 * @oopException 纯查表。
 */
function expandCompatibleTypeNames(typeName: string): readonly string[] {
  const simple = typeName.includes(".")
    ? (typeName.split(".").pop() ?? typeName)
    : typeName;
  const base = simple.replace(/^cc\./, "");
  const map: Record<string, readonly string[]> = {
    SpriteFrame: ["SpriteFrame", "cc.SpriteFrame", "sprite-frame", "image"],
    Texture2D: ["Texture2D", "cc.Texture2D", "texture", "image"],
    Material: ["Material", "cc.Material", "material"],
    Prefab: ["Prefab", "cc.Prefab", "prefab"],
    Node: ["Node", "cc.Node"],
    Label: ["Label", "cc.Label"],
    Sprite: ["Sprite", "cc.Sprite"],
    AudioClip: ["AudioClip", "cc.AudioClip", "audio"],
    Font: ["Font", "cc.Font", "ttf-font", "bitmap-font"],
    Asset: ["Asset", "cc.Asset"],
    spriteFrame: ["SpriteFrame", "cc.SpriteFrame", "sprite-frame"],
    image: ["image", "SpriteFrame", "Texture2D"],
  };
  return map[base] ?? map[typeName] ?? [typeName, base, `cc.${base}`];
}

/**
 * @description 类型名映射到 catalog 分桶。
 * @param typeName 类型。
 * @returns 分桶或 undefined。
 * @oopException 纯查表。
 */
function catalogBucketForType(typeName: string): string | undefined {
  const simple = (
    typeName.includes(".") ? (typeName.split(".").pop() ?? typeName) : typeName
  )
    .replace(/^cc\./, "")
    .toLowerCase();
  switch (simple) {
    case "spriteframe":
    case "sprite-frame":
      return "spriteFrame";
    case "texture2d":
    case "texture":
      return "texture";
    case "image":
      return "image";
    case "material":
      return "other";
    case "prefab":
      return "prefab";
    case "audioclip":
    case "audio":
      return "audio";
    case "font":
    case "bitmapfont":
    case "ttffont":
      return "font";
    case "script":
    case "typescript":
      return "script";
    default:
      return undefined;
  }
}
