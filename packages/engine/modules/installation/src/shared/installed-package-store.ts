import type { IPluginInstallPlan, IPluginInstallResult, IPluginUninstallResult } from '@peanut/pod-protocol';

interface IInstalledPackageVersionSet {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    activeVersion: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly versions: Map<string, IInstalledPackageRecord>;
}

/**
 * @description 已安装插件记录。
 */
export interface IInstalledPackageRecord {
    /**
     * @description 插件标识。
     */
    readonly pluginId: string;

    /**
     * @description 插件版本。
     */
    readonly version: string;

    /**
     * @description 当前安装目录。
     */
    readonly installPath: string;

    /**
     * @description 当前可复用目录包路径，仅保存在运行时内存中。
     */
    readonly packagePath: string;

}

/**
 * @description 已安装插件快照。
 */
export interface IInstalledPackageSnapshot {
    /**
     * @description 插件标识。
     */
    readonly pluginId: string;

    /**
     * @description 当前活动版本。
     */
    readonly activeVersion: string;

    /**
     * @description 当前保留的全部已安装版本记录。
     */
    readonly versions: readonly IInstalledPackageRecord[];
}

/**
 * @description 已安装插件存储。
 */
export class InstalledPackageStore {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _records = new Map<string, IInstalledPackageVersionSet>();

    /**
     * @description 根据安装计划写入已安装插件记录。
     * @param installPlan 插件安装计划
     * @returns 结构化安装结果
     */
    public install(installPlan: IPluginInstallPlan): IPluginInstallResult {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const installPath = `installed/${installPlan.pluginId}/${installPlan.version}`;
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const installedPackageRecord: IInstalledPackageRecord = {
            pluginId: installPlan.pluginId,
            version: installPlan.version,
            installPath,
            packagePath: installPlan.packagePath,
        };
        // 维护当前作用域内的映射索引，用于按键查询并关联后续处理数据。
        const installedPackageVersionSet = this._records.get(installPlan.pluginId) ?? {
            activeVersion: installPlan.version,
            versions: new Map<string, IInstalledPackageRecord>(),
        };
        installedPackageVersionSet.versions.set(installPlan.version, installedPackageRecord);
        installedPackageVersionSet.activeVersion = installPlan.version;
        this._records.set(installPlan.pluginId, installedPackageVersionSet);

        return {
            operation: installPlan.operation,
            pluginId: installPlan.pluginId,
            version: installPlan.version,
            installed: true,
            installPath,
            stagedPath: installPlan.stagedPath,
            previousVersion: installPlan.previousVersion,
            warnings: installPlan.warnings,
        };
    }

