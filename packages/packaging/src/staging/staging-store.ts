import type { IPluginInstallPlan } from 'peanut-contracts';

/**
 * @description 已 staged 插件记录。
 */
export interface IStagedPackageRecord {
    /**
     * @description 插件标识。
     */
    readonly pluginId: string;

    /**
     * @description 插件版本。
     */
    readonly version: string;

    /**
     * @description staging 目录路径。
     */
    readonly stagedPath: string;

    /**
     * @description 来源包路径。
     */
    readonly packagePath: string;
}

/**
 * @description staging 存储，负责记录待切换的插件版本。
 */
export class StagingStore {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _records = new Map<string, IStagedPackageRecord>();

    /**
     * @description 将一个安装计划写入 staging 存储。
     * @param installPlan 插件安装计划
     * @returns 新的 staged 记录
     */
    public stage(installPlan: IPluginInstallPlan): IStagedPackageRecord {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ stagedPackageRecord: IStagedPackageRecord = {
            pluginId: installPlan.pluginId,
            version: installPlan.version,
            stagedPath: installPlan.stagedPath,
            packagePath: installPlan.packagePath,
        };
        this._records.set(installPlan.pluginId, stagedPackageRecord);
        return stagedPackageRecord;
    }

    /**
     * @description 查询指定插件的 staged 记录。
     * @param pluginId 插件标识
     * @returns 命中时返回 staged 记录，否则返回 `null`
     */
    public get(pluginId: string): IStagedPackageRecord | null {
        return this._records.get(pluginId) ?? null;
    }

    /**
     * @description 清理指定插件的 staged 记录。
     * @param pluginId 插件标识
     * @returns 成功删除时返回 `true`
     */
    public clear(pluginId: string): boolean {
        return this._records.delete(pluginId);
    }
}
