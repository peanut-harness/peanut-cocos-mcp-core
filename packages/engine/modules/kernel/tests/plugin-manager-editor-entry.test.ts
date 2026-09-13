import assert from 'assert/strict';
import test from 'node:test';

import { RuntimeFacade } from '@peanut/pod-engine/runtime';

import { createBuiltinPluginManagerPanelRegistration } from '../src/builtin/builtin-plugin-manager-panel-registration';
import { PluginManagerEditorEntry } from '../src/host/plugin-manager-editor-entry';
import { resolvePluginManagerHostWatchPaths, resolvePluginManagerSplitHostWatchPaths } from '../src/host/plugin-manager-host-paths';
import type { IPluginManagerPanelBrowserWindow } from '../src/panels/plugin-manager-panel-ui';

test('plugin-manager editor entry should load, bind the builtin panel, and expose reload through the host shell', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ runtimeFacade = new RuntimeFacade('3.8.7', {
        allowMemoryPanelWindowProviderFallback: true,
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginManagerEditorEntry = new PluginManagerEditorEntry({
        builtinPanelRegistration: createBuiltinPluginManagerPanelRegistration(),
        runtime: runtimeFacade,
    });

    await pluginManagerEditorEntry.load();

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ launchResult = await pluginManagerEditorEntry.openBuiltinPluginManagerPanel();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ browserWindow = launchResult.browserWindow as IPluginManagerPanelBrowserWindow;
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ initialPluginManagerApp = pluginManagerEditorEntry.getPluginManager();

    await browserWindow.pluginManagerPanelUiActions?.updatePreferences({
        locale: 'en-US',
    });
    await pluginManagerEditorEntry.requestReload();
    await new Promise((resolve) => {
        setTimeout(resolve, 25);
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ reloadedPluginManagerApp = pluginManagerEditorEntry.getPluginManager();

    assert.notEqual(initialPluginManagerApp, null);
    assert.notEqual(reloadedPluginManagerApp, null);
    assert.notEqual(reloadedPluginManagerApp, initialPluginManagerApp);
    assert.equal(launchResult.session.isOpen, true);
    assert.equal(browserWindow.pluginManagerPanelUi?.state.preferences.locale, 'en-US');

    await pluginManagerEditorEntry.unload();
});

test('plugin-manager host watch path resolver should return panel and source directories from the package root', (): void => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ watchPaths = resolvePluginManagerHostWatchPaths('D:\\workspaces\\peanut-cocos-mcp-projects\\@peanut/pod-engine/kernel\\');

    assert.deepEqual(watchPaths, [
        'D:/workspaces/peanut-cocos-mcp-projects/@peanut/pod-engine/kernel/panels/plugin-manager/embedded',
        'D:/workspaces/peanut-cocos-mcp-projects/@peanut/pod-engine/kernel/src',
    ]);
});

test('plugin-manager split host watch path resolver should prefer panel package assets as the source of truth', (): void => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ watchPaths = resolvePluginManagerSplitHostWatchPaths(
        'D:\\workspaces\\peanut-cocos-mcp-projects\\@peanut/pod-engine/kernel\\',
        'D:\\workspaces\\peanut-cocos-mcp-projects\\@peanut/pod-panel\\',
    );

    assert.deepEqual(watchPaths, [
        'D:/workspaces/peanut-cocos-mcp-projects/@peanut/pod-engine/kernel/src',
        'D:/workspaces/peanut-cocos-mcp-projects/@peanut/pod-engine/kernel/panels/plugin-manager/embedded',
        'D:/workspaces/peanut-cocos-mcp-projects/@peanut/pod-panel/panels/plugin-manager/embedded',
        'D:/workspaces/peanut-cocos-mcp-projects/@peanut/pod-panel/src',
    ]);
});
