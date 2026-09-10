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
 * @description Editor API 宿主安装样例验证入口，演示宿主先安装窗口工厂，再由 plugin-manager 启动面板容器的完整链路。
 */
export class EditorApiHostInstallationHarness {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _hostGlobal: Record<string, unknown>;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _runtime: RuntimeFacade;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginManager: PluginManagerApp;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private _lastHostWindow:
        | {
              /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
              hostWindowId: string;
              /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
              loadedEntries: string[];
              /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
              injectedScripts: string[];
          }
        | null = null;

    /**
     * @description 创建一个新的 Editor API 宿主安装样例验证入口。
     * @param creatorVersion 当前宿主绑定的 Creator 版本字符串
     */
    public constructor(creatorVersion: string) {
        this._hostGlobal = {};
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ harness = this;
        new EditorApiPanelHostInstaller(this._hostGlobal).installWindowFactory({
            /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            async createWindow(): Promise<{ loadURL: (entry: string) => void; executeJavaScript: (script: string) => void; hostWindowId: string; loadedEntries: string[]; injectedScripts: string[] }> {
                // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
                const /* 累积当前流程产生的有序结果，供后续步骤统一返回或消费。 */ loadedEntries: string[] = [];
                // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
                const /* 累积当前流程产生的有序结果，供后续步骤统一返回或消费。 */ injectedScripts: string[] = [];
                harness._lastHostWindow = {
                    hostWindowId: 'editor-api-installed-window',
                    loadedEntries,
                    injectedScripts,
                };
                return {
                    loadURL: (entry: string): void => {
                        loadedEntries.push(entry);
                    },
                    executeJavaScript: (script: string): void => {
                        injectedScripts.push(script);
                    },
                    hostWindowId: harness._lastHostWindow.hostWindowId,
                    loadedEntries,
                    injectedScripts,
                };
            },
        });
        this._runtime = new RuntimeFacade(creatorVersion, {
            editorApiHostGlobal: this._hostGlobal,
        });
        this._pluginManager = new PluginManagerApp(this._runtime);
    }

    /**
     * @description 运行一次真实宿主安装样例链路。
     * @returns Promise 返回面板桥响应与宿主窗口快照摘要
     */
    public async run(): Promise<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        bridgeResponse: IPanelBridgeResponse<IPanelStatePayload> | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        hostWindowId: string | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        loadedEntries: readonly string[];
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        injectedScripts: readonly string[];
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

        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ hostPanelContainerLaunchResult = await this._pluginManager.launchPanelContainer(
            builtinPanelPluginModule.manifest.id,
            'builtin.panel.main',
        );
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelBridgeClient = hostPanelContainerLaunchResult.panelBridgeClient;
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ bridgeResponse =
            panelBridgeClient == null
                ? null
                : await panelBridgeClient.request<{}, IPanelStatePayload>({
                      id: 'editor-api-host-installation:get-state',
                      event: 'builtin.panel.getState',
                      expectsResponse: true,
                      payload: {},
                  });

        return {
            bridgeResponse,
            hostWindowId: this._lastHostWindow?.hostWindowId ?? null,
            loadedEntries: this._lastHostWindow?.loadedEntries ?? [],
            injectedScripts: this._lastHostWindow?.injectedScripts ?? [],
        };
    }
}
