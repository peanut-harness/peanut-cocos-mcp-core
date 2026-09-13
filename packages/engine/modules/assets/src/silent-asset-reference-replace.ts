import { existsSync, readFileSync, writeFileSync } from 'fs';
import { extname, resolve } from 'path';

import { CocosUuidCodec } from './cocos-uuid-codec.js';
import { FileAssetDependencyIndex } from './file-asset-dependency-index.js';
import { SilentAssetPathGuard } from './silent-asset-path-guard.js';
import { AssetCatalogBuilder } from './asset-catalog-builder.js';

/**
 * @description 静默引用替换请求。
 */
export interface ISilentAssetReferenceReplaceRequest {
    /** @description Creator 工程根。 */
    readonly projectRoot: string;
    /** @description 被替换的 uuid（标准/压缩，可带 `@sub`）。 */
    readonly fromUuid: string;
    /** @description 替换为目标 uuid（标准/压缩，可带 `@sub`）。 */
    readonly toUuid: string;
    /**
     * @description 限定扫描路径子串（`assets/...` 或 `db://`）；省略则按依赖图选文件。
     */
    readonly pathContains?: string;
    /** @description 为 true 时只报告命中，不写盘。 */
    readonly dryRun?: boolean;
    /**
     * @description 允许 `toUuid` 在 catalog 中不存在（高级修复）；默认 false。
     */
    readonly allowMissingTarget?: boolean;
    /** @description 强制重建依赖索引。 */
    readonly refreshIndex?: boolean;
}

/**
 * @description 单文件替换结果。
 */
export interface ISilentAssetReferenceReplaceFileHit {
    /** @description 项目相对路径。 */
    readonly path: string;
    /** @description 该文件内替换次数。 */
    readonly replacementCount: number;
}

/**
 * @description 静默引用替换结果。
 */
export interface ISilentAssetReferenceReplaceResult {
    /** @description 是否为演练。 */
    readonly dryRun: boolean;
    /** @description 源 uuid（规范化展示用原文）。 */
    readonly fromUuid: string;
    /** @description 目标 uuid。 */
    readonly toUuid: string;
    /** @description 命中文件。 */
    readonly files: readonly ISilentAssetReferenceReplaceFileHit[];
    /** @description 总替换次数。 */
    readonly totalReplacements: number;
    /** @description 实际扫描的序列化文件数。 */
    readonly scannedFileCount: number;
}

/** @description 可改写 `__uuid__` 的序列化扩展名。 */
const SERIALIZED_EXTENSIONS = new Set(['.anim', '.json', '.material', '.mtl', '.prefab', '.scene']);

/**
 * @description 在磁盘序列化资产中把 `__uuid__` 引用从 A 批量换成 B（支持压缩 UUID 与 `@sub`）。
 */
export class SilentAssetReferenceReplace {
    /** @description 路径校验。 */
    private readonly _pathGuard: SilentAssetPathGuard;
    /** @description UUID 编解码。 */
    private readonly _codec: CocosUuidCodec;

    /**
     * @description 创建替换器。
     * @param pathGuard 可选路径校验。
     * @param codec 可选编解码器。
     */
    public constructor(pathGuard: SilentAssetPathGuard = new SilentAssetPathGuard(), codec: CocosUuidCodec = new CocosUuidCodec()) {
        this._pathGuard = pathGuard;
        this._codec = codec;
    }

    /**
     * @description 执行引用替换。
     * @param request 请求。
     * @returns 替换结果。
     */
    public replace(request: ISilentAssetReferenceReplaceRequest): ISilentAssetReferenceReplaceResult {
        const projectRoot = resolve(request.projectRoot);
        const fromUuid = request.fromUuid.trim();
        const toUuid = request.toUuid.trim();
        if (fromUuid.length === 0 || toUuid.length === 0) {
            throw new Error('silent_replace_from_to_required');
        }
        if (this._identityKey(fromUuid) === this._identityKey(toUuid)) {
            throw new Error('silent_replace_from_equals_to');
        }
        if (request.allowMissingTarget !== true) {
            this._requireUuidInCatalog(projectRoot, toUuid);
        }

        if (request.refreshIndex === true) {
            FileAssetDependencyIndex.invalidate(projectRoot);
        }

        const candidatePaths = this._candidatePaths(projectRoot, fromUuid, request.pathContains);
        const files: ISilentAssetReferenceReplaceFileHit[] = [];
        let totalReplacements = 0;
        const dryRun = request.dryRun === true;

        for (const relativePath of candidatePaths) {
            const absolutePath = resolve(projectRoot, relativePath);
            if (!existsSync(absolutePath) || !SERIALIZED_EXTENSIONS.has(extname(relativePath).toLowerCase())) {
                continue;
            }
            let raw: string;
            try {
                raw = readFileSync(absolutePath, 'utf8');
            } catch {
                continue;
            }
            let parsed: unknown;
            try {
                parsed = JSON.parse(raw) as unknown;
            } catch {
                continue;
            }
            const remapped = this._remapValue(parsed, fromUuid, toUuid);
            if (remapped.count === 0) {
                continue;
            }
            totalReplacements += remapped.count;
            files.push({ path: relativePath, replacementCount: remapped.count });
            if (!dryRun) {
                writeFileSync(absolutePath, `${JSON.stringify(remapped.value, null, 2)}\n`, 'utf8');
            }
        }

        if (!dryRun && files.length > 0) {
            FileAssetDependencyIndex.invalidate(projectRoot);
        }

        return {
            dryRun,
            fromUuid,
            toUuid,
            files: files.sort((left, right) => left.path.localeCompare(right.path)),
            totalReplacements,
            scannedFileCount: candidatePaths.length,
        };
    }

