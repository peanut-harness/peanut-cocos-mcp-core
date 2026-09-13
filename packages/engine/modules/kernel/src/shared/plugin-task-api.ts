import type { ITaskBatchReceipt, ITaskCancelResult, ITaskReceipt, ITaskRequest, ITaskResult, ITaskSnapshot } from '@peanut/pod-protocol';
import type { ICocosRuntime } from '@peanut/pod-engine/runtime';

import type { IPluginTaskApi } from './plugin-manager-contracts.js';

/**
 * @description 当前插件可用的任务辅助接口实现。
 */
export class PluginTaskApi implements IPluginTaskApi {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginId: string;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _runtime: ICocosRuntime;

    /**
     * @description 创建一个新的插件任务接口。
     * @param pluginId 当前插件标识
     * @param runtime Runtime 门面实例
     */
    public constructor(pluginId: string, runtime: ICocosRuntime) {
        this._pluginId = pluginId;
        this._runtime = runtime;
    }

    /**
     * @description 提交一个插件任务请求。
     * @param request 任务请求；其中 `pluginId` 将被忽略并替换为当前插件标识
     * @returns Promise 返回任务受理回执
     */
    public async submit(request: Omit<ITaskRequest, 'pluginId'>): Promise<ITaskReceipt> {
        return this._runtime.execution.submit({
            ...request,
            pluginId: this._pluginId,
        });
    }

    /**
     * @description 批量提交多个插件任务请求。
     * @param requests 任务请求列表；每个请求的 `pluginId` 都会被替换为当前插件标识
     * @returns Promise 返回批量受理回执
     */
    public async submitBatch(requests: readonly Omit<ITaskRequest, 'pluginId'>[]): Promise<ITaskBatchReceipt> {
        return this._runtime.execution.submitBatch(
            requests.map((request) => {
                return {
                    ...request,
                    pluginId: this._pluginId,
                };
            }),
        );
    }

    /**
     * @description 查询一个当前插件拥有的任务。
     * @param taskId 任务标识
     * @returns Promise 命中时返回任务快照，否则返回 `null`
     */
    public async query(taskId: string): Promise<ITaskSnapshot | null> {
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ snapshot = await this._runtime.execution.query(taskId);
        if (snapshot == null || snapshot.pluginId !== this._pluginId) {
            return null;
        }
        return snapshot;
    }

    /**
     * @description 查询一个当前插件拥有任务的最终结果。
     * @param taskId 任务标识
     * @returns Promise 命中时返回任务结果，否则返回 `null`
     */
    public async getResult(taskId: string): Promise<ITaskResult | null> {
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ snapshot = await this.query(taskId);
        if (snapshot == null) {
            return null;
        }
        return this._runtime.execution.getResult(taskId);
    }

    /**
     * @description 取消一个当前插件拥有的任务。
     * @param taskId 任务标识
     * @returns Promise 返回取消结果
     */
    public async cancel(taskId: string): Promise<ITaskCancelResult> {
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ snapshot = await this.query(taskId);
        if (snapshot == null) {
            return {
                taskId,
                cancelled: false,
                reason: 'task_not_owned',
            };
        }
        return this._runtime.execution.cancel(taskId);
    }
}
