import type { ICreatorAdapter } from '../../adapters/core/creator-adapter.js';
import { AdapterRegistry } from '../../adapters/core/adapter-registry.js';
import { VersionResolver } from '../../version/version-resolver.js';

/**
 * @description Asset 子域服务接口。
 */
export interface IAssetRuntimeService {
    /**
     * @description 查询资源数据库中的对象。
     * @param pathOrUuid 资源路径或 uuid
     * @returns Promise 返回查询结果；未命中时返回 `null`
     */
    query(pathOrUuid: string): Promise<unknown | null>;

    /**
     * @description 按 pattern 批量查询资源快照（含子资源）。
     * @param options 可选 pattern 与 importer 过滤。
     * @returns 资源快照列表；宿主不支持时返回空数组。
     */
    queryAssets(options?: { readonly pattern?: string; readonly importer?: string | readonly string[] }): Promise<readonly unknown[]>;

    /**
     * @description 刷新指定资源键对应的资源快照。
     * @param pathOrUuid 资源路径或 uuid
     * @returns Promise 返回刷新后的资源结果；未命中时返回 `null`
     */
    refresh(pathOrUuid: string): Promise<unknown | null>;

    /**
     * @description 将已编译的 Prefab 序列化内容写入项目资源库。
     * @param relativePath 已验证的项目相对 `.prefab` 路径
     * @param prefab Cocos Prefab 序列化数组
     * @returns 写入后的资源快照
     */
    writePrefab(relativePath: string, prefab: readonly Record<string, unknown>[]): Promise<unknown>;
    /** @description 写入 PNG/SVG 二进制资源并刷新 AssetDB。 */
    writeBinary(relativePath: string, content: Uint8Array, mediaType: 'image/png' | 'image/svg+xml' | 'application/json' | 'font/ttf' | 'font/otf'): Promise<unknown>;
    /** @description 删除已验证的项目相对资源路径。 */
    deleteAsset(relativePath: string): Promise<void>;
}

/**
 * @description Asset 子域运行时服务。
 */
export class AssetRuntimeService implements IAssetRuntimeService {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _adapterRegistry: AdapterRegistry;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _versionResolver: VersionResolver;

    /**
     * @description 创建一个新的 Asset 子域服务。
     * @param adapterRegistry 适配器注册中心
     * @param versionResolver Creator 版本解析器
     */
    public constructor(adapterRegistry: AdapterRegistry, versionResolver: VersionResolver) {
        this._adapterRegistry = adapterRegistry;
        this._versionResolver = versionResolver;
    }

    /**
     * @description 查询资源数据库中的对象。
     * @param pathOrUuid 资源路径或 uuid
     * @returns Promise 返回查询结果；未命中时返回 `null`
     */
    public async query(pathOrUuid: string): Promise<unknown | null> {
        return this._getActiveAdapter().createAssetBridge().query(pathOrUuid);
    }

    /**
     * @description 按 pattern 批量查询资源快照（含子资源）。
     * @param options 可选 pattern 与 importer 过滤。
     * @returns 资源快照列表；宿主不支持时返回空数组。
     */
    public async queryAssets(options?: { readonly pattern?: string; readonly importer?: string | readonly string[] }): Promise<readonly unknown[]> {
        return this._getActiveAdapter().createAssetBridge().queryAssets(options);
    }

    /**
     * @description 刷新指定资源键对应的资源快照。
     * @param pathOrUuid 资源路径或 uuid
     * @returns Promise 返回刷新后的资源结果；未命中时返回 `null`
     */
    public async refresh(pathOrUuid: string): Promise<unknown | null> {
        return this._getActiveAdapter().createAssetBridge().refresh(pathOrUuid);
    }

    /**
     * @description 将已编译的 Prefab 序列化内容写入项目资源库。
     * @param relativePath 已验证的项目相对 `.prefab` 路径
     * @param prefab Cocos Prefab 序列化数组
     * @returns 写入后的资源快照
     */
    public async writePrefab(relativePath: string, prefab: readonly Record<string, unknown>[]): Promise<unknown> {
        return this._getActiveAdapter().createAssetBridge().writePrefab(relativePath, prefab);
    }

    /** @inheritdoc */
    public async writeBinary(relativePath: string, content: Uint8Array, mediaType: 'image/png' | 'image/svg+xml' | 'application/json' | 'font/ttf' | 'font/otf'): Promise<unknown> {
        return this._getActiveAdapter().createAssetBridge().writeBinary(relativePath, content, mediaType);
    }

    /** @inheritdoc */
    public async deleteAsset(relativePath: string): Promise<void> {
        await this._getActiveAdapter().createAssetBridge().deleteAsset(relativePath);
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _getActiveAdapter(): ICreatorAdapter {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ creatorVersion = this._versionResolver.getCurrentVersion().raw;
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ adapter = this._adapterRegistry.resolve(creatorVersion);
        if (adapter == null) {
            throw new Error(`No Creator adapter registered for version "${creatorVersion}".`);
        }
        return adapter;
    }
}


