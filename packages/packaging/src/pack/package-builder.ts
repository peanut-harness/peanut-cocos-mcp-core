import type { IPluginManifest, IPluginPackResult, IPluginPackageMeta } from 'peanut-contracts';

import { PackageSnapshotStore } from '../shared/package-snapshot-store.js';

/**
 * @description 插件打包器，在骨架期生成内存包快照并返回输出路径。
 */
export class PackageBuilder {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _packageSnapshotStore: PackageSnapshotStore;

    /**
     * @description 创建一个新的插件打包器。
     * @param packageSnapshotStore 插件包快照存储
     */
    public constructor(packageSnapshotStore: PackageSnapshotStore) {
        this._packageSnapshotStore = packageSnapshotStore;
    }

    /**
     * @description 生成一个插件包快照。
     * @param sourcePath 插件源目录路径
     * @param manifest 插件运行时清单
     * @param packageMeta 可选分发元信息；省略时自动生成默认值
     * @returns Promise 返回结构化打包结果
     */
    public async pack(sourcePath: string, manifest: IPluginManifest, packageMeta?: IPluginPackageMeta): Promise<IPluginPackResult> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ nextPackageMeta: IPluginPackageMeta = packageMeta ?? {
            digest: `${manifest.id}:${manifest.version}:digest`,
            packedAt: new Date().toISOString(),
            sdkVersion: '0.1.0',
        };
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ packagePath = `packages/${manifest.id}-${manifest.version}.pcp`;

        this._packageSnapshotStore.save({
            packagePath,
            sourcePath,
            manifest,
            packageMeta: nextPackageMeta,
        });

        return {
            sourcePath,
            packagePath,
            packageMeta: nextPackageMeta,
        };
    }
}
