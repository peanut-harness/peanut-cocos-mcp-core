import type { IPluginInstallPlan, IPluginInstallPlanStep, IPluginPackageInspection, IPluginPackageValidationResult } from 'peanut-contracts';

import type { IInstalledPackageRecord } from '../shared/installed-package-store.js';

/**
 * @description 安装计划生成器。
 */
export class InstallPlanner {
    /**
     * @description 基于检查结果和校验结果生成插件安装计划。
     * @param packageInspection 插件包检查结果
     * @param validationResult 插件包校验结果
     * @param currentInstalledPackageRecord 当前活动安装记录；不存在时返回 `null`
     * @returns 结构化安装计划
     */
    public plan(
        packageInspection: IPluginPackageInspection,
        validationResult: IPluginPackageValidationResult,
        currentInstalledPackageRecord?: IInstalledPackageRecord | null,
    ): IPluginInstallPlan {
        if (packageInspection.manifest == null) {
            throw new Error('Cannot build install plan without plugin manifest.');
        }
        if (!validationResult.ok) {
            throw new Error(`Cannot build install plan for plugin "${packageInspection.manifest.id}" because validation failed.`);
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ operation =
            currentInstalledPackageRecord != null && currentInstalledPackageRecord.version !== packageInspection.manifest.version ? 'upgrade' : 'install';
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ stagedPath = `staging/${packageInspection.manifest.id}/${packageInspection.manifest.version}`;
        // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
        const /* 累积当前流程产生的有序结果，供后续步骤统一返回或消费。 */ steps: IPluginInstallPlanStep[] = [
            {
                id: `${packageInspection.manifest.id}:validate`,
                kind: 'validate',
                title: 'Validate package',
                description: { 'en-US': 'Validate manifest, package metadata, and compatibility constraints.', 'zh-CN': '校验 manifest、包元数据和兼容性约束。' },
            },
            {
                id: `${packageInspection.manifest.id}:stage`,
                kind: 'stage',
                title: 'Stage package',
                description: { 'en-US': 'Move the package into the staging area before switching.', 'zh-CN': '切换前将插件包移入暂存区。' },
            },
            {
                id: `${packageInspection.manifest.id}:switch`,
                kind: 'switch',
                title: 'Switch active version',
                description: { 'en-US': 'Switch the plugin to the new staged version after validation completes.', 'zh-CN': '校验完成后切换到新的暂存版本。' },
            },
            {
                id: `${packageInspection.manifest.id}:cleanup_old`,
                kind: 'cleanup_old',
                title: 'Cleanup previous version',
                description: { 'en-US': 'Remove the old installed version after the switch succeeds.', 'zh-CN': '切换成功后移除旧的已安装版本。' },
            },
        ];

        return {
            operation,
            pluginId: packageInspection.manifest.id,
            version: packageInspection.manifest.version,
            packagePath: packageInspection.packagePath,
            stagedPath,
            previousVersion: operation === 'upgrade' ? currentInstalledPackageRecord?.version ?? null : null,
            steps,
            warnings: validationResult.warnings,
        };
    }
}
