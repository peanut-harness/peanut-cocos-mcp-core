import type {
    IEditorApiPanelBrowserWindow,
    IEditorApiPanelWindowLaunchRequest,
    IEditorApiPanelWindowProvider,
} from '../core/editor-api-panel-window.js';
import { MemoryPanelDocument } from './memory-panel-document.js';

/**
 * @description 默认 Editor API 面板宿主 provider，实现内存态 webview skeleton。
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
