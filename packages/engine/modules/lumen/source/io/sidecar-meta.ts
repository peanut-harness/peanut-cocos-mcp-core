import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

import { LumenAtomicFileWriter } from './atomic-file-writer';

/**
 * @description 旁路 `.meta` 读写：默认只改 meta；`saveSourceAndMeta` 用于 scaffold 后尚未落盘的源文件。
 */
export class LumenSidecarMetaIo {
    /**
     * @description 打开已有源文件与 `.meta`，并校验 importer。
     * @param projectRoot 项目根
     * @param relativePath 相对路径
     * @param allowedImporters 允许的 importer
     * @param missingCode 源缺失错误码
     * @param metaMissingCode meta 缺失错误码
     * @param corruptCode meta 损坏错误码
     * @returns meta 记录
     */
    public open(
        projectRoot: string,
        relativePath: string,
        allowedImporters: readonly string[],
        missingCode: string,
        metaMissingCode: string,
        corruptCode: string,
    ): Record<string, unknown> {
        const absolutePath = join(projectRoot, relativePath);
        if (!existsSync(absolutePath)) {
            throw new Error(`${missingCode}:${relativePath}`);
        }
        const metaPath = `${absolutePath}.meta`;
        if (!existsSync(metaPath)) {
            throw new Error(`${metaMissingCode}:${relativePath}`);
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(readFileSync(metaPath, 'utf8'));
        } catch {
            throw new Error(`${corruptCode}:${relativePath}`);
        }
        if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error(`${corruptCode}:${relativePath}`);
        }
        const meta = parsed as Record<string, unknown>;
        if (typeof meta.importer !== 'string' || !allowedImporters.includes(meta.importer)) {
            throw new Error(`${corruptCode}:${relativePath}`);
        }
        return meta;
    }

    /**
     * @description 原子写回 `.meta`；源文件必须仍在。
     * @param projectRoot 项目根
     * @param relativePath 相对路径
     * @param meta meta 记录
     * @param missingCode 源缺失错误码
     */
    public save(
        projectRoot: string,
        relativePath: string,
        meta: Readonly<Record<string, unknown>>,
        missingCode: string,
    ): void {
        const absolutePath = join(projectRoot, relativePath);
        if (!existsSync(absolutePath)) {
            throw new Error(`${missingCode}:${relativePath}`);
        }
        mkdirSync(dirname(absolutePath), { recursive: true });
        LumenAtomicFileWriter.writeUtf8(`${absolutePath}.meta`, `${JSON.stringify(meta, null, 2)}\n`);
    }

    /**
     * @description 同时写源文件与 `.meta`（scaffold 后尚未落盘的 LabelAtlas / Auto Atlas）。
     * @param projectRoot 项目根
     * @param relativePath 相对路径
     * @param source 源文本
     * @param meta meta 记录
     */
    public saveSourceAndMeta(
        projectRoot: string,
        relativePath: string,
        source: string,
        meta: Readonly<Record<string, unknown>>,
    ): void {
        const absolutePath = join(projectRoot, relativePath);
        mkdirSync(dirname(absolutePath), { recursive: true });
        LumenAtomicFileWriter.writeUtf8(absolutePath, source);
        LumenAtomicFileWriter.writeUtf8(`${absolutePath}.meta`, `${JSON.stringify(meta, null, 2)}\n`);
    }

    /**
     * @description 读取旁路 `.meta` 的 importer；缺失或损坏时返回 `null`。
     * @param projectRoot 项目根
     * @param relativePath 相对路径
     * @returns importer 或 `null`
     */
    public peekImporter(projectRoot: string, relativePath: string): string | null {
        const metaPath = `${join(projectRoot, relativePath)}.meta`;
        if (!existsSync(metaPath)) {
            return null;
        }
        let parsed: unknown;
        try {
            parsed = JSON.parse(readFileSync(metaPath, 'utf8'));
        } catch {
            return null;
        }
        if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return null;
        }
        const importer = (parsed as Record<string, unknown>).importer;
        return typeof importer === 'string' && importer.length > 0 ? importer : null;
    }

    /**
     * @description 读取非空字符串。
     * @param value 未受信值
     * @param errorCode 错误码
     * @returns 字符串
     */
    public readRequiredString(value: unknown, errorCode: string): string {
        if (typeof value !== 'string' || value.length === 0) {
            throw new Error(errorCode);
        }
        return value;
    }

    /**
     * @description 确保 userData 对象存在。
     * @param meta meta 根
     * @returns userData
     */
    public ensureUserData(meta: Record<string, unknown>): Record<string, unknown> {
        const existing = meta.userData;
        if (existing != null && typeof existing === 'object' && !Array.isArray(existing)) {
            return existing as Record<string, unknown>;
        }
        const created: Record<string, unknown> = {};
        meta.userData = created;
        return created;
    }

    /**
     * @description 读取可选对象。
     * @param value 未受信值
     * @returns 对象
     */
    public readOptionalRecord(value: unknown): Record<string, unknown> {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            return {};
        }
        return value as Record<string, unknown>;
    }

    /**
     * @description 深拷贝 JSON 记录。
     * @param value 记录
     * @returns 拷贝
     */
    public cloneRecord(value: Readonly<Record<string, unknown>>): Record<string, unknown> {
        return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
    }

    /**
     * @description 拒绝不在白名单内的补丁字段。
     * @param value 补丁
     * @param allowed 允许字段
     * @param errorPrefix 错误前缀
     */
    public assertOnlyFields(
        value: Readonly<Record<string, unknown>>,
        allowed: readonly string[],
        errorPrefix: string,
    ): void {
        const allowedSet = new Set(allowed);
        for (const key of Object.keys(value)) {
            if (!allowedSet.has(key)) {
                throw new Error(`${errorPrefix}:${key}:allowed=${allowed.join(',')}`);
            }
        }
    }

    /**
     * @description 校验有限数字范围。
     * @param value 未受信值
     * @param fieldName 字段名
     * @param minimum 最小值
     * @param maximum 最大值
     * @param integer 是否整数
     * @param errorPrefix 错误前缀
     * @returns 数字
     */
    public requireRange(
        value: unknown,
        fieldName: string,
        minimum: number,
        maximum: number,
        integer: boolean,
        errorPrefix: string,
    ): number {
        if (
            typeof value !== 'number' ||
            !Number.isFinite(value) ||
            value < minimum ||
            value > maximum ||
            (integer && !Number.isInteger(value))
        ) {
            throw new Error(`${errorPrefix}:${fieldName}:${minimum}..${maximum}`);
        }
        return value;
    }
}
