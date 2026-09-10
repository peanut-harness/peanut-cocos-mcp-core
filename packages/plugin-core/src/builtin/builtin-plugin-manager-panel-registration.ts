import { BuiltinPluginManagerPanelModule } from './builtin-plugin-manager-panel-module.js';
import type { IPluginManagerBuiltinPanelRegistration } from '../host/plugin-manager-builtin-panel-registration.js';
import { mountPluginManagerPanelUi, type IPluginManagerPanelBrowserWindow, unmountPluginManagerPanelUi } from '../panels/plugin-manager-panel-ui.js';
import type { PluginManagerApp } from '../app/plugin-manager-app.js';

/**
 * @description 创建一个 builtin plugin-manager panel 注册项，用于把模块、面板贡献和浏览器侧 UI 绑定统一挂到 host shell。
 * @returns builtin plugin-manager panel 注册项
 */
export function createBuiltinPluginManagerPanelRegistration(): IPluginManagerBuiltinPanelRegistration {
    return {
        pluginId: 'builtin.plugin-manager.panel',
        panelId: 'builtin.plugin-manager.panel',
        register: async (pluginManagerApp: PluginManagerApp, requestKernelReload: () => Promise<void>): Promise<void> => {
            pluginManagerApp.registerPanelUiMountBinding({
                pluginId: 'builtin.plugin-manager.panel',
                panelId: 'builtin.plugin-manager.panel',
                mountPanelUi: async (browserWindow): Promise<void> => {
                    await mountPluginManagerPanelUi(browserWindow as IPluginManagerPanelBrowserWindow);
                },
                unmountPanelUi: async (browserWindow): Promise<void> => {
                    await unmountPluginManagerPanelUi(browserWindow as IPluginManagerPanelBrowserWindow);
                },
            });

            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ builtinPluginManagerPanelModule = new BuiltinPluginManagerPanelModule(pluginManagerApp, requestKernelReload);
            pluginManagerApp.registerManifest({
                manifest: builtinPluginManagerPanelModule.manifest,
                installPath: 'plugins/builtin-plugin-manager-panel',
                trustLevel: 'builtin',
            });
            pluginManagerApp.attachModule(builtinPluginManagerPanelModule.manifest.id, builtinPluginManagerPanelModule);
            await pluginManagerApp.activatePlugin(builtinPluginManagerPanelModule.manifest.id);
        },
    };
}
