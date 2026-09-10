import type { IChangeSetEntry, IPluginError } from '../result/result-contracts.js';
import type { ContractPayload, IsoDateTimeString, PluginId, TaskId } from '../shared/common-contracts.js';

/**
 * @description 任务优先级。
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * @description 任务作用域。
 */
export type TaskScope = 'message' | 'asset' | 'scene' | 'panel' | 'selection' | 'project' | 'build';

/**
 * @description 任务合并策略。
 */
export type TaskMergePolicy = 'none' | 'dedupe' | 'coalesce' | 'batch_commit';

/**
 * @description 任务运行状态。
 */
export type TaskStatus = 'queued' | 'planning' | 'waiting_commit' | 'running' | 'succeeded' | 'failed' | 'cancelled';

/**
 * @description 任务执行轨迹状态。
 */
export type TaskTraceStatus = 'planned' | 'running' | 'completed' | 'skipped' | 'failed';

/**
 * @description 插件任务请求。
 */
export interface ITaskRequest {
    /**
     * @description 调用方自带的稳定请求标识。
     */
    readonly requestId: string;

    /**
     * @description 发起任务的插件标识。
     */
    readonly pluginId: PluginId;

    /**
     * @description 任务作用域。
     */
    readonly scope: TaskScope;

    /**
     * @description 调度优先级。
     */
    readonly priority: TaskPriority;

    /**
     * @description 任务处理器或动作标识。
     */
    readonly kind: string;

    /**
     * @description 任务输入载荷。
     */
    readonly payload?: ContractPayload;

    /**
     * @description 请求的任务合并策略。
     */
    readonly mergePolicy?: TaskMergePolicy;

    /**
     * @description 幂等键，用于同类请求去重。
     */
    readonly idempotencyKey?: string;

    /**
     * @description 任务超时时间，单位为毫秒。
     */
    readonly timeoutMs?: number;

    /**
     * @description 是否需要显式确认后才能提交。
     */
    readonly requiresConfirm?: boolean;
}

/**
 * @description 单任务受理回执。
 */
export interface ITaskReceipt {
    /**
     * @description 运行时分配的任务标识。
     */
    readonly taskId: TaskId;

    /**
     * @description 首次受理时的任务状态。
     */
    readonly status: TaskStatus;
}

/**
 * @description 批任务受理回执。
 */
export interface ITaskBatchReceipt {
    /**
     * @description 批请求稳定标识。
     */
    readonly batchId: string;

    /**
     * @description 批内各任务的回执列表。
     */
    readonly receipts: readonly ITaskReceipt[];
}

/**
 * @description 任务轨迹步骤。
 */
export interface ITaskTraceStep {
    /**
     * @description 步骤稳定标识。
     */
    readonly id: string;

    /**
     * @description 步骤标题。
     */
    readonly title: string;

    /**
     * @description 当前步骤状态。
     */
    readonly status: TaskTraceStatus;

    /**
     * @description 附加说明。
     */
    readonly detail?: string;
}

/**
 * @description 统一任务执行轨迹。
 */
export interface ITaskTrace {
    /**
     * @description 轨迹稳定标识。
     */
    readonly traceId: string;

    /**
     * @description 当前任务标识。
     */
    readonly taskId: TaskId;

    /**
     * @description 实际执行的任务种类。
     */
    readonly kind: string;

    /**
     * @description 轨迹开始时间，使用 ISO 时间字符串。
     */
    readonly startedAt: IsoDateTimeString;

    /**
     * @description 轨迹结束时间，使用 ISO 时间字符串。
     */
    readonly finishedAt?: IsoDateTimeString;

    /**
     * @description 轨迹步骤列表。
     */
    readonly steps: readonly ITaskTraceStep[];
}

/**
 * @description 任务快照。
 */
export interface ITaskSnapshot {
    /**
     * @description 任务标识。
     */
    readonly taskId: TaskId;

    /**
     * @description 发起任务的插件标识。
     */
    readonly pluginId: PluginId;

    /**
     * @description 当前任务状态。
     */
    readonly status: TaskStatus;

    /**
     * @description 当前任务作用域。
     */
    readonly scope: TaskScope;

    /**
     * @description 当前任务种类。
     */
    readonly kind: string;

    /**
     * @description 创建时间，使用 ISO 时间字符串。
     */
    readonly createdAt: IsoDateTimeString;

    /**
     * @description 更新时间，使用 ISO 时间字符串。
     */
    readonly updatedAt: IsoDateTimeString;
}

/**
 * @description 任务取消结果。
 */
export interface ITaskCancelResult {
    /**
     * @description 被取消的任务标识。
     */
    readonly taskId: TaskId;

    /**
     * @description 是否取消成功。
     */
    readonly cancelled: boolean;

    /**
     * @description 取消失败或忽略的原因。
     */
    readonly reason?: string;
}

/**
 * @description 统一任务执行结果。
 */
export interface ITaskResult<TData = ContractPayload> {
    /**
     * @description 任务标识。
     */
    readonly taskId: TaskId;

    /**
     * @description 是否执行成功。
     */
    readonly ok: boolean;

    /**
     * @description 完成后的任务状态。
     */
    readonly status: TaskStatus;

    /**
     * @description 执行返回数据。
     */
    readonly data?: TData;

    /**
     * @description 变更摘要列表。
     */
    readonly changes: readonly IChangeSetEntry[];

    /**
     * @description 结构化轨迹。
     */
    readonly trace: ITaskTrace;

    /**
     * @description 结构化错误。
     */
    readonly error?: IPluginError;
}
