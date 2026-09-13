/**
 * @description AssetDB 查询客户端可返回的资源快照（对齐 Creator AssetInfo 子集）。
 */
export interface IEditorAssetInfoSnapshot {
    /** @description 资源 uuid（可含 `@suffix`）。 */
    readonly uuid: string;
    /** @description importer 名。 */
    readonly importer: string;
    /** @description 显示或文件名。 */
    readonly name: string;
    /** @description `db://assets/...` 或相对路径。 */
    readonly url: string;
    /** @description 是否目录。 */
    readonly isDirectory?: boolean;
    /** @description 是否 Asset Bundle。 */
    readonly isBundle?: boolean;
    /** @description 子资源。 */
    readonly subAssets?: Readonly<Record<string, IEditorAssetInfoSnapshot>>;
}

/**
 * @description 可注入的 AssetDB 查询客户端（通常包装 `Editor.Message.request`）。
 */
export interface IAssetDbQueryClient {
    /**
     * @description 按条件批量查询资源。
     * @param options 查询选项。
     * @returns 资源快照列表。
     */
    queryAssets(options?: {
        readonly pattern?: string;
        readonly importer?: string | readonly string[];
    }): Promise<readonly IEditorAssetInfoSnapshot[]>;
}

/**
 * @description 通过 `Editor.Message.request('asset-db', ...)` 访问 AssetDB。
 */
export class EditorMessageAssetDbQueryClient implements IAssetDbQueryClient {
    /** @description Creator 消息请求函数。 */
    private readonly _request: (target: string, message: string, ...args: unknown[]) => Promise<unknown>;

    /**
     * @description 创建消息客户端。
     * @param request `Editor.Message.request` 兼容函数。
     */
    public constructor(request: (target: string, message: string, ...args: unknown[]) => Promise<unknown>) {
        this._request = request;
    }

    /**
     * @description 调用 `asset-db.query-assets` 并规范化结果。
     * @param options 查询选项。
     * @returns 资源快照。
     */
    public async queryAssets(options?: {
        readonly pattern?: string;
        readonly importer?: string | readonly string[];
    }): Promise<readonly IEditorAssetInfoSnapshot[]> {
        const raw = await this._request('asset-db', 'query-assets', {
            pattern: options?.pattern ?? 'db://assets/**/*',
            importer: options?.importer,
        });
        if (!Array.isArray(raw)) {
            throw new Error('asset_db_query_assets_invalid_result');
        }
        return raw.map((item) => this._readSnapshot(item));
    }

    /**
     * @description 将未知结果收窄为快照。
     * @param value 原始项。
     * @returns 快照。
     */
    private _readSnapshot(value: unknown): IEditorAssetInfoSnapshot {
        if (typeof value !== 'object' || value == null || Array.isArray(value)) {
            throw new Error('asset_db_asset_info_invalid');
        }
        const record = value as Record<string, unknown>;
        if (typeof record.uuid !== 'string' || record.uuid.length === 0) {
            throw new Error('asset_db_asset_info_uuid_missing');
        }
        if (typeof record.importer !== 'string') {
            throw new Error('asset_db_asset_info_importer_missing');
        }
        const url =
            typeof record.url === 'string' && record.url.length > 0
                ? record.url
                : typeof record.source === 'string'
                  ? record.source
                  : typeof record.path === 'string'
                    ? record.path
                    : '';
        if (url.length === 0) {
            throw new Error(`asset_db_asset_info_url_missing:${record.uuid}`);
        }
        const name =
            typeof record.name === 'string' && record.name.length > 0
                ? record.name
                : typeof record.displayName === 'string'
                  ? record.displayName
                  : record.uuid;
        const subAssetsRaw = record.subAssets;
        const subAssets: Record<string, IEditorAssetInfoSnapshot> = {};
        if (typeof subAssetsRaw === 'object' && subAssetsRaw != null && !Array.isArray(subAssetsRaw)) {
            for (const [key, child] of Object.entries(subAssetsRaw as Record<string, unknown>)) {
                subAssets[key] = this._readSnapshot(child);
            }
        }
        return {
            uuid: record.uuid,
            importer: record.importer,
            name,
            url,
            isDirectory: record.isDirectory === true,
            isBundle: record.isBundle === true,
            subAssets: Object.keys(subAssets).length > 0 ? subAssets : undefined,
        };
    }
}
