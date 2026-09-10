import { existsSync, readFileSync } from 'fs';
import { extname, resolve } from 'path';

import type { IAssetCatalogEntry } from './catalog-types.js';
import { AssetCatalogBuilder } from './asset-catalog-builder.js';

/**
 * @description 依赖查询方向。
 */
export type FileAssetDependencyDirection = 'dependencies' | 'dependents' | 'both';

/**
 * @description 依赖展开选项。
 */
export type FileAssetDependencyExpand = 'materialTextures';

/**
 * @description 磁盘依赖图查询输入。
 */
export interface IFileAssetDependencyInput {
    /** @description `db://assets/...` 或 `assets/...`。 */
    readonly dbPath?: string;
    /** @description 标准或压缩 uuid。 */
    readonly uuid?: string;
    /** @description 查询方向；默认 both。 */
    readonly direction?: FileAssetDependencyDirection;
    /** @description 是否强制重建索引。 */
    readonly refreshIndex?: boolean;
    /**
     * @description 依赖展开：`materialTextures` 在正向依赖中把材质再展开到贴图（二跳）。
     */
    readonly expand?: readonly FileAssetDependencyExpand[];
}

/**
 * @description 依赖图中的一条资产。
 */
export interface IFileAssetDependencyEntry {
    /** @description 标准 uuid。 */
    readonly uuid: string;
    /** @description `db://` 路径。 */
    readonly dbPath: string;
    /** @description catalog 类型分桶。 */
    readonly type: string;
}

/**
 * @description 依赖查询结果。
 */
export interface IFileAssetDependencyResult {
    /** @description 数据来源标识。 */
    readonly source: 'file-graph';
    /** @description 查询目标。 */
    readonly target: IFileAssetDependencyEntry;
    /** @description 正向依赖。 */
    readonly dependencies: readonly IFileAssetDependencyEntry[];
    /** @description 反向依赖。 */
    readonly dependents: readonly IFileAssetDependencyEntry[];
    /** @description 未能解析的引用 uuid。 */
    readonly unresolvedUuids: readonly string[];
    /** @description 索引元数据。 */
    readonly index: {
        readonly cached: boolean;
        readonly builtAt: string;
    };
}

/**
 * @description 内存中的依赖图。
 */
interface IFileAssetDependencyGraph {
    /** @description 构建时间戳。 */
    readonly builtAt: number;
    /** @description catalog 条目。 */
    readonly entries: readonly IAssetCatalogEntry[];
    /** @description uuid/compressedUuid → 条目。 */
    readonly byReference: ReadonlyMap<string, IAssetCatalogEntry>;
    /** @description 资产路径 → 依赖路径集合。 */
    readonly refsByPath: ReadonlyMap<string, ReadonlySet<string>>;
    /** @description 资产路径 → 未解析 uuid。 */
    readonly unresolvedByPath: ReadonlyMap<string, ReadonlySet<string>>;
}

/** @description 可解析 `__uuid__` 引用的序列化扩展名。 */
const SERIALIZED_EXTENSIONS = new Set(['.anim', '.json', '.material', '.mtl', '.prefab', '.scene']);

/** @description 索引缓存 TTL。 */
const CACHE_TTL_MS = 30_000;

/**
 * @description 基于磁盘序列化资产扫描的依赖图（不依赖 Creator query-dependencies message）。
 */
export class FileAssetDependencyIndex {
    /** @description 按工程根缓存图。 */
    private static readonly _cache = new Map<string, IFileAssetDependencyGraph>();

    /**
     * @description 失效缓存。
     * @param projectRoot 可选工程根；省略则清空全部。
     * @returns 无。
     */
    public static invalidate(projectRoot?: string): void {
        if (projectRoot != null) {
            FileAssetDependencyIndex._cache.delete(resolve(projectRoot));
            return;
        }
        FileAssetDependencyIndex._cache.clear();
    }

