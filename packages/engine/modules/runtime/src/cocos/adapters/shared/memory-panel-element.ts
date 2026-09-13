import type { IEditorApiPanelElementLike } from '../core/editor-api-panel-window.js';

/**
 * @description 内存面板元素，用于测试和显式离线面板宿主。
 */
export class MemoryPanelElement implements IEditorApiPanelElementLike {
    /**
     * @description 元素稳定标识。
     */
    public id = '';

    /**
     * @description 元素类名字符串。
     */
    public className = '';

    /**
     * @description 元素文本内容。
     */
    public textContent: string | null = null;

    /**
     * @description 元素 HTML 内容快照。
     */
    public innerHTML = '';

    /**
     * @description 元素是否禁用。
     */
    public disabled?: boolean;

    /**
     * @description 元素是否隐藏。
     */
    public hidden?: boolean;

    /**
     * @description 元素数据集。
     */
    public readonly dataset: Record<string, string> = {};

    /**
     * @description 元素标签名。
     */
    private readonly _tagName: string;

    /**
     * @description 已挂载的子元素。
     */
    private readonly _children: IEditorApiPanelElementLike[] = [];

    /**
     * @description 可选父级内存元素。
     */
    private _parent: MemoryPanelElement | null = null;

    /**
     * @description 创建内存面板元素。
     * @param tagName 元素标签名
     */
    public constructor(tagName: string) {
        this._tagName = tagName;
    }

    /**
     * @description 追加一个子节点并同步 HTML 快照。
     * @param child 需要追加的子节点
     * @returns 追加后的子节点
     */
    public appendChild(child: IEditorApiPanelElementLike): IEditorApiPanelElementLike {
        if (child instanceof MemoryPanelElement) {
            child._parent = this;
        }
        this._children.push(child);
        this._syncInnerHtml();
        return child;
    }

    /**
     * @description 替换全部子节点并同步 HTML 快照。
     * @param children 需要挂载的全部子节点
     * @returns 无返回值
     */
    public replaceChildren(...children: IEditorApiPanelElementLike[]): void {
        this._children.length = 0;
        for (const child of children) {
            if (child instanceof MemoryPanelElement) {
                child._parent = this;
            }
            this._children.push(child);
        }
        this._syncInnerHtml();
    }

    /**
     * @description 接收最小事件监听注册；内存 provider 不主动派发事件。
     * @param eventName 事件名称
     * @param listener 事件处理函数
     * @returns 无返回值
     */
    public addEventListener(eventName: string, listener: () => void | Promise<void>): void {
        void eventName;
        void listener;
    }

    /**
     * @description 同步当前元素及其父级的 HTML 快照。
     * @returns 无返回值
     */
    private _syncInnerHtml(): void {
        this.innerHTML = this._children.map((child) => this._serializeChild(child)).join('');
        this._parent?._syncInnerHtml();
    }

    /**
     * @description 序列化当前元素。
     * @returns HTML 字符串
     */
    private _serialize(): string {
        const attributes: string[] = [];
        if (this.id.length > 0) {
            attributes.push(`id="${this.id}"`);
        }
        if (this.className.length > 0) {
            attributes.push(`class="${this.className}"`);
        }
        for (const [key, value] of Object.entries(this.dataset)) {
            attributes.push(`data-${key}="${value}"`);
        }
        const textContent = this.textContent ?? '';
        const childHtml = this._children.map((child) => this._serializeChild(child)).join('');
        return `<${this._tagName}${attributes.length > 0 ? ` ${attributes.join(' ')}` : ''}>${textContent}${childHtml}</${this._tagName}>`;
    }

    /**
     * @description 序列化内存子元素或读取外部元素快照。
     * @param child 子元素
     * @returns 子元素 HTML
     */
    private _serializeChild(child: IEditorApiPanelElementLike): string {
        return child instanceof MemoryPanelElement ? child._serialize() : child.innerHTML;
    }
}
