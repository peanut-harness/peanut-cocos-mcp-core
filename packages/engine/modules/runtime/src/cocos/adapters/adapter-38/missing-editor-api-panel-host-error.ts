/**
 * @description 当宿主未安装真实 panel bridge 且未允许测试 fallback 时抛出的错误。
 */
export class MissingEditorApiPanelHostError extends Error {
    /**
     * @description 创建宿主 bridge 缺失错误。
     */
    public constructor() {
        super(
            'Editor API panel host bridge is not installed. Install __PEANUT_EDITOR_PANEL_HOST__ or explicitly allow the memory fallback provider.',
        );
        this.name = 'MissingEditorApiPanelHostError';
    }
}
