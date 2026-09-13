import type { ITaskResult } from '@peanut/pod-protocol';

import type { IPluginActivateContext, IPluginModule, IPluginRegisterContext } from '../shared/plugin-manager-contracts.js';

interface ISceneExecutionEcho {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly packageName: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly method: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly args: readonly unknown[];
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly adapterId: string;
}

interface ISceneActivationSnapshot {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly manifestField: 'scene-script' | 'contributions.scene.script';
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly executeAdapterId: string | null;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly executeMethod: string | null;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly taskId: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly taskKind: string | null;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly canonicalTaskId: string | null;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly patchedNodeId: string | null;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly patchedEnabled: boolean | null;
}

/**
 * @description 内置场景插件，用于验证 scene grant 和场景任务链路。
 */
export class BuiltinScenePluginModule implements IPluginModule {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private _lastActivationSnapshot: ISceneActivationSnapshot | null = null;

    /**
     * @description 内置场景插件的运行时清单。
     */
    public readonly manifest = {
        id: 'builtin.scene',
        version: '0.1.0',
        kind: 'runtime-plugin',
        displayName: 'Builtin Scene Plugin',
        description: { 'en-US': 'Validates runtime scene access and scene task submission.', 'zh-CN': '验证运行时场景访问和场景任务提交。' },
        main: './builtin/builtin-scene-plugin-module.ts',
        engines: {
            host: '^0.1.0',
        },
        activation: {
            autoActivate: true,
            events: ['onStartup'],
        },
        permissions: {
            sceneScripts: ['builtin.scene.inspect'],
        },
    } as const;

    /**
     * @description 在注册阶段记录场景插件已准备进入验证链路。
     * @param context 插件注册阶段上下文
     * @returns Promise 在注册结束后完成
     */
    public async register(context: IPluginRegisterContext): Promise<void> {
        context.logger.info('Builtin scene plugin registered.');
    }

    /**
     * @description 在激活阶段读取场景 manifest 字段并执行一条示例场景脚本调用。
     * @param context 插件激活阶段上下文
     * @returns Promise 在激活流程结束后完成
     */
    public async activate(context: IPluginActivateContext): Promise<void> {
        if (context.runtime.scene == null) {
            throw new Error('Builtin scene plugin requires runtime scene access.');
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ manifestField = context.runtime.scene.getManifestField();
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ executeEcho = await context.runtime.scene.execute<ISceneExecutionEcho>('builtin.scene', 'inspectScene', [
            {
                nodeId: 'root-node',
            },
        ]);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ taskReceipt = await context.tasks.submit({
            requestId: 'builtin-scene-activate',
            scope: 'scene',
            priority: 'normal',
            kind: 'scene.patch',
            payload: {
                nodeId: 'root-node',
                patch: {
                    enabled: true,
                },
            },
            mergePolicy: 'coalesce',
        });
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ taskResult = await context.tasks.getResult(taskReceipt.taskId);

        this._lastActivationSnapshot = {
            manifestField,
            executeAdapterId: executeEcho.adapterId,
            executeMethod: executeEcho.method,
            taskId: taskReceipt.taskId,
            taskKind: this._extractTaskKind(taskResult),
            canonicalTaskId: this._extractCanonicalTaskId(taskResult),
            patchedNodeId: this._extractPatchedNodeId(taskResult),
            patchedEnabled: this._extractPatchedEnabled(taskResult),
        };
    }

    /**
     * @description 在停用阶段清理最近一次激活期间记录的场景快照。
     * @param reason 插件停用原因
     * @returns Promise 在停用流程结束后完成
     */
    public async deactivate(reason: 'host_reload' | 'host_shutdown' | 'plugin_update' | 'dependency_lost' | 'manual_disable'): Promise<void> {
        void reason;
        this._lastActivationSnapshot = null;
    }

    /**
     * @description 在释放阶段执行最终清理。
     * @returns Promise 在资源释放结束后完成
     */
    public async dispose(): Promise<void> {}

    /**
     * @description 返回最近一次激活期间记录的场景验证快照。
     * @returns 命中时返回场景验证快照，否则返回 `null`
     */
    public getLastActivationSnapshot(): ISceneActivationSnapshot | null {
        return this._lastActivationSnapshot;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _extractTaskKind(taskResult: ITaskResult | null): string | null {
        if (typeof taskResult?.data === 'object' && taskResult.data != null && 'kind' in taskResult.data) {
            return String(taskResult.data.kind);
        }
        return null;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _extractCanonicalTaskId(taskResult: ITaskResult | null): string | null {
        if (typeof taskResult?.data === 'object' && taskResult.data != null && 'canonicalTaskId' in taskResult.data) {
            return String(taskResult.data.canonicalTaskId);
        }
        return null;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _extractPatchedNodeId(taskResult: ITaskResult | null): string | null {
        if (typeof taskResult?.data === 'object' && taskResult.data != null && 'nodeId' in taskResult.data) {
            return String(taskResult.data.nodeId);
        }
        return null;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _extractPatchedEnabled(taskResult: ITaskResult | null): boolean | null {
        if (
            typeof taskResult?.data === 'object' &&
            taskResult.data != null &&
            'sceneNode' in taskResult.data &&
            typeof taskResult.data.sceneNode === 'object' &&
            taskResult.data.sceneNode != null &&
            'enabled' in taskResult.data.sceneNode
        ) {
            return taskResult.data.sceneNode.enabled === true;
        }
        return null;
    }
}
