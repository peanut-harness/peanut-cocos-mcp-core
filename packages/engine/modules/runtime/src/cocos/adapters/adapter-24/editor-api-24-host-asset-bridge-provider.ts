import type { IEditorApiAssetBridgeProvider } from '../core/editor-api-asset-bridge-provider.js';

/**
 * @description Creator 2.4 `Editor.assetdb` 回调签名。
 */
type AssetDbCallback = (error: Error | null, result?: unknown) => void;

/**
 * @description Creator 2.4 AssetDB 写/刷面。
 */
export interface ICreator24AssetDbApi {
    /**
     * @description url → uuid。
     * @param url 资源 url
     * @returns uuid
     */
    urlToUuid?(url: string): string | null;
    /**
     * @description uuid → url。
     * @param uuid 资源 uuid
     * @returns url
     */
    uuidToUrl?(uuid: string): string | null;
    /**
     * @description 资源是否存在。
     * @param url 资源 url
     * @returns 是否存在
     */
    exists?(url: string): boolean;
    /**
     * @description 创建资源。
     * @param url db url
     * @param data 文本或缓冲
     * @param callback 回调
     * @returns void
     */
    create?(url: string, data: string | Uint8Array, callback?: AssetDbCallback): void;
    /**
     * @description 覆盖已存在资源。
     * @param url db url
     * @param data 文本或缓冲
     * @param callback 回调
     * @returns void
     */
    saveExists?(url: string, data: string | Uint8Array, callback?: AssetDbCallback): void;
    /**
     * @description 创建或覆盖。
     * @param url db url
     * @param data 文本或缓冲
     * @param callback 回调
     * @returns void
     */
    createOrSave?(url: string, data: string | Uint8Array, callback?: AssetDbCallback): void;
    /**
     * @description 刷新资源。
     * @param url db url
     * @param callback 回调
     * @returns void
     */
    refresh?(url: string, callback?: AssetDbCallback): void;
    /**
     * @description 删除资源。
     * @param urls url 列表
     * @param callback 回调
     * @returns void
     */
    delete?(urls: readonly string[], callback?: AssetDbCallback): void;
}

/**
 * @description 带 AssetDB 的宿主全局。
 */
export interface ICreator24AssetDbHostGlobal extends Record<string, unknown> {
    /**
     * @description Editor 面。
     */
    readonly Editor?: {
        /**
         * @description AssetDB。
         */
        readonly assetdb?: ICreator24AssetDbApi;
    };
}

/**
 * @description 通过 Creator 2.4 `Editor.assetdb` 执行 Prefab/二进制写盘与刷新。
 */
export class EditorApi24HostAssetBridgeProvider implements IEditorApiAssetBridgeProvider {
    /** @description 宿主全局。 */
    private readonly _hostGlobal: ICreator24AssetDbHostGlobal;

    /**
     * @description 创建 provider。
     * @param hostGlobal 可选宿主全局；默认 `globalThis`
     */
    public constructor(hostGlobal?: ICreator24AssetDbHostGlobal) {
        this._hostGlobal = hostGlobal ?? (globalThis as ICreator24AssetDbHostGlobal);
    }

    /**
     * @description 是否具备 createOrSave / create + saveExists。
     * @returns 可用时 true
     */
    public isAvailable(): boolean {
        const assetdb = this._hostGlobal.Editor?.assetdb;
        return (
            typeof assetdb?.createOrSave === 'function' ||
            (typeof assetdb?.create === 'function' && typeof assetdb?.saveExists === 'function')
        );
    }

    /**
     * @description 查询资源快照。
     * @param pathOrUuid 路径或 uuid
     * @returns 快照或 null
     */
    public async queryAsset(pathOrUuid: string): Promise<unknown | null> {
        const assetdb = this._requireAssetDb();
        const key = pathOrUuid.trim();
        const dbUrl = toAssetDbUrlOrUuid(key);
        if (dbUrl == null) {
            return null;
        }
        const exists = typeof assetdb.exists === 'function' ? assetdb.exists(dbUrl) : null;
        const uuid = typeof assetdb.urlToUuid === 'function' ? assetdb.urlToUuid(dbUrl) : null;
        const url = typeof assetdb.uuidToUrl === 'function' ? assetdb.uuidToUrl(key) : null;
        if (exists !== true && uuid == null && url == null) {
            return null;
        }
        return {
            path: url ?? dbUrl,
            uuid: uuid ?? (url != null ? key : null),
            exists: exists ?? uuid != null,
            source: 'editor.assetdb',
        };
    }

