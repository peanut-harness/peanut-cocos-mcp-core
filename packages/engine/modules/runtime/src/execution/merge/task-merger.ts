import type { TaskMergePolicy, TaskPriority } from '@peanut/pod-protocol';

import type { IAcceptedTask } from '../ingress/task-ingress.js';

/**
 * @description 任务合并组。
 */
export interface ITaskMergeGroup {
    /**
     * @description 合并组标识。
     */
    readonly groupId: string;

    /**
     * @description 合并策略；未配置时为 `none`。
     */
    readonly mergePolicy: TaskMergePolicy | 'none';

    /**
     * @description 当前合并组的代表任务标识。
     */
    readonly canonicalTaskId: string;

    /**
     * @description 当前合并组包含的所有任务标识。
     */
    readonly taskIds: readonly string[];

    /**
     * @description 当前合并组对应的资源锁键。
     */
    readonly lockKey: string;

    /**
     * @description 当前合并组的提交优先级。
     */
    readonly priority: TaskPriority;

    /**
     * @description 当前合并组的稳定入队顺序。
     */
    readonly sequence: number;
}

interface ITaskMergeGroupMutable {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    groupId: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    mergePolicy: TaskMergePolicy | 'none';
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    canonicalTaskId: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    taskIds: string[];
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    lockKey: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    priority: TaskPriority;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    sequence: number;
}

/**
 * @description 任务合并器，用于生成 dedupe、coalesce 与 batch-commit 合并组。
 */
export class TaskMerger {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private static _groupSequence: number = 0;

    /**
     * @description 为一批已接收任务生成合并分组。
     * @param tasks 候选任务列表
     * @returns Promise 返回合并分组列表
     */
    public async merge(tasks: readonly IAcceptedTask[]): Promise<readonly ITaskMergeGroup[]> {
        // 维护当前作用域内的映射索引，用于按键查询并关联后续处理数据。
        const /* 维护当前作用域内的映射索引，用于按键查询并关联后续处理数据。 */ taskGroups = new Map<string, ITaskMergeGroupMutable>();

        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ task of tasks) {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ mergePolicy = task.request.mergePolicy ?? 'none';
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ groupKey = this._buildGroupKey(task, mergePolicy);
            // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
            const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ currentGroup = taskGroups.get(groupKey);
            if (currentGroup == null) {
                taskGroups.set(groupKey, {
                    groupId: groupKey,
                    mergePolicy,
                    canonicalTaskId: task.taskId,
                    taskIds: [task.taskId],
                    lockKey: `${task.request.scope}:${task.request.kind}`,
                    priority: task.request.priority,
                    sequence: TaskMerger._nextGroupSequence(),
                });
                continue;
            }

            currentGroup.taskIds.push(task.taskId);
            currentGroup.priority = this._pickHigherPriority(currentGroup.priority, task.request.priority);
        }

        return [...taskGroups.values()].map((group) => {
            return {
                groupId: group.groupId,
                mergePolicy: group.mergePolicy,
                canonicalTaskId: group.canonicalTaskId,
                taskIds: [...group.taskIds],
                lockKey: group.lockKey,
                priority: group.priority,
                sequence: group.sequence,
            };
        });
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private static _nextGroupSequence(): number {
        TaskMerger._groupSequence += 1;
        return TaskMerger._groupSequence;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _pickHigherPriority(left: TaskPriority, right: TaskPriority): TaskPriority {
        return this._priorityRank(left) >= this._priorityRank(right) ? left : right;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _priorityRank(priority: TaskPriority): number {
        switch (priority) {
            case 'critical':
                return 4;
            case 'high':
                return 3;
            case 'normal':
                return 2;
            case 'low':
                return 1;
            default:
                return 0;
        }
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _buildGroupKey(task: IAcceptedTask, mergePolicy: TaskMergePolicy | 'none'): string {
        if (mergePolicy === 'none') {
            return `none:${task.taskId}`;
        }
        if (mergePolicy === 'dedupe') {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ stableKey = task.request.idempotencyKey ?? this._stableStringify(task.request.payload ?? {});
            return `dedupe:${task.request.scope}:${task.request.kind}:${stableKey}`;
        }
        if (mergePolicy === 'coalesce') {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ payloadShapeKey = this._buildPayloadShapeKey(task.request.payload ?? {});
            return `coalesce:${task.request.scope}:${task.request.kind}:${payloadShapeKey}`;
        }
        return `${mergePolicy}:${task.request.scope}:${task.request.kind}`;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _buildPayloadShapeKey(input: unknown): string {
        if (input == null) {
            return 'null';
        }
        if (Array.isArray(input)) {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ itemShapes = input.map((item) => {
                return this._buildPayloadShapeKey(item);
            });
            return `array:[${itemShapes.join(',')}]`;
        }
        if (typeof input !== 'object') {
            return typeof input;
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ objectRecord = input as Record<string, unknown>;
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ keys = Object.keys(objectRecord).sort();
        return `{${keys.map((key) => {
            return `${key}:${this._buildPayloadShapeKey(objectRecord[key])}`;
        }).join(',')}}`;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _stableStringify(input: unknown): string {
        if (input == null || typeof input !== 'object') {
            return JSON.stringify(input);
        }
        if (Array.isArray(input)) {
            return `[${input.map((item) => {
                return this._stableStringify(item);
            }).join(',')}]`;
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ objectRecord = input as Record<string, unknown>;
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ keys = Object.keys(objectRecord).sort();
        return `{${keys.map((key) => {
            return `${JSON.stringify(key)}:${this._stableStringify(objectRecord[key])}`;
        }).join(',')}}`;
    }
}
