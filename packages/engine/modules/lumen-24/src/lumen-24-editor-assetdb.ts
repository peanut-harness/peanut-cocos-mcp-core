import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Lumen24SerializedAssetMeta } from './lumen-24-serialized-asset-meta.js';
import { Lumen24RuntimeAssetRefreshAdapter } from './lumen-24-session.js';

/**
 * @description Creator 2.4 `Editor.assetdb` 回调形状（宿主注入，不依赖 3.x Message）。
 */
export interface ILumen24AssetDbApi {
    /**
     * @description 资源是否已存在。
     */
    readonly exists?: (url: string) => boolean;
    /**
     * @description 创建资源。
     */
    readonly create?: (url: string, data: string, cb?: (error: Error | null) => void) => void;
    /**
     * @description 存在则保存。
     */
    readonly saveExists?: (url: string, data: string, cb?: (error: Error | null) => void) => void;
    /**
     * @description 创建或保存。
     */
    readonly createOrSave?: (url: string, data: string, cb?: (error: Error | null) => void) => void;
    /**
     * @description 刷新资源。
     */
    readonly refresh?: (url: string, cb?: (error: Error | null, result?: unknown) => void) => void;
    /**
     * @description 删除资源（db URL 列表）。
     */
    readonly delete?: (urls: string[], cb?: (error: Error | null, result?: unknown) => void) => void;
    /**
     * @description 从外部路径导入到目标 db 目录。
     */
    readonly import?: (
        rawFiles: string[],
        destUrl: string,
        cb?: (error: Error | null, results?: unknown) => void,
    ) => void;
}

/**
 * @description 建目录结果。
 */
export interface ILumen24CreateFolderResult {
    /**
     * @description 工程相对路径。
     */
    readonly path: string;
    /**
     * @description AssetDB URL。
     */
    readonly dbUrl: string;
    /**
     * @description 调用前是否已存在。
     */
    readonly existed: boolean;
}

/**
 * @description Creator 2.4 AssetDB 宿主封装：日后抽 `peanut.lumen-24` 时整类搬走，不碰 3.x lumen。
 */
export class Lumen24EditorAssetDb {
    /** @description 底层 AssetDB。 */
    private readonly _assetdb: ILumen24AssetDbApi;

    /**
     * @description 构造封装。
     * @param assetdb 宿主 AssetDB
     */
    public constructor(assetdb: ILumen24AssetDbApi) {
        this._assetdb = assetdb;
    }

    /**
     * @description 从 `globalThis.Editor.assetdb` 读取；不可用则抛错。
     * @param hostGlobal 宿主全局（默认 `globalThis`）
     * @returns 封装实例
     */
    public static fromGlobalThis(
        hostGlobal: { Editor?: { assetdb?: ILumen24AssetDbApi } } = globalThis as {
            Editor?: { assetdb?: ILumen24AssetDbApi };
        },
    ): Lumen24EditorAssetDb {
        const assetdb = hostGlobal.Editor?.assetdb;
        if (assetdb == null) {
            throw new Error('lumen_24_assetdb_unavailable');
        }
        return new Lumen24EditorAssetDb(assetdb);
    }

