import type { IPluginManifest, IPluginPackResult, IPluginInstallPlan, IPluginInstallResult, IPluginPackageInspection, IPluginPackageValidationResult, IPluginUninstallResult } from '@peanut/pod-protocol';

import { PackagingApp } from '../app/packaging-app.js';

/**
 * @description Packaging 骨架冒烟测试入口，用于验证 pack、inspect、validate、plan、install 和 uninstall 主链路。
 */
export class PackagingSmokeHarness {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _packagingApp: PackagingApp;

    /**
     * @description 创建一个新的 Packaging 冒烟测试入口。
     */
    public constructor() {
        this._packagingApp = new PackagingApp();
    }

    /**
     * @description 执行一次最小化的 Packaging 冒烟流程。
     * @returns Promise 返回主链路的结构化结果快照
     */
    public async run(): Promise<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        packResult: IPluginPackResult;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        inspection: IPluginPackageInspection;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        validation: IPluginPackageValidationResult;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        installPlan: IPluginInstallPlan;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        installResult: IPluginInstallResult;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        uninstallResult: IPluginUninstallResult;
    }> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginManifest: IPluginManifest = {
            id: 'smoke.packaging.plugin',
            version: '0.1.0',
            kind: 'tooling-plugin',
            displayName: 'Packaging Smoke Plugin',
            main: './index.js',
            engines: {
                host: '^0.1.0',
            },
            activation: {
                autoActivate: false,
                events: [],
            },
            permissions: {},
        };

        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ packResult = await this._packagingApp.pack('plugins/packaging-smoke', pluginManifest);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ inspection = await this._packagingApp.inspect(packResult.packagePath);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ validation = await this._packagingApp.validate(packResult.packagePath);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ installPlan = await this._packagingApp.planInstall(packResult.packagePath);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ installResult = await this._packagingApp.install(packResult.packagePath);
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ uninstallResult = await this._packagingApp.uninstall(pluginManifest.id);

        return {
            packResult,
            inspection,
            validation,
            installPlan,
            installResult,
            uninstallResult,
        };
    }
}
