import type { IsoDateTimeString, PluginId, PluginState, PluginVersion } from 'peanut-contracts';

/**
 * @description 插件升级步骤状态。
 */
export type PluginUpgradeStepStatus = 'pending' | 'completed' | 'skipped' | 'failed';

/**
 * @description 插件升级总体结果。
 */
export type PluginUpgradeOutcome = 'succeeded' | 'rolled_back' | 'failed';

/**
 * @description 升级结束后可供调用方继续执行的稳定恢复点。
 */
export type PluginUpgradeRecoveryPoint = 'target_active' | 'previous_runtime_restored' | 'unrecoverable';

/**
 * @description 单个升级步骤的诊断快照。
 */
export interface IPluginUpgradeStepSnapshot {
    /**
     * @description 步骤稳定标识。
     */
    readonly id: string;

    /**
     * @description 步骤展示标题。
     */
    readonly title: string;

    /**
     * @description 当前步骤状态。
     */
    readonly status: PluginUpgradeStepStatus;

    /**
     * @description 当前步骤附加说明。
     */
    readonly detail?: string;
}

/**
 * @description 单次插件升级尝试的结构化诊断快照。
 */
export interface IPluginUpgradeDiagnostics {
    /**
     * @description 插件标识。
     */
    readonly pluginId: PluginId;

    /**
     * @description 本次尝试对应的新版本插件包路径。
     */
    readonly packagePath: string;

    /**
     * @description 升级前版本号。
     */
    readonly previousVersion: PluginVersion;

    /**
     * @description 本次尝试的目标版本号。
     */
    readonly targetVersion: PluginVersion;

    /**
     * @description 升级开始时间，使用 ISO 时间字符串。
     */
    readonly startedAt: IsoDateTimeString;

    /**
     * @description 升级结束时间，使用 ISO 时间字符串。
     */
    readonly finishedAt?: IsoDateTimeString;

    /**
     * @description 本次升级最终结果。
     */
    readonly outcome: PluginUpgradeOutcome;

    /**
     * @description 首个导致升级中断的状态机步骤；升级成功或 preflight 拒绝时返回 `null`。
     */
    readonly failureStepId: string | null;

    /**
     * @description 本次升级结束后可安全继续操作的恢复点。
     */
    readonly recoveryPoint: PluginUpgradeRecoveryPoint;

    /**
     * @description 是否实际执行了旧版本回退。
     */
    readonly rollbackApplied: boolean;

    /**
     * @description 升级完成后的当前运行时版本；无命中时返回 `null`。
     */
    readonly currentRuntimeVersion: PluginVersion | null;

    /**
     * @description 升级完成后的当前运行时状态；无命中时返回 `null`。
     */
    readonly currentRuntimeState: PluginState | null;

    /**
     * @description 升级完成后的当前活动安装版本；无命中时返回 `null`。
     */
    readonly activeInstalledVersion: PluginVersion | null;

    /**
     * @description 升级前捕获到的面板会话数量。
     */
    readonly previousPanelSessionCount: number;

    /**
     * @description 升级完成后恢复成功的面板会话数量。
     */
    readonly restoredPanelSessionCount: number;

    /**
     * @description 是否已恢复旧版本插件存储快照。
     */
    readonly storageRestored: boolean;

    /**
     * @description 本次升级失败时的主错误消息。
     */
    readonly failureMessage?: string;

    /**
     * @description 旧版本恢复失败时的附加错误消息。
     */
    readonly recoveryFailureMessage?: string;

    /**
     * @description 本次升级各阶段步骤快照。
     */
    readonly steps: readonly IPluginUpgradeStepSnapshot[];
}
