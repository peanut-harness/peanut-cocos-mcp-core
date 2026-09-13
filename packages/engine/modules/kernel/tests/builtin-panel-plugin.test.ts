import assert from 'assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { normalize, resolve } from 'path';
import test from 'node:test';

import { RuntimeFacade } from '@peanut/pod-engine/runtime';

import { BuiltinPanelPluginModule } from '../src/builtin/builtin-panel-plugin-module';
import { PluginManagerApp } from '../src/app/plugin-manager-app';
import { BuiltinPanelPluginHarness } from '../src/integration/builtin-panel-plugin-harness';
import { SamplePluginModule } from '../src/integration/sample-plugin-module';

test('plugin manager should open a plugin panel through its declared open-panel command', async (): Promise<void> => {
    // 保存承载面板会话的插件管理器，用于验证宿主命令到插件面板的路由。
    const pluginManagerApp = new PluginManagerApp(
        new RuntimeFacade('3.8.7', {
            allowMemoryPanelWindowProviderFallback: true,
        }),
    );
    // 保存提供单面板命令贡献的样例插件，行为与 SnowB BMFont 包保持一致。
    const samplePluginModule = new SamplePluginModule();
    pluginManagerApp.registerManifest({
        manifest: samplePluginModule.manifest,
        installPath: '/plugins/sample-plugin',
        trustLevel: 'builtin',
    });
    pluginManagerApp.attachModule(samplePluginModule.manifest.id, samplePluginModule);
    await pluginManagerApp.activatePlugin(samplePluginModule.manifest.id);

    // 保存命令路由启动的面板容器结果，确认入口解析到唯一的插件面板。
    const launchResult = await pluginManagerApp.executePluginCommand('sample.openPanel');

    assert.equal(launchResult.session.panelId, 'sample.panel');
    assert.equal(normalize(launchResult.session.entry).endsWith(normalize('/plugins/sample-plugin/panels/sample/index.html')), true);
});

test('plugin manager should resolve an active embedded panel without launching a memory window', async (): Promise<void> => {
    // 保存本测试独占的临时插件安装目录，测试结束后统一清理。
    const pluginInstallPath = mkdtempSync(resolve(tmpdir(), 'peanut-embedded-panel-'));
    // 保存样例插件面板入口，模拟安装器生成的受边界保护绝对路径。
    const panelEntryPath = resolve(pluginInstallPath, 'panels/sample/index.html');
    mkdirSync(resolve(pluginInstallPath, 'panels/sample'), { recursive: true });
    writeFileSync(panelEntryPath, '<!doctype html><title>Sample Panel</title>', 'utf8');
    try {
        // 保存启用内存 fallback 的运行时，用于证明解析动作不会创建隐藏窗口会话。
        const runtime = new RuntimeFacade('3.8.7', {
            allowMemoryPanelWindowProviderFallback: true,
        });
        // 保存承载样例插件的管理器实例。
        const pluginManagerApp = new PluginManagerApp(runtime);
        // 保存声明唯一面板的样例插件模块。
        const samplePluginModule = new SamplePluginModule();
        pluginManagerApp.registerManifest({
            manifest: samplePluginModule.manifest,
            installPath: pluginInstallPath,
            trustLevel: 'builtin',
        });
        pluginManagerApp.attachModule(samplePluginModule.manifest.id, samplePluginModule);
        assert.throws(() => {
            pluginManagerApp.resolveEmbeddedPluginPanel(samplePluginModule.manifest.id);
        }, /plugin_panel_plugin_not_active:sample\.plugin:loaded/);
        await pluginManagerApp.activatePlugin(samplePluginModule.manifest.id);

        // 保存不产生窗口副作用的内嵌面板解析结果。
        const embeddedPanel = pluginManagerApp.resolveEmbeddedPluginPanel(samplePluginModule.manifest.id);

        assert.equal(embeddedPanel.id, 'sample.panel');
        assert.equal(embeddedPanel.entry, panelEntryPath);
        assert.equal(await runtime.panelHost.getSession('sample.panel'), null);
        rmSync(panelEntryPath);
        assert.throws(() => {
            pluginManagerApp.resolveEmbeddedPluginPanel(samplePluginModule.manifest.id);
        }, /plugin_panel_entry_missing:sample\.plugin:sample\.panel/);
    } finally {
        rmSync(pluginInstallPath, { recursive: true, force: true });
    }
});

