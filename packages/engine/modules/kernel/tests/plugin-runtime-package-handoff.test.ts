import assert from 'assert/strict';
import test from 'node:test';

import type { IPluginManifest } from '@peanut/pod-protocol';
import { PackagingApp } from '@peanut/pod-engine/installation';
import { RuntimeFacade } from '@peanut/pod-engine/runtime';

import { PluginManagerApp } from '../src/app/plugin-manager-app';
import { SamplePluginModule } from '../src/integration/sample-plugin-module';
import { UpgradeablePanelPluginModule } from '../src/integration/upgradeable-panel-plugin-module';
import type { IPluginActivateContext, IPluginModule } from '../src/shared/plugin-manager-contracts.js';

/**
 * @description 创建在激活阶段注册版本服务的测试 provider；可注入激活失败以覆盖回滚后的服务撤销与重新注册。
 * @param pluginId provider 插件稳定标识
 * @param version 当前 provider 版本
 * @param shouldFailActivate 是否在服务注册后模拟激活失败
 * @param onActivate 激活阶段的附加观测回调
 * @returns 生命周期测试模块
 */
function createVersionServiceProviderModule(
    pluginId: string,
    version: string,
    shouldFailActivate: boolean,
    onActivate?: (context: IPluginActivateContext) => void | Promise<void>,
): IPluginModule {
    const manifest: IPluginManifest = {
        id: pluginId,
        version,
        kind: 'tooling-plugin',
        displayName: 'Version Service Provider',
        main: './version-service-provider.mjs',
        engines: { host: '^0.1.0' },
        activation: { autoActivate: false, events: [] },
        permissions: {
            editorMessages: ['provider:ping'],
        },
        contributions: {},
    };
    return {
        manifest,
        async register(): Promise<void> {},
        async activate(context: IPluginActivateContext): Promise<void> {
            context.services.register('version', async (): Promise<{ version: string }> => {
                return { version };
            });
            await onActivate?.(context);
            if (shouldFailActivate) {
                throw new Error(`version_service_provider_activate_failed:${version}`);
            }
        },
        async deactivate(): Promise<void> {},
        async dispose(): Promise<void> {},
    };
}

