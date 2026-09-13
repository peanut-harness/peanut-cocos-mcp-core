import type { IPanelBrowserWindowLike } from '../core/creator-adapter.js';

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
 * @description Editor API 3.8 面板宿主元信息。
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
 * @description Editor API 3.8 面板宿主浏览器侧上下文对象。
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
    launchPanelWindow(request: IEditorApiPanelWindowLaunchRequest): IEditorApiPanelBrowserWindow | Promise<IEditorApiPanelBrowserWindow>;

    /**
     * @description 聚焦一个 Editor API 面板宿主窗口。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns Promise 在聚焦完成后结束
     */
    focusPanelWindow?(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): void | Promise<void>;

    /**
     * @description 关闭一个 Editor API 面板宿主窗口。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns Promise 在关闭完成后结束
     */
    closePanelWindow?(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): void | Promise<void>;
}

/**
 * @description 默认的 Editor API 面板宿主 provider，实现内存态 webview skeleton。
 */
export class DefaultEditorApiPanelWindowProvider implements IEditorApiPanelWindowProvider {
    /**
     * @description 启动一个默认的 Editor API 面板宿主窗口。
     * @param request 面板窗口启动请求
     * @returns 宿主浏览器侧上下文对象
     */
    public launchPanelWindow(request: IEditorApiPanelWindowLaunchRequest): IEditorApiPanelBrowserWindow {
        return {
            location: {
                href: request.entry,
            },
            __EDITOR_PANEL_HOST__: {
                adapterId: request.adapterId,
                hostSurface: 'editor-api-webview',
                panelId: request.panelId,
                entry: request.entry,
            },
            __PEANUT_PANEL_BOOTSTRAP_SCRIPT__: request.bootstrapScript,
            document: new MemoryPanelDocument(),
        };
    }
}

class MemoryPanelElement implements IEditorApiPanelElementLike {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    public id: string = '';
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    public className: string = '';
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    public textContent: string | null = null;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    public innerHTML: string = '';
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    public disabled?: boolean;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    public hidden?: boolean;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    public readonly dataset: Record<string, string> = {};

    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _tagName: string;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _children: MemoryPanelElement[] = [];
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private _parent: MemoryPanelElement | null = null;

    /** @description 创建当前实例并保存后续运行所需的依赖与初始状态。 */
    public constructor(tagName: string) {
        this._tagName = tagName;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    public appendChild(child: IEditorApiPanelElementLike): IEditorApiPanelElementLike {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const memoryChild = child as MemoryPanelElement;
        memoryChild._parent = this;
        this._children.push(memoryChild);
        this._syncInnerHtml();
        return child;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    public replaceChildren(...children: IEditorApiPanelElementLike[]): void {
        this._children.length = 0;
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ child of children) {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const memoryChild = child as MemoryPanelElement;
            memoryChild._parent = this;
            this._children.push(memoryChild);
        }
        this._syncInnerHtml();
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    public addEventListener(eventName: string, listener: () => void | Promise<void>): void {
        void eventName;
        void listener;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _syncInnerHtml(): void {
        this.innerHTML = this._children.map((child) => {
            return child._serialize();
        }).join('');
        this._parent?._syncInnerHtml();
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _serialize(): string {
        // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
        const attrs: string[] = [];
        if (this.id.length > 0) {
            attrs.push(`id="${this.id}"`);
        }
        if (this.className.length > 0) {
            attrs.push(`class="${this.className}"`);
        }
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ [key, value] of Object.entries(this.dataset)) {
            attrs.push(`data-${key}="${value}"`);
        }
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const textContent = this.textContent ?? '';
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const childHtml = this._children.map((child) => {
            return child._serialize();
        }).join('');
        return `<${this._tagName}${attrs.length > 0 ? ` ${attrs.join(' ')}` : ''}>${textContent}${childHtml}</${this._tagName}>`;
    }
}

class MemoryPanelDocument implements IEditorApiPanelDocumentLike {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    public readonly body: IEditorApiPanelElementLike = new MemoryPanelElement('body');

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    public createElement(tagName: string): IEditorApiPanelElementLike {
        return new MemoryPanelElement(tagName);
    }
}

/**
 * @description Editor API 3.8 宿主面板窗口启动器骨架，用于模拟真实 webview 面板容器创建。
 */
export class EditorApiPanelWindowLauncher {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _provider: IEditorApiPanelWindowProvider;

    /**
     * @description 创建一个新的 Editor API 面板窗口启动器。
     * @param provider Editor API 面板宿主 provider
     */
    public constructor(provider?: IEditorApiPanelWindowProvider) {
        this._provider = provider ?? new DefaultEditorApiPanelWindowProvider();
    }

    /**
     * @description 为指定面板创建一个 Editor API 宿主浏览器侧上下文对象。
     * @param adapterId 适配器稳定标识
     * @param panelId 面板稳定标识
     * @param entry 面板前端入口路径
     * @param bootstrapScript 宿主要注入到页面的 bootstrap 脚本文本
     * @returns Editor API 宿主浏览器侧上下文对象
     */
    public async launch(adapterId: string, panelId: string, entry: string, bootstrapScript: string): Promise<IEditorApiPanelBrowserWindow> {
        return await this._provider.launchPanelWindow({
            adapterId,
            panelId,
            entry,
            bootstrapScript,
        });
    }

    /**
     * @description 聚焦一个 Editor API 面板宿主窗口。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns Promise 在聚焦完成后结束
     */
    public async focus(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): Promise<void> {
        await this._provider.focusPanelWindow?.(panelId, browserWindow);
    }

    /**
     * @description 关闭一个 Editor API 面板宿主窗口。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns Promise 在关闭完成后结束
     */
    public async close(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): Promise<void> {
        await this._provider.closePanelWindow?.(panelId, browserWindow);
    }
}