    /**
     * @description 刷新资源。
     * @param pathOrUuid 路径或 uuid
     * @returns 刷新后快照
     */
    public async refreshAsset(pathOrUuid: string): Promise<unknown | null> {
        const assetdb = this._requireAssetDb();
        const dbUrl = toAssetDbUrlOrUuid(pathOrUuid);
        if (dbUrl == null || typeof assetdb.refresh !== 'function') {
            return null;
        }
        await callAssetDb(assetdb.refresh.bind(assetdb), dbUrl);
        return this.queryAsset(dbUrl);
    }

    /**
     * @description 2.4 MVP：批量查询回落为空（后续可接 queryAssets）。
     * @returns 空数组
     */
    public async queryAssets(): Promise<readonly unknown[]> {
        return [];
    }

    /**
     * @description 写入 Prefab JSON 并刷新。
     * @param relativePath 工程相对路径
     * @param prefab Prefab 条目数组
     * @returns 写入结果
     */
    public async writePrefab(
        relativePath: string,
        prefab: readonly Record<string, unknown>[],
    ): Promise<unknown> {
        const assetdb = this._requireAssetDb();
        const dbUrl = toAssetDbUrl(relativePath);
        const content = `${JSON.stringify(prefab, null, 2)}\n`;
        await this._createOrSave(assetdb, dbUrl, content);
        if (typeof assetdb.refresh === 'function') {
            await callAssetDb(assetdb.refresh.bind(assetdb), dbUrl);
        }
        const queried = await this.queryAsset(dbUrl);
        return {
            path: relativePath,
            dbUrl,
            asset: queried,
            uuid:
                queried != null && typeof queried === 'object' && 'uuid' in queried
                    ? (queried as { uuid?: unknown }).uuid ?? null
                    : null,
            selected: false,
            source: 'editor.assetdb',
        };
    }

    /**
     * @description 写入二进制/文本资源并刷新。
     * @param relativePath 工程相对路径
     * @param content 字节
     * @param mediaType MIME
     * @returns 写入结果
     */
    public async writeBinary(
        relativePath: string,
        content: Uint8Array,
        mediaType:
            | 'image/png'
            | 'image/svg+xml'
            | 'application/json'
            | 'font/ttf'
            | 'font/otf',
    ): Promise<unknown> {
        if (
            (mediaType === 'image/png' && !relativePath.endsWith('.png')) ||
            (mediaType === 'image/svg+xml' && !relativePath.endsWith('.svg')) ||
            (mediaType === 'application/json' && !relativePath.endsWith('.json')) ||
            (mediaType === 'font/ttf' && !relativePath.endsWith('.ttf')) ||
            (mediaType === 'font/otf' && !relativePath.endsWith('.otf'))
        ) {
            throw new Error('cocos_binary_media_path_invalid');
        }
        const assetdb = this._requireAssetDb();
        const dbUrl = toAssetDbUrl(relativePath);
        const payload =
            mediaType === 'application/json' || mediaType === 'image/svg+xml'
                ? new TextDecoder().decode(content)
                : content;
        await this._createOrSave(assetdb, dbUrl, payload);
        if (typeof assetdb.refresh === 'function') {
            await callAssetDb(assetdb.refresh.bind(assetdb), dbUrl);
        }
        const queried = await this.queryAsset(dbUrl);
        return {
            path: relativePath,
            dbUrl,
            asset: queried,
            mediaType,
            byteLength: content.byteLength,
            uuid:
                queried != null && typeof queried === 'object' && 'uuid' in queried
                    ? (queried as { uuid?: unknown }).uuid ?? null
                    : null,
            spriteFrameUuid: null,
            source: 'editor.assetdb',
        };
    }

    /**
     * @description 删除资源。
     * @param relativePath 工程相对路径
     * @returns void
     */
    public async deleteAsset(relativePath: string): Promise<void> {
        const assetdb = this._requireAssetDb();
        const dbUrl = toAssetDbUrl(relativePath);
        const tracked =
            typeof assetdb.exists !== 'function'
                ? true
                : assetdb.exists(dbUrl) === true ||
                  (dbUrl.endsWith('/')
                      ? assetdb.exists(dbUrl.slice(0, -1)) === true
                      : assetdb.exists(`${dbUrl}/`) === true);
        if (!tracked) {
            // 未登记时禁止 AssetDB.delete，否则 Console 出现 `Failed to delete asset undefined`。
            throw new Error(`adapter_24_assetdb_delete_untracked:${relativePath}`);
        }
        if (typeof assetdb.delete !== 'function') {
            throw new Error('adapter_24_assetdb_delete_unavailable');
        }
        await callAssetDb(assetdb.delete.bind(assetdb), [dbUrl]);
    }

