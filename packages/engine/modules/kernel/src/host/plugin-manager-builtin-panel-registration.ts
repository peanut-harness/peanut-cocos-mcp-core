import type { PluginManagerApp } from '../app/plugin-manager-app.js';

/**
 * @description 面向 host shell 的 builtin panel 注册契约。
 */
export interface IPluginManagerBuiltinPanelRegistration {
    /**
     * @description builtin panel 所属插件标识。
     */
    readonly pluginId: string;

    /**
     * @description builtin panel 稳定标识。
     */
    readonly panelId: string;

    /**
     * @description 把 builtin panel 相关的模块、贡献和 UI 绑定注册到一个新的 plugin-manager 实例。
     * @param pluginManagerApp 当前活动的 plugin-manager 实例
     * @param requestKernelReload 宿主侧触发 kernel reload 的回调
     * @returns Promise 在注册完成后结束
     */
    register(pluginManagerApp: PluginManagerApp, requestKernelReload: () => Promise<void>): Promise<void> | void;
}
