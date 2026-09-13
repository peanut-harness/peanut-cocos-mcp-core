/**
 * @description 插件管理面板 HTML 文本辅助工具，负责转义与状态色调映射。
 */
export class PluginManagerPanelHtml {
    /**
     * @description 转义 HTML 文本，避免面板动态内容注入标记。
     * @param text 原始文本
     * @returns 转义后的安全文本
     */
    public static escape(text: string): string {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /**
     * @description 将插件运行状态映射为面板状态色调。
     * @param state 插件或任务状态字符串
     * @returns 对应的状态色调
     */
    public static toStatusTone(state: string): 'success' | 'warning' | 'danger' | 'neutral' {
        if (state === 'active') {
            return 'success';
        }
        if (state === 'failed') {
            return 'danger';
        }
        if (state === 'inactive' || state === 'disposed') {
            return 'warning';
        }
        return 'neutral';
    }
}
