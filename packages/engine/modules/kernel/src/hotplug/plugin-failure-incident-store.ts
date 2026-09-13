import type { ICleanupStepResult, IPluginFailureExport, IPluginFailureIncident } from '@peanut/pod-protocol';

/**
 * @description 插件失败事件存储，用于支撑管理面板查询、导出和清理重试。
 */
export class PluginFailureIncidentStore {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _incidents = new Map<string, IPluginFailureIncident>();

    /**
     * @description 写入或覆盖指定插件的失败事件。
     * @param incident 插件失败事件
     * @returns 写入后的失败事件
     */
    public record(incident: IPluginFailureIncident): IPluginFailureIncident {
        this._incidents.set(incident.pluginId, incident);
        return incident;
    }

    /**
     * @description 查询指定插件的失败事件。
     * @param pluginId 插件标识
     * @returns 命中时返回失败事件，否则返回 `null`
     */
    public get(pluginId: string): IPluginFailureIncident | null {
        return this._incidents.get(pluginId) ?? null;
    }

    /**
     * @description 列出当前所有失败事件。
     * @returns 失败事件只读列表
     */
    public list(): readonly IPluginFailureIncident[] {
        return [...this._incidents.values()];
    }

    /**
     * @description 清理指定插件的失败事件。
     * @param pluginId 插件标识
     * @returns 是否确实删除了一条失败事件
     */
    public clear(pluginId: string): boolean {
        return this._incidents.delete(pluginId);
    }

    /**
     * @description 用新的清理步骤结果刷新失败事件。
     * @param pluginId 插件标识
     * @param cleanupSteps 新的清理步骤结果
     * @returns 更新后的失败事件；不存在时返回 `null`
     */
    public updateCleanupSteps(pluginId: string, cleanupSteps: readonly ICleanupStepResult[]): IPluginFailureIncident | null {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ incident = this._incidents.get(pluginId);
        if (incident == null) {
            return null;
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ nextIncident: IPluginFailureIncident = {
            ...incident,
            cleanupSteps: [...cleanupSteps],
        };
        this._incidents.set(pluginId, nextIncident);
        return nextIncident;
    }

    /**
     * @description 导出指定插件的失败事件。
     * @param pluginId 插件标识
     * @returns 命中时返回导出报告，否则返回 `null`
     */
    public export(pluginId: string): IPluginFailureExport | null {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ incident = this._incidents.get(pluginId);
        if (incident == null) {
            return null;
        }

        return {
            pluginId,
            exportedAt: new Date().toISOString(),
            incident,
            serializedIncident: JSON.stringify(incident, null, 4),
        };
    }
}
