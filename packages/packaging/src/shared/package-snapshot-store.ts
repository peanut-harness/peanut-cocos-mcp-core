import type { IPluginManifest, IPluginPackageMeta } from 'peanut-contracts';

/**
 * @description 已打包插件快照。
 */
export interface IPackageSnapshot {
    /**
     * @description 插件包输出路径。
     */
    readonly packagePath: string;

    /**
     * @description 插件源目录路径。
     */
    readonly sourcePath: string;

    /**
     * @description 插件运行时清单。
     */
    readonly manifest: IPluginManifest;

    /**
     * @description 插件分发元信息。
     */
    readonly packageMeta: IPluginPackageMeta;
}

/**
 * @description 插件包快照存储，用于在骨架期模拟打包、检查和安装链路。
 */
export class PackageSnapshotStore {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _snapshots = new Map<string, IPackageSnapshot>();

    /**
     * @description 保存一个新的插件包快照。
     * @param snapshot 已打包插件快照
     * @returns 已保存的插件包快照
     */
    public save(snapshot: IPackageSnapshot): IPackageSnapshot {
        this._snapshots.set(snapshot.packagePath, snapshot);
        return snapshot;
    }

    /**
     * @description 查询指定路径对应的插件包快照。
     * @param packagePath 插件包输出路径
     * @returns 命中时返回插件包快照，否则返回 `null`
     */
    public get(packagePath: string): IPackageSnapshot | null {
        return this._snapshots.get(packagePath) ?? null;
    }

    /**
     * @description 返回当前所有已保存的插件包快照。
     * @returns 插件包快照只读列表
     */
    public list(): readonly IPackageSnapshot[] {
        return [...this._snapshots.values()];
    }
}
