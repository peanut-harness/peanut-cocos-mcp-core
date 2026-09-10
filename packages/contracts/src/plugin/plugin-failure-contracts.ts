import type { IsoDateTimeString, PluginId } from '../shared/common-contracts.js';

/**
 * @description 插件失败阶段。
 */
export type PluginFailurePhase =
    | 'host_compatibility'
    | 'module_load'
    | 'activation_prepare'
    | 'register'
    | 'activate'
    | 'deactivate'
    | 'dispose'
    | 'cleanup'
    | 'cleanup_retry';

/**
 * @description 单个清理步骤结果。
 */
export interface ICleanupStepResult {
    /**
     * @description 步骤稳定标识。
     */
    readonly stepId: string;

    /**
     * @description 步骤所属阶段。
     */
    readonly phase: PluginFailurePhase;

    /**
     * @description 步骤目标类型。
     */
    readonly targetType: 'lease' | 'panel' | 'lifecycle';

    /**
     * @description 步骤目标标识。
     */
    readonly targetId: string;

    /**
     * @description 当前步骤是否执行成功。
     */
    readonly ok: boolean;

    /**
     * @description 当前步骤摘要。
     */
    readonly summary: string;

    /**
     * @description 失败时的错误消息。
     */
    readonly errorMessage?: string;
}

/**
 * @description 插件失败事件记录。
 */
export interface IPluginFailureIncident {
    /**
     * @description 插件标识。
     */
    readonly pluginId: PluginId;

    /**
     * @description 失败阶段。
     */
    readonly phase: PluginFailurePhase;

    /**
     * @description 失败前的插件状态。
     */
    readonly previousState: string | null;

    /**
     * @description 失败记录写入时间，使用 ISO 时间字符串。
     */
    readonly failedAt: IsoDateTimeString;

    /**
     * @description 是否保留安装结果。
     */
    readonly installPreserved: boolean;

    /**
     * @description 主失败消息。
     */
    readonly errorMessage: string;

    /**
     * @description 主失败堆栈。
     */
    readonly errorStack?: string;

    /**
     * @description 本次失败关联的清理步骤结果。
     */
    readonly cleanupSteps: readonly ICleanupStepResult[];
}

/**
 * @description 用于导出的插件失败报告。
 */
export interface IPluginFailureExport {
    /**
     * @description 插件标识。
     */
    readonly pluginId: PluginId;

    /**
     * @description 报告导出时间，使用 ISO 时间字符串。
     */
    readonly exportedAt: IsoDateTimeString;

    /**
     * @description 当前失败事件。
     */
    readonly incident: IPluginFailureIncident;

    /**
     * @description 结构化导出文本。
     */
    readonly serializedIncident: string;
}


