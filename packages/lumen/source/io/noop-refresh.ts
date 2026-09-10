import type { ILumenEditorRefreshAdapter, ILumenEditorRefreshResult } from '../types';

/**
 * @description 默认编辑器刷新适配器：不触发宿主，仅返回指引。
 */
export class LumenNoopEditorRefreshAdapter implements ILumenEditorRefreshAdapter {
    /**
     * @description 返回未触发刷新的说明，供 Agent 改走人工或 MCP。
     * @param _projectRoot 项目根
     * @param relativePaths 请求刷新的路径
     * @returns 结果
     */
    public async refresh(
        _projectRoot: string,
        relativePaths: readonly string[],
    ): Promise<ILumenEditorRefreshResult> {
        const scope = relativePaths.length === 0 ? 'entire assets database' : relativePaths.join(', ');
        return {
            triggered: false,
            message: `lumen_editor_refresh_noop:open_creator_and_refresh:${scope}`,
            settle: {
                waitedMs: 0,
                budgetMs: 0,
                overBudget: false,
                registered: 0,
                pending: 0,
                ready: false,
                softFailCount: 0,
            },
        };
    }

    /**
     * @description no-op 屏障刷新（无宿主时与 refresh 相同）。
     * @param projectRoot 项目根
     * @param relativePaths 路径
     * @returns 结果
     */
    public async refreshBarrier(
        projectRoot: string,
        relativePaths: readonly string[],
    ): Promise<ILumenEditorRefreshResult> {
        return this.refresh(projectRoot, relativePaths);
    }
}
