import assert from 'assert/strict';
import test from 'node:test';

import type { IPluginManifest } from 'peanut-contracts';

import { PackagingApp } from '../src/app/packaging-app';
import { PackagingSmokeHarness } from '../src/integration/packaging-smoke-harness';

test('packaging smoke harness should pack, inspect, validate, install, and uninstall a plugin package', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ packagingSmokeHarness = new PackagingSmokeHarness();
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ packagingSmokeResult = await packagingSmokeHarness.run();

    assert.equal(packagingSmokeResult.packResult.packagePath, 'packages/smoke.packaging.plugin-0.1.0.pcp');
    assert.equal(packagingSmokeResult.inspection.isValidStructure, true);
    assert.equal(packagingSmokeResult.validation.ok, true);
    assert.equal(packagingSmokeResult.installPlan.pluginId, 'smoke.packaging.plugin');
    assert.equal(packagingSmokeResult.installResult.installed, true);
    assert.equal(packagingSmokeResult.uninstallResult.removed, true);
});

test('packaging app should manage active version switching during upgrade', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ packagingApp = new PackagingApp();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginManifestV1: IPluginManifest = {
        id: 'upgrade.packaging.plugin',
        version: '0.1.0',
        kind: 'tooling-plugin',
        displayName: 'Upgrade Packaging Plugin',
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
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginManifestV2: IPluginManifest = {
        ...pluginManifestV1,
        version: '0.2.0',
    };

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ packResultV1 = await packagingApp.pack('plugins/upgrade-packaging/v0.1.0', pluginManifestV1);
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ installResultV1 = await packagingApp.install(packResultV1.packagePath);
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ packResultV2 = await packagingApp.pack('plugins/upgrade-packaging/v0.2.0', pluginManifestV2);
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ upgradePlan = await packagingApp.planInstall(packResultV2.packagePath);
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ upgradeResult = await packagingApp.upgrade(packResultV2.packagePath);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ installedPackageSnapshot = packagingApp.getInstalledPackageSnapshot(pluginManifestV1.id);

    assert.equal(installResultV1.operation, 'install');
    assert.equal(installResultV1.previousVersion, null);
    assert.equal(upgradePlan.operation, 'upgrade');
    assert.equal(upgradePlan.previousVersion, '0.1.0');
    assert.equal(upgradeResult.operation, 'upgrade');
    assert.equal(upgradeResult.previousVersion, '0.1.0');
    assert.equal(upgradeResult.version, '0.2.0');
    assert.equal(installedPackageSnapshot?.activeVersion, '0.2.0');
    assert.deepEqual(
        installedPackageSnapshot?.versions.map((installedPackageRecord) => {
            return installedPackageRecord.version;
        }),
        ['0.1.0', '0.2.0'],
    );
});