test('plugin manager should install and upgrade runtime modules through package handoff APIs', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingApp = new PackagingApp();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManagerApp = new PluginManagerApp(runtimeFacade, packagingApp);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginId = 'plugin-manager.package-handoff.plugin';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginModuleV1 = new UpgradeablePanelPluginModule({
        pluginId,
        trackStorageVersion: true,
        version: '0.1.0',
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginModuleV2 = new UpgradeablePanelPluginModule({
        openOnActivate: false,
        pluginId,
        trackStorageVersion: true,
        version: '0.2.0',
    });

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const packResultV1 = await packagingApp.pack('plugins/package-handoff/v0.1.0', pluginModuleV1.manifest);
    pluginManagerApp.registerPackageRuntimeModule(packResultV1.packagePath, () => {
        return new UpgradeablePanelPluginModule({
            pluginId,
            trackStorageVersion: true,
            version: '0.1.0',
        });
    });

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const installResultV1 = await pluginManagerApp.installAndActivatePackage(packResultV1.packagePath);

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const packResultV2 = await packagingApp.pack('plugins/package-handoff/v0.2.0', pluginModuleV2.manifest);
    pluginManagerApp.registerPackageRuntimeModule(packResultV2.packagePath, () => {
        return new UpgradeablePanelPluginModule({
            openOnActivate: false,
            pluginId,
            trackStorageVersion: true,
            version: '0.2.0',
        });
    });

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const upgradeResult = await pluginManagerApp.upgradeAndActivatePackage(packResultV2.packagePath);
    // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
    const runtimeRecord = pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
        return pluginRuntimeRecord.pluginId === pluginId;
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installedPackageSnapshot = pluginManagerApp.getInstalledPackageSnapshot(pluginId);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const upgradeDiagnostics = pluginManagerApp.getUpgradeDiagnostics(pluginId);
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const restoredPanelSession = await runtimeFacade.panelHost.getSession(pluginModuleV2.panelId);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const panelBridgeClient = pluginManagerApp.createPanelBridgeClient(pluginId, pluginModuleV2.panelId);
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const panelVersionResponse = await panelBridgeClient.request<{}, { pluginId: string; version: string }>({
        id: 'package-handoff-version',
        event: 'upgradeable.getVersion',
        expectsResponse: true,
        payload: {},
    });
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const storageStateResponse = await panelBridgeClient.request<
        {},
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        { pluginId: string; currentVersion: string | null; previousVersion: string | null }
    >({
        id: 'package-handoff-storage',
        event: 'upgradeable.getStorageState',
        expectsResponse: true,
        payload: {},
    });
    await panelBridgeClient.dispose();

    assert.equal(installResultV1.operation, 'install');
    assert.equal(upgradeResult.operation, 'upgrade');
    assert.equal(upgradeResult.previousVersion, '0.1.0');
    assert.equal(runtimeRecord?.state, 'active');
    assert.equal(runtimeRecord?.version, '0.2.0');
    assert.equal(installedPackageSnapshot?.activeVersion, '0.2.0');
    assert.equal(upgradeDiagnostics?.outcome, 'succeeded');
    assert.equal(upgradeDiagnostics?.failureStepId, null);
    assert.equal(upgradeDiagnostics?.recoveryPoint, 'target_active');
    assert.equal(upgradeDiagnostics?.rollbackApplied, false);
    assert.equal(upgradeDiagnostics?.currentRuntimeVersion, '0.2.0');
    assert.equal(upgradeDiagnostics?.currentRuntimeState, 'active');
    assert.equal(upgradeDiagnostics?.activeInstalledVersion, '0.2.0');
    assert.equal(upgradeDiagnostics?.previousPanelSessionCount, 1);
    assert.equal(upgradeDiagnostics?.restoredPanelSessionCount, 1);
    assert.equal(upgradeDiagnostics?.storageRestored, false);
    assert.equal(upgradeDiagnostics?.steps.find((step) => step.id === 'rollback_previous_runtime')?.status, 'skipped');
    assert.equal(restoredPanelSession?.panelId, pluginModuleV2.panelId);
    assert.equal(restoredPanelSession?.isOpen, true);
    assert.equal(panelVersionResponse.payload?.version, '0.2.0');
    assert.equal(storageStateResponse.payload?.currentVersion, '0.2.0');
    assert.equal(storageStateResponse.payload?.previousVersion, '0.1.0');

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const uninstallResult = await pluginManagerApp.uninstallPackage(pluginId);
    assert.equal(uninstallResult.removed, true);
});

test('plugin manager should reactivate an inactive auto-activated installed package during refresh recovery', async (): Promise<void> => {
    const runtimeFacade = new RuntimeFacade('3.8.7');
    const samplePluginModule = new SamplePluginModule();
    const basePackagingApp = new PackagingApp();
    const packagingApp = {
        getProjectPluginFileStore: () => {
            return basePackagingApp.getProjectPluginFileStore();
        },
        listInstalledPackageSnapshots: () => {
            return [
                {
                    activeVersion: samplePluginModule.manifest.version,
                    pluginId: samplePluginModule.manifest.id,
                    versions: [
                        {
                            installPath: 'installed/refresh-reactivation/sample.plugin/0.1.0',
                            version: samplePluginModule.manifest.version,
                        },
                    ],
                },
            ];
        },
        async inspect(): Promise<{ manifest: SamplePluginModule['manifest'] }> {
            return {
                manifest: samplePluginModule.manifest,
            };
        },
    } as unknown as PackagingApp;
    let resolverCalled = false;
    const pluginManagerApp = new PluginManagerApp(runtimeFacade, packagingApp, {
        async resolve(): Promise<SamplePluginModule> {
            resolverCalled = true;
            return new SamplePluginModule();
        },
    });
    pluginManagerApp.registerManifest({
        manifest: samplePluginModule.manifest,
        installPath: 'installed/refresh-reactivation/sample.plugin/0.1.0',
        trustLevel: 'community',
    });
    pluginManagerApp.attachModule(samplePluginModule.manifest.id, samplePluginModule);

    await pluginManagerApp.activatePlugin(samplePluginModule.manifest.id);
    await pluginManagerApp.deactivatePlugin(samplePluginModule.manifest.id, 'manual_disable');
    await pluginManagerApp.activateInstalledPackages();

    const runtimeRecord = pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
        return pluginRuntimeRecord.pluginId === samplePluginModule.manifest.id;
    });
    assert.equal(resolverCalled, true);
    assert.equal(runtimeRecord?.state, 'active');
});

