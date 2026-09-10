import type { ICreatorAdapter } from '../../adapters/core/creator-adapter.js';
import { AdapterRegistry } from '../../adapters/core/adapter-registry.js';
import { VersionResolver } from '../../version/version-resolver.js';

/**
 * @description Scene 子域服务接口。
 */
export interface ISceneRuntimeService {
    /**
     * @description 返回当前版本场景脚本字段名。
     * @returns 当前版本使用的场景脚本字段名
     */
    getManifestField(): 'scene-script' | 'contributions.scene.script';

    /**
     * @description 返回当前场景根节点快照。
     * @returns 当前场景根节点快照；尚未加载场景时返回 `null`
     */
    getCurrent(): Promise<Record<string, unknown> | null>;

    /**
     * @description 返回当前场景节点快照列表。
     * @returns 场景树节点快照列表
     */
    getHierarchy(options?: { includeEditorNodes?: boolean }): Promise<readonly Record<string, unknown>[]>;

    /**
     * @description 执行指定插件暴露的场景脚本方法。
     * @param packageName 插件包名
     * @param method 场景脚本方法名
     * @param args 传给场景脚本方法的参数列表
     * @returns Promise 返回脚本执行结果
     */
    execute<TData = unknown>(packageName: string, method: string, args?: readonly unknown[]): Promise<TData>;

    /**
     * @description 为指定场景节点应用一个补丁对象。
     * @param nodeId 场景节点稳定标识
     * @param patch 需要写入节点的补丁字段
     * @returns Promise 返回补丁后的节点快照
     */
    patch(nodeId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>>;
}

/**
 * @description Scene 子域运行时服务。
 */
export class SceneRuntimeService implements ISceneRuntimeService {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _adapterRegistry: AdapterRegistry;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _versionResolver: VersionResolver;

    /**
     * @description 创建一个新的 Scene 子域服务。
     * @param adapterRegistry 适配器注册中心
     * @param versionResolver Creator 版本解析器
     */
    public constructor(adapterRegistry: AdapterRegistry, versionResolver: VersionResolver) {
        this._adapterRegistry = adapterRegistry;
        this._versionResolver = versionResolver;
    }

    /**
     * @description 返回当前版本场景脚本字段名。
     * @returns 当前版本使用的场景脚本字段名
     */
    public getManifestField(): 'scene-script' | 'contributions.scene.script' {
        return this._getActiveAdapter().createSceneBridge().getManifestField();
    }

    /**
     * @description 返回当前场景根节点快照。
     * @returns 当前场景根节点快照；尚未加载场景时返回 `null`
     */
    public async getCurrent(): Promise<Record<string, unknown> | null> {
        return this._getActiveAdapter().createSceneBridge().getCurrent();
    }

    /**
     * @description 返回当前场景节点快照列表。
     * @param options 可选层次选项。
     * @returns 场景树节点快照列表
     */
    public async getHierarchy(options?: { includeEditorNodes?: boolean }): Promise<readonly Record<string, unknown>[]> {
        return this._getActiveAdapter().createSceneBridge().getHierarchy(options);
    }

    /**
     * @description 执行指定插件暴露的场景脚本方法。
     * @param packageName 插件包名
     * @param method 场景脚本方法名
     * @param args 传给场景脚本方法的参数列表
     * @returns Promise 返回脚本执行结果
     */
    public async execute<TData = unknown>(packageName: string, method: string, args?: readonly unknown[]): Promise<TData> {
        return this._getActiveAdapter().createSceneBridge().execute<TData>(packageName, method, args);
    }

    /**
     * @description 为指定场景节点应用一个补丁对象。
     * @param nodeId 场景节点稳定标识
     * @param patch 需要写入节点的补丁字段
     * @returns Promise 返回补丁后的节点快照
     */
    public async patch(nodeId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
        return this._getActiveAdapter().createSceneBridge().patch(nodeId, patch);
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