    /**
     * @description 解析待扫描文件列表（序列化主资源；可选 pathContains 过滤）。
     * @param projectRoot 工程根。
     * @param fromUuid 源 uuid（保留参数供调用方语义；扫描不依赖反向图，以免漏掉 `@sub`）。
     * @param pathContains 可选路径过滤。
     * @returns 相对路径列表。
     */
    private _candidatePaths(projectRoot: string, fromUuid: string, pathContains: string | undefined): string[] {
        void fromUuid;
        const needle =
            pathContains != null && pathContains.trim().length > 0
                ? this._normalizePathContainsFilter(pathContains.trim())
                : undefined;
        const catalog = new AssetCatalogBuilder().build(projectRoot);
        const paths: string[] = [];
        for (const entry of Object.values(catalog.uuidMap)) {
            if (entry.parentUuid.length > 0) {
                continue;
            }
            if (!SERIALIZED_EXTENSIONS.has(extname(entry.path).toLowerCase())) {
                continue;
            }
            if (needle == null || entry.path.toLowerCase().includes(needle)) {
                paths.push(entry.path);
            }
        }
        return paths.sort();
    }

    /**
     * @description 规范化 `pathContains` 子串过滤（不是完整路径；允许 `FeatureReplaceProbe` 这类文件名片段）。
     * @param pathContains 过滤子串。
     * @returns 小写过滤子串。
     */
    private _normalizePathContainsFilter(pathContains: string): string {
        const trimmed = pathContains.replace(/\\/g, '/').replace(/^db:\/\//u, '').replace(/^\.\//u, '');
        if (trimmed.length === 0) {
            throw new Error('silent_asset_path_empty');
        }
        if (trimmed.includes('..') || trimmed.startsWith('/') || /^[A-Za-z]:\//u.test(trimmed)) {
            throw new Error(`silent_asset_path_escape:${pathContains}`);
        }
        if (trimmed === 'assets' || trimmed.startsWith('assets/')) {
            return this._pathGuard.normalize(trimmed).toLowerCase();
        }
        if (trimmed.includes('/')) {
            throw new Error(`silent_asset_path_outside_assets:${trimmed}`);
        }
        return trimmed.toLowerCase();
    }

    /**
     * @description 要求目标 uuid 存在于 catalog。
     * @param projectRoot 工程根。
     * @param uuid 目标。
     * @returns 无。
     */
    private _requireUuidInCatalog(projectRoot: string, uuid: string): void {
        const catalog = new AssetCatalogBuilder().build(projectRoot);
        const primary = this._primaryPart(uuid);
        const found = Object.values(catalog.uuidMap).some((entry) => {
            return (
                this._identityKey(entry.uuid) === this._identityKey(uuid) ||
                this._identityKey(entry.compressedUuid) === this._identityKey(uuid) ||
                this._identityKey(entry.uuid) === this._identityKey(primary) ||
                this._identityKey(entry.compressedUuid) === this._identityKey(primary)
            );
        });
        if (!found) {
            throw new Error(`silent_replace_target_not_found:${uuid}`);
        }
    }

    /**
     * @description 递归改写 JSON 中的 `__uuid__`。
     * @param value 任意 JSON。
     * @param fromUuid 源。
     * @param toUuid 目标。
     * @returns 新值与替换计数。
     */
    private _remapValue(value: unknown, fromUuid: string, toUuid: string): { readonly value: unknown; readonly count: number } {
        if (value == null) {
            return { value, count: 0 };
        }
        if (Array.isArray(value)) {
            let count = 0;
            const next = value.map((item) => {
                const remapped = this._remapValue(item, fromUuid, toUuid);
                count += remapped.count;
                return remapped.value;
            });
            return { value: next, count };
        }
        if (typeof value !== 'object') {
            return { value, count: 0 };
        }
        const record = value as Record<string, unknown>;
        let count = 0;
        const next: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(record)) {
            if (key === '__uuid__' && typeof child === 'string') {
                const replaced = this._replaceOneUuid(child, fromUuid, toUuid);
                next[key] = replaced.value;
                count += replaced.changed ? 1 : 0;
                continue;
            }
            const remapped = this._remapValue(child, fromUuid, toUuid);
            next[key] = remapped.value;
            count += remapped.count;
        }
        return { value: next, count };
    }