test('plugin manager should restore consumer service requests to the rolled-back provider version after a failed package upgrade', async (): Promise<void> => {
    const packagingApp = new PackagingApp();
    const runtimeFacade = new RuntimeFacade('3.8.7');
    const pluginManagerApp = new PluginManagerApp(runtimeFacade, packagingApp);
    const providerPluginId = 'plugin-manager.service-provider';
    const consumerPluginId = 'plugin-manager.service-consumer';
    const providerModuleV1 = createVersionServiceProviderModule(providerPluginId, '0.1.0', false);
    const providerModuleV2 = createVersionServiceProviderModule(providerPluginId, '0.2.0', true);
    let consumerServices: IPluginActivateContext['services'] | null = null;
    const consumerModule: IPluginModule = {
        manifest: {
            id: consumerPluginId,
            version: '0.1.0',
            kind: 'tooling-plugin',
            displayName: 'Version Service Consumer',
            main: './version-service-consumer.mjs',
            engines: { host: '^0.1.0' },
            activation: { autoActivate: false, events: [] },
            permissions: {},
            contributions: {},
        },
        async register(): Promise<void> {},
        async activate(context: IPluginActivateContext): Promise<void> {
            consumerServices = context.services;
        },
        async deactivate(): Promise<void> {},
        async dispose(): Promise<void> {},
    };

    const packResultV1 = await packagingApp.pack('plugins/service-provider/v0.1.0', providerModuleV1.manifest);
    pluginManagerApp.registerPackageRuntimeModule(packResultV1.packagePath, () => {
        return createVersionServiceProviderModule(providerPluginId, '0.1.0', false);
    });
    await pluginManagerApp.installAndActivatePackage(packResultV1.packagePath);
    pluginManagerApp.registerManifest({
        manifest: consumerModule.manifest,
        installPath: 'installed/service-consumer/0.1.0',
        trustLevel: 'community',
    });
    pluginManagerApp.attachModule(consumerPluginId, consumerModule);
    await pluginManagerApp.activatePlugin(consumerPluginId);

    const initialVersionResponse = await consumerServices?.request<{ version: string }>(providerPluginId, 'version', {});
    assert.equal(initialVersionResponse?.version, '0.1.0');

    const packResultV2 = await packagingApp.pack('plugins/service-provider/v0.2.0', providerModuleV2.manifest);
    pluginManagerApp.registerPackageRuntimeModule(packResultV2.packagePath, () => {
        return createVersionServiceProviderModule(providerPluginId, '0.2.0', true);
    });
    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.upgradeAndActivatePackage(packResultV2.packagePath);
    }, /version_service_provider_activate_failed:0.2.0/);

    const recoveredVersionResponse = await consumerServices?.request<{ version: string }>(providerPluginId, 'version', {});
    const providerRuntimeRecord = pluginManagerApp.listRuntimeRecords().find((runtimeRecord) => {
        return runtimeRecord.pluginId === providerPluginId;
    });
    const upgradeDiagnostics = pluginManagerApp.getUpgradeDiagnostics(providerPluginId);

    assert.equal(recoveredVersionResponse?.version, '0.1.0');
    assert.equal(providerRuntimeRecord?.state, 'active');
    assert.equal(providerRuntimeRecord?.version, '0.1.0');
    assert.equal(upgradeDiagnostics?.outcome, 'rolled_back');
    assert.equal(upgradeDiagnostics?.rollbackApplied, true);
});

