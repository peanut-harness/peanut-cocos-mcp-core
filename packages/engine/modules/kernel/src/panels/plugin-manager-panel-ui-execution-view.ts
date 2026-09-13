import type { IExecutionDiagnosticGroupSnapshot, IExecutionDiagnosticsSnapshot } from '@peanut/pod-engine/runtime';

import type { IPluginDevelopmentSessionSnapshot } from '../development/plugin-development-controller.js';
import { PluginManagerPanelHtml } from './plugin-manager-panel-ui-html.js';
import type { PluginManagerExecutionPriorityFilter } from './plugin-manager-panel-ui-types.js';

/**
 * @description 插件管理面板执行视图辅助器，负责 execution diagnostics 过滤与开发会话 markup。
 */
export class PluginManagerPanelExecutionView {
    /**
     * @description 统计当前执行队列中的组数量。
     * @param executionDiagnosticsSnapshot 执行诊断快照；缺失时返回 0
     * @returns 规划中、待提交与活动提交组的总数
     */
    public static getExecutionQueueGroupCount(executionDiagnosticsSnapshot: IExecutionDiagnosticsSnapshot | null): number {
        if (executionDiagnosticsSnapshot == null) {
            return 0;
        }

        return (
            executionDiagnosticsSnapshot.queue.planningGroups.length +
            executionDiagnosticsSnapshot.queue.pendingCommitGroups.length +
            (executionDiagnosticsSnapshot.queue.activeCommitGroup == null ? 0 : 1)
        );
    }

    /**
     * @description 按优先级与异常过滤条件筛选执行诊断组。
     * @param groups 待过滤的执行诊断组列表
     * @param priorityFilter 优先级过滤器
     * @param showOnlyExceptionalExecutionGroups 是否只保留异常组
     * @returns 过滤后的执行诊断组列表
     */
    public static getFilteredExecutionDiagnosticGroups(
        groups: readonly IExecutionDiagnosticGroupSnapshot[],
        priorityFilter: PluginManagerExecutionPriorityFilter,
        showOnlyExceptionalExecutionGroups: boolean,
    ): readonly IExecutionDiagnosticGroupSnapshot[] {
        return groups.filter((groupSnapshot) => {
            if (priorityFilter !== 'all' && groupSnapshot.priority !== priorityFilter) {
                return false;
            }
            if (showOnlyExceptionalExecutionGroups && !PluginManagerPanelExecutionView.isExceptionalExecutionDiagnosticGroup(groupSnapshot)) {
                return false;
            }
            return true;
        });
    }

    /**
     * @description 按选中组标识查找执行诊断组。
     * @param executionDiagnosticsSnapshot 执行诊断快照
     * @param selectedExecutionGroupId 当前选中的组标识
     * @returns 匹配的执行诊断组；未找到时返回 `null`
     */
    public static getSelectedExecutionDiagnosticGroup(
        executionDiagnosticsSnapshot: IExecutionDiagnosticsSnapshot | null,
        selectedExecutionGroupId: string | null,
    ): IExecutionDiagnosticGroupSnapshot | null {
        if (executionDiagnosticsSnapshot == null || selectedExecutionGroupId == null) {
            return null;
        }

        return (
            [...executionDiagnosticsSnapshot.currentGroups, ...executionDiagnosticsSnapshot.recentGroups].find((groupSnapshot) => {
                return groupSnapshot.groupId === selectedExecutionGroupId;
            }) ?? null
        );
    }

    /**
     * @description 返回当前面板应展示的执行诊断组列表。
     * @param executionDiagnosticsSnapshot 执行诊断快照
     * @param priorityFilter 优先级过滤器
     * @param showOnlyExceptionalExecutionGroups 是否只保留异常组
     * @returns 可展示的执行诊断组列表
     */
    public static getDisplayedExecutionGroups(
        executionDiagnosticsSnapshot: IExecutionDiagnosticsSnapshot | null,
        priorityFilter: PluginManagerExecutionPriorityFilter,
        showOnlyExceptionalExecutionGroups: boolean,
    ): readonly IExecutionDiagnosticGroupSnapshot[] {
        if (executionDiagnosticsSnapshot == null) {
            return [];
        }

        return PluginManagerPanelExecutionView.getFilteredExecutionDiagnosticGroups(
            [...executionDiagnosticsSnapshot.currentGroups, ...executionDiagnosticsSnapshot.recentGroups],
            priorityFilter,
            showOnlyExceptionalExecutionGroups,
        );
    }

    /**
     * @description 判断执行诊断组是否属于异常组。
     * @param groupSnapshot 执行诊断组快照
     * @returns 存在超时、取消、重规划或失败时返回 `true`
     */
    public static isExceptionalExecutionDiagnosticGroup(groupSnapshot: IExecutionDiagnosticGroupSnapshot): boolean {
        return groupSnapshot.hasTimeout || groupSnapshot.hasCancellation || groupSnapshot.hasReplan || groupSnapshot.status === 'failed';
    }

    /**
     * @description 渲染开发控制会话的最近操作 markup。
     * @param session 开发会话快照
     * @returns 可直接嵌入面板的 HTML 文本
     */
    public static renderDevelopmentSessionMarkup(session: IPluginDevelopmentSessionSnapshot): string {
        if (session.recentOperations.length === 0) {
            return '<div class="plugin-manager-panel__empty">暂无开发控制操作记录。</div>';
        }
        return `<div class="plugin-manager-panel__failure-list">${session.recentOperations
            .map((operation) => {
                const title = `${operation.ok ? '成功' : '失败'} · ${operation.action}${operation.target == null ? '' : ` · ${operation.target}`}`;
                const detail = `${operation.completedAt} · ${operation.durationMs}ms${operation.errorMessage == null ? '' : ` · ${operation.errorMessage}`}`;
                return `<div class="plugin-manager-panel__failure-row"><strong>${PluginManagerPanelHtml.escape(title)}</strong><span>${PluginManagerPanelHtml.escape(detail)}</span></div>`;
            })
            .join('')}</div>`;
    }
}