    /**
     * @description 创建文件夹（db://assets/.../）。
     * @param relativeDirectory 相对目录（可无尾 `/`）
     * @returns 结果
     */
    public async createFolder(relativeDirectory: string): Promise<unknown> {
        const assetdb = this._requireAssetDb();
        const normalized = relativeDirectory.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
        if (!normalized.startsWith('assets/') && normalized !== 'assets') {
            throw new Error(`adapter_24_folder_outside_assets:${relativeDirectory}`);
        }
        const dbUrl = `db://${normalized}/`;
        if (typeof assetdb.exists === 'function' && assetdb.exists(dbUrl)) {
            return { path: normalized, dbUrl, existed: true };
        }
        if (typeof assetdb.create !== 'function') {
            throw new Error('adapter_24_assetdb_create_unavailable');
        }
        await callAssetDb(assetdb.create.bind(assetdb), dbUrl, '');
        if (typeof assetdb.refresh === 'function') {
            await callAssetDb(assetdb.refresh.bind(assetdb), dbUrl);
        }
        return { path: normalized, dbUrl, existed: false, source: 'editor.assetdb' };
    }

    /**
     * @description 要求 AssetDB 可用。
     * @returns AssetDB
     */
    private _requireAssetDb(): ICreator24AssetDbApi {
        const assetdb = this._hostGlobal.Editor?.assetdb;
        if (assetdb == null) {
            throw new Error('adapter_24_assetdb_unavailable');
        }
        return assetdb;
    }

    /**
     * @description createOrSave 或 create/saveExists 回落。
     * @param assetdb AssetDB
     * @param dbUrl db url
     * @param data 内容
     * @returns void
     */
    private async _createOrSave(
        assetdb: ICreator24AssetDbApi,
        dbUrl: string,
        data: string | Uint8Array,
    ): Promise<void> {
        const exists = typeof assetdb.exists === 'function' ? assetdb.exists(dbUrl) === true : false;
        // 已跟踪资源优先 saveExists：2.4 createOrSave 并发会生成 ` - 001` 并抛 copySubMetas of null。
        if (exists) {
            if (typeof assetdb.saveExists === 'function') {
                await callAssetDb(assetdb.saveExists.bind(assetdb), dbUrl, data);
                return;
            }
        }
        if (typeof assetdb.createOrSave === 'function') {
            await callAssetDb(assetdb.createOrSave.bind(assetdb), dbUrl, data);
            return;
        }
        if (exists) {
            throw new Error('adapter_24_assetdb_saveExists_unavailable');
        }
        if (typeof assetdb.create !== 'function') {
            throw new Error('adapter_24_assetdb_create_unavailable');
        }
        await callAssetDb(assetdb.create.bind(assetdb), dbUrl, data);
    }
}

/**
 * @description 把工程相对路径转为 db://assets/...。
 * @param relativePath 相对路径
 * @returns db url
 */
function toAssetDbUrl(relativePath: string): string {
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    if (normalized.startsWith('db://')) {
        return normalized;
    }
    if (!normalized.startsWith('assets/')) {
        throw new Error(`adapter_24_path_outside_assets:${relativePath}`);
    }
    return `db://${normalized}`;
}

/**
 * @description 接受相对路径、db url 或 uuid。
 * @param pathOrUuid 输入
 * @returns db url 或原 uuid
 */
function toAssetDbUrlOrUuid(pathOrUuid: string): string | null {
    const key = pathOrUuid.trim();
    if (key.length === 0) {
        return null;
    }
    if (key.startsWith('db://')) {
        return key;
    }
    if (key.startsWith('assets/')) {
        return `db://${key}`;
    }
    return key;
}

/**
 * @description 将 assetdb 回调 API 包成 Promise。
 * @param method 绑定后的方法
 * @param args 参数（末尾自动接 cb）
 * @returns 结果
 */
async function callAssetDb(
    method: (...args: never[]) => void,
    ...args: unknown[]
): Promise<unknown> {
    return await new Promise((resolve, reject) => {
        const callback: AssetDbCallback = (error, result) => {
            if (error != null) {
                reject(error);
                return;
            }
            resolve(result ?? null);
        };
        try {
            (method as (...callArgs: unknown[]) => void)(...args, callback);
        } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
        }
    });
}
