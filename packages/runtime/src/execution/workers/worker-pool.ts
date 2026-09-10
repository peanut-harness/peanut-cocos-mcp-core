import type { TaskMergePolicy } from 'peanut-contracts';

import type { IAcceptedTask } from '../ingress/task-ingress.js';
import type { ITaskPlanningSnapshot } from '../snapshot/task-snapshot-inspector.js';
import { TaskSnapshotInspector } from '../snapshot/task-snapshot-inspector.js';

/**
 * @description Worker 池骨架，后续用于承载纯计算规划任务。
 */
export interface IWorkerPlanSummary {
    /**
     * @description 被规划的任务组标识。
     */
    readonly groupId: string;

    /**
     * @description 当前规划包含的任务标识列表。
     */
    readonly taskIds: readonly string[];

    /**
     * @description 当前规划对应的合并策略。
     */
    readonly mergePolicy: TaskMergePolicy | 'none';

    /**
     * @description 当前规划包含的任务数量。
     */
    readonly taskCount: number;

    /**
     * @description 当前规划涉及的资源目标列表。
     */
    readonly targets: readonly string[];

    /**
     * @description 当前规划捕获到的任务快照列表。
     */
    readonly snapshots: readonly ITaskPlanningSnapshot[];
}

/** @description 定义承担当前模块核心职责的类，并集中管理其依赖与运行状态。 */
export class WorkerPool {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _snapshotInspector: TaskSnapshotInspector | null;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _planDelayMs: number;

    /**
     * @description 创建一个新的 Worker 池。
     * @param snapshotInspector 可选任务快照检查器
     * @param planDelayMs 可选规划阶段延迟，单位毫秒
     */
    public constructor(snapshotInspector?: TaskSnapshotInspector | null, planDelayMs: number = 0) {
        this._snapshotInspector = snapshotInspector ?? null;
        this._planDelayMs = planDelayMs;
    }

    /**
     * @description 为指定任务执行规划阶段。
     * @param groupId 任务组标识
     * @param tasks 当前规划包含的任务列表
     * @param mergePolicy 当前规划对应的合并策略
     * @returns Promise 返回规划摘要
     */
    public async plan(
        groupId: string,
        tasks: readonly IAcceptedTask[],
        mergePolicy: TaskMergePolicy | 'none',
    ): Promise<IWorkerPlanSummary> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ snapshotInspector = this._snapshotInspector;
        if (this._planDelayMs > 0) {
            await new Promise((resolve) => {
                setTimeout(resolve, this._planDelayMs);
            });
        }

        return {
            groupId,
            taskIds: tasks.map((task) => {
                return task.taskId;
            }),
            mergePolicy,
            taskCount: tasks.length,
            targets: tasks.map((task) => {
                return this._resolveTarget(task);
            }),
            snapshots:
                snapshotInspector == null
                    ? []
                    : tasks.map((task) => {
                          return snapshotInspector.capture(task);
                      }),
        };
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _resolveTarget(task: IAcceptedTask): string {
        if (typeof task.request.payload !== 'object' || task.request.payload == null) {
            return `${task.request.scope}:${task.request.kind}`;
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ payloadRecord = task.request.payload as Record<string, unknown>;
        if (typeof payloadRecord.pathOrUuid === 'string') {
            return payloadRecord.pathOrUuid;
        }
        if (typeof payloadRecord.nodeId === 'string') {
            return payloadRecord.nodeId;
        }

        return `${task.request.scope}:${task.request.kind}`;
    }
}


