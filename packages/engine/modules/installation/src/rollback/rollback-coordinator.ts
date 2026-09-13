import type { IPluginInstallPlan } from '@peanut/pod-protocol';

import { InstalledPackageStore } from '../shared/installed-package-store.js';
import { StagingStore } from '../staging/staging-store.js';

/**
 * @description 回滚协调器，用于在安装失败时撤销 staging 状态。
 */
export class RollbackCoordinator {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _stagingStore: StagingStore;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _installedPackageStore: InstalledPackageStore;

    /**
     * @description 创建一个新的回滚协调器。
     * @param stagingStore staging 存储
     * @param installedPackageStore 已安装插件存储
     */
    public constructor(stagingStore: StagingStore, installedPackageStore: InstalledPackageStore) {
        this._stagingStore = stagingStore;
        this._installedPackageStore = installedPackageStore;
    }

    /**
     * @description 回滚一个尚未完成切换的安装计划。
     * @param installPlan 插件安装计划
     * @returns Promise 在回滚结束后完成
     */
    public async rollback(installPlan: IPluginInstallPlan): Promise<void> {
        this._installedPackageStore.rollbackUpgrade(installPlan.pluginId, installPlan.previousVersion, installPlan.version);
        this._stagingStore.clear(installPlan.pluginId);
    }
}
