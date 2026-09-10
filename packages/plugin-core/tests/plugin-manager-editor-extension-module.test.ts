import assert from 'assert/strict';
import test from 'node:test';

import { RuntimeFacade } from 'peanut-runtime';

import { createBuiltinPluginManagerPanelRegistration } from '../src/builtin/builtin-plugin-manager-panel-registration';
import { PluginManagerEditorExtensionModule } from '../src/host/plugin-manager-editor-extension-module';
import type { IPluginManagerPanelBrowserWindow } from '../src/panels/plugin-manager-panel-ui';

test('plugin-manager editor extension module should expose host methods that forward to the editor entry', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ runtimeFacade = new RuntimeFacade('3.8.7', {
        allowMemoryPanelWindowProviderFallback: true,
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginManagerEditorExtensionModule = new PluginManagerEditorExtensionModule({
        builtinPanelRegistration: createBuiltinPluginManagerPanelRegistration(),
        runtime: runtimeFacade,
    });

    await pluginManagerEditorExtensionModule.load();

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ launchResult = await pluginManagerEditorExtensionModule.methods.openBuiltinPluginManagerPanel();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ browserWindow = launchResult.browserWindow as IPluginManagerPanelBrowserWindow;
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ initialPluginManagerApp = pluginManagerEditorExtensionModule.getEditorEntry().getPluginManager();

    await browserWindow.pluginManagerPanelUiActions?.updatePreferences({
        locale: 'en-US',
    });
    await pluginManagerEditorExtensionModule.methods.reloadKernel();
    await new Promise((resolve) => {
        setTimeout(resolve, 25);
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ reloadedPluginManagerApp = pluginManagerEditorExtensionModule.getEditorEntry().getPluginManager();
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ strategy = await pluginManagerEditorExtensionModule.methods.handleChangedPaths([
        'D:\\workspaces\\peanut-cocos-mcp-projects\\peanut-plugin-panel\\panels\\plugin-manager\\embedded\\index.js',
    ]);

    assert.notEqual(initialPluginManagerApp, null);
    assert.notEqual(reloadedPluginManagerApp, null);
    assert.notEqual(reloadedPluginManagerApp, initialPluginManagerApp);
    assert.equal(launchResult.session.hasBrowserWindow, true);
    assert.equal(browserWindow.pluginManagerPanelUi?.state.preferences.locale, 'en-US');
    assert.equal(strategy, 'panel-ui');

    await pluginManagerEditorExtensionModule.unload();
});
