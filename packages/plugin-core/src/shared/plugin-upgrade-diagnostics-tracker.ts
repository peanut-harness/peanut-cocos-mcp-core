import type { PluginState } from 'peanut-contracts';

import type {
    IPluginUpgradeDiagnostics,
    IPluginUpgradeStepSnapshot,
    PluginUpgradeOutcome,
    PluginUpgradeRecoveryPoint,
    PluginUpgradeStepStatus,
} from './plugin-upgrade-diagnostics.js';

/**
 * @description 可变的升级步骤快照，仅供升级诊断跟踪器内部改写状态。
 */
export interface IMutablePluginUpgradeStepSnapshot {
    /** @description 步骤稳定标识。 */
    id: string;
    /** @description 步骤展示标题。 */
    title: string;
    /** @description 当前步骤状态。 */
    status: PluginUpgradeStepStatus;
    /** @description 当前步骤附加说明。 */
    detail?: string;
}

/**
 * @description 可变的升级诊断记录，仅供升级流程写入中间状态。
 */
export interface IMutablePluginUpgradeDiagnostics {
    /** @description 插件标识。 */
    pluginId: string;
    /** @description 本次尝试对应的新版本插件包路径。 */
    packagePath: string;
    /** @description 升级前版本号。 */
    previousVersion: string;
    /** @description 本次尝试的目标版本号。 */
    targetVersion: string;
    /** @description 升级开始时间，使用 ISO 时间字符串。 */
    startedAt: string;
    /** @description 升级结束时间，使用 ISO 时间字符串。 */
    finishedAt?: string;
    /** @description 本次升级最终结果。 */
    outcome: PluginUpgradeOutcome;
    /** @description 首次失败的步骤标识；未失败时为 `null`。 */
    failureStepId: string | null;
    /** @description 升级结束后的恢复点。 */
    recoveryPoint: PluginUpgradeRecoveryPoint;
    /** @description 是否已执行回滚。 */
    rollbackApplied: boolean;
    /** @description 结束后的运行时版本。 */
    currentRuntimeVersion: string | null;
    /** @description 结束后的运行时状态。 */
    currentRuntimeState: PluginState | null;
    /** @description 结束后的活动安装版本。 */
    activeInstalledVersion: string | null;
    /** @description 升级前面板会话数量。 */
    previousPanelSessionCount: number;
    /** @description 恢复后仍打开的面板会话数量。 */
    restoredPanelSessionCount: number;
    /** @description 是否已恢复旧存储快照。 */
    storageRestored: boolean;
    /** @description 升级失败原因。 */
    failureMessage?: string;
    /** @description 回滚失败原因。 */
    recoveryFailureMessage?: string;
    /** @description 可变步骤列表。 */
    steps: IMutablePluginUpgradeStepSnapshot[];
}

/**
 * @description 插件升级诊断跟踪器，负责步骤状态改写、冻结快照与按插件存取。
 */
export class PluginUpgradeDiagnosticsTracker {
    /** @description 按插件保存最近一次升级诊断快照。 */
    private readonly _diagnosticsStore = new Map<string, IPluginUpgradeDiagnostics>();

    /**
     * @description 创建一次新的可变升级诊断记录。
     * @param pluginId 插件标识
     * @param packagePath 新版本插件包路径
     * @param previousVersion 升级前版本号
     * @param targetVersion 目标版本号
     * @param previousPanelSessionCount 升级前面板会话数量
     * @returns 可变升级诊断记录
     */
    public create(
        pluginId: string,
        packagePath: string,
        previousVersion: string,
        targetVersion: string,
        previousPanelSessionCount: number,
    ): IMutablePluginUpgradeDiagnostics {
        return {
            pluginId,
            packagePath,
            previousVersion,
            targetVersion,
            startedAt: new Date().toISOString(),
            outcome: 'failed',
            failureStepId: null,
            recoveryPoint: 'unrecoverable',
            rollbackApplied: false,
            currentRuntimeVersion: null,
            currentRuntimeState: null,
            activeInstalledVersion: null,
            previousPanelSessionCount,
            restoredPanelSessionCount: 0,
            storageRestored: false,
            steps: [
                {
                    id: 'inspect_package',
                    title: 'Inspect package',
                    status: 'pending',
                },
                {
                    id: 'deactivate_previous_runtime',
                    title: 'Deactivate previous runtime',
                    status: 'pending',
                },
                {
                    id: 'dispose_previous_runtime',
                    title: 'Dispose previous runtime',
                    status: 'pending',
                },
                {
                    id: 'switch_installed_package',
                    title: 'Switch installed package',
                    status: 'pending',
                },
                {
                    id: 'activate_target_runtime',
                    title: 'Activate target runtime',
                    status: 'pending',
                },
                {
                    id: 'restore_target_panel_sessions',
                    title: 'Restore target panel sessions',
                    status: 'pending',
                },
                {
                    id: 'rollback_previous_runtime',
                    title: 'Rollback previous runtime',
                    status: 'pending',
                },
            ],
        };
    }

