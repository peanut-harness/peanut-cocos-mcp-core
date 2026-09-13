import type { IPluginInstallPlan, IPluginInstallResult, IPluginRepairResult, IPluginUninstallResult } from '@peanut/pod-protocol';

import { InstalledPackageStore } from '../shared/installed-package-store.js';
import { StagingStore } from '../staging/staging-store.js';

/**
 * @description 插件安装器，负责把安装计划落实到已安装记录中。
 */
export class PackageInstaller {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _stagingStore: StagingStore;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _installedPackageStore: InstalledPackageStore;

    /**
     * @description 创建一个新的插件安装器。
     * @param stagingStore staging 存储
     * @param installedPackageStore 已安装插件存储
     */
    public constructor(stagingStore: StagingStore, installedPackageStore: InstalledPackageStore) {
        this._stagingStore = stagingStore;
        this._installedPackageStore = installedPackageStore;
    }

    /**
     * @description 执行一个插件安装计划。
     * @param installPlan 插件安装计划
     * @returns Promise 返回结构化安装结果
     */
    public async install(installPlan: IPluginInstallPlan): Promise<IPluginInstallResult> {
        this._stagingStore.stage(installPlan);
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ installResult = this._installedPackageStore.install(installPlan);
        this._stagingStore.clear(installPlan.pluginId);
        return installResult;
    }

    /**
     * @description 卸载指定插件。
     * @param pluginId 插件标识
     * @returns Promise 返回结构化卸载结果
     */
    public async uninstall(pluginId: string): Promise<IPluginUninstallResult> {
        this._stagingStore.clear(pluginId);
        return this._installedPackageStore.uninstall(pluginId);
    }

    /**
     * @description 执行一次幂等的修复流程。
     * @returns Promise 返回修复结果
     */
    public async repair(): Promise<IPluginRepairResult> {
        return {
            repaired: false,
            actions: [],
        };
    }
}
