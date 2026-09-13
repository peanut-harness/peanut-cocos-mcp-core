import assert from 'assert/strict';
import test from 'node:test';

import type { IPluginInstallPlan, IPluginPackageInspection, IPluginPackageValidationResult } from '@peanut/pod-protocol';

import { InstallPlanner } from '../src/install/install-planner';
import { PackageInstaller } from '../src/install/package-installer';
import { RollbackCoordinator } from '../src/rollback/rollback-coordinator';
import { InstalledPackageStore } from '../src/shared/installed-package-store';
import { StagingStore } from '../src/staging/staging-store';
import { PackageValidator } from '../src/validate/package-validator';

test('package validator should reject missing packages and preserve inspection issues', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packageValidator = new PackageValidator();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packageInspection: IPluginPackageInspection = {
        packagePath: 'packages/missing-plugin.pcp',
        manifest: null,
        packageMeta: null,
        isValidStructure: false,
        issues: ['package_not_found'],
    };

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const packageValidationResult = await packageValidator.validate(packageInspection);

    assert.equal(packageValidationResult.ok, false);
    assert.deepEqual(packageValidationResult.issues, ['package_not_found']);
    assert.deepEqual(packageValidationResult.warnings, []);
});

test('install planner should refuse to build a plan when validation failed', (): void => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installPlanner = new InstallPlanner();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packageInspection: IPluginPackageInspection = {
        packagePath: 'packages/invalid-plugin.pcp',
        manifest: {
            id: 'invalid.plugin',
            version: '0.1.0',
            kind: 'tooling-plugin',
            displayName: 'Invalid Plugin',
            main: './index.js',
            engines: {
                host: '',
            },
            activation: {
                autoActivate: false,
                events: [],
            },
            permissions: {},
        },
        packageMeta: {
            digest: 'invalid.plugin:0.1.0:digest',
            packedAt: '2026-07-09T00:00:00.000Z',
            sdkVersion: '0.1.0',
        },
        isValidStructure: true,
        issues: [],
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const validationResult: IPluginPackageValidationResult = {
        ok: false,
        issues: ['host_engine_range_missing'],
        warnings: ['package_signature_missing'],
    };

    assert.throws(() => {
        installPlanner.plan(packageInspection, validationResult);
    }, /validation failed/i);
});

test('rollback coordinator should clear staged records during failure recovery', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const stagingStore = new StagingStore();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installedPackageStore = new InstalledPackageStore();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const rollbackCoordinator = new RollbackCoordinator(stagingStore, installedPackageStore);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installPlan: IPluginInstallPlan = {
        operation: 'install',
        pluginId: 'rollback.plugin',
        version: '0.1.0',
        packagePath: 'packages/rollback.plugin-0.1.0.pcp',
        stagedPath: 'staging/rollback.plugin/0.1.0',
        previousVersion: null,
        steps: [
            {
                id: 'rollback.plugin:stage',
                kind: 'stage',
                title: 'Stage package',
                description: 'Stage rollback plugin.',
            },
        ],
        warnings: [],
    };

    stagingStore.stage(installPlan);
    assert.notEqual(stagingStore.get(installPlan.pluginId), null);

    await rollbackCoordinator.rollback(installPlan);

    assert.equal(stagingStore.get(installPlan.pluginId), null);
});

test('package installer and rollback coordinator should clear staging when install write fails', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const stagingStore = new StagingStore();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installedPackageStore = new InstalledPackageStore();
    installedPackageStore.install = (): never => {
        throw new Error('installed_package_store_write_failed');
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packageInstaller = new PackageInstaller(stagingStore, installedPackageStore);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const rollbackCoordinator = new RollbackCoordinator(stagingStore, installedPackageStore);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installPlan: IPluginInstallPlan = {
        operation: 'install',
        pluginId: 'rollback.failed-write.plugin',
        version: '0.1.0',
        packagePath: 'packages/rollback.failed-write.plugin-0.1.0.pcp',
        stagedPath: 'staging/rollback.failed-write.plugin/0.1.0',
        previousVersion: null,
        steps: [
            {
                id: 'rollback.failed-write.plugin:stage',
                kind: 'stage',
                title: 'Stage package',
                description: 'Stage rollback plugin before installed store write.',
            },
        ],
        warnings: [],
    };

    await assert.rejects(async (): Promise<void> => {
        try {
            await packageInstaller.install(installPlan);
        } catch (/* 捕获当前操作失败的异常信息，用于生成失败结果或保留诊断上下文。 */ error) {
            await rollbackCoordinator.rollback(installPlan);
            throw error;
        }
    }, /installed_package_store_write_failed/);

    assert.equal(stagingStore.get(installPlan.pluginId), null);
    assert.equal(installedPackageStore.get(installPlan.pluginId), null);
});

test('package installer should retain prior versions while switching the active version during upgrade', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const stagingStore = new StagingStore();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installedPackageStore = new InstalledPackageStore();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packageInstaller = new PackageInstaller(stagingStore, installedPackageStore);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const initialInstallPlan: IPluginInstallPlan = {
        operation: 'install',
        pluginId: 'rollback.upgrade.plugin',
        version: '0.1.0',
        packagePath: 'packages/rollback.upgrade.plugin-0.1.0.pcp',
        stagedPath: 'staging/rollback.upgrade.plugin/0.1.0',
        previousVersion: null,
        steps: [
            {
                id: 'rollback.upgrade.plugin:stage:0.1.0',
                kind: 'stage',
                title: 'Stage package',
                description: 'Stage rollback upgrade plugin v0.1.0.',
            },
        ],
        warnings: [],
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const upgradeInstallPlan: IPluginInstallPlan = {
        operation: 'upgrade',
        pluginId: 'rollback.upgrade.plugin',
        version: '0.2.0',
        packagePath: 'packages/rollback.upgrade.plugin-0.2.0.pcp',
        stagedPath: 'staging/rollback.upgrade.plugin/0.2.0',
        previousVersion: '0.1.0',
        steps: [
            {
                id: 'rollback.upgrade.plugin:stage:0.2.0',
                kind: 'stage',
                title: 'Stage package',
                description: 'Stage rollback upgrade plugin v0.2.0.',
            },
        ],
        warnings: [],
    };

    await packageInstaller.install(initialInstallPlan);
    await packageInstaller.install(upgradeInstallPlan);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installedPackageSnapshot = installedPackageStore.getSnapshot(upgradeInstallPlan.pluginId);
    assert.equal(stagingStore.get(upgradeInstallPlan.pluginId), null);
    assert.equal(installedPackageSnapshot?.activeVersion, '0.2.0');
    assert.deepEqual(
        installedPackageSnapshot?.versions.map((installedPackageRecord) => {
            return installedPackageRecord.version;
        }),
        ['0.1.0', '0.2.0'],
    );
});
