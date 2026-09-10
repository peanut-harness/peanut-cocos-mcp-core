import {
    DefaultEditorApiPanelWindowProvider,
    type IEditorApiPanelBrowserWindow,
    type IEditorApiPanelWindowLaunchRequest,
    type IEditorApiPanelWindowProvider,
} from './editor-api-panel-window-launcher.js';

/**
 * @description Editor API 宿主面板 provider 可选项。
 */
export interface IEditorApiHostPanelWindowProviderOptions {
    /**
     * @description 缺失真实宿主 bridge 时是否允许退回内存 skeleton provider；默认 `false`。
     */
    readonly allowFallbackProvider?: boolean;
}

/**
 * @description 当 3.8.7 宿主未安装真实 panel host bridge 且未允许测试 fallback 时抛出的错误。
 */
export class MissingEditorApiPanelHostError extends Error {
    /**
     * @description 创建一个新的宿主 bridge 缺失错误。
     */
    public constructor() {
        super(
            'Editor API panel host bridge is not installed. Install __PEANUT_EDITOR_PANEL_HOST__ or explicitly allow the memory fallback provider.',
        );
        this.name = 'MissingEditorApiPanelHostError';
    }
}

/**
 * @description Editor API 宿主桥接接口，由真实 Creator 宿主实现并注入。
 */
export interface IEditorApiPanelHostBridge {
    /**
     * @description 启动一个真实宿主面板窗口。
     * @param request 面板窗口启动请求
     * @returns 宿主浏览器侧上下文对象
     */
    openPanelWindow(request: IEditorApiPanelWindowLaunchRequest): IEditorApiPanelBrowserWindow | Promise<IEditorApiPanelBrowserWindow>;

    /**
     * @description 聚焦一个真实宿主面板窗口。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns Promise 在聚焦完成后结束
     */
    focusPanelWindow?(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): void | Promise<void>;

    /**
     * @description 关闭一个真实宿主面板窗口。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns Promise 在关闭完成后结束
     */
    closePanelWindow?(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): void | Promise<void>;
}

/**
 * @description 可能携带宿主桥接的全局对象。
 */
export interface IEditorApiPanelHostGlobal extends Record<string, unknown> {
    /**
     * @description 由真实宿主注入的 Panel Host bridge。
     */
    __PEANUT_EDITOR_PANEL_HOST__?: IEditorApiPanelHostBridge;
}

/**
 * @description Editor API 宿主面板 provider。优先走真实宿主桥接；默认要求宿主 bridge 已安装，测试场景可显式退回内存 skeleton。
 */
export class EditorApiHostPanelWindowProvider implements IEditorApiPanelWindowProvider {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _hostBridge: IEditorApiPanelHostBridge | null;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _fallbackProvider: DefaultEditorApiPanelWindowProvider;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _options: IEditorApiHostPanelWindowProviderOptions;

    /**
     * @description 创建一个新的 Editor API 宿主面板 provider。
     * @param hostBridge 可选真实宿主桥接；省略时会尝试从全局对象解析
     * @param hostGlobal 可选全局对象；省略时使用 `globalThis`
     * @param options provider 可选项；测试环境可显式允许 fallback provider
     */
    public constructor(
        hostBridge?: IEditorApiPanelHostBridge | null,
        hostGlobal?: IEditorApiPanelHostGlobal,
        options?: IEditorApiHostPanelWindowProviderOptions,
    ) {
        this._hostBridge = hostBridge ?? EditorApiHostPanelWindowProvider._resolveHostBridge(hostGlobal);
        this._fallbackProvider = new DefaultEditorApiPanelWindowProvider();
        this._options = options ?? {};
    }

    /**
     * @description 启动一个 Editor API 面板宿主窗口。
     * @param request 面板窗口启动请求
     * @returns 宿主浏览器侧上下文对象
     */
    public async launchPanelWindow(request: IEditorApiPanelWindowLaunchRequest): Promise<IEditorApiPanelBrowserWindow> {
        if (this._hostBridge != null) {
            return await this._hostBridge.openPanelWindow(request);
        }

        if (this._options.allowFallbackProvider !== true) {
            throw new MissingEditorApiPanelHostError();
        }

        return this._fallbackProvider.launchPanelWindow(request);
    }

    /**
     * @description 聚焦一个 Editor API 面板宿主窗口。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns Promise 在聚焦完成后结束
     */
    public async focusPanelWindow(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): Promise<void> {
        await this._hostBridge?.focusPanelWindow?.(panelId, browserWindow);
    }

    /**
     * @description 关闭一个 Editor API 面板宿主窗口。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns Promise 在关闭完成后结束
     */
    public async closePanelWindow(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): Promise<void> {
        await this._hostBridge?.closePanelWindow?.(panelId, browserWindow);
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private static _resolveHostBridge(hostGlobal?: IEditorApiPanelHostGlobal): IEditorApiPanelHostBridge | null {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ nextHostGlobal =
            hostGlobal ?? (typeof globalThis === 'object' && globalThis != null ? (globalThis as IEditorApiPanelHostGlobal) : undefined);
        return nextHostGlobal?.__PEANUT_EDITOR_PANEL_HOST__ ?? null;
    }
}
