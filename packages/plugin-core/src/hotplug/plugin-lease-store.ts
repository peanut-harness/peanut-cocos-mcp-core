import type { ICleanupStepResult, PluginFailurePhase } from 'peanut-contracts';

/**
 * @description 通用 lease 存储，用于跟踪插件注册的清理动作和 grant 生命周期。
 */
export class PluginLeaseStore {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _leases = new Map<string, Map<string, () => void | Promise<void>>>();

    /**
     * @description 为指定插件注册一个 lease。
     * @param pluginId 插件标识
     * @param disposer 在停用或卸载时执行的清理函数
     * @returns 新注册的 lease 标识
     */
    public register(pluginId: string, disposer: () => void | Promise<void>): string {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ leaseId = `${pluginId}:lease:${Date.now()}:${Math.random().toString(16).slice(2)}`;
        // 维护当前作用域内的映射索引，用于按键查询并关联后续处理数据。
        const /* 维护当前作用域内的映射索引，用于按键查询并关联后续处理数据。 */ pluginLeases = this._leases.get(pluginId) ?? new Map<string, () => void | Promise<void>>();
        pluginLeases.set(leaseId, disposer);
        this._leases.set(pluginId, pluginLeases);
        return leaseId;
    }

    /**
     * @description 释放指定插件的所有 lease，并返回逐项结果。
     * @param pluginId 插件标识
     * @param phase 当前释放动作所属失败阶段
     * @returns Promise 返回结构化 lease 释放结果列表
     */
    public async releasePlugin(pluginId: string, phase: PluginFailurePhase = 'cleanup'): Promise<readonly ICleanupStepResult[]> {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ pluginLeases = this._leases.get(pluginId);
        if (pluginLeases == null) {
            return [];
        }

        // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
        const /* 累积当前流程产生的有序结果，供后续步骤统一返回或消费。 */ cleanupStepResults: ICleanupStepResult[] = [];
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ [leaseId, disposer] of [...pluginLeases.entries()]) {
            try {
                await disposer();
                pluginLeases.delete(leaseId);
                cleanupStepResults.push({
                    stepId: `${pluginId}:lease:${leaseId}`,
                    phase,
                    targetType: 'lease',
                    targetId: leaseId,
                    ok: true,
                    summary: `Lease "${leaseId}" released.`,
                });
            } catch (/* 捕获当前操作失败的异常信息，用于生成失败结果或保留诊断上下文。 */ error) {
                cleanupStepResults.push({
                    stepId: `${pluginId}:lease:${leaseId}`,
                    phase,
                    targetType: 'lease',
                    targetId: leaseId,
                    ok: false,
                    summary: `Lease "${leaseId}" release failed.`,
                    errorMessage: error instanceof Error ? error.message : 'unknown_lease_release_error',
                });
            }
        }

        if (pluginLeases.size === 0) {
            this._leases.delete(pluginId);
        } else {
            this._leases.set(pluginId, pluginLeases);
        }

        return cleanupStepResults;
    }
}
