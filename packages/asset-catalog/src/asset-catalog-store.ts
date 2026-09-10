import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

import type { AssetCatalogBucket, IAssetCatalogDocument, IAssetCatalogEntry } from './catalog-types';
import { AssetCatalogBuckets } from './asset-catalog-buckets';

/**
 * @description 目录摘要（给人/AI 先看规模，不承载全量条目）。
 */
export interface IAssetCatalogSummary {
    /** @description schema 版本。 */
    readonly schemaVersion: 1;
    /** @description 生成时间。 */
    readonly generatedAt: string;
    /** @description 项目根。 */
    readonly projectRoot: string;
    /** @description 资产根名。 */
    readonly assetRoot: string;
    /** @description 各类型计数。 */
    readonly counts: IAssetCatalogDocument['counts'];
    /** @description 冲突数量。 */
    readonly conflictCount: number;
    /** @description 冲突列表。 */
    readonly conflicts: IAssetCatalogDocument['conflicts'];
    /** @description 分片相对路径提示。 */
    readonly shards: {
        /** @description 摘要文件名。 */
        readonly summary: string;
        /** @description UUID 倒排文件名。 */
        readonly uuidMap: string;
        /** @description 分桶目录名。 */
        readonly bucketsDirectory: string;
    };
}

/**
 * @description UUID 倒排中的精简条目（供按 uuid 秒查）。
 */
export interface IAssetCatalogUuidMapEntry {
    /** @description 资源类型。 */
    readonly type: AssetCatalogBucket;
    /** @description 资源路径。 */
    readonly path: string;
    /** @description 压缩 UUID。 */
    readonly compressedUuid: string;
    /** @description 文件名。 */
    readonly name: string;
    /** @description Bundle 路径。 */
    readonly bundle: string;
    /** @description 父 UUID。 */
    readonly parentUuid: string;
    /** @description 显示名。 */
    readonly displayName: string;
    /** @description importer。 */
    readonly importer: string;
}

/**
 * @description 分片落盘与按需读取；避免 AI/工具一次吞入全量 JSON。
 */
export class AssetCatalogStore {
    /** @description 完整目录文件名（调试用，默认仍写但非查询主路径）。 */
    public static readonly catalogFileName = 'catalog.json';
    /** @description 摘要文件名。 */
    public static readonly summaryFileName = 'summary.json';
    /** @description UUID 倒排文件名。 */
    public static readonly uuidMapFileName = 'uuid-map.json';
    /** @description 分桶目录名。 */
    public static readonly bucketsDirectoryName = 'buckets';
    /** @description 兼容旧版 by-type 文件名。 */
    public static readonly byTypeFileName = 'by-type.json';

    /**
     * @description 将目录文档写成摘要 + UUID 倒排 + 分类型分片。
     * @param outputDirectory 输出目录绝对路径。
     * @param document 目录文档。
     * @returns 摘要文件路径。
     */
    public write(outputDirectory: string, document: IAssetCatalogDocument): string {
        mkdirSync(outputDirectory, { recursive: true });
        const bucketsDirectory = join(outputDirectory, AssetCatalogStore.bucketsDirectoryName);
        mkdirSync(bucketsDirectory, { recursive: true });

        const summary: IAssetCatalogSummary = {
            schemaVersion: 1,
            generatedAt: document.generatedAt,
            projectRoot: document.projectRoot,
            assetRoot: document.assetRoot,
            counts: document.counts,
            conflictCount: document.conflicts.length,
            conflicts: document.conflicts,
            shards: {
                summary: AssetCatalogStore.summaryFileName,
                uuidMap: AssetCatalogStore.uuidMapFileName,
                bucketsDirectory: AssetCatalogStore.bucketsDirectoryName,
            },
        };
        const summaryPath = join(outputDirectory, AssetCatalogStore.summaryFileName);
        writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

        const uuidMap: Record<string, IAssetCatalogUuidMapEntry> = {};
        for (const [uuid, entry] of Object.entries(document.uuidMap)) {
            uuidMap[uuid] = this._toUuidMapEntry(entry);
        }
        writeFileSync(join(outputDirectory, AssetCatalogStore.uuidMapFileName), `${JSON.stringify(uuidMap)}\n`, 'utf8');

        for (const bucket of AssetCatalogBuckets.all) {
            writeFileSync(
                join(bucketsDirectory, `${bucket}.json`),
                `${JSON.stringify(document.byType[bucket])}\n`,
                'utf8',
            );
        }

        // 保留精简全量文件供人工排查；查询路径不读它。
        writeFileSync(join(outputDirectory, AssetCatalogStore.catalogFileName), `${JSON.stringify(document)}\n`, 'utf8');
        try {
            unlinkSync(join(outputDirectory, AssetCatalogStore.byTypeFileName));
        } catch {
            // 旧文件不存在时忽略。
        }
        return summaryPath;
    }

