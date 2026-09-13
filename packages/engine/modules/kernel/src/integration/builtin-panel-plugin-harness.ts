import type { IPanelBridgeEnvelope, IPanelBridgeResponse, IPluginRuntimeRecord } from '@peanut/pod-protocol';
import { RuntimeFacade } from '@peanut/pod-engine/runtime';

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
 * @description 内置面板插件验证入口，用于端到端检查 panel contribution、桥接和回收链路。
 */
export class BuiltinPanelPluginHarness {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _runtime: RuntimeFacade;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginManager: PluginManagerApp;

    /**
     * @description 创建一个新的内置面板插件验证入口。
     * @param creatorVersion 当前宿主绑定的 Creator 版本字符串
     */
    public constructor(creatorVersion: string) {
        this._runtime = new RuntimeFacade(creatorVersion);
        this._pluginManager = new PluginManagerApp(this._runtime);
    }

    /**
     * @description 激活内置面板插件并验证请求、通知、消息和开关面板链路。
     * @returns Promise 返回运行时记录、请求结果和通知快照
     */
    public async run(): Promise<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        runtimeRecord: IPluginRuntimeRecord | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        initialStateResponse: IPanelBridgeResponse<IPanelStatePayload>;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        emittedStateResponse: IPanelBridgeResponse<IPanelStatePayload>;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        closedStateResponse: IPanelBridgeResponse<IPanelStatePayload>;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        reopenedStateResponse: IPanelBridgeResponse<IPanelStatePayload>;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        notifications: readonly IPanelBridgeEnvelope<IPanelStatePayload>[];
    }> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const builtinPanelPluginModule = new BuiltinPanelPluginModule();
        this._pluginManager.registerManifest({
            manifest: builtinPanelPluginModule.manifest,
            installPath: 'plugins/builtin-panel',
            trustLevel: 'builtin',
        });
        this._pluginManager.attachModule(builtinPanelPluginModule.manifest.id, builtinPanelPluginModule);
        await this._pluginManager.activatePlugin(builtinPanelPluginModule.manifest.id);

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelBridgeClient = this._pluginManager.createPanelBridgeClient(builtinPanelPluginModule.manifest.id, 'builtin.panel.main');
        // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
        const notifications: IPanelBridgeEnvelope<IPanelStatePayload>[] = [];
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const unsubscribe = panelBridgeClient.subscribe<IPanelStatePayload>('builtin.panel.state', (envelope): void => {
            notifications.push(envelope);
        });

        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const initialStateResponse = await panelBridgeClient.request<{}, IPanelStatePayload>({
            id: 'builtin-panel-get-state',
            event: 'builtin.panel.getState',
            expectsResponse: true,
            payload: {},
        });
        await panelBridgeClient.postMessage({
            id: 'builtin-panel-ping',
            event: 'builtin.panel.ping',
            payload: {
                source: 'panel-client',
            },
        });
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const emittedStateResponse = await panelBridgeClient.request<{}, IPanelStatePayload>({
            id: 'builtin-panel-emit-state',
            event: 'builtin.panel.emitState',
            expectsResponse: true,
            payload: {},
        });
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const closedStateResponse = await panelBridgeClient.request<{ isOpen: boolean }, IPanelStatePayload>({
            id: 'builtin-panel-close',
            event: 'builtin.panel.setOpenState',
            expectsResponse: true,
            payload: {
                isOpen: false,
            },
        });
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const reopenedStateResponse = await panelBridgeClient.request<{ isOpen: boolean }, IPanelStatePayload>({
            id: 'builtin-panel-open',
            event: 'builtin.panel.setOpenState',
            expectsResponse: true,
            payload: {
                isOpen: true,
            },
        });

        unsubscribe();
        await panelBridgeClient.dispose();

        return {
            runtimeRecord:
                this._pluginManager
                    .listRuntimeRecords()
                    .find((pluginRuntimeRecord) => {
                        return pluginRuntimeRecord.pluginId === builtinPanelPluginModule.manifest.id;
                    }) ?? null,
            initialStateResponse,
            emittedStateResponse,
            closedStateResponse,
            reopenedStateResponse,
            notifications,
        };
    }

    /**
     * @description 激活后执行停用与释放，验证面板桥在停用后不再可用。
     * @returns Promise 返回停用后的状态摘要
     */
    public async runDeactivateFlow(): Promise<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        inactiveState: string | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        disposedState: string | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        panelBridgeReleased: boolean;
    }> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const builtinPanelPluginModule = new BuiltinPanelPluginModule();
        this._pluginManager.registerManifest({
            manifest: builtinPanelPluginModule.manifest,
            installPath: 'plugins/builtin-panel',
            trustLevel: 'builtin',
        });
        this._pluginManager.attachModule(builtinPanelPluginModule.manifest.id, builtinPanelPluginModule);
        await this._pluginManager.activatePlugin(builtinPanelPluginModule.manifest.id);
        await this._pluginManager.deactivatePlugin(builtinPanelPluginModule.manifest.id, 'manual_disable');
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const inactiveState =
            this._pluginManager
                .listRuntimeRecords()
                .find((pluginRuntimeRecord) => {
                    return pluginRuntimeRecord.pluginId === builtinPanelPluginModule.manifest.id;
                })?.state ?? null;

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        let panelBridgeReleased = false;
        try {
            this._pluginManager.createPanelBridgeClient(builtinPanelPluginModule.manifest.id, 'builtin.panel.main');
        } catch {
            panelBridgeReleased = true;
        }

        await this._pluginManager.disposePlugin(builtinPanelPluginModule.manifest.id);
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const disposedState =
            this._pluginManager
                .listRuntimeRecords()
                .find((pluginRuntimeRecord) => {
                    return pluginRuntimeRecord.pluginId === builtinPanelPluginModule.manifest.id;
                })?.state ?? null;

        return {
            inactiveState,
            disposedState,
            panelBridgeReleased,
        };
    }
}