    /**
     * @description 使用持久化快照恢复内存索引；重复调用会完整替换旧状态。
     * @param snapshots 从项目级持久化仓读取的安装快照
     * @returns 无返回值
     */
    public restoreSnapshots(snapshots: readonly IInstalledPackageSnapshot[]): void {
        this._records.clear();
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ snapshot of snapshots) {
            // 保存当前插件的可变版本集合，后续统一写入内存索引。
            const versionSet: IInstalledPackageVersionSet = {
                activeVersion: snapshot.activeVersion,
                versions: new Map<string, IInstalledPackageRecord>(),
            };
            for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ versionRecord of snapshot.versions) {
                versionSet.versions.set(versionRecord.version, versionRecord);
            }
            if (versionSet.versions.has(versionSet.activeVersion)) {
                this._records.set(snapshot.pluginId, versionSet);
            }
        }
    }

    /**
     * @description 清理指定插件的旧版本，只保留活动版本。
     * @param pluginId 插件标识
     * @param activeVersion 需要保留的活动版本
     * @returns 被清理掉的旧版本记录列表
     */
    public cleanupOldVersions(pluginId: string, activeVersion: string): readonly IInstalledPackageRecord[] {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const installedPackageVersionSet = this._records.get(pluginId);
        if (installedPackageVersionSet == null) {
            return [];
        }

        // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
        const removedPackageRecords: IInstalledPackageRecord[] = [];
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ [version, installedPackageRecord] of [...installedPackageVersionSet.versions.entries()]) {
            if (version === activeVersion) {
                continue;
            }

            installedPackageVersionSet.versions.delete(version);
            removedPackageRecords.push(installedPackageRecord);
        }

        installedPackageVersionSet.activeVersion = activeVersion;
        this._records.set(pluginId, installedPackageVersionSet);
        return removedPackageRecords;
    }

    /**
     * @description 在升级失败后恢复先前的活动版本，并移除失败版本记录。
     * @param pluginId 插件标识
     * @param previousVersion 升级前的活动版本
     * @param failedVersion 升级期间失败的新版本
     * @returns 回滚后的安装快照；插件不存在时返回 `null`
     */
    public rollbackUpgrade(pluginId: string, previousVersion: string | null, failedVersion: string): IInstalledPackageSnapshot | null {
        if (previousVersion == null) {
            this.removeVersion(pluginId, failedVersion);
            return this.getSnapshot(pluginId);
        }

        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const installedPackageVersionSet = this._records.get(pluginId);
        if (installedPackageVersionSet == null) {
            return null;
        }

        installedPackageVersionSet.versions.delete(failedVersion);
        if (installedPackageVersionSet.versions.has(previousVersion)) {
            installedPackageVersionSet.activeVersion = previousVersion;
        }

        if (installedPackageVersionSet.versions.size === 0) {
            this._records.delete(pluginId);
            return null;
        }

        this._records.set(pluginId, installedPackageVersionSet);
        return this.getSnapshot(pluginId);
    }

    /**
     * @description 切换指定插件的活动安装版本；目标版本必须已存在。
     * @param pluginId 插件标识
     * @param version 要激活的已安装版本
     * @returns 切换后的安装快照；插件或版本不存在时返回 `null`
     */
    public switchActiveVersion(pluginId: string, version: string): IInstalledPackageSnapshot | null {
        const installedPackageVersionSet = this._records.get(pluginId);
        if (installedPackageVersionSet == null || !installedPackageVersionSet.versions.has(version)) {
            return null;
        }

        installedPackageVersionSet.activeVersion = version;
        this._records.set(pluginId, installedPackageVersionSet);
        return this.getSnapshot(pluginId);
    }

    /**
     * @description 卸载指定插件。
     * @param pluginId 插件标识
     * @returns 结构化卸载结果
     */
    public uninstall(pluginId: string): IPluginUninstallResult {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const installedPackageRecord = this.get(pluginId);
        if (installedPackageRecord == null) {
            return {
                pluginId,
                removed: false,
                installPath: null,
            };
        }

        this._records.delete(pluginId);
        return {
            pluginId,
            removed: true,
            installPath: installedPackageRecord.installPath,
        };
    }

    /**
     * @description 查询指定插件的安装记录。
     * @param pluginId 插件标识
     * @returns 命中时返回安装记录，否则返回 `null`
     */
    public get(pluginId: string): IInstalledPackageRecord | null {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const installedPackageVersionSet = this._records.get(pluginId);
        if (installedPackageVersionSet == null) {
            return null;
        }

        return installedPackageVersionSet.versions.get(installedPackageVersionSet.activeVersion) ?? null;
    }

    /**
     * @description 返回指定插件的全部已安装版本记录。
     * @param pluginId 插件标识
     * @returns 已安装版本记录列表；插件不存在时返回空数组
     */
    public listVersions(pluginId: string): readonly IInstalledPackageRecord[] {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const installedPackageVersionSet = this._records.get(pluginId);
        if (installedPackageVersionSet == null) {
            return [];
        }

        return [...installedPackageVersionSet.versions.values()];
    }

    /**
     * @description 返回指定插件的安装快照，包括活动版本与保留版本列表。
     * @param pluginId 插件标识
     * @returns 命中时返回安装快照，否则返回 `null`
     */
    public getSnapshot(pluginId: string): IInstalledPackageSnapshot | null {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const installedPackageVersionSet = this._records.get(pluginId);
        if (installedPackageVersionSet == null) {
            return null;
        }

        return {
            pluginId,
            activeVersion: installedPackageVersionSet.activeVersion,
            versions: [...installedPackageVersionSet.versions.values()],
        };
    }

    /**
     * @description 返回当前全部插件的多版本安装快照。
     * @returns 按插件标识排序的安装快照列表
     */
    public listSnapshots(): readonly IInstalledPackageSnapshot[] {
        return [...this._records.keys()]
            .sort()
            .map((pluginId) => this.getSnapshot(pluginId))
            .filter((snapshot): snapshot is IInstalledPackageSnapshot => snapshot != null);
    }

    /**
     * @description 删除指定插件的某个已安装版本记录。
     * @param pluginId 插件标识
     * @param version 需要删除的版本号
     * @returns 被删除的安装记录；未命中时返回 `null`
     */
    public removeVersion(pluginId: string, version: string): IInstalledPackageRecord | null {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const installedPackageVersionSet = this._records.get(pluginId);
        if (installedPackageVersionSet == null) {
            return null;
        }

        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const installedPackageRecord = installedPackageVersionSet.versions.get(version) ?? null;
        if (installedPackageRecord == null) {
            return null;
        }

        installedPackageVersionSet.versions.delete(version);
        if (installedPackageVersionSet.versions.size === 0) {
            this._records.delete(pluginId);
            return installedPackageRecord;
        }

        if (installedPackageVersionSet.activeVersion === version) {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const fallbackVersion = installedPackageVersionSet.versions.keys().next().value;
            if (typeof fallbackVersion === 'string') {
                installedPackageVersionSet.activeVersion = fallbackVersion;
            }
        }

        this._records.set(pluginId, installedPackageVersionSet);
        return installedPackageRecord;
    }
}