    /**
     * @description 读取摘要。
     * @param outputDirectory 输出目录。
     * @returns 摘要文档。
     */
    public readSummary(outputDirectory: string): IAssetCatalogSummary {
        const summaryPath = join(outputDirectory, AssetCatalogStore.summaryFileName);
        const parsed = this._parseJson(readFileSync(summaryPath, 'utf8'), summaryPath);
        if (!this._isSummary(parsed)) {
            throw new Error(`catalog_summary_invalid:${summaryPath}`);
        }
        return parsed;
    }

    /**
     * @description 读取完整 UUID 倒排表。
     * @param outputDirectory 输出目录。
     * @returns UUID → 精简条目。
     */
    public readUuidMap(outputDirectory: string): Readonly<Record<string, IAssetCatalogUuidMapEntry>> {
        const mapPath = join(outputDirectory, AssetCatalogStore.uuidMapFileName);
        const parsed = this._parseJson(readFileSync(mapPath, 'utf8'), mapPath);
        if (!this._isRecord(parsed)) {
            throw new Error(`uuid_map_invalid:${mapPath}`);
        }
        const result: Record<string, IAssetCatalogUuidMapEntry> = {};
        for (const [uuid, value] of Object.entries(parsed)) {
            if (this._isUuidMapEntry(value)) {
                result[uuid] = value;
            }
        }
        return result;
    }

    /**
     * @description 按 UUID 从倒排表读取单条。
     * @param outputDirectory 输出目录。
     * @param uuid 资源 UUID。
     * @returns 命中条目；未命中返回 null。
     */
    public readByUuid(outputDirectory: string, uuid: string): IAssetCatalogEntry | null {
        const map = this.readUuidMap(outputDirectory);
        const hit = map[uuid];
        if (hit == null) {
            return null;
        }
        return this._fromUuidMapEntry(uuid, hit);
    }

    /**
     * @description 读取单个类型分片。
     * @param outputDirectory 输出目录。
     * @param type 类型分桶。
     * @returns 该类型条目列表。
     */
    public readBucket(outputDirectory: string, type: AssetCatalogBucket): readonly IAssetCatalogEntry[] {
        const bucketPath = join(outputDirectory, AssetCatalogStore.bucketsDirectoryName, `${type}.json`);
        const parsed = this._parseJson(readFileSync(bucketPath, 'utf8'), bucketPath);
        if (!Array.isArray(parsed)) {
            throw new Error(`bucket_json_invalid:${bucketPath}`);
        }
        return parsed.filter((item): item is IAssetCatalogEntry => this._isEntry(item));
    }

    /**
     * @description 列出可读取的类型分片（存在对应文件）。
     * @param outputDirectory 输出目录。
     * @returns 类型列表。
     */
    public listBuckets(outputDirectory: string): readonly AssetCatalogBucket[] {
        const bucketsDirectory = join(outputDirectory, AssetCatalogStore.bucketsDirectoryName);
        const names = readdirSync(bucketsDirectory);
        return AssetCatalogBuckets.all.filter((bucket) => names.includes(`${bucket}.json`));
    }

    /**
     * @description 兼容读取旧版完整 catalog.json。
     * @param outputDirectory 输出目录。
     * @returns 目录文档。
     */
    public read(outputDirectory: string): IAssetCatalogDocument {
        const catalogPath = join(outputDirectory, AssetCatalogStore.catalogFileName);
        const parsed = this._parseJson(readFileSync(catalogPath, 'utf8'), catalogPath);
        if (!this._isDocument(parsed)) {
            throw new Error(`catalog_schema_invalid:${catalogPath}`);
        }
        return parsed;
    }

