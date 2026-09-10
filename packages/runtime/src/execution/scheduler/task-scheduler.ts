import type { ITaskReceipt } from 'peanut-contracts';

import type { IAcceptedTask } from '../ingress/task-ingress.js';
import { TaskLedger } from '../ledger/task-ledger.js';

/**
 * @description 任务调度器骨架，负责把任务入队并登记到账本。
 */
export class TaskScheduler {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _ledger: TaskLedger;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _queue: string[] = [];

    /**
     * @description 创建一个新的任务调度器。
     * @param ledger 任务账本
     */
    public constructor(ledger: TaskLedger) {
        this._ledger = ledger;
    }

    /**
     * @description 将一个任务加入执行队列。
     * @param task 已标准化的任务模型
     * @returns 该任务的受理回执
     */
    public schedule(task: IAcceptedTask): ITaskReceipt {
        this._ledger.create(task, 'queued');
        this._queue.push(task.taskId);
        return {
            taskId: task.taskId,
            status: 'queued',
        };
    }

    /**
     * @description 返回当前排队中的任务标识列表。
     * @returns 当前队列的只读快照
     */
    public listQueuedTaskIds(): readonly string[] {
        return this._queue;
    }

    /**
     * @description 从队列中移除指定任务标识。
     * @param taskId 要移除的任务标识
     * @returns 成功移除时返回 `true`
     */
    public remove(taskId: string): boolean {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ taskIndex = this._queue.indexOf(taskId);
        if (taskIndex < 0) {
            return false;
        }
        this._queue.splice(taskIndex, 1);
        return true;
    }
}


