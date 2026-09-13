import type { IPanelBridgeClient } from '@peanut/pod-protocol';
import type { ICocosRuntime, IPanelHostSessionSnapshot } from '@peanut/pod-engine/runtime';

import type { IPanelContribution } from '@peanut/pod-protocol';

import { PluginManagerApp } from '../app/plugin-manager-app.js';
import type { IPanelBridgeBrowserWindow } from './browser-panel-bridge-bootstrap.js';

/**
 * @description 宿主面板容器启动结果。
 */
export interface IHostPanelContainerLaunchResult {
    /**
     * @description 当前面板会话快照。
     */
    readonly session: IPanelHostSessionSnapshot;

    /**
     * @description 本次启动命中的浏览器侧上下文对象；宿主未创建窗口时返回 `null`。
     */
    readonly browserWindow: IPanelBridgeBrowserWindow | null;

    /**
     * @description 本次注入的面板桥客户端；未绑定浏览器侧对象时返回 `null`。
     */
    readonly panelBridgeClient: IPanelBridgeClient | null;

    /**
     * @description 本次挂载的 bootstrap 脚本文本。
     */
    readonly bootstrapScript: string;
}

/**
 * @description 宿主面板容器启动器，负责按统一顺序打开容器、挂载 bootstrap 脚本并绑定浏览器侧面板桥。
 */
export class HostPanelContainerLauncher {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _runtime: ICocosRuntime;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginManager: PluginManagerApp;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _panelContributionResolver: (pluginId: string, panelId: string) => IPanelContribution | null;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _mountedBrowserWindows = new Map<string, {
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        pluginId: string;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        browserWindow: IPanelBridgeBrowserWindow;
    }>();

    /**
     * @description 创建一个新的宿主面板容器启动器。
     * @param runtime Runtime 门面实例
     * @param pluginManager 插件管理器主入口
     * @param panelContributionResolver 面板贡献解析器
     */
    public constructor(
        runtime: ICocosRuntime,
        pluginManager: PluginManagerApp,
        panelContributionResolver: (pluginId: string, panelId: string) => IPanelContribution | null,
    ) {
        this._runtime = runtime;
        this._pluginManager = pluginManager;
        this._panelContributionResolver = panelContributionResolver;
    }

    /**
     * @description 打开宿主面板容器并建立标准化 panel bridge 注入。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @param entry 面板前端入口路径
     * @param browserWindow 可选浏览器侧对象；提供时会直接注入 live panel bridge
     * @returns Promise 返回宿主会话快照、bootstrap 脚本和可选 live panel bridge
     */
    public async launch(
        pluginId: string,
        panelId: string,
        entry: string,
        browserWindow?: IPanelBridgeBrowserWindow,
    ): Promise<IHostPanelContainerLaunchResult> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ bootstrapScript = this._pluginManager.createPanelBridgeBootstrapScript(pluginId, panelId);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ panelHostLaunchResult = await this._runtime.panelHost.launchContainer(panelId, entry, bootstrapScript);

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ targetBrowserWindow = browserWindow ?? (panelHostLaunchResult.browserWindow as IPanelBridgeBrowserWindow | null);
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        let /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelBridgeClient: IPanelBridgeClient | null = null;
        if (targetBrowserWindow != null) {
            if (browserWindow != null) {
                await this._runtime.panelHost.attachBrowserWindow(panelId, browserWindow);
            }
            panelBridgeClient = this._pluginManager.attachPanelBridgeToWindow(pluginId, panelId, targetBrowserWindow);
            await this._pluginManager.mountPanelUiToWindow(pluginId, panelId, targetBrowserWindow);
            this._mountedBrowserWindows.set(panelId, {
                pluginId,
                browserWindow: targetBrowserWindow,
            });
        }

        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ panelHostSessionSnapshot = await this._runtime.panelHost.getSession(panelId);
        if (panelHostSessionSnapshot == null) {
            throw new Error(`Panel host session "${panelId}" was not created.`);
        }

        return {
            session: panelHostSessionSnapshot,
            browserWindow: targetBrowserWindow ?? null,
            panelBridgeClient,
            bootstrapScript,
        };
    }

    /**
     * @description 按已注册的面板贡献解析入口并启动宿主面板容器。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @param browserWindow 可选浏览器侧对象；提供时会直接注入 live panel bridge
     * @returns Promise 返回宿主会话快照、bootstrap 脚本和可选 live panel bridge
     */
    public async launchRegisteredPanel(
        pluginId: string,
        panelId: string,
        browserWindow?: IPanelBridgeBrowserWindow,
    ): Promise<IHostPanelContainerLaunchResult> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelContribution = this._panelContributionResolver(pluginId, panelId);
        if (panelContribution == null) {
            throw new Error(`Panel "${panelId}" is not registered by plugin "${pluginId}".`);
        }
        return this.launch(pluginId, panelId, panelContribution.entry, browserWindow);
    }

    /**
     * @description 关闭指定宿主面板容器。
     * @param panelId 面板稳定标识
     * @returns Promise 在宿主面板容器关闭后结束
     */
    public async close(panelId: string): Promise<void> {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ mountedPanelRecord = this._mountedBrowserWindows.get(panelId);
        if (mountedPanelRecord != null) {
            await this._pluginManager.unmountPanelUiFromWindow(
                mountedPanelRecord.pluginId,
                panelId,
                mountedPanelRecord.browserWindow,
            );
            this._mountedBrowserWindows.delete(panelId);
        }
        await this._runtime.panelHost.close(panelId);
    }
}
