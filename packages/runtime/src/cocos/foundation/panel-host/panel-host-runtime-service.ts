import type {
    ICreatorAdapter,
    IPanelBrowserWindowLike,
    IPanelHostLaunchResult,
    IPanelHostSessionSnapshot,
} from '../../adapters/core/creator-adapter.js';
import { AdapterRegistry } from '../../adapters/core/adapter-registry.js';
import { VersionResolver } from '../../version/version-resolver.js';

/**
 * @description Panel Host 子域服务接口。
 */
export interface IPanelHostRuntimeService {
    /**
     * @description 打开或恢复插件面板容器。
     * @param panelId 面板稳定标识
     * @param entry 面板前端入口路径
     * @returns Promise 在宿主面板容器准备完成后结束
     */
    open(panelId: string, entry: string): Promise<void>;

    /**
     * @description 关闭指定插件面板。
     * @param panelId 面板稳定标识
     * @returns Promise 在面板关闭后结束
     */
    close(panelId: string): Promise<void>;

    /**
     * @description 聚焦指定插件面板。
     * @param panelId 面板稳定标识
     * @returns Promise 在面板聚焦完成后结束
     */
    focus(panelId: string): Promise<void>;

    /**
     * @description 为指定面板写入浏览器 bootstrap 脚本文本。
     * @param panelId 面板稳定标识
     * @param bootstrapScript 供宿主在页面初始化时注入的脚本文本
     * @returns Promise 在脚本挂载完成后结束
     */
    setBootstrapScript(panelId: string, bootstrapScript: string): Promise<void>;

    /**
     * @description 为指定面板绑定一个浏览器侧上下文对象。
     * @param panelId 面板稳定标识
     * @param browserWindow 宿主实际持有的浏览器侧对象
     * @returns Promise 在绑定完成后结束
     */
    attachBrowserWindow(panelId: string, browserWindow: IPanelBrowserWindowLike): Promise<void>;

    /**
     * @description 查询指定面板的宿主会话快照。
     * @param panelId 面板稳定标识
     * @returns Promise 命中时返回宿主会话快照，否则返回 `null`
     */
    getSession(panelId: string): Promise<IPanelHostSessionSnapshot | null>;

    /**
     * @description 返回当前所有面板的宿主会话快照。
     * @returns Promise 返回宿主会话快照只读列表
     */
    listSessions(): Promise<readonly IPanelHostSessionSnapshot[]>;

    /**
     * @description 启动一个面板容器并挂载 bootstrap 脚本。
     * @param panelId 面板稳定标识
     * @param entry 面板前端入口路径
     * @param bootstrapScript 供宿主在页面初始化时注入的脚本文本
     * @returns Promise 返回当前面板会话快照与宿主创建的浏览器侧上下文对象
     */
    launchContainer(panelId: string, entry: string, bootstrapScript: string): Promise<IPanelHostLaunchResult>;
}

/**
 * @description Panel Host 子域运行时服务。
 */
export class PanelHostRuntimeService implements IPanelHostRuntimeService {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _adapterRegistry: AdapterRegistry;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _versionResolver: VersionResolver;

    /**
     * @description 创建一个新的 Panel Host 子域服务。
     * @param adapterRegistry 适配器注册中心
     * @param versionResolver Creator 版本解析器
     */
    public constructor(adapterRegistry: AdapterRegistry, versionResolver: VersionResolver) {
        this._adapterRegistry = adapterRegistry;
        this._versionResolver = versionResolver;
    }

    /**
     * @description 打开或恢复插件面板容器。
     * @param panelId 面板稳定标识
     * @param entry 面板前端入口路径
     * @returns Promise 在宿主面板容器准备完成后结束
     */
    public async open(panelId: string, entry: string): Promise<void> {
        await this._getActiveAdapter().createPanelHostBridge().open(panelId, entry);
    }

    /**
     * @description 关闭指定插件面板。
     * @param panelId 面板稳定标识
     * @returns Promise 在面板关闭后结束
     */
    public async close(panelId: string): Promise<void> {
        await this._getActiveAdapter().createPanelHostBridge().close(panelId);
    }

    /**
     * @description 聚焦指定插件面板。
     * @param panelId 面板稳定标识
     * @returns Promise 在面板聚焦完成后结束
     */
    public async focus(panelId: string): Promise<void> {
        await this._getActiveAdapter().createPanelHostBridge().focus(panelId);
    }

    /**
     * @description 为指定面板写入浏览器 bootstrap 脚本文本。
     * @param panelId 面板稳定标识
     * @param bootstrapScript 供宿主在页面初始化时注入的脚本文本
     * @returns Promise 在脚本挂载完成后结束
     */
    public async setBootstrapScript(panelId: string, bootstrapScript: string): Promise<void> {
        await this._getActiveAdapter().createPanelHostBridge().setBootstrapScript(panelId, bootstrapScript);
    }

    /**
     * @description 为指定面板绑定一个浏览器侧上下文对象。
     * @param panelId 面板稳定标识
     * @param browserWindow 宿主实际持有的浏览器侧对象
     * @returns Promise 在绑定完成后结束
     */
    public async attachBrowserWindow(panelId: string, browserWindow: IPanelBrowserWindowLike): Promise<void> {
        await this._getActiveAdapter().createPanelHostBridge().attachBrowserWindow(panelId, browserWindow);
    }

    /**
     * @description 查询指定面板的宿主会话快照。
     * @param panelId 面板稳定标识
     * @returns Promise 命中时返回宿主会话快照，否则返回 `null`
     */
    public async getSession(panelId: string): Promise<IPanelHostSessionSnapshot | null> {
        return this._getActiveAdapter().createPanelHostBridge().getSession(panelId);
    }

    /**
     * @description 返回当前所有面板的宿主会话快照。
     * @returns Promise 返回宿主会话快照只读列表
     */
    public async listSessions(): Promise<readonly IPanelHostSessionSnapshot[]> {
        return this._getActiveAdapter().createPanelHostBridge().listSessions();
    }

    /**
     * @description 启动一个面板容器并挂载 bootstrap 脚本。
     * @param panelId 面板稳定标识
     * @param entry 面板前端入口路径
     * @param bootstrapScript 供宿主在页面初始化时注入的脚本文本
     * @returns Promise 返回当前面板会话快照与宿主创建的浏览器侧上下文对象
     */
    public async launchContainer(panelId: string, entry: string, bootstrapScript: string): Promise<IPanelHostLaunchResult> {
        return this._getActiveAdapter().createPanelHostBridge().launchContainer(panelId, entry, bootstrapScript);
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


