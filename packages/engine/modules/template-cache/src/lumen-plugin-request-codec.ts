import { lumenTemplateCacheContracts as LumenPluginContracts } from './lumen-template-cache-contracts.js';

/**
 * @description 解析 Lumen 插件服务 / 面板的未受信请求。
 */
export class LumenPluginRequestCodec {
    /**
     * @description 解析导入源路径。
     * @param value 请求体：字符串路径，或含 sourceRoot / from / path 的对象
     * @returns 去空白后的绝对路径
     */
    public static readSourceRoot(value: unknown): string {
        const direct = this.readNonEmptyString(value);
        if (direct != null) {
            return direct;
        }
        const fromKeys = this.readStringFromKeys(value, LumenPluginContracts.sourceRootKeys);
        if (fromKeys != null) {
            return fromKeys;
        }
        throw new Error(LumenPluginContracts.errors.importSourceRootRequired);
    }

    /**
     * @description 解析编辑器刷新请求。
     * @param value 含 projectRoot 与可选 paths 的对象
     * @returns 项目根与相对路径列表
     */
    public static readEditorRefreshRequest(value: unknown): {
        readonly projectRoot: string;
        readonly paths: readonly string[];
    } {
        const record = this.readOptionalRecord(value);
        if (record == null) {
            throw new Error(LumenPluginContracts.errors.editorRefreshRequestInvalid);
        }
        const projectRoot = this.readNonEmptyString(record.projectRoot);
        if (projectRoot == null) {
            throw new Error(LumenPluginContracts.errors.editorRefreshProjectRootRequired);
        }
        return {
            projectRoot,
            paths: this._readPathList(this._firstDefined(record, LumenPluginContracts.refreshPathKeys)),
        };
    }

    /**
     * @description 把普通对象抄成可交给面板桥的 payload。
     * @param value 已由业务层产生的结果对象
     * @returns 字符串键的记录
     */
    public static toPayload(value: object): Record<string, unknown> {
        return this._copyRecord(value);
    }

    /**
     * @description 读取可选普通对象。
     * @param value 未受信输入
     * @returns 记录；非对象时为 null
     */
    public static readOptionalRecord(value: unknown): Record<string, unknown> | null {
        if (!this.isRecord(value)) {
            return null;
        }
        return this._copyRecord(value);
    }

    /**
     * @description 判断未知值是否为普通对象（保留原引用）。
     * @param value 未受信输入
     * @returns 是否为普通对象
     */
    public static isRecord(value: unknown): value is Record<string, unknown> {
        return value != null && typeof value === 'object' && !Array.isArray(value);
    }

    /**
     * @description 读取去空白后的非空字符串。
     * @param value 未受信输入
     * @returns 字符串；否则 null
     */
    public static readNonEmptyString(value: unknown): string | null {
        if (typeof value !== 'string') {
            return null;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    /**
     * @description 按候选字段读取第一个非空字符串。
     * @param value 对象或其它
     * @param keys 字段名
     * @returns 字符串；否则 null
     */
    public static readStringFromKeys(value: unknown, keys: readonly string[]): string | null {
        const record = this.readOptionalRecord(value);
        if (record == null) {
            return null;
        }
        return this.readNonEmptyString(this._firstDefined(record, keys));
    }

    /**
     * @description 按候选键取第一个已定义字段。
     * @param record 记录
     * @param keys 字段名
     * @returns 值或 undefined
     */
    private static _firstDefined(record: Record<string, unknown>, keys: readonly string[]): unknown {
        for (const key of keys) {
            if (key in record && record[key] !== undefined) {
                return record[key];
            }
        }
        return undefined;
    }

    /**
     * @description 浅拷贝可枚举字段。
     * @param value 普通对象
     * @returns 新记录
     */
    private static _copyRecord(value: object): Record<string, unknown> {
        const payload: Record<string, unknown> = {};
        for (const [key, entry] of Object.entries(value)) {
            payload[key] = entry;
        }
        return payload;
    }

    /**
     * @description 从 paths 或 path 字段收集非空字符串。
     * @param value 字符串或字符串数组
     * @returns 去空白后的路径列表
     */
    private static _readPathList(value: unknown): readonly string[] {
        const single = this.readNonEmptyString(value);
        if (single != null) {
            return [single];
        }
        if (!Array.isArray(value)) {
            return [];
        }
        const paths: string[] = [];
        for (const item of value) {
            const pathValue = this.readNonEmptyString(item);
            if (pathValue != null) {
                paths.push(pathValue);
            }
        }
        return paths;
    }
}
