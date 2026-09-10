/**
 * @description Creator 图片 / AutoAtlas 压缩纹理 `userData.compressSettings` 编解码（含平台覆盖）。
 */

/** @description `compressSettings` 内保留键，不作为平台名。 */
const RESERVED_KEYS = new Set(['useCompressTexture', 'presetId']);

/**
 * @description Creator 纹理压缩平台覆盖键（项目设置平台大类 + 常见小游戏子平台）。
 */
export const LUMEN_TEXTURE_COMPRESS_PLATFORM_KEYS = [
    'web',
    'ios',
    'miniGame',
    'android',
    'wechatgame',
    'bytedance',
    'alipay',
    'taobao',
    'oppo',
    'vivo',
    'huawei',
    'honor',
] as const;

/**
 * @description 单平台压缩覆盖。
 */
export interface ILumenCompressPlatformOverride {
    /** @description 是否启用压缩纹理；省略表示不改默认开关。 */
    readonly useCompressTexture?: boolean;
    /** @description 压缩预设 id；空串表示清除该平台覆盖。 */
    readonly presetId?: string;
}

/**
 * @description 压缩纹理设置快照（默认 + 平台覆盖）。
 */
export interface ILumenCompressSettingsSnapshot {
    /** @description 默认是否启用压缩纹理。 */
    readonly useCompressTexture: boolean;
    /** @description 默认压缩预设 id；未绑定时为空串。 */
    readonly presetId: string;
    /** @description 平台覆盖表；键为 Creator 平台 id。 */
    readonly platforms: Readonly<Record<string, ILumenCompressPlatformOverride>>;
}

/**
 * @description 读写 `meta.userData.compressSettings` 并与顶层 `useCompressTexture` / `presetId` 同步。
 */
export class LumenCompressSettingsCodec {
    /**
     * @description 从 userData 读取压缩设置。
     * @param userData 图片或 AutoAtlas 的 meta.userData
     * @returns 压缩设置快照
     */
    public inspect(userData: Readonly<Record<string, unknown>>): ILumenCompressSettingsSnapshot {
        const nested = this._readOptionalRecord(userData.compressSettings);
        const useCompressTexture = this._readBoolean(
            nested.useCompressTexture ?? userData.useCompressTexture,
            false,
        );
        const presetId = this._readString(nested.presetId ?? userData.presetId);
        const platforms: Record<string, ILumenCompressPlatformOverride> = {};
        for (const [key, raw] of Object.entries(nested)) {
            if (RESERVED_KEYS.has(key)) {
                continue;
            }
            if (!this._isKnownPlatformKey(key)) {
                continue;
            }
            const record = this._readOptionalRecord(raw);
            const override: { useCompressTexture?: boolean; presetId?: string } = {};
            if (typeof record.useCompressTexture === 'boolean') {
                override.useCompressTexture = record.useCompressTexture;
            }
            if (typeof record.presetId === 'string') {
                override.presetId = record.presetId;
            }
            if (Object.keys(override).length > 0) {
                platforms[key] = override;
            }
        }
        return { useCompressTexture, presetId, platforms };
    }

    /**
     * @description 写入压缩设置补丁；同步顶层标量字段。
     * @param userData 可写 userData
     * @param patch 补丁（`useCompressTexture` / `presetId` / `platforms`）
     * @param errorPrefix 错误前缀（如 `lumen_image`）
     */
    public applyPatch(
        userData: Record<string, unknown>,
        patch: Readonly<Record<string, unknown>>,
        errorPrefix: string,
    ): void {
        this._assertOnlyFields(patch, ['useCompressTexture', 'presetId', 'platforms'], errorPrefix, 'compressSettings');
        const nested = this._ensureRecord(userData, 'compressSettings');
        if (patch.useCompressTexture !== undefined) {
            const value = this._requireBoolean(patch.useCompressTexture, `${errorPrefix}.compressSettings.useCompressTexture`);
            nested.useCompressTexture = value;
            userData.useCompressTexture = value;
        }
        if (patch.presetId !== undefined) {
            const presetId = this._requireString(patch.presetId, `${errorPrefix}.compressSettings.presetId`);
            if (presetId.length === 0) {
                delete nested.presetId;
                delete userData.presetId;
            } else {
                nested.presetId = presetId;
                userData.presetId = presetId;
            }
        }
        if (patch.platforms !== undefined) {
            const platformsPatch = this._requireRecord(
                patch.platforms,
                `${errorPrefix}.compressSettings.platforms`,
            );
            for (const [platformKey, rawOverride] of Object.entries(platformsPatch)) {
                this._requireKnownPlatform(platformKey, errorPrefix);
                if (rawOverride == null) {
                    delete nested[platformKey];
                    continue;
                }
                const overridePatch = this._requireRecord(
                    rawOverride,
                    `${errorPrefix}.compressSettings.platforms.${platformKey}`,
                );
                this._assertOnlyFields(
                    overridePatch,
                    ['useCompressTexture', 'presetId'],
                    errorPrefix,
                    `compressSettings.platforms.${platformKey}`,
                );
                const current = this._readOptionalRecord(nested[platformKey]);
                if (overridePatch.useCompressTexture !== undefined) {
                    current.useCompressTexture = this._requireBoolean(
                        overridePatch.useCompressTexture,
                        `${errorPrefix}.compressSettings.platforms.${platformKey}.useCompressTexture`,
                    );
                }
                if (overridePatch.presetId !== undefined) {
                    const presetId = this._requireString(
                        overridePatch.presetId,
                        `${errorPrefix}.compressSettings.platforms.${platformKey}.presetId`,
                    );
                    if (presetId.length === 0) {
                        delete current.presetId;
                    } else {
                        current.presetId = presetId;
                    }
                }
                if (Object.keys(current).length === 0) {
                    delete nested[platformKey];
                } else {
                    nested[platformKey] = current;
                }
            }
        }
        this._pruneEmptyCompressSettings(userData, nested);
    }

