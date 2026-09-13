import type { IPanelBrowserWindowLike } from './creator-adapter.js';

/**
 * @description Editor API 面板最小文档接口。
 */
export interface IEditorApiPanelDocumentLike {
    /**
     * @description 当前页面根节点。
     */
    readonly body: IEditorApiPanelElementLike;

    /**
     * @description 创建一个新的元素节点。
     * @param tagName 元素标签名
     * @returns 新创建的元素节点
     */
    createElement(tagName: string): IEditorApiPanelElementLike;
}

/**
 * @description Editor API 面板最小元素接口。
 */
export interface IEditorApiPanelElementLike {
    /**
     * @description 元素稳定标识。
     */
    id: string;

    /**
     * @description 元素类名字符串。
     */
    className: string;

    /**
     * @description 元素文本内容。
     */
    textContent: string | null;

    /**
     * @description 元素 HTML 内容快照。
     */
    innerHTML: string;

    /**
     * @description 元素是否禁用。
     */
    disabled?: boolean;

    /**
     * @description 元素是否隐藏。
     */
    hidden?: boolean;

    /**
     * @description 元素数据集。
     */
    readonly dataset: Record<string, string>;

    /**
     * @description 追加一个子节点。
     * @param child 需要追加的子节点
     * @returns 追加后的子节点
     */
    appendChild(child: IEditorApiPanelElementLike): IEditorApiPanelElementLike;

    /**
     * @description 使用给定子节点替换当前全部子节点。
     * @param children 需要挂载的全部子节点
     * @returns 无返回值
     */
    replaceChildren(...children: IEditorApiPanelElementLike[]): void;

    /**
     * @description 绑定一个事件监听器。
     * @param eventName 事件名称
     * @param listener 事件处理函数
     * @returns 无返回值
     */
    addEventListener(eventName: string, listener: () => void | Promise<void>): void;
}

/**
 * @description Editor API 面板宿主元信息。
 */
export interface IEditorApiPanelHostMetadata extends Record<string, unknown> {
    /**
     * @description 适配器稳定标识。
     */
    readonly adapterId: string;

    /**
     * @description 宿主表面类型。
     */
    readonly hostSurface: 'editor-api-webview';

    /**
     * @description 面板稳定标识。
     */
    readonly panelId: string;

    /**
     * @description 面板前端入口路径。
     */
    readonly entry: string;
}

/**
 * @description Editor API 面板宿主浏览器侧上下文对象。
 */
export interface IEditorApiPanelBrowserWindow extends IPanelBrowserWindowLike {
    /**
     * @description 面板页面地址。
     */
    location: {
        /**
         * @description 当前面板入口路径。
         */
        href: string;
    };

    /**
     * @description 宿主元信息。
     */
    __EDITOR_PANEL_HOST__: IEditorApiPanelHostMetadata;

    /**
     * @description 宿主准备注入到页面的 bootstrap 脚本文本。
     */
    __PEANUT_PANEL_BOOTSTRAP_SCRIPT__: string;

    /**
     * @description 可选最小文档对象，供面板 UI 直接程序化渲染。
     */
    document?: IEditorApiPanelDocumentLike;
}

/**
 * @description Editor API 面板窗口启动请求。
 */
export interface IEditorApiPanelWindowLaunchRequest {
    /**
     * @description 适配器稳定标识。
     */
    readonly adapterId: string;

    /**
     * @description 面板稳定标识。
     */
    readonly panelId: string;

    /**
     * @description 面板前端入口路径。
     */
    readonly entry: string;

    /**
     * @description 宿主要注入到页面的 bootstrap 脚本文本。
     */
    readonly bootstrapScript: string;
}

/**
 * @description Editor API 面板宿主 provider 接口。
 */
export interface IEditorApiPanelWindowProvider {
    /**
     * @description 启动一个 Editor API 面板宿主窗口。
     * @param request 面板窗口启动请求
     * @returns 宿主浏览器侧上下文对象
     */
    launchPanelWindow(
        request: IEditorApiPanelWindowLaunchRequest,
    ): IEditorApiPanelBrowserWindow | Promise<IEditorApiPanelBrowserWindow>;

    /**
     * @description 聚焦一个 Editor API 面板宿主窗口。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns 无返回值
     */
    focusPanelWindow?(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): void | Promise<void>;

    /**
     * @description 关闭一个 Editor API 面板宿主窗口。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns 无返回值
     */
    closePanelWindow?(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): void | Promise<void>;
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
    openPanelWindow(
        request: IEditorApiPanelWindowLaunchRequest,
    ): IEditorApiPanelBrowserWindow | Promise<IEditorApiPanelBrowserWindow>;

    /**
     * @description 聚焦一个真实宿主面板窗口。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns 无返回值
     */
    focusPanelWindow?(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): void | Promise<void>;

    /**
     * @description 关闭一个真实宿主面板窗口。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns 无返回值
     */
    closePanelWindow?(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): void | Promise<void>;
}

/**
 * @description 可能携带宿主面板桥接的全局对象。
 */
export interface IEditorApiPanelHostGlobal extends Record<string, unknown> {
    /**
     * @description 由真实宿主注入的 Panel Host bridge。
     */
    __PEANUT_EDITOR_PANEL_HOST__?: IEditorApiPanelHostBridge;
}