    /**
     * @description 尝试替换单个 uuid 字符串。
     * @param stored 文件中的原串。
     * @param fromUuid 源。
     * @param toUuid 目标。
     * @returns 新串与是否变更。
     */
    private _replaceOneUuid(stored: string, fromUuid: string, toUuid: string): { readonly value: string; readonly changed: boolean } {
        const fromPrimary = this._primaryPart(fromUuid);
        const fromSuffix = this._suffixPart(fromUuid);
        const toPrimary = this._primaryPart(toUuid);
        const toSuffix = this._suffixPart(toUuid);
        const storedPrimary = this._primaryPart(stored);
        const storedSuffix = this._suffixPart(stored);

        if (fromSuffix != null) {
            if (this._samePrimary(storedPrimary, fromPrimary) && storedSuffix === fromSuffix) {
                const nextSuffix = toSuffix ?? fromSuffix;
                return {
                    value: this._formatLike(stored, toPrimary, nextSuffix),
                    changed: true,
                };
            }
            return { value: stored, changed: false };
        }

        if (!this._samePrimary(storedPrimary, fromPrimary)) {
            return { value: stored, changed: false };
        }
        return {
            value: this._formatLike(stored, toPrimary, storedSuffix),
            changed: true,
        };
    }

    /**
     * @description 按原串风格输出目标 uuid（保留连字符/压缩形态与 `@sub`）。
     * @param stored 原串。
     * @param toPrimary 目标主 uuid。
     * @param suffix 可选子资源后缀。
     * @returns 输出串。
     */
    private _formatLike(stored: string, toPrimary: string, suffix: string | undefined): string {
        const storedLooksCompressed = !stored.includes('-') && this._primaryPart(stored).length !== 32;
        let head: string;
        try {
            if (storedLooksCompressed) {
                head = this._codec.compress(toPrimary);
            } else if (stored.includes('-')) {
                head = this._toDashed(toPrimary);
            } else {
                head = this._codec.normalize(toPrimary).split('@')[0] ?? toPrimary;
            }
        } catch {
            head = toPrimary;
        }
        return suffix != null && suffix.length > 0 ? `${head}@${suffix}` : head;
    }

    /**
     * @description 判断两个主 uuid 是否同一身份（含压缩）。
     * @param left 左。
     * @param right 右。
     * @returns 是否相同。
     */
    private _samePrimary(left: string, right: string): boolean {
        return this._identityKey(left) === this._identityKey(right);
    }

    /**
     * @description 身份键：优先压缩归一，失败则去连字符小写。
     * @param uuid 任意形态。
     * @returns 键。
     */
    private _identityKey(uuid: string): string {
        const primary = this._primaryPart(uuid);
        const suffix = this._suffixPart(uuid);
        let head: string;
        try {
            const normalized = this._codec.normalize(primary);
            if (normalized.length === 32) {
                head = this._codec.compress(normalized);
            } else {
                head = normalized;
            }
        } catch {
            head = primary.replace(/-/g, '').toLowerCase();
        }
        return suffix != null ? `${head}@${suffix}` : head;
    }

    /**
     * @description 主 uuid 部分。
     * @param uuid 输入。
     * @returns 主串。
     */
    private _primaryPart(uuid: string): string {
        const at = uuid.indexOf('@');
        return at === -1 ? uuid.trim() : uuid.slice(0, at).trim();
    }

    /**
     * @description `@` 后后缀。
     * @param uuid 输入。
     * @returns 后缀或 undefined。
     */
    private _suffixPart(uuid: string): string | undefined {
        const at = uuid.indexOf('@');
        if (at === -1) {
            return undefined;
        }
        const suffix = uuid.slice(at + 1).trim();
        return suffix.length > 0 ? suffix : undefined;
    }

    /**
     * @description 转为带连字符 UUID（若可）。
     * @param uuid 输入。
     * @returns 连字符形态。
     */
    private _toDashed(uuid: string): string {
        const normalized = this._codec.normalize(this._primaryPart(uuid));
        if (normalized.length !== 32) {
            return uuid;
        }
        return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20)}`;
    }
}
