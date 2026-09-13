import { EditorApiPanelHostBridgeRegistry } from './editor-api-panel-host-bridge-registry.js';
import type { IEditorApiPanelHostBridge, IEditorApiPanelHostGlobal } from '../core/editor-api-panel-window.js';
import {
    EditorApiWindowBackedPanelHostBridge,
    type IEditorApiPanelWindowFactory,
} from './editor-api-window-backed-panel-host-bridge.js';

/**
 * @description Editor API 面板宿主安装器，用于在真实 Creator 宿主里快速注册或移除 panel host bridge。
 */
export class EditorApiPanelHostInstaller {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _bridgeRegistry: EditorApiPanelHostBridgeRegistry;

    /**
     * @description 创建一个新的 Editor API 面板宿主安装器。
     * @param hostGlobal 可选全局对象；省略时使用 `globalThis`
     */
    public constructor(hostGlobal?: IEditorApiPanelHostGlobal) {
        this._bridgeRegistry = new EditorApiPanelHostBridgeRegistry(hostGlobal);
    }

    /**
     * @description 直接安装一个宿主 panel host bridge。
     * @param hostBridge 宿主 bridge 实现
     * @returns 当前安装器实例，便于链式调用
     */
    public installHostBridge(hostBridge: IEditorApiPanelHostBridge): EditorApiPanelHostInstaller {
        this._bridgeRegistry.register(hostBridge);
        return this;
    }

    /**
     * @description 基于窗口工厂安装一个宿主 panel host bridge。
     * @param windowFactory 宿主窗口工厂
     * @returns 当前安装器实例，便于链式调用
     */
    public installWindowFactory(windowFactory: IEditorApiPanelWindowFactory): EditorApiPanelHostInstaller {
        this._bridgeRegistry.register(new EditorApiWindowBackedPanelHostBridge(windowFactory));
        return this;
    }

    /**
     * @description 移除当前已安装的宿主 panel host bridge。
     * @returns 是否确实移除了一个已安装 bridge
     */
    public uninstall(): boolean {
        return this._bridgeRegistry.unregister();
    }

    /**
     * @description 返回当前已安装的宿主 panel host bridge。
     * @returns 命中时返回宿主 bridge，否则返回 `null`
     */
    public getInstalledBridge(): IEditorApiPanelHostBridge | null {
        return this._bridgeRegistry.get();
    }
}
