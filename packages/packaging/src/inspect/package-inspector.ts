import type { IPluginPackageInspection } from 'peanut-contracts';

import { PackageSnapshotStore } from '../shared/package-snapshot-store.js';
import type { ProjectPackageStore } from '../persistence/project-package-store.js';

/**
 * @description 插件包检查器，负责返回包路径对应的结构检查结果。
 */
export class PackageInspector {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _packageSnapshotStore: PackageSnapshotStore;
    /** @description 可选的真实项目包仓；存在时在内存快照未命中后检查目录包。 */
    private readonly _projectPackageStore: ProjectPackageStore | null;

    /**
     * @description 创建一个新的插件包检查器。
     * @param packageSnapshotStore 插件包快照存储
     */
    public constructor(packageSnapshotStore: PackageSnapshotStore, projectPackageStore?: ProjectPackageStore) {
        this._packageSnapshotStore = packageSnapshotStore;
        this._projectPackageStore = projectPackageStore ?? null;
    }

    /**
     * @description 检查指定路径上的插件包结构。
     * @param packagePath 插件包路径
     * @returns Promise 返回结构化检查结果
     */
    public async inspect(packagePath: string): Promise<IPluginPackageInspection> {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ packageSnapshot = this._packageSnapshotStore.get(packagePath);
        if (packageSnapshot == null) {
            if (this._projectPackageStore != null) {
                return this._projectPackageStore.inspect(packagePath);
            }
            return {
                packagePath,
                manifest: null,
                packageMeta: null,
                isValidStructure: false,
                issues: ['package_not_found'],
            };
        }

        // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
        const /* 累积当前流程产生的有序结果，供后续步骤统一返回或消费。 */ issues: string[] = [];
        if (packageSnapshot.manifest.id.trim().length === 0) {
            issues.push('manifest_id_missing');
        }
        if (packageSnapshot.manifest.version.trim().length === 0) {
            issues.push('manifest_version_missing');
        }
        if (packageSnapshot.packageMeta.digest.trim().length === 0) {
            issues.push('package_digest_missing');
        }

        return {
            packagePath,
            manifest: packageSnapshot.manifest,
            packageMeta: packageSnapshot.packageMeta,
            isValidStructure: issues.length === 0,
            issues,
        };
    }
}