    /**
     * @description 查询依赖 / 被依赖。
     * @param projectRoot 工程根。
     * @param input 查询输入。
     * @returns 查询结果。
     */
    public query(projectRoot: string, input: IFileAssetDependencyInput): IFileAssetDependencyResult {
        const cacheKey = resolve(projectRoot);
        const cached = FileAssetDependencyIndex._cache.get(cacheKey);
        const useCache = input.refreshIndex !== true && cached != null && Date.now() - cached.builtAt < CACHE_TTL_MS;
        const graph = useCache && cached != null ? cached : this._buildGraph(cacheKey);
        if (!useCache) {
            FileAssetDependencyIndex._cache.set(cacheKey, graph);
        }
        const target = this._resolveTarget(graph.entries, graph.byReference, input);
        const direction = input.direction ?? 'both';
        const dependencies =
            direction === 'dependents'
                ? []
                : [...(graph.refsByPath.get(target.path) ?? [])].map((assetPath) => this._entryForPath(graph.entries, assetPath));
        const dependents =
            direction === 'dependencies'
                ? []
                : [...graph.refsByPath.entries()]
                      .filter(([, refs]) => refs.has(target.path))
                      .map(([assetPath]) => this._entryForPath(graph.entries, assetPath));
        const expandedDependencies = direction === 'dependents' ? [] : this._expandDependencies(graph, dependencies, input.expand ?? []);
        return {
            source: 'file-graph',
            target: this._toResultEntry(target),
            dependencies: expandedDependencies.map((entry) => this._toResultEntry(entry)).sort(compareEntries),
            dependents: dependents.map((entry) => this._toResultEntry(entry)).sort(compareEntries),
            unresolvedUuids: [...(graph.unresolvedByPath.get(target.path) ?? [])].sort(),
            index: { cached: useCache, builtAt: new Date(graph.builtAt).toISOString() },
        };
    }

    /**
     * @description 按 expand 选项扩展正向依赖（如材质→贴图）。
     * @param graph 依赖图。
     * @param dependencies 一层依赖。
     * @param expand 展开选项。
     * @returns 展开后的依赖条目。
     */
    private _expandDependencies(
        graph: IFileAssetDependencyGraph,
        dependencies: readonly IAssetCatalogEntry[],
        expand: readonly FileAssetDependencyExpand[],
    ): IAssetCatalogEntry[] {
        if (!expand.includes('materialTextures')) {
            return [...dependencies];
        }
        const byPath = new Map<string, IAssetCatalogEntry>();
        for (const entry of dependencies) {
            byPath.set(entry.path, entry);
        }
        for (const entry of dependencies) {
            if (entry.type !== 'material') {
                continue;
            }
            for (const nestedPath of graph.refsByPath.get(entry.path) ?? []) {
                if (!byPath.has(nestedPath)) {
                    byPath.set(nestedPath, this._entryForPath(graph.entries, nestedPath));
                }
            }
        }
        return [...byPath.values()];
    }

    /**
     * @description 扫描工程构建依赖图。
     * @param projectRoot 工程根。
     * @returns 图。
     */
    private _buildGraph(projectRoot: string): IFileAssetDependencyGraph {
        const catalog = new AssetCatalogBuilder().build(projectRoot);
        const entries = Object.values(catalog.uuidMap);
        const byReference = this._referenceIndex(entries);
        const refsByPath = new Map<string, Set<string>>();
        const unresolvedByPath = new Map<string, Set<string>>();
        for (const entry of this._primaryEntries(entries)) {
            const absolutePath = resolve(projectRoot, entry.path);
            const references = this._readReferences(absolutePath);
            const resolved = new Set<string>();
            const unresolved = new Set<string>();
            for (const reference of references) {
                const dependency = byReference.get(reference);
                if (dependency != null && dependency.path !== entry.path) {
                    resolved.add(dependency.path);
                } else if (dependency == null) {
                    unresolved.add(reference);
                }
            }
            refsByPath.set(entry.path, resolved);
            unresolvedByPath.set(entry.path, unresolved);
        }
        return {
            builtAt: Date.now(),
            entries,
            byReference,
            refsByPath,
            unresolvedByPath,
        };
    }

