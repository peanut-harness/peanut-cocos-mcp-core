/**
 * @description 按 Creator 版本解析资产 `.meta` 的 importer `ver`（策展 `meta-importers.json`）。
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { LumenPackageRoot } from '../package-root';
import { LumenCocosVersion } from './cocos-version';

/**
 * @description 一个 Creator 版本区间内的 importer → meta ver。
 */
interface ILumenMetaImporterRange {
    /**
     * @description 含该版本起生效。
     */
    readonly since: LumenCocosVersion;

    /**
     * @description 不含该版本起失效；省略表示无上界。
     */
    readonly until: LumenCocosVersion | null;

    /**
     * @description importer 名 → meta `ver`。
     */
    readonly importers: Readonly<Record<string, string>>;
}

/**
 * @description 策展文档形状。
 */
interface ILumenMetaImportersDocument {
    /**
     * @description 固定 `meta-importers`。
     */
    readonly kind: 'meta-importers';

    /**
     * @description 版本区间表。
     */
    readonly ranges: readonly ILumenMetaImporterRange[];

    /**
     * @description 表内无该 importer 时的回退 ver。
     */
    readonly fallbackImporterVer: string;
}

/**
 * @description 按会话 `cocosVersion` 选择正确的 meta importer `ver`。
 */
export class LumenMetaImporterVersions {
    /** @description 默认单例（包内策展表）。 */
    private static _shared: LumenMetaImporterVersions | null = null;

    /** @description 已加载的策展表。 */
    private readonly _document: ILumenMetaImportersDocument;

    /**
     * @description 使用已解析文档构造。
     * @param document 策展文档
     */
    public constructor(document: ILumenMetaImportersDocument) {
        this._document = document;
    }

    /**
     * @description 包内默认表（单例）。
     * @returns 版本表服务
     */
    public static shared(): LumenMetaImporterVersions {
        if (LumenMetaImporterVersions._shared == null) {
            LumenMetaImporterVersions._shared = LumenMetaImporterVersions.loadFromSchemaRoot(
                LumenPackageRoot.resolveSchema(),
            );
        }
        return LumenMetaImporterVersions._shared;
    }

    /**
     * @description 从策展根目录加载。
     * @param schemaRoot 含 `meta-importers.json` 的目录
     * @returns 版本表服务
     */
    public static loadFromSchemaRoot(schemaRoot: string): LumenMetaImporterVersions {
        const absolutePath = join(schemaRoot, 'meta-importers.json');
        if (!existsSync(absolutePath)) {
            throw new Error(`lumen_meta_importers_missing:${absolutePath}`);
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(readFileSync(absolutePath, 'utf8'));
        } catch {
            throw new Error(`lumen_meta_importers_json_corrupt:${absolutePath}`);
        }
        return new LumenMetaImporterVersions(LumenMetaImporterVersions._parseDocument(parsed));
    }

    /**
     * @description 解析指定 Creator 版本下某 importer 应写入的 meta `ver`。
     * @param cocosVersion 会话 / 工程 Creator 版本
     * @param importer meta `importer` 字段
     * @returns meta `ver` 字符串
     */
    public resolve(cocosVersion: LumenCocosVersion, importer: string): string {
        const trimmed = importer.trim();
        if (trimmed.length === 0) {
            throw new Error('lumen_meta_importer_empty');
        }
        const range = this._selectRange(cocosVersion);
        const mapped = range.importers[trimmed];
        if (typeof mapped === 'string' && mapped.trim().length > 0) {
            return mapped.trim();
        }
        return this._document.fallbackImporterVer;
    }

    /**
     * @description 选择覆盖该 Creator 版本的区间；无精确覆盖时取 `since <= version` 中最新一档。
     * @param cocosVersion Creator 版本
     * @returns 区间
     */
    private _selectRange(cocosVersion: LumenCocosVersion): ILumenMetaImporterRange {
        const exact = this._document.ranges.filter((range) => {
            if (cocosVersion.compare(range.since) < 0) {
                return false;
            }
            if (range.until != null && cocosVersion.compare(range.until) >= 0) {
                return false;
            }
            return true;
        });
        if (exact.length > 0) {
            const selected = exact[exact.length - 1];
            if (selected == null) {
                throw new Error('lumen_meta_importers_empty');
            }
            return selected;
        }
        const floor = this._document.ranges.filter((range) => cocosVersion.compare(range.since) >= 0);
        if (floor.length > 0) {
            const selected = floor[floor.length - 1];
            if (selected == null) {
                throw new Error('lumen_meta_importers_empty');
            }
            return selected;
        }
        const first = this._document.ranges[0];
        if (first == null) {
            throw new Error('lumen_meta_importers_empty');
        }
        return first;
    }

    /**
     * @description 解析并校验策展 JSON。
     * @param raw 原始 JSON
     * @returns 文档
     */
    private static _parseDocument(raw: unknown): ILumenMetaImportersDocument {
        if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new Error('lumen_meta_importers_json_corrupt:root');
        }
        const record = raw as Record<string, unknown>;
        if (record.kind !== 'meta-importers') {
            throw new Error('lumen_meta_importers_json_corrupt:kind');
        }
        if (typeof record.fallbackImporterVer !== 'string' || record.fallbackImporterVer.trim().length === 0) {
            throw new Error('lumen_meta_importers_json_corrupt:fallbackImporterVer');
        }
        if (!Array.isArray(record.ranges) || record.ranges.length === 0) {
            throw new Error('lumen_meta_importers_json_corrupt:ranges');
        }
        const ranges: ILumenMetaImporterRange[] = [];
        for (const item of record.ranges) {
            if (item == null || typeof item !== 'object' || Array.isArray(item)) {
                throw new Error('lumen_meta_importers_json_corrupt:range');
            }
            const row = item as Record<string, unknown>;
            if (typeof row.since !== 'string') {
                throw new Error('lumen_meta_importers_json_corrupt:since');
            }
            let until: LumenCocosVersion | null = null;
            if (row.until != null) {
                if (typeof row.until !== 'string') {
                    throw new Error('lumen_meta_importers_json_corrupt:until');
                }
                until = LumenCocosVersion.parse(row.until);
            }
            if (row.importers == null || typeof row.importers !== 'object' || Array.isArray(row.importers)) {
                throw new Error('lumen_meta_importers_json_corrupt:importers');
            }
            const importers: Record<string, string> = {};
            for (const [key, value] of Object.entries(row.importers as Record<string, unknown>)) {
                if (typeof value !== 'string' || value.trim().length === 0) {
                    throw new Error(`lumen_meta_importers_json_corrupt:importer:${key}`);
                }
                importers[key] = value.trim();
            }
            ranges.push({
                since: LumenCocosVersion.parse(row.since),
                until,
                importers,
            });
        }
        ranges.sort((left, right) => left.since.compare(right.since));
        return {
            kind: 'meta-importers',
            ranges,
            fallbackImporterVer: record.fallbackImporterVer.trim(),
        };
    }
}
