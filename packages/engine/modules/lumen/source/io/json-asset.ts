import { CompatibleUuid } from '@peanut/pod-engine/assets';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

import { LumenAtomicFileWriter } from './atomic-file-writer';
import { LumenCocosVersion } from '../schema/cocos-version';
import { LumenMetaImporterVersions } from '../schema/meta-importer-versions';

/**
 * @description JSON 资产的读盘 / 写盘 / 最小 meta（单对象或序列化数组）。
 */
export class LumenJsonAssetIo {
    /** @description meta importer 版本表。 */
    private readonly _metaVersions: LumenMetaImporterVersions;

    /**
     * @description 构造 IO。
     * @param metaVersions 可选版本表；默认包内策展
     */
    public constructor(metaVersions: LumenMetaImporterVersions = LumenMetaImporterVersions.shared()) {
        this._metaVersions = metaVersions;
    }
    /**
     * @description 读取 JSON 对象并校验 `__type__`。
     * @param projectRoot 项目根
     * @param relativePath 相对路径
     * @param allowedTypes 允许的 `__type__`
     * @param missingCode 缺失错误码
     * @param corruptCode 损坏错误码
     * @returns 记录
     */
    public readRecord(
        projectRoot: string,
        relativePath: string,
        allowedTypes: readonly string[],
        missingCode: string,
        corruptCode: string,
    ): Record<string, unknown> {
        const absolutePath = join(projectRoot, relativePath);
        if (!existsSync(absolutePath)) {
            throw new Error(`${missingCode}:${relativePath}`);
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(readFileSync(absolutePath, 'utf8'));
        } catch {
            throw new Error(`${corruptCode}:${relativePath}`);
        }
        if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error(`${corruptCode}:${relativePath}`);
        }
        const record = parsed as Record<string, unknown>;
        const typeName = record.__type__;
        if (typeof typeName !== 'string' || !allowedTypes.includes(typeName)) {
            throw new Error(`${corruptCode}:${relativePath}`);
        }
        return record;
    }

    /**
     * @description 读取 JSON 数组并校验首项 `__type__`。
     * @param projectRoot 项目根
     * @param relativePath 相对路径
     * @param allowedHeaderTypes 允许的首项 `__type__`
     * @param missingCode 缺失错误码
     * @param corruptCode 损坏错误码
     * @returns 条目数组
     */
    public readEntries(
        projectRoot: string,
        relativePath: string,
        allowedHeaderTypes: readonly string[],
        missingCode: string,
        corruptCode: string,
    ): Record<string, unknown>[] {
        const parsed = this.readJsonValue(projectRoot, relativePath, missingCode, corruptCode);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            throw new Error(`${corruptCode}:${relativePath}`);
        }
        const entries: Record<string, unknown>[] = [];
        for (const item of parsed) {
            if (item == null || typeof item !== 'object' || Array.isArray(item)) {
                throw new Error(`${corruptCode}:${relativePath}`);
            }
            entries.push(item as Record<string, unknown>);
        }
        const headerType = entries[0]?.__type__;
        if (typeof headerType !== 'string' || !allowedHeaderTypes.includes(headerType)) {
            throw new Error(`${corruptCode}:${relativePath}`);
        }
        return entries;
    }

    /**
     * @description 读取 JSON 对象或数组。
     * @param projectRoot 项目根
     * @param relativePath 相对路径
     * @param missingCode 缺失错误码
     * @param corruptCode 损坏错误码
     * @returns 解析值
     */
    public readJsonValue(
        projectRoot: string,
        relativePath: string,
        missingCode: string,
        corruptCode: string,
    ): unknown {
        const absolutePath = join(projectRoot, relativePath);
        if (!existsSync(absolutePath)) {
            throw new Error(`${missingCode}:${relativePath}`);
        }
        try {
            return JSON.parse(readFileSync(absolutePath, 'utf8')) as unknown;
        } catch {
            throw new Error(`${corruptCode}:${relativePath}`);
        }
    }

    /**
     * @description 写回 JSON 与最小 meta。
     * @param projectRoot 项目根
     * @param relativePath 相对路径
     * @param record 记录
     * @param importer meta importer
     * @param writeMetaIfMissing 缺少 meta 时是否创建
     * @param cocosVersion Creator 版本（决定 meta `ver`）
     */
    public writeRecord(
        projectRoot: string,
        relativePath: string,
        record: Readonly<Record<string, unknown>>,
        importer: string,
        writeMetaIfMissing: boolean,
        cocosVersion: LumenCocosVersion = LumenCocosVersion.DEFAULT,
    ): void {
        this.writeJsonValue(projectRoot, relativePath, record, importer, writeMetaIfMissing, cocosVersion);
    }

    /**
     * @description 写回 JSON 数组与最小 meta。
     * @param projectRoot 项目根
     * @param relativePath 相对路径
     * @param entries 条目
     * @param importer meta importer
     * @param writeMetaIfMissing 缺少 meta 时是否创建
     * @param cocosVersion Creator 版本（决定 meta `ver`）
     */
    public writeEntries(
        projectRoot: string,
        relativePath: string,
        entries: readonly Readonly<Record<string, unknown>>[],
        importer: string,
        writeMetaIfMissing: boolean,
        cocosVersion: LumenCocosVersion = LumenCocosVersion.DEFAULT,
    ): void {
        this.writeJsonValue(projectRoot, relativePath, entries, importer, writeMetaIfMissing, cocosVersion);
    }

    /**
     * @description 写回 JSON 值与最小 meta。
     * @param projectRoot 项目根
     * @param relativePath 相对路径
     * @param value 对象或数组
     * @param importer meta importer
     * @param writeMetaIfMissing 缺少 meta 时是否创建
     * @param cocosVersion Creator 版本（决定 meta `ver`）
     */
    public writeJsonValue(
        projectRoot: string,
        relativePath: string,
        value: unknown,
        importer: string,
        writeMetaIfMissing: boolean,
        cocosVersion: LumenCocosVersion = LumenCocosVersion.DEFAULT,
    ): void {
        const absolutePath = join(projectRoot, relativePath);
        mkdirSync(dirname(absolutePath), { recursive: true });
        LumenAtomicFileWriter.writeUtf8(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
        if (writeMetaIfMissing) {
            this.writeMetaIfMissing(projectRoot, relativePath, importer, cocosVersion);
        }
    }

    /**
     * @description 解析 `{ __id__ }`。
     * @param value 引用
     * @returns 下标或 `null`
     */
    public readId(value: unknown): number | null {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }
        const id = (value as { __id__?: unknown }).__id__;
        return typeof id === 'number' && Number.isInteger(id) ? id : null;
    }

    /**
     * @description 解析可变数组内 `__id__` 指向的对象（可原地改）。
     * @param entries 序列化数组
     * @param value `{ __id__ }` 或内联对象
     * @returns 对象或 `null`
     */
    public resolveMutableEntry(
        entries: Record<string, unknown>[],
        value: unknown,
    ): Record<string, unknown> | null {
        const id = this.readId(value);
        if (id != null) {
            const entry = entries[id];
            return entry ?? null;
        }
        if (value != null && typeof value === 'object' && !Array.isArray(value)) {
            return value as Record<string, unknown>;
        }
        return null;
    }

    /**
     * @description 缺少 `.meta` 时写入最小 importer 记录。
     * @param projectRoot 项目根
     * @param relativePath 资产相对路径
     * @param importer meta `importer`
     * @param cocosVersion Creator 版本（决定 meta `ver`）
     */
    public writeMetaIfMissing(
        projectRoot: string,
        relativePath: string,
        importer: string,
        cocosVersion: LumenCocosVersion = LumenCocosVersion.DEFAULT,
    ): void {
        const metaPath = `${join(projectRoot, relativePath)}.meta`;
        if (existsSync(metaPath)) {
            return;
        }
        mkdirSync(dirname(metaPath), { recursive: true });
        LumenAtomicFileWriter.writeUtf8(
            metaPath,
            `${JSON.stringify(
                {
                    ver: this.resolveMetaVersion(importer, cocosVersion),
                    importer,
                    imported: false,
                    uuid: CompatibleUuid.create(),
                    files: [],
                    subMetas: {},
                    userData: {},
                },
                null,
                2,
            )}\n`,
        );
    }

    /**
     * @description 按 Creator 版本与 importer 解析 meta `ver`。
     * @param importer meta `importer` 字段
     * @param cocosVersion Creator 版本
     * @returns 版本字符串
     */
    public resolveMetaVersion(
        importer: string,
        cocosVersion: LumenCocosVersion = LumenCocosVersion.DEFAULT,
    ): string {
        return this._metaVersions.resolve(cocosVersion, importer);
    }

    /**
     * @description 读取 `{ __uuid__ }` 或字符串 uuid。
     * @param value 序列化值
     * @returns uuid 或 `null`
     */
    public readUuid(value: unknown): string | null {
        if (value == null) {
            return null;
        }
        if (typeof value === 'string') {
            return value;
        }
        if (typeof value === 'object' && !Array.isArray(value)) {
            const uuid = (value as { __uuid__?: unknown }).__uuid__;
            return typeof uuid === 'string' ? uuid : null;
        }
        return null;
    }

    /**
     * @description 编码 uuid 引用。
     * @param value uuid 或 `null`
     * @param expectedType 可选 `__expectedType__`
     * @returns 序列化值
     */
    public encodeUuid(value: unknown, expectedType?: string): Record<string, unknown> | null {
        if (value === null) {
            return null;
        }
        if (typeof value !== 'string' || value.trim().length === 0) {
            throw new Error('lumen_property_type:uuid');
        }
        const encoded: Record<string, unknown> = { __uuid__: value.trim() };
        if (expectedType != null) {
            encoded.__expectedType__ = expectedType;
        }
        return encoded;
    }

    /**
     * @description 深拷贝 JSON 值。
     * @param value 任意 JSON
     * @returns 拷贝
     */
    public cloneJson(value: unknown): unknown {
        return JSON.parse(JSON.stringify(value)) as unknown;
    }
}