    /**
     * @description 将指定步骤标记为完成。
     * @param upgradeDiagnostics 可变升级诊断记录
     * @param stepId 步骤标识
     * @param detail 完成说明
     */
    public completeStep(upgradeDiagnostics: IMutablePluginUpgradeDiagnostics, stepId: string, detail: string): void {
        this._updateStep(upgradeDiagnostics, stepId, 'completed', detail);
    }

    /**
     * @description 将指定步骤标记为失败，并记录首个失败步骤。
     * @param upgradeDiagnostics 可变升级诊断记录
     * @param stepId 步骤标识
     * @param detail 失败说明
     */
    public failStep(upgradeDiagnostics: IMutablePluginUpgradeDiagnostics, stepId: string, detail: string): void {
        if (upgradeDiagnostics.failureStepId == null && stepId !== 'rollback_previous_runtime') {
            upgradeDiagnostics.failureStepId = stepId;
        }
        this._updateStep(upgradeDiagnostics, stepId, 'failed', detail);
    }

    /**
     * @description 跳过仍处于 pending 的步骤。
     * @param upgradeDiagnostics 可变升级诊断记录
     * @param detail 跳过说明
     */
    public skipPendingSteps(upgradeDiagnostics: IMutablePluginUpgradeDiagnostics, detail: string): void {
        for (const step of upgradeDiagnostics.steps) {
            if (step.status === 'pending') {
                step.status = 'skipped';
                step.detail = detail;
            }
        }
    }

    /**
     * @description 执行升级步骤并在成功或失败时更新诊断状态。
     * @param upgradeDiagnostics 可变升级诊断记录
     * @param stepId 步骤标识
     * @param action 实际升级动作
     * @param successDetail 成功说明
     * @returns Promise 返回动作结果
     */
    public async runStep<T>(
        upgradeDiagnostics: IMutablePluginUpgradeDiagnostics,
        stepId: string,
        action: () => Promise<T>,
        successDetail: string,
    ): Promise<T> {
        try {
            const result = await action();
            this.completeStep(upgradeDiagnostics, stepId, successDetail);
            return result;
        } catch (error) {
            const normalizedError = error instanceof Error ? error : new Error(String(error));
            this.failStep(upgradeDiagnostics, stepId, normalizedError.message);
            throw error;
        }
    }

    /**
     * @description 将升级诊断冻结为成功结果并写入存储。
     * @param upgradeDiagnostics 可变升级诊断记录
     */
    public finalizeSuccess(upgradeDiagnostics: IMutablePluginUpgradeDiagnostics): void {
        upgradeDiagnostics.finishedAt = new Date().toISOString();
        upgradeDiagnostics.outcome = 'succeeded';
        upgradeDiagnostics.failureStepId = null;
        upgradeDiagnostics.recoveryPoint = 'target_active';
        upgradeDiagnostics.rollbackApplied = false;
        upgradeDiagnostics.storageRestored = false;
        this.skipPendingSteps(upgradeDiagnostics, 'Rollback was not required.');
        this._diagnosticsStore.set(upgradeDiagnostics.pluginId, this.freeze(upgradeDiagnostics));
    }

    /**
     * @description 将升级诊断冻结为回滚结果并写入存储。
     * @param upgradeDiagnostics 可变升级诊断记录
     * @param failureMessage 触发回滚的失败原因
     */
    public finalizeRollback(upgradeDiagnostics: IMutablePluginUpgradeDiagnostics, failureMessage: string): void {
        upgradeDiagnostics.finishedAt = new Date().toISOString();
        upgradeDiagnostics.outcome = 'rolled_back';
        upgradeDiagnostics.recoveryPoint = 'previous_runtime_restored';
        upgradeDiagnostics.rollbackApplied = true;
        upgradeDiagnostics.storageRestored = true;
        upgradeDiagnostics.failureMessage = failureMessage;
        this.skipPendingSteps(upgradeDiagnostics, 'Upgrade rolled back before reaching this step.');
        this._diagnosticsStore.set(upgradeDiagnostics.pluginId, this.freeze(upgradeDiagnostics));
    }