    /**
     * @description 将完整条目压成 UUID 倒排精简结构。
     * @param entry 完整条目。
     * @returns 精简倒排条目。
     */
    private _toUuidMapEntry(entry: IAssetCatalogEntry): IAssetCatalogUuidMapEntry {
        return {
            type: entry.type,
            path: entry.path,
            compressedUuid: entry.compressedUuid,
            name: entry.name,
            bundle: entry.bundle,
            parentUuid: entry.parentUuid,
            displayName: entry.displayName,
            importer: entry.importer,
        };
    }

    /**
     * @description 从 UUID 倒排还原完整条目。
     * @param uuid UUID。
     * @param entry 精简条目。
     * @returns 完整条目。
     */
    private _fromUuidMapEntry(uuid: string, entry: IAssetCatalogUuidMapEntry): IAssetCatalogEntry {
        return {
            type: entry.type,
            path: entry.path,
            uuid,
            compressedUuid: entry.compressedUuid,
            importer: entry.importer,
            name: entry.name,
            bundle: entry.bundle,
            parentUuid: entry.parentUuid,
            displayName: entry.displayName,
        };
    }

    /**
     * @description 解析 JSON 文本。
     * @param rawText 原始文本。
     * @param sourcePath 来源路径。
     * @returns 解析值。
     */
    private _parseJson(rawText: string, sourcePath: string): unknown {
        try {
            return JSON.parse(rawText) as unknown;
        } catch {
            throw new Error(`catalog_json_invalid:${sourcePath}`);
        }
    }

    /**
     * @description 判断是否为摘要文档。
     * @param value 待校验值。
     * @returns 是否摘要。
     */
    private _isSummary(value: unknown): value is IAssetCatalogSummary {
        if (!this._isRecord(value)) {
            return false;
        }
        return value.schemaVersion === 1
            && typeof value.generatedAt === 'string'
            && typeof value.projectRoot === 'string'
            && typeof value.counts === 'object'
            && value.counts != null
            && typeof value.conflictCount === 'number'
            && Array.isArray(value.conflicts);
    }

    /**
     * @description 判断是否为完整目录文档。
     * @param value 待校验值。
     * @returns 是否文档。
     */
    private _isDocument(value: unknown): value is IAssetCatalogDocument {
        if (!this._isRecord(value)) {
            return false;
        }
        return value.schemaVersion === 1
            && typeof value.generatedAt === 'string'
            && typeof value.projectRoot === 'string'
            && typeof value.assetRoot === 'string'
            && typeof value.counts === 'object'
            && value.counts != null
            && typeof value.byType === 'object'
            && value.byType != null
            && typeof value.uuidMap === 'object'
            && value.uuidMap != null
            && Array.isArray(value.conflicts);
    }

    /**
     * @description 判断是否为条目。
     * @param value 待校验值。
     * @returns 是否条目。
     */
    private _isEntry(value: unknown): value is IAssetCatalogEntry {
        if (!this._isRecord(value)) {
            return false;
        }
        return typeof value.type === 'string'
            && typeof value.path === 'string'
            && typeof value.uuid === 'string'
            && typeof value.compressedUuid === 'string'
            && typeof value.importer === 'string'
            && typeof value.name === 'string';
    }

    /**
     * @description 判断是否为 UUID 倒排精简条目。
     * @param value 待校验值。
     * @returns 是否精简条目。
     */
    private _isUuidMapEntry(value: unknown): value is IAssetCatalogUuidMapEntry {
        if (!this._isRecord(value)) {
            return false;
        }
        return typeof value.type === 'string'
            && typeof value.path === 'string'
            && typeof value.compressedUuid === 'string'
            && typeof value.name === 'string'
            && typeof value.importer === 'string';
    }

    /**
     * @description 判断是否为普通对象。
     * @param value 待校验值。
     * @returns 是否对象。
     */
    private _isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value != null && !Array.isArray(value);
    }
}
