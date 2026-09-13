import assert from 'assert/strict';
import test from 'node:test';

import type { IPluginManifest } from '@peanut/pod-protocol';
import { PackagingApp } from '@peanut/pod-engine/installation';
import { RuntimeFacade } from '@peanut/pod-engine/runtime';

import { PluginManagerApp } from '../src/app/plugin-manager-app';
import { SamplePluginAcceptanceHarness } from '../src/integration/sample-plugin-acceptance-harness';
import { UpgradeablePanelPluginModule } from '../src/integration/upgradeable-panel-plugin-module';

test('sample plugin acceptance harness should complete the third-party package to uninstall lifecycle', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const samplePluginAcceptanceHarness = new SamplePluginAcceptanceHarness('3.8.7');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const samplePluginAcceptanceResult = await samplePluginAcceptanceHarness.run();

    assert.equal(samplePluginAcceptanceResult.packResult.packagePath, 'packages/sample.plugin-0.1.0.pcp');
    assert.equal(samplePluginAcceptanceResult.inspection.isValidStructure, true);
    assert.equal(samplePluginAcceptanceResult.inspection.manifest?.id, 'sample.plugin');
    assert.equal(samplePluginAcceptanceResult.installPlan.pluginId, 'sample.plugin');
    assert.equal(samplePluginAcceptanceResult.installResult.installed, true);
    assert.equal(samplePluginAcceptanceResult.installResult.installPath, 'installed/sample.plugin/0.1.0');
    assert.equal(samplePluginAcceptanceResult.runtimeRecord?.pluginId, 'sample.plugin');
    assert.equal(samplePluginAcceptanceResult.runtimeRecord?.trustLevel, 'community');
    assert.equal(samplePluginAcceptanceResult.runtimeRecord?.state, 'disposed');
    assert.equal(samplePluginAcceptanceResult.panelStateResponse.ok, true);
    assert.equal(samplePluginAcceptanceResult.panelStateResponse.payload?.pluginId, 'sample.plugin');
    assert.deepEqual(samplePluginAcceptanceResult.panelStateResponse.payload?.activeIds, ['selection-node-a', 'selection-node-b']);
    assert.equal(samplePluginAcceptanceResult.taskResultResponse.ok, true);
    assert.equal(samplePluginAcceptanceResult.taskResultResponse.payload?.status, 'succeeded');
    assert.equal(samplePluginAcceptanceResult.taskResultResponse.payload?.kind, 'asset.query');
    assert.equal(samplePluginAcceptanceResult.taskResultResponse.payload?.mergePolicy, 'dedupe');
    assert.equal(samplePluginAcceptanceResult.taskTraceResponse.ok, true);
    assert.notEqual(samplePluginAcceptanceResult.taskTraceResponse.payload?.traceId, null);
    assert.equal(samplePluginAcceptanceResult.taskTraceResponse.payload?.firstStepStatus, 'planned');
    assert.equal((samplePluginAcceptanceResult.taskTraceResponse.payload?.stepCount ?? 0) >= 2, true);
    assert.equal(samplePluginAcceptanceResult.inactiveState, 'inactive');
    assert.equal(samplePluginAcceptanceResult.disposedState, 'disposed');
    assert.equal(samplePluginAcceptanceResult.uninstallResult.removed, true);
    assert.equal(samplePluginAcceptanceResult.uninstallResult.installPath, 'installed/sample.plugin/0.1.0');
});

test('plugin manager app should proxy package upgrade and expose the switched active version', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingApp = new PackagingApp();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManagerApp = new PluginManagerApp(new RuntimeFacade('3.8.7'), packagingApp);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManifestV1: IPluginManifest = {
        id: 'plugin-manager.upgrade.plugin',
        version: '0.1.0',
        kind: 'tooling-plugin',
        displayName: 'Plugin Manager Upgrade Plugin',
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
    const pluginManifestV2: IPluginManifest = {
        ...pluginManifestV1,
        version: '0.2.0',
    };

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingPackResultV1 = await packagingApp.pack('plugins/plugin-manager-upgrade/v0.1.0', pluginManifestV1);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installResultV1 = await pluginManagerApp.installPackage(packagingPackResultV1.packagePath);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingPackResultV2 = await packagingApp.pack('plugins/plugin-manager-upgrade/v0.2.0', pluginManifestV2);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const upgradeResult = await pluginManagerApp.upgradePackage(packagingPackResultV2.packagePath);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installedPackageSnapshot = pluginManagerApp.getInstalledPackageSnapshot(pluginManifestV1.id);

    assert.equal(installResultV1.operation, 'install');
    assert.equal(upgradeResult.operation, 'upgrade');
    assert.equal(upgradeResult.previousVersion, '0.1.0');
    assert.equal(installedPackageSnapshot?.activeVersion, '0.2.0');
    assert.deepEqual(
        installedPackageSnapshot?.versions.map((installedPackageRecord) => {
            return installedPackageRecord.version;
        }),
        ['0.1.0', '0.2.0'],
    );
});