test('plugin manager should isolate consumer grants and panel sessions when a provider upgrade rolls back', async (): Promise<void> => {
    const packagingApp = new PackagingApp();
    const runtimeFacade = new RuntimeFacade('3.8.7');
    const pluginManagerApp = new PluginManagerApp(runtimeFacade, packagingApp);
    const providerPluginId = 'plugin-manager.isolated-provider';
    const consumerPluginId = 'plugin-manager.isolated-consumer';
    const unrelatedPluginId = 'plugin-manager.isolated-unrelated';
    const consumerPanelId = `${consumerPluginId}.panel`;
    const unrelatedPluginModule = new UpgradeablePanelPluginModule({
        pluginId: unrelatedPluginId,
        version: '0.1.0',
    });
    let consumerServices: IPluginActivateContext['services'] | null = null;
    let consumerMessage: IPluginActivateContext['runtime']['message'] | null = null;
    let failedProviderMessage: IPluginActivateContext['runtime']['message'] | null = null;
    const consumerModule: IPluginModule = {
        manifest: {
            id: consumerPluginId,
            version: '0.1.0',
            kind: 'panel-plugin',
            displayName: 'Isolated Service Consumer',
            main: './isolated-service-consumer.mjs',
            engines: { host: '^0.1.0' },
            activation: { autoActivate: false, events: [] },
            permissions: {
                editorMessages: ['consumer:still-active'],
                panel: {
                    open: true,
                    embed: true,
                },
            },
            contributions: {
                panels: [
                    {
                        id: consumerPanelId,
                        title: 'Isolated Service Consumer',
                        entry: 'panels/isolated-consumer/index.html',
                        placement: 'utility',
                        singleton: true,
                        activationPolicy: 'manual',
                        sessionPolicy: 'restore_layout',
                        permissions: {
                            allowSelectionRead: false,
                        },
                    },
                ],
            },
        },
        async register(context): Promise<void> {
            context.registry.registerPanel({
                id: consumerPanelId,
                title: 'Isolated Service Consumer',
                entry: 'panels/isolated-consumer/index.html',
                placement: 'utility',
                singleton: true,
                activationPolicy: 'manual',
                sessionPolicy: 'restore_layout',
                permissions: {
                    allowSelectionRead: false,
                },
            });
        },
        async activate(context): Promise<void> {
            consumerServices = context.services;
            consumerMessage = context.runtime.message ?? null;
            await context.panels.open(consumerPanelId);
        },
        async deactivate(): Promise<void> {},
        async dispose(): Promise<void> {},
    };

    const providerPackageV1 = await packagingApp.pack(
        'plugins/isolated-provider/v0.1.0',
        createVersionServiceProviderModule(providerPluginId, '0.1.0', false).manifest,
    );
    pluginManagerApp.registerPackageRuntimeModule(providerPackageV1.packagePath, () => {
        return createVersionServiceProviderModule(providerPluginId, '0.1.0', false);
    });
    await pluginManagerApp.installAndActivatePackage(providerPackageV1.packagePath);
    pluginManagerApp.registerManifest({
        manifest: consumerModule.manifest,
        installPath: 'installed/isolated-consumer/0.1.0',
        trustLevel: 'community',
    });
    pluginManagerApp.attachModule(consumerPluginId, consumerModule);
    await pluginManagerApp.activatePlugin(consumerPluginId);
    pluginManagerApp.registerManifest({
        manifest: unrelatedPluginModule.manifest,
        installPath: 'installed/isolated-unrelated/0.1.0',
        trustLevel: 'community',
    });
    pluginManagerApp.attachModule(unrelatedPluginId, unrelatedPluginModule);
    await pluginManagerApp.activatePlugin(unrelatedPluginId);

    const providerPackageV2 = await packagingApp.pack(
        'plugins/isolated-provider/v0.2.0',
        createVersionServiceProviderModule(providerPluginId, '0.2.0', true).manifest,
    );
    pluginManagerApp.registerPackageRuntimeModule(providerPackageV2.packagePath, () => {
        return createVersionServiceProviderModule(providerPluginId, '0.2.0', true, (context): void => {
            failedProviderMessage = context.runtime.message ?? null;
        });
    });
    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.upgradeAndActivatePackage(providerPackageV2.packagePath);
    }, /version_service_provider_activate_failed:0.2.0/);

    if (consumerServices == null || consumerMessage == null || failedProviderMessage == null) {
        throw new Error('Expected provider and consumer runtime grants to be captured during activation.');
    }

    const recoveredVersionResponse = await consumerServices.request<{ version: string }>(providerPluginId, 'version', {});
    const consumerPanelSession = await runtimeFacade.panelHost.getSession(consumerPanelId);
    const unrelatedPanelSession = await runtimeFacade.panelHost.getSession(unrelatedPluginModule.panelId);
    const consumerRuntimeRecord = pluginManagerApp.listRuntimeRecords().find((runtimeRecord) => {
        return runtimeRecord.pluginId === consumerPluginId;
    });
    const unrelatedRuntimeRecord = pluginManagerApp.listRuntimeRecords().find((runtimeRecord) => {
        return runtimeRecord.pluginId === unrelatedPluginId;
    });
    const providerUpgradeDiagnostics = pluginManagerApp.getUpgradeDiagnostics(providerPluginId);

    assert.equal(recoveredVersionResponse.version, '0.1.0');
    await consumerMessage.broadcast('consumer:still-active', consumerPluginId);
    await assert.rejects(async (): Promise<void> => {
        await failedProviderMessage.broadcast('provider:ping', providerPluginId);
    }, /revoked/);
    assert.equal(consumerRuntimeRecord?.state, 'active');
    assert.equal(unrelatedRuntimeRecord?.state, 'active');
    assert.equal(consumerPanelSession?.isOpen, true);
    assert.equal(unrelatedPanelSession?.isOpen, true);
    assert.equal(providerUpgradeDiagnostics?.outcome, 'rolled_back');
    assert.equal(providerUpgradeDiagnostics?.rollbackApplied, true);
    assert.equal(providerUpgradeDiagnostics?.currentRuntimeVersion, '0.1.0');
});

