import type { IPanelBridgeClient } from 'peanut-contracts';

import type { IPanelBridgeClientFactory } from '../shared/plugin-manager-contracts.js';

/**
 * @description 面板桥浏览器侧上下文快照。
 */
export interface IPanelBridgeBootstrapContext extends Record<string, unknown> {
    /**
     * @description 当前面板所属插件标识。
     */
    readonly pluginId: string;

    /**
     * @description 当前面板稳定标识。
     */
    readonly panelId: string;
}

/**
 * @description 浏览器侧面板桥注入目标。
 */
export interface IPanelBridgeBrowserWindow extends Record<string, unknown> {
    /**
     * @description 宿主直接注入的桥接客户端实例。
     */
    panelBridge?: IPanelBridgeClient;

    /**
     * @description 面板前端可调用的桥接客户端获取函数。
     */
    acquirePanelBridge?: () => IPanelBridgeClient | Promise<IPanelBridgeClient>;

    /**
     * @description 宿主注入的标准化面板桥上下文。
     */
    __PEANUT_PANEL_BRIDGE_CONTEXT__?: IPanelBridgeBootstrapContext;
}

/**
 * @description 浏览器侧面板桥引导器，用于规范 `window.panelBridge` 与 `window.acquirePanelBridge` 的宿主注入契约。
 */
export class BrowserPanelBridgeBootstrap {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _panelBridgeClientFactory: IPanelBridgeClientFactory;

    /**
     * @description 创建一个新的浏览器侧面板桥引导器。
     * @param panelBridgeClientFactory 面板桥客户端工厂
     */
    public constructor(panelBridgeClientFactory: IPanelBridgeClientFactory) {
        this._panelBridgeClientFactory = panelBridgeClientFactory;
    }

    /**
     * @description 把指定面板的桥接客户端注入到浏览器侧对象。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @param targetWindow 浏览器侧注入目标
     * @returns 注入后的面板桥客户端
     */
    public attach(pluginId: string, panelId: string, targetWindow: IPanelBridgeBrowserWindow): IPanelBridgeClient {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelBridgeClient = this._panelBridgeClientFactory.createPanelBridgeClient(pluginId, panelId);
        targetWindow.__PEANUT_PANEL_BRIDGE_CONTEXT__ = {
            pluginId,
            panelId,
        };
        targetWindow.panelBridge = panelBridgeClient;
        targetWindow.acquirePanelBridge = async (): Promise<IPanelBridgeClient> => {
            return panelBridgeClient;
        };
        return panelBridgeClient;
    }

    /**
     * @description 生成一段供宿主注入到面板页面的 bootstrap 脚本。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @returns 标准化的浏览器注入脚本文本
     */
    public createScript(pluginId: string, panelId: string): string {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ bootstrapContext: IPanelBridgeBootstrapContext = {
            pluginId,
            panelId,
        };
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ serializedContext = JSON.stringify(bootstrapContext);
        return `(function () {
    var targetWindow = window;
    targetWindow.__PEANUT_PANEL_BRIDGE_CONTEXT__ = ${serializedContext};
    if (typeof targetWindow.acquirePanelBridge !== 'function') {
        targetWindow.acquirePanelBridge = async function acquirePanelBridge() {
            if (targetWindow.panelBridge == null) {
                throw new Error('panel_bridge_not_attached:${pluginId}:${panelId}');
            }
            return targetWindow.panelBridge;
        };
    }
    function reportBrowserError(eventName, errorMessage, errorStack) {
        if (targetWindow.panelBridge == null || typeof targetWindow.panelBridge.postMessage !== 'function') return;
        targetWindow.panelBridge.postMessage({
            id: 'peanut-browser-diagnostic-' + Date.now(),
            event: eventName,
            expectsResponse: false,
            payload: { errorMessage: String(errorMessage || 'browser_panel_error'), errorStack: errorStack || undefined }
        }).catch(function () { /* 诊断上报失败不得影响面板。 */ });
    }
    if (typeof targetWindow.addEventListener === 'function') {
        targetWindow.addEventListener('error', function (event) {
            reportBrowserError('pluginManager.diagnostic.browserError', event && event.message, event && event.error && event.error.stack);
        });
        targetWindow.addEventListener('unhandledrejection', function (event) {
            var reason = event && event.reason;
            reportBrowserError('pluginManager.diagnostic.browserUnhandledRejection', reason && reason.message || reason, reason && reason.stack);
        });
    }
})();`;
    }
}
