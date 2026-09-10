import type { ITaskTrace, ITaskTraceStep, TaskTraceStatus } from 'peanut-contracts';

/**
 * @description 任务 Trace 管线骨架，负责构造标准化执行轨迹。
 */
export class TracePipeline {
    /**
     * @description 创建一条新的任务轨迹。
     * @param taskId 任务标识
     * @param kind 任务种类
     * @returns 新创建的任务轨迹
     */
    public create(taskId: string, kind: string): ITaskTrace {
        return {
            traceId: `${taskId}:trace`,
            taskId,
            kind,
            startedAt: new Date().toISOString(),
            steps: [],
        };
    }

    /**
     * @description 在现有轨迹上追加一个步骤。
     * @param trace 原始任务轨迹
     * @param id 步骤标识
     * @param title 步骤标题
     * @param status 步骤状态
     * @param detail 附加说明
     * @returns 追加步骤后的任务轨迹
     */
    public append(trace: ITaskTrace, id: string, title: string, status: TaskTraceStatus, detail?: string): ITaskTrace {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ nextStep: ITaskTraceStep = {
            id,
            title,
            status,
            detail,
        };
        return {
            ...trace,
            steps: [...trace.steps, nextStep],
        };
    }

    /**
     * @description 结束一条任务轨迹。
     * @param trace 原始任务轨迹
     * @returns 补齐结束时间后的任务轨迹
     */
    public finish(trace: ITaskTrace): ITaskTrace {
        return {
            ...trace,
            finishedAt: new Date().toISOString(),
        };
    }
}