test('plugin manager should record a recovery point when previous runtime deactivation fails', async (): Promise<void> => {
    const packagingApp = new PackagingApp();
    const runtimeFacade = new RuntimeFacade('3.8.7');
    const pluginManagerApp = new PluginManagerApp(runtimeFacade, packagingApp);
    const pluginId = 'plugin-manager.deactivation-diagnostics-provider';
    const pluginModuleV1: IPluginModule = {
        ...createVersionServiceProviderModule(pluginId, '0.1.0', false),
        async deactivate(reason): Promise<void> {
            if (reason === 'plugin_update') {
                throw new Error('provider_deactivate_for_upgrade_failed');
            }
        },
    };
    const pluginModuleV2 = createVersionServiceProviderModule(pluginId, '0.2.0', false);
    const packageV1 = await packagingApp.pack('plugins/deactivation-diagnostics-provider/v0.1.0', pluginModuleV1.manifest);
    pluginManagerApp.registerPackageRuntimeModule(packageV1.packagePath, () => {
        return pluginModuleV1;
    });
    await pluginManagerApp.installAndActivatePackage(packageV1.packagePath);

    const packageV2 = await packagingApp.pack('plugins/deactivation-diagnostics-provider/v0.2.0', pluginModuleV2.manifest);
    pluginManagerApp.registerPackageRuntimeModule(packageV2.packagePath, () => {
        return createVersionServiceProviderModule(pluginId, '0.2.0', false);
    });
    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.upgradeAndActivatePackage(packageV2.packagePath);
    }, /provider_deactivate_for_upgrade_failed/);

    const runtimeRecord = pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
        return pluginRuntimeRecord.pluginId === pluginId;
    });
    const upgradeDiagnostics = pluginManagerApp.getUpgradeDiagnostics(pluginId);

    assert.equal(runtimeRecord?.state, 'active');
    assert.equal(runtimeRecord?.version, '0.1.0');
    assert.equal(pluginManagerApp.getActiveInstalledPackage(pluginId)?.version, '0.1.0');
    assert.equal(upgradeDiagnostics?.outcome, 'rolled_back');
    assert.equal(upgradeDiagnostics?.failureStepId, 'deactivate_previous_runtime');
    assert.equal(upgradeDiagnostics?.recoveryPoint, 'previous_runtime_restored');
    assert.equal(upgradeDiagnostics?.failureMessage, 'provider_deactivate_for_upgrade_failed');
    assert.equal(upgradeDiagnostics?.recoveryFailureMessage, undefined);
    assert.equal(upgradeDiagnostics?.steps.find((step) => step.id === 'deactivate_previous_runtime')?.status, 'failed');
    assert.equal(upgradeDiagnostics?.steps.find((step) => step.id === 'dispose_previous_runtime')?.status, 'skipped');
    assert.equal(upgradeDiagnostics?.steps.find((step) => step.id === 'rollback_previous_runtime')?.status, 'completed');
});