test('plugin manager should switch the runtime instance to the upgraded plugin version', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingApp = new PackagingApp();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManagerApp = new PluginManagerApp(runtimeFacade, packagingApp);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginModuleV1 = new UpgradeablePanelPluginModule({
        pluginId: 'plugin-manager.runtime-upgrade.plugin',
        version: '0.1.0',
        trackStorageVersion: true,
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginModuleV2 = new UpgradeablePanelPluginModule({
        pluginId: 'plugin-manager.runtime-upgrade.plugin',
        version: '0.2.0',
        openOnActivate: false,
        trackStorageVersion: true,
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingPackResultV1 = await packagingApp.pack('plugins/runtime-upgrade/v0.1.0', pluginModuleV1.manifest);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installResultV1 = await pluginManagerApp.installPackage(packagingPackResultV1.packagePath);
    pluginManagerApp.registerManifest({
        manifest: pluginModuleV1.manifest,
        installPath: installResultV1.installPath,
        trustLevel: 'community',
    });
    pluginManagerApp.attachModule(pluginModuleV1.manifest.id, pluginModuleV1);
    await pluginManagerApp.activatePlugin(pluginModuleV1.manifest.id);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingPackResultV2 = await packagingApp.pack('plugins/runtime-upgrade/v0.2.0', pluginModuleV2.manifest);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const upgradeResult = await pluginManagerApp.upgradePlugin(packagingPackResultV2.packagePath, pluginModuleV2);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeRecord = pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
        return pluginRuntimeRecord.pluginId === pluginModuleV1.manifest.id;
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installedPackageSnapshot = pluginManagerApp.getInstalledPackageSnapshot(pluginModuleV1.manifest.id);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const restoredPanelSession = await runtimeFacade.panelHost.getSession(pluginModuleV2.panelId);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const panelBridgeClient = pluginManagerApp.createPanelBridgeClient(pluginModuleV2.manifest.id, pluginModuleV2.panelId);
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    const panelVersionResponse = await panelBridgeClient.request<{}, { pluginId: string; version: string }>({
        id: 'runtime-upgrade-version',
        event: 'upgradeable.getVersion',
        expectsResponse: true,
        payload: {},
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const storageStateResponse = await panelBridgeClient.request<
        {},
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        { pluginId: string; currentVersion: string | null; previousVersion: string | null }
    >({
        id: 'runtime-upgrade-storage-state',
        event: 'upgradeable.getStorageState',
        expectsResponse: true,
        payload: {},
    });
    await panelBridgeClient.dispose();

    assert.equal(upgradeResult.operation, 'upgrade');
    assert.equal(upgradeResult.previousVersion, '0.1.0');
    assert.equal(runtimeRecord?.version, '0.2.0');
    assert.equal(runtimeRecord?.state, 'active');
    assert.equal(installedPackageSnapshot?.activeVersion, '0.2.0');
    assert.equal(restoredPanelSession?.panelId, pluginModuleV2.panelId);
    assert.equal(restoredPanelSession?.isOpen, true);
    assert.equal(panelVersionResponse.payload?.version, '0.2.0');
    assert.equal(storageStateResponse.payload?.currentVersion, '0.2.0');
    assert.equal(storageStateResponse.payload?.previousVersion, '0.1.0');
});

test('plugin manager should roll back to the previous runtime instance when upgraded plugin activation fails', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingApp = new PackagingApp();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManagerApp = new PluginManagerApp(new RuntimeFacade('3.8.7'), packagingApp);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginModuleV1 = new UpgradeablePanelPluginModule({
        pluginId: 'plugin-manager.runtime-upgrade-rollback.plugin',
        version: '0.1.0',
        trackStorageVersion: true,
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginModuleV2 = new UpgradeablePanelPluginModule({
        pluginId: 'plugin-manager.runtime-upgrade-rollback.plugin',
        version: '0.2.0',
        failActivate: true,
        trackStorageVersion: true,
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingPackResultV1 = await packagingApp.pack('plugins/runtime-upgrade-rollback/v0.1.0', pluginModuleV1.manifest);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installResultV1 = await pluginManagerApp.installPackage(packagingPackResultV1.packagePath);
    pluginManagerApp.registerManifest({
        manifest: pluginModuleV1.manifest,
        installPath: installResultV1.installPath,
        trustLevel: 'community',
    });
    pluginManagerApp.attachModule(pluginModuleV1.manifest.id, pluginModuleV1);
    await pluginManagerApp.activatePlugin(pluginModuleV1.manifest.id);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingPackResultV2 = await packagingApp.pack('plugins/runtime-upgrade-rollback/v0.2.0', pluginModuleV2.manifest);
    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.upgradePlugin(packagingPackResultV2.packagePath, pluginModuleV2);
    }, /upgradeable_plugin_activate_failed:0.2.0/);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeRecord = pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
        return pluginRuntimeRecord.pluginId === pluginModuleV1.manifest.id;
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installedPackageSnapshot = pluginManagerApp.getInstalledPackageSnapshot(pluginModuleV1.manifest.id);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const panelBridgeClient = pluginManagerApp.createPanelBridgeClient(pluginModuleV1.manifest.id, pluginModuleV1.panelId);
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    const panelVersionResponse = await panelBridgeClient.request<{}, { pluginId: string; version: string }>({
        id: 'runtime-upgrade-rollback-version',
        event: 'upgradeable.getVersion',
        expectsResponse: true,
        payload: {},
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const storageStateResponse = await panelBridgeClient.request<
        {},
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        { pluginId: string; currentVersion: string | null; previousVersion: string | null }
    >({
        id: 'runtime-upgrade-rollback-storage-state',
        event: 'upgradeable.getStorageState',
        expectsResponse: true,
        payload: {},
    });
    await panelBridgeClient.dispose();

    assert.equal(runtimeRecord?.version, '0.1.0');
    assert.equal(runtimeRecord?.state, 'active');
    assert.equal(runtimeRecord?.failureIncident, undefined);
    assert.equal(installedPackageSnapshot?.activeVersion, '0.1.0');
    assert.deepEqual(
        installedPackageSnapshot?.versions.map((installedPackageRecord) => {
            return installedPackageRecord.version;
        }),
        ['0.1.0', '0.2.0'],
    );
    assert.equal(panelVersionResponse.payload?.version, '0.1.0');
    assert.equal(storageStateResponse.payload?.currentVersion, '0.1.0');
    assert.equal(storageStateResponse.payload?.previousVersion, null);
});

test('plugin manager should restore pre-upgrade panel sessions when upgraded plugin activation fails', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingApp = new PackagingApp();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManagerApp = new PluginManagerApp(runtimeFacade, packagingApp);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginModuleV1 = new UpgradeablePanelPluginModule({
        pluginId: 'plugin-manager.runtime-upgrade-panel-rollback.plugin',
        version: '0.1.0',
        trackStorageVersion: true,
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginModuleV2 = new UpgradeablePanelPluginModule({
        pluginId: 'plugin-manager.runtime-upgrade-panel-rollback.plugin',
        version: '0.2.0',
        failActivate: true,
        openOnActivate: false,
        trackStorageVersion: true,
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingPackResultV1 = await packagingApp.pack('plugins/runtime-upgrade-panel-rollback/v0.1.0', pluginModuleV1.manifest);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installResultV1 = await pluginManagerApp.installPackage(packagingPackResultV1.packagePath);
    pluginManagerApp.registerManifest({
        manifest: pluginModuleV1.manifest,
        installPath: installResultV1.installPath,
        trustLevel: 'community',
    });
    pluginManagerApp.attachModule(pluginModuleV1.manifest.id, pluginModuleV1);
    await pluginManagerApp.activatePlugin(pluginModuleV1.manifest.id);

    pluginModuleV1.setOpenOnActivate(false);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingPackResultV2 = await packagingApp.pack('plugins/runtime-upgrade-panel-rollback/v0.2.0', pluginModuleV2.manifest);
    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.upgradePlugin(packagingPackResultV2.packagePath, pluginModuleV2);
    }, /upgradeable_plugin_activate_failed:0.2.0/);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const restoredPanelSession = await runtimeFacade.panelHost.getSession(pluginModuleV1.panelId);

    assert.equal(restoredPanelSession?.panelId, pluginModuleV1.panelId);
    assert.equal(restoredPanelSession?.isOpen, true);
});
