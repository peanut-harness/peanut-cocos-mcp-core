import type {
    IEditorApiPanelDocumentLike,
    IEditorApiPanelElementLike,
} from '../core/editor-api-panel-window.js';
import { MemoryPanelElement } from './memory-panel-element.js';

/**
 * @description 内存面板文档，用于测试和显式离线面板宿主。
 */
export class MemoryPanelDocument implements IEditorApiPanelDocumentLike {
    /**
     * @description 当前页面根节点。
     */
    public readonly body: IEditorApiPanelElementLike = new MemoryPanelElement('body');

    /**
     * @description 创建一个新的内存元素节点。
     * @param tagName 元素标签名
     * @returns 新创建的元素节点
     */
    public createElement(tagName: string): IEditorApiPanelElementLike {
        return new MemoryPanelElement(tagName);
    }
}