test('plugin manager should roll back package handoff upgrades when the new runtime module fails activation', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packagingApp = new PackagingApp();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginManagerApp = new PluginManagerApp(runtimeFacade, packagingApp);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginId = 'plugin-manager.package-handoff-rollback.plugin';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginModuleV1 = new UpgradeablePanelPluginModule({
        pluginId,
        trackStorageVersion: true,
        version: '0.1.0',
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pluginModuleV2 = new UpgradeablePanelPluginModule({
        failActivate: true,
        openOnActivate: false,
        pluginId,
        trackStorageVersion: true,
        version: '0.2.0',
    });

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const packResultV1 = await packagingApp.pack('plugins/package-handoff-rollback/v0.1.0', pluginModuleV1.manifest);
    pluginManagerApp.registerPackageRuntimeModule(packResultV1.packagePath, () => {
        return new UpgradeablePanelPluginModule({
            pluginId,
            trackStorageVersion: true,
            version: '0.1.0',
        });
    });
    await pluginManagerApp.installAndActivatePackage(packResultV1.packagePath);

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const packResultV2 = await packagingApp.pack('plugins/package-handoff-rollback/v0.2.0', pluginModuleV2.manifest);
    pluginManagerApp.registerPackageRuntimeModule(packResultV2.packagePath, () => {
        return new UpgradeablePanelPluginModule({
            failActivate: true,
            openOnActivate: false,
            pluginId,
            trackStorageVersion: true,
            version: '0.2.0',
        });
    });

    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.upgradeAndActivatePackage(packResultV2.packagePath);
    }, /upgradeable_plugin_activate_failed:0.2.0/);

    // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
    const runtimeRecord = pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
        return pluginRuntimeRecord.pluginId === pluginId;
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const installedPackageSnapshot = pluginManagerApp.getInstalledPackageSnapshot(pluginId);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const upgradeDiagnostics = pluginManagerApp.getUpgradeDiagnostics(pluginId);
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const restoredPanelSession = await runtimeFacade.panelHost.getSession(pluginModuleV1.panelId);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const panelBridgeClient = pluginManagerApp.createPanelBridgeClient(pluginId, pluginModuleV1.panelId);
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const panelVersionResponse = await panelBridgeClient.request<{}, { pluginId: string; version: string }>({
        id: 'package-handoff-rollback-version',
        event: 'upgradeable.getVersion',
        expectsResponse: true,
        payload: {},
    });
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const storageStateResponse = await panelBridgeClient.request<
        {},
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        { pluginId: string; currentVersion: string | null; previousVersion: string | null }
    >({
        id: 'package-handoff-rollback-storage',
        event: 'upgradeable.getStorageState',
        expectsResponse: true,
        payload: {},
    });
    await panelBridgeClient.dispose();

    assert.equal(runtimeRecord?.state, 'active');
    assert.equal(runtimeRecord?.version, '0.1.0');
    assert.equal(runtimeRecord?.failureIncident, undefined);
    assert.equal(installedPackageSnapshot?.activeVersion, '0.1.0');
    assert.equal(upgradeDiagnostics?.outcome, 'rolled_back');
    assert.equal(upgradeDiagnostics?.failureStepId, 'activate_target_runtime');
    assert.equal(upgradeDiagnostics?.recoveryPoint, 'previous_runtime_restored');
    assert.equal(upgradeDiagnostics?.rollbackApplied, true);
    assert.equal(upgradeDiagnostics?.failureMessage, 'upgradeable_plugin_activate_failed:0.2.0');
    assert.equal(upgradeDiagnostics?.currentRuntimeVersion, '0.1.0');
    assert.equal(upgradeDiagnostics?.currentRuntimeState, 'active');
    assert.equal(upgradeDiagnostics?.activeInstalledVersion, '0.1.0');
    assert.equal(upgradeDiagnostics?.previousPanelSessionCount, 1);
    assert.equal(upgradeDiagnostics?.restoredPanelSessionCount, 1);
    assert.equal(upgradeDiagnostics?.storageRestored, true);
    assert.equal(upgradeDiagnostics?.steps.find((step) => step.id === 'activate_target_runtime')?.status, 'failed');
    assert.equal(upgradeDiagnostics?.steps.find((step) => step.id === 'restore_target_panel_sessions')?.status, 'skipped');
    assert.equal(upgradeDiagnostics?.steps.find((step) => step.id === 'rollback_previous_runtime')?.status, 'completed');
    assert.equal(restoredPanelSession?.panelId, pluginModuleV1.panelId);
    assert.equal(restoredPanelSession?.isOpen, true);
    assert.equal(panelVersionResponse.payload?.version, '0.1.0');
    assert.equal(storageStateResponse.payload?.currentVersion, '0.1.0');
    assert.equal(storageStateResponse.payload?.previousVersion, null);

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const uninstallResult = await pluginManagerApp.uninstallPackage(pluginId);
    assert.equal(uninstallResult.removed, true);
});

