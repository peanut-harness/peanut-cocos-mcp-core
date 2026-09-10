import type { ITaskRequest } from 'peanut-contracts';

/**
 * @description 进入执行管线后的标准化任务模型。
 */
export interface IAcceptedTask {
    /**
     * @description Runtime 分配的任务标识。
     */
    readonly taskId: string;

    /**
     * @description 原始任务请求。
     */
    readonly request: ITaskRequest;
}

/**
 * @description 执行管线入口，负责把外部任务请求标准化。
 */
export class TaskIngress {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private static _sequence: number = 0;

    /**
     * @description 接收一个外部任务请求并生成运行时任务标识。
     * @param request 外部任务请求
     * @returns 标准化后的任务模型
     */
    public accept(request: ITaskRequest): IAcceptedTask {
        TaskIngress._sequence += 1;
        return {
            taskId: `${request.pluginId}:${request.requestId}:${TaskIngress._sequence}`,
            request,
        };
    }
}
