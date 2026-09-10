/**
 * @description 已解析的 Creator `.meta` 文档。
 */
export interface IParsedAssetMeta {
    /** @description 主资源 UUID。 */
    readonly uuid: string;
    /** @description importer 名称。 */
    readonly importer: string;
    /** @description 目录是否声明为 Asset Bundle。 */
    readonly isBundle: boolean;
    /** @description 子资源列表。 */
    readonly subMetas: readonly IParsedAssetSubMeta[];
}

/**
 * @description 已解析的 meta 子资源。
 */
export interface IParsedAssetSubMeta {
    /** @description 子资源 UUID（含 `@` 后缀）。 */
    readonly uuid: string;
    /** @description 子资源 importer。 */
    readonly importer: string;
    /** @description 显示名。 */
    readonly displayName: string;
    /** @description 子资源逻辑名。 */
    readonly name: string;
}

/**
 * @description 解析并校验 Creator `.meta` JSON。
 */
export class AssetMetaParser {
    /**
     * @description 将 meta 文件文本解析为结构化文档。
     * @param rawText meta 文件原始文本。
     * @param sourcePath 用于错误诊断的路径。
     * @returns 解析后的 meta 文档。
     */
    public parse(rawText: string, sourcePath: string): IParsedAssetMeta {
        let parsed: unknown;
        try {
            parsed = JSON.parse(rawText) as unknown;
        } catch {
            throw new Error(`meta_json_invalid:${sourcePath}`);
        }
        if (!this._isRecord(parsed)) {
            throw new Error(`meta_root_invalid:${sourcePath}`);
        }
        const uuid = parsed.uuid;
        const importer = parsed.importer;
        if (typeof uuid !== 'string' || uuid.trim().length === 0) {
            throw new Error(`meta_uuid_missing:${sourcePath}`);
        }
        if (typeof importer !== 'string' || importer.trim().length === 0) {
            throw new Error(`meta_importer_missing:${sourcePath}`);
        }
        const userData = parsed.userData;
        const isBundle = this._isRecord(userData) && userData.isBundle === true;
        const subMetasRaw = parsed.subMetas;
        const subMetas: IParsedAssetSubMeta[] = [];
        if (subMetasRaw != null) {
            if (!this._isRecord(subMetasRaw)) {
                throw new Error(`meta_submetas_invalid:${sourcePath}`);
            }
            for (const value of Object.values(subMetasRaw)) {
                if (!this._isRecord(value)) {
                    continue;
                }
                if (typeof value.uuid !== 'string' || typeof value.importer !== 'string') {
                    continue;
                }
                subMetas.push({
                    uuid: value.uuid,
                    importer: value.importer,
                    displayName: typeof value.displayName === 'string' ? value.displayName : '',
                    name: typeof value.name === 'string' ? value.name : '',
                });
            }
        }
        return {
            uuid,
            importer,
            isBundle,
            subMetas,
        };
    }

    /**
     * @description 判断值是否为普通对象记录。
     * @param value 待检查值。
     * @returns 为记录时返回 true。
     */
    private _isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value != null && !Array.isArray(value);
    }
}
