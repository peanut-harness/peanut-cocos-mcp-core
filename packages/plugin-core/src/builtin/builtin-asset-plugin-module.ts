import type { ITaskResult } from 'peanut-contracts';

import type { IPluginActivateContext, IPluginModule, IPluginRegisterContext } from '../shared/plugin-manager-contracts.js';

interface IAssetActivationSnapshot {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly queriedPath: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly assetFound: boolean;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly assetType: string | null;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly taskId: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly taskKind: string | null;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly canonicalTaskId: string | null;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly taskAssetFound: boolean;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly taskAssetType: string | null;
}

/**
 * @description 内置资源插件，用于验证 assetRead grant 和资源任务链路。
 */
export class BuiltinAssetPluginModule implements IPluginModule {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private _lastActivationSnapshot: IAssetActivationSnapshot | null = null;

    /**
     * @description 内置资源插件的运行时清单。
     */
    public readonly manifest = {
        id: 'builtin.asset',
        version: '0.1.0',
        kind: 'runtime-plugin',
        displayName: 'Builtin Asset Plugin',
        description: { 'en-US': 'Validates runtime asset read access and asset task submission.', 'zh-CN': '验证运行时资源读取权限和资源任务提交。' },
        main: './builtin/builtin-asset-plugin-module.ts',
        engines: {
            host: '^0.1.0',
        },
        activation: {
            autoActivate: true,
            events: ['onStartup'],
        },
        permissions: {
            assetDb: {
                read: true,
                write: false,
                delete: false,
            },
        },
    } as const;

    /**
     * @description 在注册阶段记录资源插件已准备进入验证链路。
     * @param context 插件注册阶段上下文
     * @returns Promise 在注册结束后完成
     */
    public async register(context: IPluginRegisterContext): Promise<void> {
        context.logger.info('Builtin asset plugin registered.');
    }

    /**
     * @description 在激活阶段读取示例资源并提交一条 asset.query 任务。
     * @param context 插件激活阶段上下文
     * @returns Promise 在激活流程结束后完成
     */
    public async activate(context: IPluginActivateContext): Promise<void> {
        if (context.runtime.assetRead == null) {
            throw new Error('Builtin asset plugin requires runtime asset read access.');
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ queriedPath = 'assets/example.prefab';
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ assetSnapshot = await context.runtime.assetRead.query(queriedPath);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ taskReceipt = await context.tasks.submit({
            requestId: 'builtin-asset-activate',
            scope: 'asset',
            priority: 'normal',
            kind: 'asset.query',
            payload: {
                pathOrUuid: queriedPath,
            },
            mergePolicy: 'dedupe',
            idempotencyKey: `asset.query:${queriedPath}`,
        });
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ taskResult = await context.tasks.getResult(taskReceipt.taskId);

        this._lastActivationSnapshot = {
            queriedPath,
            assetFound: assetSnapshot != null,
            assetType:
                typeof assetSnapshot === 'object' && assetSnapshot != null && 'type' in assetSnapshot
                    ? String(assetSnapshot.type)
                    : null,
            taskId: taskReceipt.taskId,
            taskKind: this._extractTaskKind(taskResult),
            canonicalTaskId: this._extractCanonicalTaskId(taskResult),
            taskAssetFound: this._extractTaskAssetFound(taskResult),
            taskAssetType: this._extractTaskAssetType(taskResult),
        };
    }

    /**
     * @description 在停用阶段清理最近一次激活期间的资源查询快照。
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
     * @description 返回最近一次激活期间记录的资源验证快照。
     * @returns 命中时返回资源验证快照，否则返回 `null`
     */
    public getLastActivationSnapshot(): IAssetActivationSnapshot | null {
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
    private _extractTaskAssetFound(taskResult: ITaskResult | null): boolean {
        if (typeof taskResult?.data === 'object' && taskResult.data != null && 'found' in taskResult.data) {
            return taskResult.data.found === true;
        }
        return false;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _extractTaskAssetType(taskResult: ITaskResult | null): string | null {
        if (
            typeof taskResult?.data === 'object' &&
            taskResult.data != null &&
            'asset' in taskResult.data &&
            typeof taskResult.data.asset === 'object' &&
            taskResult.data.asset != null &&
            'type' in taskResult.data.asset
        ) {
            return String(taskResult.data.asset.type);
        }
        return null;
    }
}
