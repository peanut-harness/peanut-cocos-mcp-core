import assert from 'assert/strict';
import test from 'node:test';

import type { IPluginManifest } from 'peanut-contracts';
import { PackagingApp } from 'peanut-packaging';
import { RuntimeFacade } from 'peanut-runtime';

import { PluginManagerApp } from '../src/app/plugin-manager-app';
import { FaultyPluginModule } from '../src/integration/faulty-plugin-module';
import { HotplugFailurePluginModule } from '../src/integration/hotplug-failure-plugin-module';

/**
 * @description 创建供目录包加载失败测试使用的最小插件清单。
 * @param pluginId 插件稳定标识。
 * @param creatorRange 可选的 Cocos Creator 版本范围。
 * @returns 可交给 PackagingApp 打包的插件清单。
 */
function createLoadFailureManifest(pluginId: string, creatorRange?: string): IPluginManifest {
    return {
        id: pluginId,
        version: '0.1.0',
        kind: 'tooling-plugin',
        displayName: 'Load Failure Plugin',
        main: './plugin.mjs',
        engines: {
            host: '^0.1.0',
            creator: creatorRange,
        },
        activation: { autoActivate: true, events: ['onStartup'] },
        permissions: {},
    };
}

test('plugin manager should record module loading failures after retaining the installed package', async (): Promise<void> => {
    const packagingApp = new PackagingApp();
    const pluginId = 'plugin.module-load.failure';
    const pluginManagerApp = new PluginManagerApp(new RuntimeFacade('3.6.4'), packagingApp);
    const packResult = await packagingApp.pack('plugins/module-load-failure', createLoadFailureManifest(pluginId));
    pluginManagerApp.registerPackageRuntimeModule(packResult.packagePath, (): never => {
        throw new Error('plugin_module_factory_failed');
    });

    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.installAndActivatePackage(packResult.packagePath);
    }, /plugin_module_factory_failed/);

    assert.equal(pluginManagerApp.getFailureIncident(pluginId)?.phase, 'module_load');
    assert.equal(pluginManagerApp.getFailureIncident(pluginId)?.errorMessage, 'plugin_module_factory_failed');
    assert.equal(pluginManagerApp.getFailureIncident(pluginId)?.errorStack?.includes('plugin_module_factory_failed'), true);
    assert.equal(pluginManagerApp.getInstalledPackageSnapshot(pluginId)?.activeVersion, '0.1.0');
});

test('plugin manager should reject an incompatible Creator version before plugin module loading', async (): Promise<void> => {
    const packagingApp = new PackagingApp();
    const pluginId = 'plugin.creator-incompatible';
    const pluginManagerApp = new PluginManagerApp(new RuntimeFacade('3.6.4'), packagingApp);
    const packResult = await packagingApp.pack('plugins/creator-incompatible', createLoadFailureManifest(pluginId, '>=3.8.0 <3.9.0'));
    let moduleFactoryCalled = false;
    pluginManagerApp.registerPackageRuntimeModule(packResult.packagePath, (): never => {
        moduleFactoryCalled = true;
        throw new Error('plugin_module_factory_should_not_run');
    });

    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.installAndActivatePackage(packResult.packagePath);
    }, /plugin_creator_incompatible:plugin\.creator-incompatible:>=3\.8\.0 <3\.9\.0:3\.6\.4/);

    assert.equal(moduleFactoryCalled, false);
    assert.equal(pluginManagerApp.getFailureIncident(pluginId)?.phase, 'host_compatibility');
    assert.equal(pluginManagerApp.getInstalledPackageSnapshot(pluginId)?.activeVersion, '0.1.0');
});

