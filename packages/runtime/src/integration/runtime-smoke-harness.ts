import type { ITaskSnapshot } from 'peanut-contracts';

import { RuntimeFacade } from '../cocos/runtime-facade.js';

/**
 * @description Runtime 骨架冒烟测试入口，用于验证默认适配器、子域服务和执行管线能够协同工作。
 */
export class RuntimeSmokeHarness {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _runtime: RuntimeFacade;

    /**
     * @description 创建一个新的 Runtime 冒烟测试入口。
     * @param creatorVersion 当前宿主绑定的 Creator 版本字符串
     */
    public constructor(creatorVersion: string) {
        this._runtime = new RuntimeFacade(creatorVersion);
    }

    /**
     * @description 执行一次最小化的 Runtime 冒烟流程。
     * @returns Promise 返回当前适配器诊断和任务快照
     */
    public async run(): Promise<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        adapterId: string | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        taskSnapshot: ITaskSnapshot | null;
    }> {
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ taskReceipt = await this._runtime.execution.submit({
            requestId: 'runtime-smoke-request',
            pluginId: 'runtime-smoke-plugin',
            scope: 'asset',
            priority: 'normal',
            kind: 'asset.query',
            payload: {
                pathOrUuid: 'assets/example.prefab',
            },
            mergePolicy: 'dedupe',
        });

        return {
            adapterId: this._runtime.getActiveAdapterProfile()?.adapterId ?? null,
            taskSnapshot: await this._runtime.execution.query(taskReceipt.taskId),
        };
    }
}
