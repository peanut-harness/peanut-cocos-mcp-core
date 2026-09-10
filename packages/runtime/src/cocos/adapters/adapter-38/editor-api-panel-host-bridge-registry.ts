import type { IEditorApiPanelHostBridge, IEditorApiPanelHostGlobal } from './editor-api-host-panel-window-provider.js';

/**
 * @description Editor API 宿主桥接注册器，用于让真实 Creator 宿主显式挂载 panel host bridge。
 */
export class EditorApiPanelHostBridgeRegistry {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _hostGlobal: IEditorApiPanelHostGlobal;

    /**
     * @description 创建一个新的 Editor API 宿主桥接注册器。
     * @param hostGlobal 可选全局对象；省略时使用 `globalThis`
     */
    public constructor(hostGlobal?: IEditorApiPanelHostGlobal) {
        this._hostGlobal =
            hostGlobal ?? (typeof globalThis === 'object' && globalThis != null ? (globalThis as IEditorApiPanelHostGlobal) : {});
    }

    /**
     * @description 注册一个真实宿主 panel host bridge。
     * @param hostBridge 宿主 bridge 实现
     * @returns 当前注册器实例，便于链式调用
     */
    public register(hostBridge: IEditorApiPanelHostBridge): EditorApiPanelHostBridgeRegistry {
        this._hostGlobal.__PEANUT_EDITOR_PANEL_HOST__ = hostBridge;
        return this;
    }

    /**
     * @description 清理当前已注册的宿主 panel host bridge。
     * @returns 是否确实移除了一个已注册 bridge
     */
    public unregister(): boolean {
        if (this._hostGlobal.__PEANUT_EDITOR_PANEL_HOST__ == null) {
            return false;
        }
        delete this._hostGlobal.__PEANUT_EDITOR_PANEL_HOST__;
        return true;
    }

    /**
     * @description 返回当前已注册的宿主 panel host bridge。
     * @returns 命中时返回宿主 bridge，否则返回 `null`
     */
    public get(): IEditorApiPanelHostBridge | null {
        return this._hostGlobal.__PEANUT_EDITOR_PANEL_HOST__ ?? null;
    }
}