    /**
     * @description 将升级诊断冻结为失败结果并写入存储。
     * @param upgradeDiagnostics 可变升级诊断记录
     * @param failureMessage 升级失败原因
     * @param recoveryFailureMessage 回滚失败原因
     */
    public finalizeFailure(
        upgradeDiagnostics: IMutablePluginUpgradeDiagnostics,
        failureMessage: string,
        recoveryFailureMessage?: string,
    ): void {
        upgradeDiagnostics.finishedAt = new Date().toISOString();
        upgradeDiagnostics.outcome = 'failed';
        upgradeDiagnostics.recoveryPoint = 'unrecoverable';
        upgradeDiagnostics.failureMessage = failureMessage;
        upgradeDiagnostics.recoveryFailureMessage = recoveryFailureMessage;
        this.skipPendingSteps(upgradeDiagnostics, 'Upgrade stopped before reaching this step.');
        this._diagnosticsStore.set(upgradeDiagnostics.pluginId, this.freeze(upgradeDiagnostics));
    }

    /**
     * @description 将可变诊断记录冻结为只读快照。
     * @param upgradeDiagnostics 可变升级诊断记录
     * @returns 只读升级诊断快照
     */
    public freeze(upgradeDiagnostics: IMutablePluginUpgradeDiagnostics): IPluginUpgradeDiagnostics {
        const steps: IPluginUpgradeStepSnapshot[] = upgradeDiagnostics.steps.map((step) => {
            return {
                id: step.id,
                title: step.title,
                status: step.status,
                detail: step.detail,
            };
        });

        return {
            pluginId: upgradeDiagnostics.pluginId,
            packagePath: upgradeDiagnostics.packagePath,
            previousVersion: upgradeDiagnostics.previousVersion,
            targetVersion: upgradeDiagnostics.targetVersion,
            startedAt: upgradeDiagnostics.startedAt,
            finishedAt: upgradeDiagnostics.finishedAt,
            outcome: upgradeDiagnostics.outcome,
            failureStepId: upgradeDiagnostics.failureStepId,
            recoveryPoint: upgradeDiagnostics.recoveryPoint,
            rollbackApplied: upgradeDiagnostics.rollbackApplied,
            currentRuntimeVersion: upgradeDiagnostics.currentRuntimeVersion,
            currentRuntimeState: upgradeDiagnostics.currentRuntimeState,
            activeInstalledVersion: upgradeDiagnostics.activeInstalledVersion,
            previousPanelSessionCount: upgradeDiagnostics.previousPanelSessionCount,
            restoredPanelSessionCount: upgradeDiagnostics.restoredPanelSessionCount,
            storageRestored: upgradeDiagnostics.storageRestored,
            failureMessage: upgradeDiagnostics.failureMessage,
            recoveryFailureMessage: upgradeDiagnostics.recoveryFailureMessage,
            steps,
        };
    }

    /**
     * @description 读取指定插件最近一次升级诊断。
     * @param pluginId 插件标识
     * @returns 升级诊断快照；不存在时返回 `null`
     */
    public get(pluginId: string): IPluginUpgradeDiagnostics | null {
        return this._diagnosticsStore.get(pluginId) ?? null;
    }

    /**
     * @description 列出全部已保存的升级诊断快照。
     * @returns 升级诊断快照列表
     */
    public list(): readonly IPluginUpgradeDiagnostics[] {
        return [...this._diagnosticsStore.values()];
    }

    /**
     * @description 删除指定插件的升级诊断快照。
     * @param pluginId 插件标识
     * @returns 删除成功时返回 `true`
     */
    public delete(pluginId: string): boolean {
        return this._diagnosticsStore.delete(pluginId);
    }

    /**
     * @description 更新单个升级步骤状态。
     * @param upgradeDiagnostics 可变升级诊断记录
     * @param stepId 步骤标识
     * @param status 目标状态
     * @param detail 附加说明
     */
    private _updateStep(
        upgradeDiagnostics: IMutablePluginUpgradeDiagnostics,
        stepId: string,
        status: PluginUpgradeStepStatus,
        detail: string,
    ): void {
        const upgradeStep = upgradeDiagnostics.steps.find((step) => {
            return step.id === stepId;
        });
        if (upgradeStep == null) {
            return;
        }
        upgradeStep.status = status;
        upgradeStep.detail = detail;
    }
}