    /**
     * @description 解析查询目标。
     * @param entries catalog 条目。
     * @param byReference 引用索引。
     * @param input 输入。
     * @returns 目标条目。
     */
    private _resolveTarget(
        entries: readonly IAssetCatalogEntry[],
        byReference: ReadonlyMap<string, IAssetCatalogEntry>,
        input: IFileAssetDependencyInput,
    ): IAssetCatalogEntry {
        const dbPath = input.dbPath?.trim();
        if (dbPath != null && dbPath.length > 0) {
            const assetPath = dbPath.replace(/^db:\/\//, '');
            const found = entries.find((entry) => entry.path === assetPath && entry.parentUuid.length === 0);
            if (found != null) {
                return found;
            }
            throw new Error(`asset_not_found:${dbPath}`);
        }
        const uuid = input.uuid?.trim();
        if (uuid != null && uuid.length > 0) {
            const found = byReference.get(uuid);
            if (found != null) {
                return found;
            }
            throw new Error(`asset_uuid_not_found:${uuid}`);
        }
        throw new Error('dbPath_or_uuid_required');
    }

    /**
     * @description 构建 uuid 索引。
     * @param entries 条目。
     * @returns 索引。
     */
    private _referenceIndex(entries: readonly IAssetCatalogEntry[]): Map<string, IAssetCatalogEntry> {
        const result = new Map<string, IAssetCatalogEntry>();
        for (const entry of entries) {
            result.set(entry.uuid, entry);
            result.set(entry.compressedUuid, entry);
        }
        return result;
    }

    /**
     * @description 可扫描引用的主资源条目。
     * @param entries 全部条目。
     * @returns 主资源。
     */
    private _primaryEntries(entries: readonly IAssetCatalogEntry[]): IAssetCatalogEntry[] {
        return entries.filter((entry) => entry.parentUuid.length === 0 && SERIALIZED_EXTENSIONS.has(extname(entry.path).toLowerCase()));
    }

    /**
     * @description 从序列化 JSON 读取 `__uuid__` 引用。
     * @param absolutePath 文件绝对路径。
     * @returns 引用集合。
     */
    private _readReferences(absolutePath: string): Set<string> {
        const references = new Set<string>();
        if (!existsSync(absolutePath)) {
            return references;
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(readFileSync(absolutePath, 'utf8')) as unknown;
        } catch {
            return references;
        }
        this._visit(parsed, (record) => {
            if (typeof record.__uuid__ === 'string' && record.__uuid__.length > 0) {
                references.add(record.__uuid__);
            }
        });
        return references;
    }

    /**
     * @description 深度访问 JSON 对象。
     * @param value 任意 JSON。
     * @param visitor 对象访问器。
     * @returns 无。
     */
    private _visit(value: unknown, visitor: (record: Record<string, unknown>) => void): void {
        if (value == null || typeof value !== 'object') {
            return;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                this._visit(item, visitor);
            }
            return;
        }
        const record = value as Record<string, unknown>;
        visitor(record);
        for (const item of Object.values(record)) {
            this._visit(item, visitor);
        }
    }

    /**
     * @description 按路径取主资源条目。
     * @param entries 条目。
     * @param assetPath 相对路径。
     * @returns 条目。
     */
    private _entryForPath(entries: readonly IAssetCatalogEntry[], assetPath: string): IAssetCatalogEntry {
        const found = entries.find((entry) => entry.path === assetPath && entry.parentUuid.length === 0);
        if (found == null) {
            throw new Error(`asset_catalog_entry_missing:${assetPath}`);
        }
        return found;
    }

    /**
     * @description 转为对外结果条目。
     * @param entry catalog 条目。
     * @returns 结果条目。
     */
    private _toResultEntry(entry: IAssetCatalogEntry): IFileAssetDependencyEntry {
        return { uuid: entry.uuid, dbPath: `db://${entry.path}`, type: entry.type };
    }
}

/**
 * @description 结果条目排序。
 * @param left 左。
 * @param right 右。
 * @returns 比较值。
 * @oopException 纯值级比较器。
 */
function compareEntries(left: IFileAssetDependencyEntry, right: IFileAssetDependencyEntry): number {
    return left.dbPath.localeCompare(right.dbPath) || left.uuid.localeCompare(right.uuid);
}
