import type {
    IEditorApiPanelBrowserWindow,
    IEditorApiPanelHostBridge,
    IEditorApiPanelHostMetadata,
    IEditorApiPanelWindowLaunchRequest,
} from '../core/editor-api-panel-window.js';

/**
 * @description 可包装真实宿主窗口对象的基础句柄。
 */
export interface IEditorApiPanelWindowHandle extends Record<string, unknown> {
    /**
     * @description 可选 URL 加载能力。
     */
    loadURL?: (entry: string) => void | Promise<void>;

    /**
     * @description 可选脚本执行能力。
     */
    executeJavaScript?: (script: string) => void | Promise<void>;

    /**
     * @description 可选 eval 能力。
     */
    eval?: (script: string) => unknown;

    /**
     * @description 可选聚焦能力。
     */
    focus?: () => void | Promise<void>;

    /**
     * @description 可选关闭能力。
     */
    close?: () => void | Promise<void>;

    /**
     * @description 可选 location 对象。
     */
    location?: {
        /**
         * @description 当前页面地址。
         */
        href: string;
    };
}

/**
 * @description 宿主窗口工厂接口。
 */
export interface IEditorApiPanelWindowFactory {
    /**
     * @description 创建一个宿主窗口句柄。
     * @param request 面板窗口启动请求
     * @returns 宿主窗口句柄
     */
    createWindow(request: IEditorApiPanelWindowLaunchRequest): IEditorApiPanelWindowHandle | Promise<IEditorApiPanelWindowHandle>;

    /**
     * @description 可选自定义 bootstrap 注入动作。
     * @param windowHandle 宿主窗口句柄
     * @param request 面板窗口启动请求
     * @returns Promise 在脚本注入完成后结束
     */
    injectBootstrapScript?(windowHandle: IEditorApiPanelWindowHandle, request: IEditorApiPanelWindowLaunchRequest): void | Promise<void>;
}

/**
 * @description 基于宿主窗口句柄的 Editor API panel host bridge 实现样例。
 */
export class EditorApiWindowBackedPanelHostBridge implements IEditorApiPanelHostBridge {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _windowFactory: IEditorApiPanelWindowFactory;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _windowHandles = new Map<string, IEditorApiPanelWindowHandle>();

    /**
     * @description 创建一个新的基于宿主窗口句柄的 panel host bridge。
     * @param windowFactory 宿主窗口工厂
     */
    public constructor(windowFactory: IEditorApiPanelWindowFactory) {
        this._windowFactory = windowFactory;
    }

    /**
     * @description 启动一个真实宿主面板窗口，并尽量利用常见窗口方法加载 URL 和注入 bootstrap 脚本。
     * @param request 面板窗口启动请求
     * @returns 标准化的宿主浏览器侧上下文对象
     */
    public async openPanelWindow(request: IEditorApiPanelWindowLaunchRequest): Promise<IEditorApiPanelBrowserWindow> {
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ windowHandle = await this._windowFactory.createWindow(request);
        this._windowHandles.set(request.panelId, windowHandle);

        if (windowHandle.loadURL != null) {
            await windowHandle.loadURL(request.entry);
        }
        if (windowHandle.location == null) {
            windowHandle.location = {
                href: request.entry,
            };
        } else {
            windowHandle.location.href = request.entry;
        }

        if (this._windowFactory.injectBootstrapScript != null) {
            await this._windowFactory.injectBootstrapScript(windowHandle, request);
        } else if (windowHandle.executeJavaScript != null) {
            await windowHandle.executeJavaScript(request.bootstrapScript);
        } else if (windowHandle.eval != null) {
            void windowHandle.eval(request.bootstrapScript);
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ editorApiPanelHostMetadata: IEditorApiPanelHostMetadata = {
            adapterId: request.adapterId,
            hostSurface: 'editor-api-webview',
            panelId: request.panelId,
            entry: request.entry,
        };

        return {
            ...windowHandle,
            location: windowHandle.location,
            __EDITOR_PANEL_HOST__: editorApiPanelHostMetadata,
            __PEANUT_PANEL_BOOTSTRAP_SCRIPT__: request.bootstrapScript,
        };
    }

    /**
     * @description 聚焦一个宿主窗口句柄。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns Promise 在聚焦完成后结束
     */
    public async focusPanelWindow(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): Promise<void> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ windowHandle = this._resolveWindowHandle(panelId, browserWindow);
        await windowHandle.focus?.();
    }

    /**
     * @description 关闭一个宿主窗口句柄。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns Promise 在关闭完成后结束
     */
    public async closePanelWindow(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): Promise<void> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ windowHandle = this._resolveWindowHandle(panelId, browserWindow);
        await windowHandle.close?.();
        this._windowHandles.delete(panelId);
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _resolveWindowHandle(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): IEditorApiPanelWindowHandle {
        return this._windowHandles.get(panelId) ?? (browserWindow as unknown as IEditorApiPanelWindowHandle);
    }
}