    /**
     * @description 相对路径转 `db://` URL。
     * @param relativePath 工程相对路径
     * @returns db URL
     */
    public toDbUrl(relativePath: string): string {
        if (typeof relativePath !== 'string' || relativePath.trim().length === 0) {
            throw new Error('lumen_24_toDbUrl_path_required');
        }
        const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '').trim();
        if (normalized.length === 0 || normalized === 'db://') {
            throw new Error(`lumen_24_toDbUrl_path_invalid:${relativePath}`);
        }
        return normalized.startsWith('db://') ? normalized : `db://${normalized}`;
    }

    /**
     * @description 判断 AssetDB 是否已登记该 db URL（兼容文件夹尾 `/`）。
     * @param dbUrl `db://` URL
     * @returns 已登记为 true；无法探测时视为已登记（交由 delete 自行失败）
     */
    public isTrackedDbUrl(dbUrl: string): boolean {
        if (typeof dbUrl !== 'string' || dbUrl.trim().length === 0) {
            return false;
        }
        if (typeof this._assetdb.exists !== 'function') {
            return true;
        }
        const normalized = dbUrl.trim();
        if (this._assetdb.exists(normalized) === true) {
            return true;
        }
        if (normalized.endsWith('/')) {
            return this._assetdb.exists(normalized.slice(0, -1)) === true;
        }
        return this._assetdb.exists(`${normalized}/`) === true;
    }

    /**
     * @description 盘建 `assets/` 目录并写 2.4 `folder` meta（避免 AssetDB `create` 落 0 字节文件）。
     * @param projectRoot 工程根
     * @param relativePath 相对目录
     * @returns 建目录结果
     */
    public async createFolder(projectRoot: string, relativePath: string): Promise<ILumen24CreateFolderResult> {
        const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
        if (!normalized.startsWith('assets/') && normalized !== 'assets') {
            throw new Error(`lumen_24_createFolder_outside_assets:${relativePath}`);
        }
        const absolutePath = join(projectRoot, normalized);
        const existed = existsSync(absolutePath);
        mkdirSync(absolutePath, { recursive: true });
        const segments = normalized.split('/');
        for (let index = 0; index < segments.length; index += 1) {
            const ancestorPath = segments.slice(0, index + 1).join('/');
            if (ancestorPath === 'assets') {
                continue;
            }
            const metaAbsolute = `${join(projectRoot, ancestorPath)}.meta`;
            if (existsSync(metaAbsolute)) {
                continue;
            }
            writeFileSync(
                metaAbsolute,
                `${JSON.stringify(
                    {
                        ver: '1.1.3',
                        uuid: Lumen24EditorAssetDb._createUuid(),
                        importer: 'folder',
                        isBundle: false,
                        bundleName: '',
                        priority: 1,
                        compressionType: {},
                        optimizeHotUpdate: {},
                        inlineSpriteFrames: {},
                        isRemoteBundle: {},
                        subMetas: {},
                    },
                    null,
                    2,
                )}\n`,
            );
        }
        return { path: normalized, dbUrl: `db://${normalized}/`, existed };
    }

    /**
     * @description 经 AssetDB 删除资源（文件夹 URL 带尾 `/`）。
     * 仅删除已登记 URL；未登记的不得传入，否则 Creator 会打 `Failed to delete asset undefined`。
     * @param dbUrls db URL 列表
     * @returns void
     */
    public async deleteDbUrls(dbUrls: readonly string[]): Promise<void> {
        if (typeof this._assetdb.delete !== 'function') {
            throw new Error('lumen_24_assetdb_delete_unavailable');
        }
        const normalizedUrls = [
            ...new Set(
                dbUrls
                    .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
                    .map((url) => url.trim()),
            ),
        ];
        if (normalizedUrls.length === 0) {
            throw new Error('lumen_24_assetdb_delete_urls_required');
        }
        const trackedUrls = normalizedUrls.filter((url) => this.isTrackedDbUrl(url));
        if (trackedUrls.length === 0) {
            return;
        }
        await this._callCb(this._assetdb.delete.bind(this._assetdb), trackedUrls);
    }

    /**
     * @description 导入外部文件到 `db://` 目录（2.4 `Editor.assetdb.import`）。
     * @param absoluteSources 绝对路径列表
     * @param destDbUrl 目标目录 URL
     * @returns AssetDB results
     */
    public async importFiles(
        projectRoot: string,
        absoluteSources: readonly string[],
        destDbUrl: string,
    ): Promise<unknown> {
        if (typeof this._assetdb.import !== 'function') {
            throw new Error('lumen_24_assetdb_import_unavailable');
        }
        if (absoluteSources.length === 0) {
            throw new Error('lumen_24_assetdb_import_sources_required');
        }
        const assetsRoot = join(projectRoot, 'assets').replace(/\\/g, '/').replace(/\/+$/u, '');
        for (const absoluteSource of absoluteSources) {
            const normalized = absoluteSource.replace(/\\/g, '/');
            if (normalized === assetsRoot || normalized.startsWith(`${assetsRoot}/`)) {
                throw new Error(`lumen_24_assetdb_import_source_already_in_project:${absoluteSource}`);
            }
        }
        return this._callCb(this._assetdb.import.bind(this._assetdb), [...absoluteSources], destDbUrl);
    }

    /**
     * @description 确保 PNG 为 Sprite 类型并 refresh（2.4 用 meta.type=sprite，非 3.x @f9941）。
     * @param projectRoot 工程根
     * @param dbPaths `db://assets/...png` 列表
     * @returns 结果
     */
    public async ensureSpriteFrames(
        projectRoot: string,
        dbPaths: readonly string[],
    ): Promise<{
        readonly ok: true;
        readonly phase: 'creator_2x';
        readonly ensured: readonly string[];
        readonly skipped: readonly string[];
    }> {
        const ensured: string[] = [];
        const skipped: string[] = [];
        for (const dbPath of dbPaths) {
            const relative = dbPath.replace(/^db:\/\//u, '').replace(/\/+$/u, '');
            if (!/\.(png|jpe?g|webp)$/iu.test(relative)) {
                skipped.push(dbPath);
                continue;
            }
            const absolute = join(projectRoot, relative);
            const metaPath = `${absolute}.meta`;
            if (!existsSync(metaPath)) {
                skipped.push(dbPath);
                continue;
            }
            const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as Record<string, unknown>;
            if (meta.type !== 'sprite') {
                meta.type = 'sprite';
                writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
            }
            if (typeof this._assetdb.refresh === 'function') {
                await this._callCb(this._assetdb.refresh.bind(this._assetdb), this.toDbUrl(relative));
            }
            ensured.push(dbPath);
        }
        return { ok: true, phase: 'creator_2x', ensured, skipped };
    }

    /**
     * @description 构造「盘写 + AssetDB 同步」适配器：已跟踪用 saveExists；未跟踪只 refresh（禁止对已有文件 createOrSave）。
     * @param projectRoot 工程根（用于补写 `.meta`）
     * @returns 刷新适配器
     */
    public createRefreshAdapter(projectRoot: string): Lumen24RuntimeAssetRefreshAdapter {
        return new Lumen24RuntimeAssetRefreshAdapter(
            async (pathOrUuid) => {
                if (typeof this._assetdb.refresh !== 'function') {
                    return null;
                }
                if (typeof pathOrUuid !== 'string' || pathOrUuid.trim().length === 0) {
                    return null;
                }
                return this._callCb(this._assetdb.refresh.bind(this._assetdb), this.toDbUrl(pathOrUuid.trim()));
            },
            async (relativePath, prefab) => {
                if (typeof relativePath !== 'string' || relativePath.trim().length === 0) {
                    throw new Error('lumen_24_writePrefab_path_required');
                }
                const dbUrl = this.toDbUrl(relativePath.trim());
                const content = `${JSON.stringify(prefab, null, 2)}\n`;
                const absolutePath = join(projectRoot, relativePath.replace(/\\/g, '/').replace(/^\/+/, ''));
                Lumen24SerializedAssetMeta.ensure(absolutePath, 'prefab');
                const alreadyTracked =
                    typeof this._assetdb.exists === 'function' ? this._assetdb.exists(dbUrl) === true : false;
                if (alreadyTracked) {
                    // 已有 uuid/meta 时禁止再走 createOrSave：2.4 并发下会生成 ` - 001` 副本并抛 copySubMetas of null。
                    if (typeof this._assetdb.saveExists === 'function') {
                        await this._callCb(this._assetdb.saveExists.bind(this._assetdb), dbUrl, content);
                        return { path: relativePath, dbUrl, alreadyTracked, mode: 'saveExists' };
                    }
                }
                // 磁盘已有内容+meta：只 refresh 导入，避免 createOrSave 再造副本。
                if (typeof this._assetdb.refresh === 'function') {
                    await this._callCb(this._assetdb.refresh.bind(this._assetdb), dbUrl);
                    return { path: relativePath, dbUrl, alreadyTracked, mode: 'refresh' };
                }
                if (typeof this._assetdb.createOrSave === 'function') {
                    await this._callCb(this._assetdb.createOrSave.bind(this._assetdb), dbUrl, content);
                    return { path: relativePath, dbUrl, alreadyTracked, mode: 'createOrSave' };
                }
                if (typeof this._assetdb.create === 'function') {
                    await this._callCb(this._assetdb.create.bind(this._assetdb), dbUrl, content);
                    return { path: relativePath, dbUrl, alreadyTracked, mode: 'create' };
                }
                throw new Error('lumen_24_assetdb_write_unavailable');
            },
        );
    }

    /**
     * @description 以 Promise 包装 AssetDB 回调。
     * @param method 回调式方法
     * @param args 参数（不含 callback）
     * @returns 回调第二参
     */
    private _callCb(method: (...callArgs: never[]) => void, ...args: unknown[]): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const callback = (error: Error | null, result?: unknown): void => {
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

    /**
     * @description 生成 UUID（兼容 Creator 2.4 旧 Node，不用 `randomUUID`）。
     * @returns uuid
     */
    private static _createUuid(): string {
        const bytes = randomBytes(16);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = bytes.toString('hex');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
}
