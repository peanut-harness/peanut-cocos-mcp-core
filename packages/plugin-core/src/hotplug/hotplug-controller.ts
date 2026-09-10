import type { ICleanupStepResult, PluginDeactivateReason, PluginFailurePhase } from 'peanut-contracts';

import { PanelManager } from '../panels/panel-manager.js';
import { PluginLeaseStore } from './plugin-lease-store.js';

/**
 * @description 热插拔控制器骨架，负责协调 enable / disable / reload 等编排阶段。
 */
export class HotplugController {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _panelManager: PanelManager;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginLeaseStore: PluginLeaseStore;

    /**
     * @description 创建一个新的热插拔控制器。
     * @param panelManager 面板管理器
     * @param pluginLeaseStore 插件 lease 存储
     */
    public constructor(panelManager: PanelManager, pluginLeaseStore: PluginLeaseStore) {
        this._panelManager = panelManager;
        this._pluginLeaseStore = pluginLeaseStore;
    }

    /**
     * @description 在插件停用前执行统一的清理前置动作。
     * @param pluginId 插件标识
     * @param reason 插件停用原因
     * @returns Promise 返回结构化清理结果列表
     */
    public async beforeDeactivate(pluginId: string, reason: PluginDeactivateReason): Promise<readonly ICleanupStepResult[]> {
        void reason;
        return this.cleanupRuntime(pluginId, 'cleanup');
    }

    /**
     * @description 释放指定插件的运行时副作用。
     * @param pluginId 插件标识
     * @param phase 当前释放动作所属失败阶段
     * @returns Promise 返回结构化清理结果列表
     */
    public async cleanupRuntime(
        pluginId: string,
        phase: PluginFailurePhase,
        preservePanelSessions = false,
    ): Promise<readonly ICleanupStepResult[]> {
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ panelCleanupSteps = await this._panelManager.releasePlugin(pluginId, phase, {
            preserveSessions: preservePanelSessions,
        });
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ leaseCleanupSteps = await this._pluginLeaseStore.releasePlugin(pluginId, phase);
        return [...panelCleanupSteps, ...leaseCleanupSteps];
    }

    /**
     * @description 执行停用编排，确保运行时清理与生命周期步骤都被记录。
     * @param pluginId 插件标识
     * @param reason 插件停用原因
     * @param deactivateAction 实际停用动作
     * @returns Promise 返回结构化步骤结果列表
     */
    public async runDeactivate(
        pluginId: string,
        reason: PluginDeactivateReason,
        deactivateAction: () => Promise<void>,
        preservePanelSessions = false,
    ): Promise<readonly ICleanupStepResult[]> {
        void reason;
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ cleanupStepResults = await this.cleanupRuntime(pluginId, 'cleanup', preservePanelSessions);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ lifecycleStepResult = await this._runLifecycleStep(pluginId, 'deactivate', deactivateAction);
        return [...cleanupStepResults, lifecycleStepResult];
    }

    /**
     * @description 执行释放编排，确保运行时清理与生命周期步骤都被记录。
     * @param pluginId 插件标识
     * @param disposeAction 实际释放动作
     * @returns Promise 返回结构化步骤结果列表
     */
    public async runDispose(
        pluginId: string,
        disposeAction: () => Promise<void>,
        preservePanelSessions = false,
    ): Promise<readonly ICleanupStepResult[]> {
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ cleanupStepResults = await this.cleanupRuntime(pluginId, 'cleanup', preservePanelSessions);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ lifecycleStepResult = await this._runLifecycleStep(pluginId, 'dispose', disposeAction);
        return [...cleanupStepResults, lifecycleStepResult];
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private async _runLifecycleStep(
        pluginId: string,
        phase: Extract<PluginFailurePhase, 'deactivate' | 'dispose'>,
        action: () => Promise<void>,
    ): Promise<ICleanupStepResult> {
        try {
            await action();
            return {
                stepId: `${pluginId}:${phase}`,
                phase,
                targetType: 'lifecycle',
                targetId: pluginId,
                ok: true,
                summary: `Plugin ${phase} completed.`,
            };
        } catch (/* 捕获当前操作失败的异常信息，用于生成失败结果或保留诊断上下文。 */ error) {
            return {
                stepId: `${pluginId}:${phase}`,
                phase,
                targetType: 'lifecycle',
                targetId: pluginId,
                ok: false,
                summary: `Plugin ${phase} failed.`,
                errorMessage: error instanceof Error ? error.message : `unknown_plugin_${phase}_error`,
            };
        }
    }
}
