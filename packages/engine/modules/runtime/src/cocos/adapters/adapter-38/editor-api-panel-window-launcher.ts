import type {
    IEditorApiPanelBrowserWindow,
    IEditorApiPanelWindowProvider,
} from '../core/editor-api-panel-window.js';
import { DefaultEditorApiPanelWindowProvider } from '../shared/default-editor-api-panel-window-provider.js';

export { DefaultEditorApiPanelWindowProvider } from '../shared/default-editor-api-panel-window-provider.js';

/**
 * @description Editor API 稳定阶段的宿主面板窗口启动器。
 */
export class EditorApiPanelWindowLauncher {
    /**
     * @description 面板宿主 provider。
     */
    private readonly _provider: IEditorApiPanelWindowProvider;

    /**
     * @description 创建 Editor API 面板窗口启动器。
     * @param provider Editor API 面板宿主 provider
     */
    public constructor(provider?: IEditorApiPanelWindowProvider) {
        this._provider = provider ?? new DefaultEditorApiPanelWindowProvider();
    }

    /**
     * @description 为指定面板创建 Editor API 宿主浏览器侧上下文对象。
     * @param adapterId 适配器稳定标识
     * @param panelId 面板稳定标识
     * @param entry 面板前端入口路径
     * @param bootstrapScript 宿主要注入到页面的 bootstrap 脚本文本
     * @returns Editor API 宿主浏览器侧上下文对象
     */
    public async launch(
        adapterId: string,
        panelId: string,
        entry: string,
        bootstrapScript: string,
    ): Promise<IEditorApiPanelBrowserWindow> {
        return await this._provider.launchPanelWindow({
            adapterId,
            panelId,
            entry,
            bootstrapScript,
        });
    }

    /**
     * @description 聚焦 Editor API 面板宿主窗口。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns 无返回值
     */
    public async focus(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): Promise<void> {
        await this._provider.focusPanelWindow?.(panelId, browserWindow);
    }

    /**
     * @description 关闭 Editor API 面板宿主窗口。
     * @param panelId 面板稳定标识
     * @param browserWindow 当前宿主浏览器侧上下文对象
     * @returns 无返回值
     */
    public async close(panelId: string, browserWindow: IEditorApiPanelBrowserWindow): Promise<void> {
        await this._provider.closePanelWindow?.(panelId, browserWindow);
    }
}