test('plugin manager should mark a plugin as failed when register throws', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManagerApp = new PluginManagerApp(new RuntimeFacade('3.8.7'));
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const faultyPluginModule = new FaultyPluginModule('register');

    pluginManagerApp.registerManifest({
        manifest: faultyPluginModule.manifest,
        installPath: 'plugins/faulty-plugin',
        trustLevel: 'community',
    });
    pluginManagerApp.attachModule(faultyPluginModule.manifest.id, faultyPluginModule);

    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.activatePlugin(faultyPluginModule.manifest.id);
    }, /faulty_plugin_register_failed/);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeRecord = pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
        return pluginRuntimeRecord.pluginId === faultyPluginModule.manifest.id;
    });
    assert.equal(runtimeRecord?.state, 'failed');
    assert.throws(() => {
        pluginManagerApp.createPanelBridgeClient(faultyPluginModule.manifest.id, 'faulty.panel');
    });
});

test('plugin manager should mark a plugin as failed when activate throws after successful register', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManagerApp = new PluginManagerApp(new RuntimeFacade('3.8.7'));
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const faultyPluginModule = new FaultyPluginModule('activate');

    pluginManagerApp.registerManifest({
        manifest: faultyPluginModule.manifest,
        installPath: 'plugins/faulty-plugin',
        trustLevel: 'community',
    });
    pluginManagerApp.attachModule(faultyPluginModule.manifest.id, faultyPluginModule);

    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.activatePlugin(faultyPluginModule.manifest.id);
    }, /faulty_plugin_activate_failed/);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeRecord = pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
        return pluginRuntimeRecord.pluginId === faultyPluginModule.manifest.id;
    });
    assert.equal(runtimeRecord?.state, 'failed');
});

test('plugin manager should preserve installed package, clean runtime side effects, and export failure details when activation fails after install', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingApp = new PackagingApp();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManagerApp = new PluginManagerApp(new RuntimeFacade('3.8.7'), packagingApp);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const hotplugFailurePluginModule = new HotplugFailurePluginModule({
        failureStage: 'activate',
        pluginId: 'hotplug.install.activate.plugin',
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packResult = await packagingApp.pack('plugins/hotplug-install-activate-plugin', hotplugFailurePluginModule.manifest);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installResult = await pluginManagerApp.installPackage(packResult.packagePath);
    pluginManagerApp.registerManifest({
        manifest: hotplugFailurePluginModule.manifest,
        installPath: installResult.installPath,
        trustLevel: 'community',
    });
    pluginManagerApp.attachModule(hotplugFailurePluginModule.manifest.id, hotplugFailurePluginModule);

    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.activatePlugin(hotplugFailurePluginModule.manifest.id);
    }, /hotplug_failure_activate_failed/);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeRecord = pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
        return pluginRuntimeRecord.pluginId === hotplugFailurePluginModule.manifest.id;
    });
    assert.equal(runtimeRecord?.state, 'failed');
    assert.equal(runtimeRecord?.health?.status, 'failed');
    assert.equal(pluginManagerApp.listFailureIncidents().length, 1);
    assert.equal(pluginManagerApp.getFailureIncident(hotplugFailurePluginModule.manifest.id)?.phase, 'activate');
    assert.equal(pluginManagerApp.getFailureIncident(hotplugFailurePluginModule.manifest.id)?.installPreserved, true);
    assert.throws(() => {
        pluginManagerApp.createPanelBridgeClient(hotplugFailurePluginModule.manifest.id, hotplugFailurePluginModule.panelId);
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const failureExport = pluginManagerApp.exportFailureIncident(hotplugFailurePluginModule.manifest.id);
    assert.equal(failureExport?.incident.errorMessage, 'hotplug_failure_activate_failed');
    assert.equal(failureExport?.serializedIncident.includes('hotplug.install.activate.plugin'), true);
    await assert.rejects(async (): Promise<void> => {
        await hotplugFailurePluginModule.readCapturedSelectionIds();
    }, /revoked/);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const uninstallResult = await pluginManagerApp.uninstallPackage(hotplugFailurePluginModule.manifest.id);
    assert.equal(uninstallResult.removed, true);
    assert.equal(uninstallResult.installPath, installResult.installPath);
});