test('plugin manager should retry a package handoff upgrade after rollback and restore its panel state', async (): Promise<void> => {
    const packagingApp = new PackagingApp();
    const runtimeFacade = new RuntimeFacade('3.8.7');
    const pluginManagerApp = new PluginManagerApp(runtimeFacade, packagingApp);
    const pluginId = 'plugin-manager.package-handoff-retry.plugin';
    const pluginModuleV1 = new UpgradeablePanelPluginModule({
        pluginId,
        trackStorageVersion: true,
        version: '0.1.0',
    });
    const pluginModuleV2 = new UpgradeablePanelPluginModule({
        openOnActivate: false,
        pluginId,
        trackStorageVersion: true,
        version: '0.2.0',
    });

    const packResultV1 = await packagingApp.pack('plugins/package-handoff-retry/v0.1.0', pluginModuleV1.manifest);
    pluginManagerApp.registerPackageRuntimeModule(packResultV1.packagePath, () => {
        return new UpgradeablePanelPluginModule({
            pluginId,
            trackStorageVersion: true,
            version: '0.1.0',
        });
    });
    await pluginManagerApp.installAndActivatePackage(packResultV1.packagePath);

    const packResultV2 = await packagingApp.pack('plugins/package-handoff-retry/v0.2.0', pluginModuleV2.manifest);
    let targetModuleFactoryInvocationCount = 0;
    pluginManagerApp.registerPackageRuntimeModule(packResultV2.packagePath, () => {
        targetModuleFactoryInvocationCount += 1;
        return new UpgradeablePanelPluginModule({
            failActivate: targetModuleFactoryInvocationCount === 1,
            openOnActivate: false,
            pluginId,
            trackStorageVersion: true,
            version: '0.2.0',
        });
    });

    await assert.rejects(async (): Promise<void> => {
        await pluginManagerApp.upgradeAndActivatePackage(packResultV2.packagePath);
    }, /upgradeable_plugin_activate_failed:0.2.0/);

    const rollbackRuntimeRecord = pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
        return pluginRuntimeRecord.pluginId === pluginId;
    });
    const rollbackPanelSession = await runtimeFacade.panelHost.getSession(pluginModuleV1.panelId);
    assert.equal(rollbackRuntimeRecord?.version, '0.1.0');
    assert.equal(rollbackPanelSession?.isOpen, true);

    const retryResult = await pluginManagerApp.upgradeAndActivatePackage(packResultV2.packagePath);
    const retriedRuntimeRecord = pluginManagerApp.listRuntimeRecords().find((pluginRuntimeRecord) => {
        return pluginRuntimeRecord.pluginId === pluginId;
    });
    const installedPackageSnapshot = pluginManagerApp.getInstalledPackageSnapshot(pluginId);
    const upgradeDiagnostics = pluginManagerApp.getUpgradeDiagnostics(pluginId);
    const restoredPanelSession = await runtimeFacade.panelHost.getSession(pluginModuleV2.panelId);
    const panelBridgeClient = pluginManagerApp.createPanelBridgeClient(pluginId, pluginModuleV2.panelId);
    const panelVersionResponse = await panelBridgeClient.request<{}, { pluginId: string; version: string }>({
        id: 'package-handoff-retry-version',
        event: 'upgradeable.getVersion',
        expectsResponse: true,
        payload: {},
    });
    const storageStateResponse = await panelBridgeClient.request<
        {},
        { pluginId: string; currentVersion: string | null; previousVersion: string | null }
    >({
        id: 'package-handoff-retry-storage',
        event: 'upgradeable.getStorageState',
        expectsResponse: true,
        payload: {},
    });
    await panelBridgeClient.dispose();

    assert.equal(targetModuleFactoryInvocationCount, 2);
    assert.equal(retryResult.operation, 'upgrade');
    assert.equal(retryResult.previousVersion, '0.1.0');
    assert.equal(retriedRuntimeRecord?.state, 'active');
    assert.equal(retriedRuntimeRecord?.version, '0.2.0');
    assert.equal(retriedRuntimeRecord?.failureIncident, undefined);
    assert.equal(installedPackageSnapshot?.activeVersion, '0.2.0');
    assert.equal(upgradeDiagnostics?.outcome, 'succeeded');
    assert.equal(upgradeDiagnostics?.rollbackApplied, false);
    assert.equal(upgradeDiagnostics?.previousPanelSessionCount, 1);
    assert.equal(upgradeDiagnostics?.restoredPanelSessionCount, 1);
    assert.equal(restoredPanelSession?.isOpen, true);
    assert.equal(panelVersionResponse.payload?.version, '0.2.0');
    assert.equal(storageStateResponse.payload?.currentVersion, '0.2.0');
    assert.equal(storageStateResponse.payload?.previousVersion, '0.1.0');

    const uninstallResult = await pluginManagerApp.uninstallPackage(pluginId);
    assert.equal(uninstallResult.removed, true);
});