    /**
     * @description 顶层 `useCompressTexture` / `presetId` 写入后同步进 `compressSettings`。
     * @param userData 可写 userData
     */
    public syncTopLevelScalars(userData: Record<string, unknown>): void {
        const nested = this._ensureRecord(userData, 'compressSettings');
        if (typeof userData.useCompressTexture === 'boolean') {
            nested.useCompressTexture = userData.useCompressTexture;
        }
        if (typeof userData.presetId === 'string' && userData.presetId.length > 0) {
            nested.presetId = userData.presetId;
        } else if ('presetId' in userData && userData.presetId === undefined) {
            delete nested.presetId;
        }
        this._pruneEmptyCompressSettings(userData, nested);
    }

    /**
     * @description 判断平台键是否在已知列表中。
     * @param key 平台键
     * @returns 是否已知
     */
    private _isKnownPlatformKey(key: string): boolean {
        return (LUMEN_TEXTURE_COMPRESS_PLATFORM_KEYS as readonly string[]).includes(key);
    }

    /**
     * @description 校验平台键。
     * @param key 平台键
     * @param errorPrefix 错误前缀
     */
    private _requireKnownPlatform(key: string, errorPrefix: string): void {
        if (!this._isKnownPlatformKey(key)) {
            throw new Error(
                `${errorPrefix}_compress_platform_unknown:${key}:${LUMEN_TEXTURE_COMPRESS_PLATFORM_KEYS.join('|')}`,
            );
        }
    }

    /**
     * @description 空 `compressSettings` 时从 userData 移除。
     * @param userData userData
     * @param nested compressSettings 对象
     */
    private _pruneEmptyCompressSettings(
        userData: Record<string, unknown>,
        nested: Record<string, unknown>,
    ): void {
        if (Object.keys(nested).length === 0) {
            delete userData.compressSettings;
        } else {
            userData.compressSettings = nested;
        }
    }

    /**
     * @description 读取可选对象。
     * @param raw 原始值
     * @returns 对象或空记录
     */
    private _readOptionalRecord(raw: unknown): Record<string, unknown> {
        if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
            return {};
        }
        return { ...(raw as Record<string, unknown>) };
    }

    /**
     * @description 确保嵌套对象存在。
     * @param parent 父对象
     * @param key 键名
     * @returns 嵌套对象
     */
    private _ensureRecord(parent: Record<string, unknown>, key: string): Record<string, unknown> {
        const current = parent[key];
        if (current != null && typeof current === 'object' && !Array.isArray(current)) {
            return current as Record<string, unknown>;
        }
        const created: Record<string, unknown> = {};
        parent[key] = created;
        return created;
    }

    /**
     * @description 校验补丁仅含允许键。
     * @param patch 补丁
     * @param allowed 允许键
     * @param label 错误标签
     */
    private _assertOnlyFields(
        patch: Readonly<Record<string, unknown>>,
        allowed: readonly string[],
        errorPrefix: string,
        fieldPath: string,
    ): void {
        for (const key of Object.keys(patch)) {
            if (!allowed.includes(key)) {
                throw new Error(`${errorPrefix}_property_not_editable:${fieldPath}.${key}`);
            }
        }
    }

    /**
     * @description 校验对象为记录。
     * @param value 未受信值
     * @param label 错误标签
     * @returns 记录
     */
    private _requireRecord(value: unknown, label: string): Record<string, unknown> {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`${label}_property_type:object`);
        }
        return value as Record<string, unknown>;
    }

    /**
     * @description 读取布尔缺省。
     * @param raw 原始值
     * @param fallback 缺省
     * @returns 布尔
     */
    private _readBoolean(raw: unknown, fallback: boolean): boolean {
        return typeof raw === 'boolean' ? raw : fallback;
    }

    /**
     * @description 读取字符串缺省空串。
     * @param raw 原始值
     * @returns 字符串
     */
    private _readString(raw: unknown): string {
        return typeof raw === 'string' ? raw : '';
    }

    /**
     * @description 校验布尔。
     * @param value 未受信值
     * @param label 错误标签
     * @returns 布尔
     */
    private _requireBoolean(value: unknown, label: string): boolean {
        if (typeof value !== 'boolean') {
            throw new Error(`${label}_property_type:boolean`);
        }
        return value;
    }

    /**
     * @description 校验字符串。
     * @param value 未受信值
     * @param label 错误标签
     * @returns 字符串
     */
    private _requireString(value: unknown, label: string): string {
        if (typeof value !== 'string') {
            throw new Error(`${label}_property_type:string`);
        }
        return value;
    }
}