test('plugin manager should quarantine the plugin and release panel access when deactivate fails', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManagerApp = new PluginManagerApp(new RuntimeFacade('3.8.7'));
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const hotplugFailurePluginModule = new HotplugFailurePluginModule({
        failureStage: 'deactivate',
        pluginId: 'hotplug.deactivate.failure.plugin',
    });

    pluginManagerApp.registerManifest({
        manifest: hotplugFailurePluginModule.manifest,
        installPath: 'plugins/hotplug-deactivate-failure-plugin',
        trustLevel: 'community',
    });
    pluginManagerApp.attachModule(hotplugFailurePluginModule.manifest.id, hotplugFailurePluginModule);
    await pluginManagerApp.activatePlugin(hotplugFailurePluginModule.manifest.id);

    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.deactivatePlugin(hotplugFailurePluginModule.manifest.id, 'manual_disable');
    }, /hotplug_failure_deactivate_failed/);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeRecord = pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
        return pluginRuntimeRecord.pluginId === hotplugFailurePluginModule.manifest.id;
    });
    assert.equal(runtimeRecord?.state, 'failed');
    assert.equal(pluginManagerApp.getFailureIncident(hotplugFailurePluginModule.manifest.id)?.phase, 'deactivate');
    assert.throws(() => {
        pluginManagerApp.createPanelBridgeClient(hotplugFailurePluginModule.manifest.id, hotplugFailurePluginModule.panelId);
    });
    await assert.rejects(async (): Promise<void> => {
        await hotplugFailurePluginModule.readCapturedSelectionIds();
    }, /revoked/);
});

test('plugin manager should quarantine the plugin when dispose fails after cleanup', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManagerApp = new PluginManagerApp(new RuntimeFacade('3.8.7'));
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const hotplugFailurePluginModule = new HotplugFailurePluginModule({
        failureStage: 'dispose',
        pluginId: 'hotplug.dispose.failure.plugin',
    });

    pluginManagerApp.registerManifest({
        manifest: hotplugFailurePluginModule.manifest,
        installPath: 'plugins/hotplug-dispose-failure-plugin',
        trustLevel: 'community',
    });
    pluginManagerApp.attachModule(hotplugFailurePluginModule.manifest.id, hotplugFailurePluginModule);
    await pluginManagerApp.activatePlugin(hotplugFailurePluginModule.manifest.id);

    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.disposePlugin(hotplugFailurePluginModule.manifest.id);
    }, /hotplug_failure_dispose_failed/);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeRecord = pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
        return pluginRuntimeRecord.pluginId === hotplugFailurePluginModule.manifest.id;
    });
    assert.equal(runtimeRecord?.state, 'failed');
    assert.equal(pluginManagerApp.getFailureIncident(hotplugFailurePluginModule.manifest.id)?.phase, 'dispose');
});

test('plugin manager should keep failed leases retryable and allow cleanup retry before re-activation', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManagerApp = new PluginManagerApp(new RuntimeFacade('3.8.7'));
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const hotplugFailurePluginModule = new HotplugFailurePluginModule({
        disposerFailureCount: 1,
        pluginId: 'hotplug.cleanup.retry.plugin',
    });

    pluginManagerApp.registerManifest({
        manifest: hotplugFailurePluginModule.manifest,
        installPath: 'plugins/hotplug-cleanup-retry-plugin',
        trustLevel: 'community',
    });
    pluginManagerApp.attachModule(hotplugFailurePluginModule.manifest.id, hotplugFailurePluginModule);
    await pluginManagerApp.activatePlugin(hotplugFailurePluginModule.manifest.id);

    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.deactivatePlugin(hotplugFailurePluginModule.manifest.id, 'manual_disable');
    }, /hotplug_failure_disposer_failed/);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const initialFailureIncident = pluginManagerApp.getFailureIncident(hotplugFailurePluginModule.manifest.id);
    assert.equal(initialFailureIncident?.cleanupSteps.some((cleanupStepResult) => !cleanupStepResult.ok), true);

    hotplugFailurePluginModule.clearDisposerFailures();
    // 保存当前流程收集的有序结果，供后续步骤统一处理。
    const retryCleanupStepResults = await pluginManagerApp.retryCleanup(hotplugFailurePluginModule.manifest.id);
    assert.equal(retryCleanupStepResults.every((cleanupStepResult) => cleanupStepResult.ok), true);
    assert.equal(pluginManagerApp.getFailureIncident(hotplugFailurePluginModule.manifest.id)?.cleanupSteps.every((cleanupStepResult) => cleanupStepResult.ok), true);

    await pluginManagerApp.activatePlugin(hotplugFailurePluginModule.manifest.id);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeRecord = pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
        return pluginRuntimeRecord.pluginId === hotplugFailurePluginModule.manifest.id;
    });
    assert.equal(runtimeRecord?.state, 'active');
    assert.equal(pluginManagerApp.getFailureIncident(hotplugFailurePluginModule.manifest.id), null);
});

