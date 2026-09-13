import assert from 'assert/strict';
import test from 'node:test';

import { RuntimeFacade } from '@peanut/pod-engine/runtime';

import { createBuiltinPluginManagerPanelRegistration } from '../src/builtin/builtin-plugin-manager-panel-registration';
import { PluginManagerHostShell } from '../src/host/plugin-manager-host-shell';
import type { IPluginManagerPanelBrowserWindow } from '../src/panels/plugin-manager-panel-ui';

test('plugin-manager host shell should open the builtin panel through runtime panel host when no browser window is pre-bound', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ runtimeFacade = new RuntimeFacade('3.8.7', {
        allowMemoryPanelWindowProviderFallback: true,
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginManagerHostShell = new PluginManagerHostShell(runtimeFacade, {
        builtinPanelRegistration: createBuiltinPluginManagerPanelRegistration(),
    });
    await pluginManagerHostShell.start();

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ launchResult = await pluginManagerHostShell.openBuiltinPluginManagerPanel();

    assert.equal(launchResult.session.panelId, 'builtin.plugin-manager.panel');
    assert.equal(launchResult.session.isOpen, true);
    assert.equal(launchResult.session.hasBrowserWindow, true);
    assert.equal(launchResult.panelBridgeClient != null, true);
    assert.equal((launchResult.browserWindow as IPluginManagerPanelBrowserWindow | null)?.pluginManagerPanelUi?.state.pluginId, 'builtin.plugin-manager.panel');

    await pluginManagerHostShell.dispose();
});

test('plugin-manager host shell should let the builtin panel request a kernel reload and preserve the panel binding', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ runtimeFacade = new RuntimeFacade('3.8.7', {
        allowMemoryPanelWindowProviderFallback: true,
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginManagerHostShell = new PluginManagerHostShell(runtimeFacade, {
        builtinPanelRegistration: createBuiltinPluginManagerPanelRegistration(),
    });
    await pluginManagerHostShell.start();

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ browserWindow: IPluginManagerPanelBrowserWindow = {};
    await pluginManagerHostShell.bindBuiltinPluginManagerPanel(browserWindow);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ initialPluginManagerApp = pluginManagerHostShell.getPluginManager();

    await browserWindow.pluginManagerPanelUiActions?.updatePreferences({
        locale: 'en-US',
    });
    await browserWindow.pluginManagerPanelUiActions?.reloadKernel();
    await new Promise((resolve) => {
        setTimeout(resolve, 25);
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ reloadedPluginManagerApp = pluginManagerHostShell.getPluginManager();

    assert.notEqual(reloadedPluginManagerApp, null);
    assert.notEqual(reloadedPluginManagerApp, initialPluginManagerApp);
    assert.equal(browserWindow.pluginManagerPanelUi?.state.preferences.locale, 'en-US');
    assert.equal(browserWindow.pluginManagerPanelUi?.state.kernelReloadSupported, true);
    assert.equal(browserWindow.documentTitle?.includes('Plugin Manager'), true);

    await pluginManagerHostShell.dispose();
});

test('plugin-manager host shell should classify panel files as panel remount and core files as kernel reload', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ runtimeFacade = new RuntimeFacade('3.8.7', {
        allowMemoryPanelWindowProviderFallback: true,
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginManagerHostShell = new PluginManagerHostShell(runtimeFacade, {
        builtinPanelRegistration: createBuiltinPluginManagerPanelRegistration(),
    });
    await pluginManagerHostShell.start();

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ browserWindow: IPluginManagerPanelBrowserWindow = {};
    await pluginManagerHostShell.bindBuiltinPluginManagerPanel(browserWindow);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ currentPluginManagerApp = pluginManagerHostShell.getPluginManager();

    assert.equal(
        pluginManagerHostShell.resolveChangeStrategy('D:\\workspaces\\peanut-cocos-mcp-projects\\@peanut/pod-panel\\panels\\plugin-manager\\index.html'),
        'panel-ui',
    );
    assert.equal(
        pluginManagerHostShell.resolveChangeStrategy('D:\\workspaces\\peanut-cocos-mcp-projects\\@peanut/pod-engine/kernel\\src\\app\\plugin-manager-app.ts'),
        'kernel',
    );
    assert.equal(
        pluginManagerHostShell.resolveChangeStrategy('D:\\workspaces\\peanut-cocos-mcp-projects\\@peanut/pod-engine/kernel\\src\\host\\plugin-manager-host-shell.ts'),
        'ignore',
    );

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ panelStrategy = await pluginManagerHostShell.handleChangedPaths([
        'D:\\workspaces\\peanut-cocos-mcp-projects\\@peanut/pod-panel\\panels\\plugin-manager\\embedded\\index.js',
    ]);
    assert.equal(panelStrategy, 'panel-ui');
    assert.equal(pluginManagerHostShell.getPluginManager(), currentPluginManagerApp);
    assert.equal(browserWindow.pluginManagerPanelUi?.state.pluginId, 'builtin.plugin-manager.panel');

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ kernelStrategy = await pluginManagerHostShell.handleChangedPaths([
        'D:\\workspaces\\peanut-cocos-mcp-projects\\@peanut/pod-engine/kernel\\src\\app\\plugin-manager-app.ts',
    ]);
    assert.equal(kernelStrategy, 'kernel');
    assert.notEqual(pluginManagerHostShell.getPluginManager(), currentPluginManagerApp);

    await pluginManagerHostShell.dispose();
});
