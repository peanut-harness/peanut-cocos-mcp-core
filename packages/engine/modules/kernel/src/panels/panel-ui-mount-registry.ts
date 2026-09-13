import type { IPanelBridgeBrowserWindow } from './browser-panel-bridge-bootstrap.js';

/**
 * @description 面板浏览器侧 UI 挂载绑定。
 */
export interface IPanelUiMountBinding {
    /**
     * @description 面板所属插件标识。
     */
    readonly pluginId: string;

    /**
     * @description 面板稳定标识。
     */
    readonly panelId: string;

    /**
     * @description 把具体面板 UI 挂载到浏览器侧上下文对象。
     * @param browserWindow 宿主持有的浏览器侧上下文对象
     * @returns Promise 在挂载完成后结束
     */
    mountPanelUi(browserWindow: IPanelBridgeBrowserWindow): Promise<void> | void;

    /**
     * @description 把具体面板 UI 从浏览器侧上下文对象卸载。
     * @param browserWindow 宿主持有的浏览器侧上下文对象
     * @returns Promise 在卸载完成后结束
     */
    unmountPanelUi?(browserWindow: IPanelBridgeBrowserWindow): Promise<void> | void;
}

/**
 * @description 面板浏览器侧 UI 挂载绑定注册表。
 */
export class PanelUiMountRegistry {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _bindings = new Map<string, IPanelUiMountBinding>();

    /**
     * @description 注册一个新的面板 UI 挂载绑定。
     * @param binding 面板 UI 挂载绑定
     * @returns 当前注册表实例，便于链式调用
     */
    public register(binding: IPanelUiMountBinding): PanelUiMountRegistry {
        this._bindings.set(this._createBindingKey(binding.pluginId, binding.panelId), binding);
        return this;
    }

    /**
     * @description 删除一个面板 UI 挂载绑定。
     * @param pluginId 面板所属插件标识
     * @param panelId 面板稳定标识
     * @returns 成功移除时返回 `true`
     */
    public unregister(pluginId: string, panelId: string): boolean {
        return this._bindings.delete(this._createBindingKey(pluginId, panelId));
    }

    /**
     * @description 查询一个面板 UI 挂载绑定。
     * @param pluginId 面板所属插件标识
     * @param panelId 面板稳定标识
     * @returns 命中时返回面板 UI 挂载绑定，否则返回 `null`
     */
    public get(pluginId: string, panelId: string): IPanelUiMountBinding | null {
        return this._bindings.get(this._createBindingKey(pluginId, panelId)) ?? null;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _createBindingKey(pluginId: string, panelId: string): string {
        return `${pluginId}::${panelId}`;
    }
}
