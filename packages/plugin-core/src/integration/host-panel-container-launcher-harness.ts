import type { IPanelBridgeResponse } from 'peanut-contracts';
import { EditorApiPanelHostInstaller, RuntimeFacade } from 'peanut-runtime';

import { PluginManagerApp } from '../app/plugin-manager-app.js';
import { BuiltinPanelPluginModule } from '../builtin/builtin-panel-plugin-module.js';

interface IPanelStatePayload extends Record<string, unknown> {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly pluginId: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly panelId: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly isOpen: boolean;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly pingCount: number;
}

/**
 * @description 宿主面板容器启动器验证入口，用于端到端检查容器打开、bootstrap 挂载与 live bridge 注入。
 */
export class HostPanelContainerLauncherHarness {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _runtime: RuntimeFacade;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginManager: PluginManagerApp;

    /**
     * @description 创建一个新的宿主面板容器启动器验证入口。
     * @param creatorVersion 当前宿主绑定的 Creator 版本字符串
     */
    public constructor(creatorVersion: string) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ hostGlobal: Record<string, unknown> = {};
        new EditorApiPanelHostInstaller(hostGlobal).installWindowFactory({
            /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
            async createWindow(): Promise<{
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                loadURL: () => void;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                executeJavaScript: () => void;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                hostWindowId: string;
            }> {
                return {
                    loadURL: () => {},
                    executeJavaScript: () => {},
                    hostWindowId: 'host-panel-container-launcher-window',
                };
            },
        });
        this._runtime = new RuntimeFacade(creatorVersion, {
            editorApiHostGlobal: hostGlobal,
        });
        this._pluginManager = new PluginManagerApp(this._runtime);
    }

    /**
     * @description 打开内置面板容器并验证宿主 session 与浏览器侧 live bridge。
     * @returns Promise 返回容器启动结果与面板状态响应
     */
    public async run(): Promise<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        sessionHasBrowserWindow: boolean;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        sessionHasBootstrapScript: boolean;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        bootstrapScript: string;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        bridgeResponse: IPanelBridgeResponse<IPanelStatePayload> | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        acquireBridgeMatches: boolean;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        launchedViaPluginManager: boolean;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        runtimeProvidedBridgeResponse: IPanelBridgeResponse<IPanelStatePayload> | null;
    }> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ builtinPanelPluginModule = new BuiltinPanelPluginModule();
        this._pluginManager.registerManifest({
            manifest: builtinPanelPluginModule.manifest,
            installPath: 'plugins/builtin-panel',
            trustLevel: 'builtin',
        });
        this._pluginManager.attachModule(builtinPanelPluginModule.manifest.id, builtinPanelPluginModule);
        await this._pluginManager.activatePlugin(builtinPanelPluginModule.manifest.id);

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ browserWindow: {
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            panelBridge?: Awaited<ReturnType<PluginManagerApp['createPanelBridgeClient']>>;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            acquirePanelBridge?: () => Promise<Awaited<ReturnType<PluginManagerApp['createPanelBridgeClient']>>>;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            __PEANUT_PANEL_BRIDGE_CONTEXT__?: {
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                pluginId: string;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                panelId: string;
            };
        } = {};
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ hostPanelContainerLaunchResult = await this._pluginManager.launchPanelContainer(
            builtinPanelPluginModule.manifest.id,
            'builtin.panel.main',
            browserWindow,
        );

        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ attachedPanelBridgeClient = await browserWindow.acquirePanelBridge?.();
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ bridgeResponse =
            attachedPanelBridgeClient == null
                ? null
                : await attachedPanelBridgeClient.request<{}, IPanelStatePayload>({
                      id: 'host-panel-container-launcher:get-state',
                      event: 'builtin.panel.getState',
                      expectsResponse: true,
                      payload: {},
                  });
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ runtimeProvidedLaunchResult = await this._pluginManager.launchPanelContainer(
            builtinPanelPluginModule.manifest.id,
            'builtin.panel.main',
        );
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ runtimeProvidedBridgeResponse =
            runtimeProvidedLaunchResult.panelBridgeClient == null
                ? null
                : await runtimeProvidedLaunchResult.panelBridgeClient.request<{}, IPanelStatePayload>({
                      id: 'host-panel-container-launcher:get-state:auto',
                      event: 'builtin.panel.getState',
                      expectsResponse: true,
                      payload: {},
                  });

        return {
            sessionHasBrowserWindow: hostPanelContainerLaunchResult.session.hasBrowserWindow,
            sessionHasBootstrapScript: hostPanelContainerLaunchResult.session.hasBootstrapScript,
            bootstrapScript: hostPanelContainerLaunchResult.bootstrapScript,
            bridgeResponse,
            acquireBridgeMatches: attachedPanelBridgeClient === hostPanelContainerLaunchResult.panelBridgeClient,
            launchedViaPluginManager: hostPanelContainerLaunchResult.session.entry === 'panels/builtin-panel/index.html',
            runtimeProvidedBridgeResponse,
        };
    }
}
