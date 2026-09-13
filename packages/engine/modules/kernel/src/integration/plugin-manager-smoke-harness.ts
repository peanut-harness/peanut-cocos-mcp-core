import type { IPanelBridgeResponse, IPluginRuntimeRecord } from '@peanut/pod-protocol';
import { RuntimeFacade } from '@peanut/pod-engine/runtime';

import { PluginManagerApp } from '../app/plugin-manager-app.js';
import { SamplePluginModule } from './sample-plugin-module.js';

/**
 * @description PluginManager 骨架冒烟测试入口，用于验证 Runtime、Packaging 和 SamplePlugin 的最小接线流程。
 */
export class PluginManagerSmokeHarness {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _runtime: RuntimeFacade;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginManager: PluginManagerApp;

    /**
     * @description 创建一个新的 PluginManager 冒烟测试入口。
     * @param creatorVersion 当前宿主绑定的 Creator 版本字符串
     */
    public constructor(creatorVersion: string) {
        this._runtime = new RuntimeFacade(creatorVersion);
        this._pluginManager = new PluginManagerApp(this._runtime);
    }

    /**
     * @description 执行样例插件的注册、挂载和激活流程。
     * @returns Promise 返回当前插件运行时记录快照和面板桥响应
     */
    public async run(): Promise<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        runtimeRecords: readonly IPluginRuntimeRecord[];
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        panelResponse: IPanelBridgeResponse<{
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            pluginId: string;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            activeIds: readonly string[];
        }>;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        taskResultResponse: IPanelBridgeResponse<{
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            taskId: string | null;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            status: string | null;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            kind: string | null;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            mergePolicy: unknown | null;
        }>;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        taskTraceResponse: IPanelBridgeResponse<{
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            taskId: string | null;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            traceId: string | null;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            stepCount: number;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            firstStepStatus: string | null;
        }>;
    }> {
        await this._runtime.selection.setActiveIds(['smoke-selection-node']);
        await this._runtime.project.configure('projects/plugin-manager-smoke', 'Plugin Manager Smoke Project');
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ samplePluginModule = new SamplePluginModule();
        this._pluginManager.registerManifest({
            manifest: samplePluginModule.manifest,
            installPath: 'plugins/sample-plugin',
            trustLevel: 'builtin',
        });
        this._pluginManager.attachModule(samplePluginModule.manifest.id, samplePluginModule);
        await this._pluginManager.activatePlugin(samplePluginModule.manifest.id);

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelBridgeClient = this._pluginManager.createPanelBridgeClient(samplePluginModule.manifest.id, 'sample.panel');
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ panelResponse = await panelBridgeClient.request<{ includeSelection: boolean }, { pluginId: string; activeIds: readonly string[] }>({
            id: 'sample-panel-state',
            event: 'sample.getState',
            expectsResponse: true,
            payload: {
                includeSelection: true,
            },
        });
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ taskResultResponse = await panelBridgeClient.request<
            {},
            {
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                taskId: string | null;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                status: string | null;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                kind: string | null;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                mergePolicy: unknown | null;
            }
        >({
            id: 'sample-panel-task-result',
            event: 'sample.getTaskResult',
            expectsResponse: true,
            payload: {},
        });
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ taskTraceResponse = await panelBridgeClient.request<
            {},
            {
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                taskId: string | null;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                traceId: string | null;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                stepCount: number;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                firstStepStatus: string | null;
            }
        >({
            id: 'sample-panel-task-trace',
            event: 'sample.getTaskTrace',
            expectsResponse: true,
            payload: {},
        });
        await panelBridgeClient.dispose();

        return {
            runtimeRecords: this._pluginManager.listRuntimeRecords(),
            panelResponse,
            taskResultResponse,
            taskTraceResponse,
        };
    }

    /**
     * @description 执行样例插件的激活、停用和释放流程，并返回回收后的验证结果。
     * @returns Promise 返回停用与释放后的运行时状态和面板桥可用性结果
     */
    public async runLifecycleCleanup(): Promise<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        inactiveState: string | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        disposedState: string | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        panelBridgeReleased: boolean;
    }> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ samplePluginModule = new SamplePluginModule();
        this._pluginManager.registerManifest({
            manifest: samplePluginModule.manifest,
            installPath: 'plugins/sample-plugin',
            trustLevel: 'builtin',
        });
        this._pluginManager.attachModule(samplePluginModule.manifest.id, samplePluginModule);
        await this._pluginManager.activatePlugin(samplePluginModule.manifest.id);
        await this._pluginManager.deactivatePlugin(samplePluginModule.manifest.id, 'manual_disable');
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ inactiveState =
            this._pluginManager.listRuntimeRecords().find((pluginRuntimeRecord) => {
                return pluginRuntimeRecord.pluginId === samplePluginModule.manifest.id;
            })?.state ?? null;

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        let /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelBridgeReleased = false;
        try {
            this._pluginManager.createPanelBridgeClient(samplePluginModule.manifest.id, 'sample.panel');
        } catch {
            panelBridgeReleased = true;
        }

        await this._pluginManager.disposePlugin(samplePluginModule.manifest.id);
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ disposedState =
            this._pluginManager.listRuntimeRecords().find((pluginRuntimeRecord) => {
                return pluginRuntimeRecord.pluginId === samplePluginModule.manifest.id;
            })?.state ?? null;

        return {
            inactiveState,
            disposedState,
            panelBridgeReleased,
        };
    }
}
