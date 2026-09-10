import type {
    ICleanupStepResult,
    IPanelBridgeResponse,
    IPluginFailureExport,
    IPluginInstallPlan,
    IPluginInstallResult,
    IPluginPackResult,
    IPluginRuntimeRecord,
    IPluginUninstallResult,
} from 'peanut-contracts';
import { PackagingApp } from 'peanut-packaging';
import { RuntimeFacade } from 'peanut-runtime';

import { PluginManagerApp } from '../app/plugin-manager-app.js';
import { HotplugFailurePluginModule } from './hotplug-failure-plugin-module.js';

interface IHotplugFailurePanelPayload extends Record<string, unknown> {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly pluginId: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly panelId: string;
}

/**
 * @description 第三方热插拔恢复验收入口，用于串联 package、install、停用失败、incident 导出、cleanup retry、重新激活与卸载闭环。
 */
export class HotplugRecoveryAcceptanceHarness {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _runtime: RuntimeFacade;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _packaging: PackagingApp;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginManager: PluginManagerApp;

    /**
     * @description 创建一个新的第三方热插拔恢复验收入口。
     * @param creatorVersion 当前宿主绑定的 Creator 版本字符串
     */
    public constructor(creatorVersion: string) {
        this._runtime = new RuntimeFacade(creatorVersion);
        this._packaging = new PackagingApp();
        this._pluginManager = new PluginManagerApp(this._runtime, this._packaging);
    }

    /**
     * @description 执行一次完整的第三方热插拔恢复验收流程。
     * @returns Promise 返回安装、失败导出、cleanup retry、重新激活与卸载全链路结果
     */
    public async run(): Promise<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        packResult: IPluginPackResult;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        installPlan: IPluginInstallPlan;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        installResult: IPluginInstallResult;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        deactivateFailureMessage: string | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        failedRuntimeRecord: IPluginRuntimeRecord | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        failureExport: IPluginFailureExport | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        retryCleanupStepResults: readonly ICleanupStepResult[];
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        reactivatedRuntimeRecord: IPluginRuntimeRecord | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        recoveredPanelStateResponse: IPanelBridgeResponse<IHotplugFailurePanelPayload>;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        finalInactiveState: string | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        finalDisposedState: string | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        uninstallResult: IPluginUninstallResult;
    }> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ hotplugFailurePluginModule = new HotplugFailurePluginModule({
            disposerFailureCount: 1,
            pluginId: 'hotplug.acceptance.plugin',
        });
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ packResult = await this._packaging.pack('plugins/hotplug-acceptance-plugin', hotplugFailurePluginModule.manifest);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ installPlan = await this._pluginManager.planInstallPackage(packResult.packagePath);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ installResult = await this._pluginManager.installPackage(packResult.packagePath);

        this._pluginManager.registerManifest({
            manifest: hotplugFailurePluginModule.manifest,
            installPath: installResult.installPath,
            trustLevel: 'community',
        });
        this._pluginManager.attachModule(hotplugFailurePluginModule.manifest.id, hotplugFailurePluginModule);
        await this._pluginManager.activatePlugin(hotplugFailurePluginModule.manifest.id);

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        let /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ deactivateFailureMessage: string | null = null;
        try {
            await this._pluginManager.deactivatePlugin(hotplugFailurePluginModule.manifest.id, 'manual_disable');
        } catch (/* 捕获当前操作失败的异常信息，用于生成失败结果或保留诊断上下文。 */ error) {
            deactivateFailureMessage = error instanceof Error ? error.message : 'unknown_hotplug_recovery_error';
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ failedRuntimeRecord = this._getRuntimeRecord(hotplugFailurePluginModule.manifest.id);
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ failureExport = this._pluginManager.exportFailureIncident(hotplugFailurePluginModule.manifest.id);

        hotplugFailurePluginModule.clearDisposerFailures();
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ retryCleanupStepResults = await this._pluginManager.retryCleanup(hotplugFailurePluginModule.manifest.id);
        await this._pluginManager.activatePlugin(hotplugFailurePluginModule.manifest.id);

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelBridgeClient = this._pluginManager.createPanelBridgeClient(
            hotplugFailurePluginModule.manifest.id,
            hotplugFailurePluginModule.panelId,
        );
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ recoveredPanelStateResponse = await panelBridgeClient.request<{}, IHotplugFailurePanelPayload>({
            id: 'hotplug-recovery-panel-state',
            event: 'hotplug.failure.getState',
            expectsResponse: true,
            payload: {},
        });
        await panelBridgeClient.dispose();

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ reactivatedRuntimeRecord = this._getRuntimeRecord(hotplugFailurePluginModule.manifest.id);
        await this._pluginManager.deactivatePlugin(hotplugFailurePluginModule.manifest.id, 'manual_disable');
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ finalInactiveState = this._getRuntimeRecord(hotplugFailurePluginModule.manifest.id)?.state ?? null;
        await this._pluginManager.disposePlugin(hotplugFailurePluginModule.manifest.id);
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ finalDisposedState = this._getRuntimeRecord(hotplugFailurePluginModule.manifest.id)?.state ?? null;
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ uninstallResult = await this._pluginManager.uninstallPackage(hotplugFailurePluginModule.manifest.id);

        return {
            packResult,
            installPlan,
            installResult,
            deactivateFailureMessage,
            failedRuntimeRecord,
            failureExport,
            retryCleanupStepResults,
            reactivatedRuntimeRecord,
            recoveredPanelStateResponse,
            finalInactiveState,
            finalDisposedState,
            uninstallResult,
        };
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _getRuntimeRecord(pluginId: string): IPluginRuntimeRecord | null {
        return (
            this._pluginManager.listRuntimeRecords().find((pluginRuntimeRecord) => {
                return pluginRuntimeRecord.pluginId === pluginId;
            }) ?? null
        );
    }
}