test('plugin manager should preserve the installed package when uninstall fails during deactivate', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingApp = new PackagingApp();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManagerApp = new PluginManagerApp(new RuntimeFacade('3.8.7'), packagingApp);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const hotplugFailurePluginModule = new HotplugFailurePluginModule({
        failureStage: 'deactivate',
        pluginId: 'hotplug.uninstall.deactivate.failure.plugin',
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packResult = await packagingApp.pack('plugins/hotplug-uninstall-deactivate-failure-plugin', hotplugFailurePluginModule.manifest);
    pluginManagerApp.registerPackageRuntimeModule(packResult.packagePath, () => {
        return new HotplugFailurePluginModule({
            failureStage: 'deactivate',
            pluginId: hotplugFailurePluginModule.manifest.id,
        });
    });

    await pluginManagerApp.installAndActivatePackage(packResult.packagePath);

    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.uninstallPackage(hotplugFailurePluginModule.manifest.id);
    }, /hotplug_failure_deactivate_failed/);

    assert.equal(pluginManagerApp.getActiveInstalledPackage(hotplugFailurePluginModule.manifest.id)?.version, '0.1.0');
    assert.equal(pluginManagerApp.getInstalledPackageSnapshot(hotplugFailurePluginModule.manifest.id)?.activeVersion, '0.1.0');
    assert.equal(pluginManagerApp.getFailureIncident(hotplugFailurePluginModule.manifest.id)?.phase, 'deactivate');
    assert.equal(
        pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
            return pluginRuntimeRecord.pluginId === hotplugFailurePluginModule.manifest.id;
        })?.state,
        'failed',
    );
});

test('plugin manager should preserve the installed package when uninstall fails during dispose', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingApp = new PackagingApp();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManagerApp = new PluginManagerApp(new RuntimeFacade('3.8.7'), packagingApp);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const hotplugFailurePluginModule = new HotplugFailurePluginModule({
        failureStage: 'dispose',
        pluginId: 'hotplug.uninstall.dispose.failure.plugin',
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packResult = await packagingApp.pack('plugins/hotplug-uninstall-dispose-failure-plugin', hotplugFailurePluginModule.manifest);
    pluginManagerApp.registerPackageRuntimeModule(packResult.packagePath, () => {
        return new HotplugFailurePluginModule({
            failureStage: 'dispose',
            pluginId: hotplugFailurePluginModule.manifest.id,
        });
    });

    await pluginManagerApp.installAndActivatePackage(packResult.packagePath);

    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.uninstallPackage(hotplugFailurePluginModule.manifest.id);
    }, /hotplug_failure_dispose_failed/);

    assert.equal(pluginManagerApp.getActiveInstalledPackage(hotplugFailurePluginModule.manifest.id)?.version, '0.1.0');
    assert.equal(pluginManagerApp.getInstalledPackageSnapshot(hotplugFailurePluginModule.manifest.id)?.activeVersion, '0.1.0');
    assert.equal(pluginManagerApp.getFailureIncident(hotplugFailurePluginModule.manifest.id)?.phase, 'dispose');
    assert.equal(
        pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
            return pluginRuntimeRecord.pluginId === hotplugFailurePluginModule.manifest.id;
        })?.state,
        'failed',
    );
});
