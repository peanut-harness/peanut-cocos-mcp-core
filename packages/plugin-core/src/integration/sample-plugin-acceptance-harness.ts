import type {
    IPanelBridgeResponse,
    IPluginInstallPlan,
    IPluginInstallResult,
    IPluginPackageInspection,
    IPluginPackResult,
    IPluginRuntimeRecord,
    IPluginUninstallResult,
} from 'peanut-contracts';
import { PackagingApp } from 'peanut-packaging';
import { RuntimeFacade } from 'peanut-runtime';

import { PluginManagerApp } from '../app/plugin-manager-app.js';
import { SamplePluginModule } from './sample-plugin-module.js';

interface IPanelStatePayload extends Record<string, unknown> {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly pluginId: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly activeIds: readonly string[];
}

interface ITaskResultPayload extends Record<string, unknown> {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly taskId: string | null;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly status: string | null;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly kind: string | null;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly mergePolicy: unknown | null;
}

interface ITaskTracePayload extends Record<string, unknown> {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly taskId: string | null;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly traceId: string | null;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly stepCount: number;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly firstStepStatus: string | null;
}

/**
 * @description 第三方样例插件验收入口，用于串联 package、install、activate、panel 和 uninstall 闭环。
 */
export class SamplePluginAcceptanceHarness {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _runtime: RuntimeFacade;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _packaging: PackagingApp;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginManager: PluginManagerApp;

    /**
     * @description 创建一个新的第三方样例插件验收入口。
     * @param creatorVersion 当前宿主绑定的 Creator 版本字符串
     */
    public constructor(creatorVersion: string) {
        this._runtime = new RuntimeFacade(creatorVersion);
        this._packaging = new PackagingApp();
        this._pluginManager = new PluginManagerApp(this._runtime, this._packaging);
    }

    /**
     * @description 执行一次完整的第三方样例插件验收流程。
     * @returns Promise 返回打包、安装、激活和卸载全链路结果
     */
    public async run(): Promise<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        packResult: IPluginPackResult;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        inspection: IPluginPackageInspection;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        installPlan: IPluginInstallPlan;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        installResult: IPluginInstallResult;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        runtimeRecord: IPluginRuntimeRecord | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        panelStateResponse: IPanelBridgeResponse<IPanelStatePayload>;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        taskResultResponse: IPanelBridgeResponse<ITaskResultPayload>;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        taskTraceResponse: IPanelBridgeResponse<ITaskTracePayload>;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        inactiveState: string | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        disposedState: string | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        uninstallResult: IPluginUninstallResult;
    }> {
        await this._runtime.selection.setActiveIds(['selection-node-a', 'selection-node-b']);
        await this._runtime.project.configure('projects/sample-plugin', 'Sample Plugin Project');
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ samplePluginModule = new SamplePluginModule();
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ packResult = await this._packaging.pack('plugins/sample-plugin', samplePluginModule.manifest);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ inspection = await this._pluginManager.inspectPackage(packResult.packagePath);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ installPlan = await this._pluginManager.planInstallPackage(packResult.packagePath);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ installResult = await this._pluginManager.installPackage(packResult.packagePath);

        this._pluginManager.registerManifest({
            manifest: samplePluginModule.manifest,
            installPath: installResult.installPath,
            trustLevel: 'community',
        });
        this._pluginManager.attachModule(samplePluginModule.manifest.id, samplePluginModule);
        await this._pluginManager.activatePlugin(samplePluginModule.manifest.id);

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelBridgeClient = this._pluginManager.createPanelBridgeClient(samplePluginModule.manifest.id, 'sample.panel');
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ panelStateResponse = await panelBridgeClient.request<{ includeSelection: boolean }, IPanelStatePayload>({
            id: 'sample-acceptance-state',
            event: 'sample.getState',
            expectsResponse: true,
            payload: {
                includeSelection: true,
            },
        });
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ taskResultResponse = await panelBridgeClient.request<{}, ITaskResultPayload>({
            id: 'sample-acceptance-task-result',
            event: 'sample.getTaskResult',
            expectsResponse: true,
            payload: {},
        });
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ taskTraceResponse = await panelBridgeClient.request<{}, ITaskTracePayload>({
            id: 'sample-acceptance-task-trace',
            event: 'sample.getTaskTrace',
            expectsResponse: true,
            payload: {},
        });
        await panelBridgeClient.dispose();

        await this._pluginManager.deactivatePlugin(samplePluginModule.manifest.id, 'manual_disable');
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ inactiveState =
            this._pluginManager.listRuntimeRecords().find((pluginRuntimeRecord) => {
                return pluginRuntimeRecord.pluginId === samplePluginModule.manifest.id;
            })?.state ?? null;
        await this._pluginManager.disposePlugin(samplePluginModule.manifest.id);
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ disposedState =
            this._pluginManager.listRuntimeRecords().find((pluginRuntimeRecord) => {
                return pluginRuntimeRecord.pluginId === samplePluginModule.manifest.id;
            })?.state ?? null;
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ runtimeRecord =
            this._pluginManager.listRuntimeRecords().find((pluginRuntimeRecord) => {
                return pluginRuntimeRecord.pluginId === samplePluginModule.manifest.id;
            }) ?? null;
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ uninstallResult = await this._pluginManager.uninstallPackage(samplePluginModule.manifest.id);

        return {
            packResult,
            inspection,
            installPlan,
            installResult,
            runtimeRecord,
            panelStateResponse,
            taskResultResponse,
            taskTraceResponse,
            inactiveState,
            disposedState,
            uninstallResult,
        };
    }
}