test('builtin panel plugin should activate through plugin-manager and complete the panel bridge lifecycle', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ builtinPanelPluginHarness = new BuiltinPanelPluginHarness('3.8.7');
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ builtinPanelPluginResult = await builtinPanelPluginHarness.run();

    assert.equal(builtinPanelPluginResult.runtimeRecord?.pluginId, 'builtin.panel');
    assert.equal(builtinPanelPluginResult.runtimeRecord?.state, 'active');
    assert.equal(builtinPanelPluginResult.runtimeRecord?.trustLevel, 'builtin');
    assert.equal(builtinPanelPluginResult.initialStateResponse.ok, true);
    assert.equal(builtinPanelPluginResult.initialStateResponse.payload?.isOpen, true);
    assert.equal(builtinPanelPluginResult.initialStateResponse.payload?.pingCount, 0);
    assert.equal(builtinPanelPluginResult.emittedStateResponse.ok, true);
    assert.equal(builtinPanelPluginResult.emittedStateResponse.payload?.pingCount, 1);
    assert.equal(builtinPanelPluginResult.notifications.length, 1);
    assert.equal(builtinPanelPluginResult.notifications[0]?.event, 'builtin.panel.state');
    assert.equal(builtinPanelPluginResult.notifications[0]?.payload?.isOpen, true);
    assert.equal(builtinPanelPluginResult.closedStateResponse.payload?.isOpen, false);
    assert.equal(builtinPanelPluginResult.reopenedStateResponse.payload?.isOpen, true);
});

test('builtin panel plugin should release its panel bridge after deactivate and dispose', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ builtinPanelPluginHarness = new BuiltinPanelPluginHarness('3.8.7');
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ builtinPanelCleanupResult = await builtinPanelPluginHarness.runDeactivateFlow();

    assert.equal(builtinPanelCleanupResult.inactiveState, 'inactive');
    assert.equal(builtinPanelCleanupResult.disposedState, 'disposed');
    assert.equal(builtinPanelCleanupResult.panelBridgeReleased, true);
});

test('plugin manager should attach a browser-side panel bridge and generate a bootstrap script contract', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginManagerApp = new PluginManagerApp(new RuntimeFacade('3.8.7'));
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ builtinPanelPluginModule = new BuiltinPanelPluginModule();
    pluginManagerApp.registerManifest({
        manifest: builtinPanelPluginModule.manifest,
        installPath: 'plugins/builtin-panel',
        trustLevel: 'builtin',
    });
    pluginManagerApp.attachModule(builtinPanelPluginModule.manifest.id, builtinPanelPluginModule);
    await pluginManagerApp.activatePlugin(builtinPanelPluginModule.manifest.id);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ fakeWindow: {
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        panelBridge?: Awaited<ReturnType<typeof pluginManagerApp.createPanelBridgeClient>>;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        acquirePanelBridge?: () => Promise<Awaited<ReturnType<typeof pluginManagerApp.createPanelBridgeClient>>>;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        __PEANUT_PANEL_BRIDGE_CONTEXT__?: {
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            pluginId: string;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            panelId: string;
        };
    } = {};
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ attachedPanelBridgeClient = pluginManagerApp.attachPanelBridgeToWindow(
        builtinPanelPluginModule.manifest.id,
        'builtin.panel.main',
        fakeWindow,
    );

    assert.equal(fakeWindow.__PEANUT_PANEL_BRIDGE_CONTEXT__?.pluginId, builtinPanelPluginModule.manifest.id);
    assert.equal(fakeWindow.__PEANUT_PANEL_BRIDGE_CONTEXT__?.panelId, 'builtin.panel.main');
    assert.equal(fakeWindow.panelBridge, attachedPanelBridgeClient);
    assert.equal(await fakeWindow.acquirePanelBridge?.(), attachedPanelBridgeClient);

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ bridgeResponse = await attachedPanelBridgeClient.request<{}, { pluginId: string; panelId: string; isOpen: boolean; pingCount: number }>({
        id: 'builtin-panel-browser-bridge',
        event: 'builtin.panel.getState',
        expectsResponse: true,
        payload: {},
    });
    assert.equal(bridgeResponse.ok, true);
    assert.equal(bridgeResponse.payload?.pluginId, builtinPanelPluginModule.manifest.id);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ bootstrapScript = pluginManagerApp.createPanelBridgeBootstrapScript(builtinPanelPluginModule.manifest.id, 'builtin.panel.main');
    assert.equal(bootstrapScript.includes('__PEANUT_PANEL_BRIDGE_CONTEXT__'), true);
    assert.equal(bootstrapScript.includes('panel_bridge_not_attached:builtin.panel:builtin.panel.main'), true);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ bootstrapWindow: {
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        panelBridge?: unknown;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        acquirePanelBridge?: () => Promise<unknown>;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        __PEANUT_PANEL_BRIDGE_CONTEXT__?: {
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            pluginId: string;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            panelId: string;
        };
    } = {};
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ evaluateBootstrapScript = new Function('window', bootstrapScript);
    evaluateBootstrapScript(bootstrapWindow);

    assert.equal(bootstrapWindow.__PEANUT_PANEL_BRIDGE_CONTEXT__?.pluginId, builtinPanelPluginModule.manifest.id);
    assert.equal(bootstrapWindow.__PEANUT_PANEL_BRIDGE_CONTEXT__?.panelId, 'builtin.panel.main');
    await assert.rejects(async (): Promise<void> => {
        await bootstrapWindow.acquirePanelBridge?.();
    }, /panel_bridge_not_attached:builtin\.panel:builtin\.panel\.main/);

    bootstrapWindow.panelBridge = attachedPanelBridgeClient;
    assert.equal(await bootstrapWindow.acquirePanelBridge?.(), attachedPanelBridgeClient);
});
