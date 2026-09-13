import type { IExecutionDiagnosticGroupSnapshot } from '@peanut/pod-engine/runtime';

import {
    normalizePluginManagerPanelLocale,
    translatePluginManagerPanelPhase,
    translatePluginManagerPanelPriority,
    translatePluginManagerPanelStage,
    translatePluginManagerPanelState,
    translatePluginManagerPanelText,
    translatePluginManagerPanelTrustLevel,
} from './plugin-manager-panel-i18n.js';
import type { PluginManagerPanelLocale } from './plugin-manager-panel-contracts.js';
import { PluginManagerPanelExecutionView } from './plugin-manager-panel-ui-execution-view.js';
import { PluginManagerPanelHtml } from './plugin-manager-panel-ui-html.js';
import { PluginManagerPanelUiStyles } from './plugin-manager-panel-ui-styles.js';
import type { IPluginManagerPanelUiState } from './plugin-manager-panel-ui-types.js';

/**
 * @description 插件管理面板 HTML markup 渲染器，将 UI 状态快照转为可显示的字符串。
 */
export class PluginManagerPanelMarkupRenderer {
    /**
     * @description 把面板 UI 状态渲染为一段可直接显示的 HTML 字符串。
     * @param state 当前 UI 状态快照
     * @returns 当前 UI 的 HTML 字符串快照
     */
    public static render(state: IPluginManagerPanelUiState): string {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const executionDiagnosticsSnapshot = state.executionDiagnosticsSnapshot;
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const summaryCards = [
            PluginManagerPanelMarkupRenderer.renderSummaryCard(
                translatePluginManagerPanelText(locale, 'summary.runtime'),
                `${state.runtimeRecords.length}`,
                translatePluginManagerPanelText(locale, 'summary.runtimeHint'),
            ),
            PluginManagerPanelMarkupRenderer.renderSummaryCard(
                translatePluginManagerPanelText(locale, 'summary.failures'),
                `${state.failureItems.length}`,
                translatePluginManagerPanelText(locale, 'summary.failuresHint'),
            ),
            PluginManagerPanelMarkupRenderer.renderSummaryCard(
                translatePluginManagerPanelText(locale, 'summary.selected'),
                state.selectedRuntimeRecord?.state != null
                    ? translatePluginManagerPanelState(locale, state.selectedRuntimeRecord.state)
                    : translatePluginManagerPanelText(locale, 'summary.none'),
                state.selectedPluginId ?? translatePluginManagerPanelText(locale, 'summary.noPluginSelected'),
            ),
            PluginManagerPanelMarkupRenderer.renderSummaryCard(
                translatePluginManagerPanelText(locale, 'summary.queue'),
                `${PluginManagerPanelExecutionView.getExecutionQueueGroupCount(executionDiagnosticsSnapshot)}`,
                executionDiagnosticsSnapshot?.queue.activeCommitGroup?.groupId ?? translatePluginManagerPanelText(locale, 'summary.idle'),
            ),
        ].join('');
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const runtimeRows = state.runtimeRecords.length === 0
            ? `<div class="plugin-manager-panel__empty">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'empty.noPlugins'))}</div>`
            : state.runtimeRecords.map((pluginRuntimeRecord) => {
                  // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
                  const selectedClass = pluginRuntimeRecord.pluginId === state.selectedPluginId ? ' is-selected' : '';
                  return `<button type="button" class="plugin-manager-panel__plugin-card${selectedClass}" data-plugin-id="${PluginManagerPanelHtml.escape(pluginRuntimeRecord.pluginId)}">
  <span class="plugin-manager-panel__plugin-title">${PluginManagerPanelHtml.escape(pluginRuntimeRecord.pluginId)}</span>
  <span class="plugin-manager-panel__plugin-meta">${PluginManagerPanelHtml.escape(pluginRuntimeRecord.version)} · ${PluginManagerPanelHtml.escape(translatePluginManagerPanelTrustLevel(locale, pluginRuntimeRecord.trustLevel))}</span>
  <span class="plugin-manager-panel__status-pill plugin-manager-panel__status-pill--${PluginManagerPanelHtml.escape(PluginManagerPanelHtml.toStatusTone(pluginRuntimeRecord.state))}">${PluginManagerPanelHtml.escape(translatePluginManagerPanelState(locale, pluginRuntimeRecord.state))}</span>
</button>`;
              }).join('');
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const failureSummary = state.failureItems.length === 0
            ? `<div class="plugin-manager-panel__empty">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'empty.noPluginFailures'))}</div>`
            : state.failureItems.map((pluginFailureListItemPayload) => {
                  return `<div class="plugin-manager-panel__failure-row">
  <strong>${PluginManagerPanelHtml.escape(pluginFailureListItemPayload.pluginId)}</strong>
  <span>${PluginManagerPanelHtml.escape(translatePluginManagerPanelPhase(locale, pluginFailureListItemPayload.phase))}</span>
  <span>${PluginManagerPanelHtml.escape(pluginFailureListItemPayload.summary ?? translatePluginManagerPanelText(locale, 'execution.noDetail'))}</span>
</div>`;
              }).join('');
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const cleanupSteps = state.lastCleanupSteps.length === 0
            ? `<div class="plugin-manager-panel__empty">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'cleanup.noSteps'))}</div>`
            : state.lastCleanupSteps.map((cleanupStepResult) => {
                  return `<div class="plugin-manager-panel__timeline-row">
  <span class="plugin-manager-panel__timeline-target">${PluginManagerPanelHtml.escape(cleanupStepResult.targetType)}</span>
  <span class="plugin-manager-panel__timeline-id">${PluginManagerPanelHtml.escape(cleanupStepResult.targetId)}</span>
  <span class="plugin-manager-panel__status-pill plugin-manager-panel__status-pill--${cleanupStepResult.ok ? 'success' : 'danger'}">${cleanupStepResult.ok ? PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'cleanup.ok')) : PluginManagerPanelHtml.escape(cleanupStepResult.errorMessage ?? translatePluginManagerPanelText(locale, 'cleanup.pending'))}</span>
</div>`;
              }).join('');
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const selectedRuntimeRecord = state.selectedRuntimeRecord;
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const selectedInstalledPackageSnapshot = state.selectedInstalledPackageSnapshot;
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const selectedIncident = state.selectedIncident;
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const selectedFailureExport = state.selectedFailureExport;
        const selectedDiagnosticExport = state.selectedDiagnosticExport;
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const executionDiagnosticsMarkup = PluginManagerPanelMarkupRenderer.renderExecutionDiagnosticsMarkup(state);
        const developmentSessionMarkup = PluginManagerPanelExecutionView.renderDevelopmentSessionMarkup(state.developmentSession);
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const selectedDetail = selectedRuntimeRecord == null
            ? `<div class="plugin-manager-panel__empty">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'empty.noPluginSelected'))}</div>`
            : `<div class="plugin-manager-panel__detail-card">
  <div class="plugin-manager-panel__detail-header">
    <h2>${PluginManagerPanelHtml.escape(selectedRuntimeRecord.pluginId)}</h2>
    <span class="plugin-manager-panel__status-pill plugin-manager-panel__status-pill--${PluginManagerPanelHtml.escape(PluginManagerPanelHtml.toStatusTone(selectedRuntimeRecord.state))}">${PluginManagerPanelHtml.escape(translatePluginManagerPanelState(locale, selectedRuntimeRecord.state))}</span>
  </div>
  <div class="plugin-manager-panel__detail-grid">
    <div><span class="plugin-manager-panel__label">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'detail.version'))}</span><strong>${PluginManagerPanelHtml.escape(selectedRuntimeRecord.version)}</strong></div>
    <div><span class="plugin-manager-panel__label">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'detail.trust'))}</span><strong>${PluginManagerPanelHtml.escape(translatePluginManagerPanelTrustLevel(locale, selectedRuntimeRecord.trustLevel))}</strong></div>
    <div><span class="plugin-manager-panel__label">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'detail.failurePhase'))}</span><strong>${PluginManagerPanelHtml.escape(translatePluginManagerPanelPhase(locale, selectedIncident?.phase ?? 'none'))}</strong></div>
    <div><span class="plugin-manager-panel__label">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'detail.export'))}</span><strong>${selectedDiagnosticExport == null && selectedFailureExport == null ? PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'detail.exportPending')) : PluginManagerPanelHtml.escape(selectedDiagnosticExport?.filePath ?? translatePluginManagerPanelText(locale, 'detail.exportReady'))}</strong></div>
    <div><span class="plugin-manager-panel__label">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'detail.installedActive'))}</span><strong>${PluginManagerPanelHtml.escape(selectedInstalledPackageSnapshot?.activeVersion ?? translatePluginManagerPanelText(locale, 'detail.notInstalled'))}</strong></div>
    <div><span class="plugin-manager-panel__label">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'detail.installedVersions'))}</span><strong>${PluginManagerPanelHtml.escape(selectedInstalledPackageSnapshot?.versions.join(', ') ?? translatePluginManagerPanelText(locale, 'detail.none'))}</strong></div>
  </div>
  <div class="plugin-manager-panel__detail-note">${PluginManagerPanelHtml.escape(selectedIncident?.errorMessage ?? translatePluginManagerPanelText(locale, 'detail.noFailureSelected'))}</div>
</div>`;

        return `<section class="plugin-manager-panel" data-status="${PluginManagerPanelHtml.escape(state.status)}">
  <style>${PluginManagerPanelUiStyles.STYLE_TEXT}</style>
  <header class="plugin-manager-panel__hero">
    <div>
      <p class="plugin-manager-panel__eyebrow">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'hero.controlSurface'))}</p>
      <h1>${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'hero.title'))}</h1>
      <p class="plugin-manager-panel__subtitle">${PluginManagerPanelHtml.escape(state.lastError ?? translatePluginManagerPanelText(locale, 'hero.subtitle'))}</p>
    </div>
    <div class="plugin-manager-panel__hero-status">${PluginManagerPanelHtml.escape(translatePluginManagerPanelState(locale, state.status))}</div>
  </header>
  <section class="plugin-manager-panel__summary">${summaryCards}</section>
  <section class="plugin-manager-panel__workspace">
    <aside class="plugin-manager-panel__sidebar">
      <div class="plugin-manager-panel__section-head"><h2>${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'sidebar.pluginsTitle'))}</h2><span>${state.runtimeRecords.length}</span></div>
      <div class="plugin-manager-panel__plugin-list">${runtimeRows}</div>
      <div class="plugin-manager-panel__section-head"><h2>${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'sidebar.failuresTitle'))}</h2><span>${state.failureItems.length}</span></div>
      <div class="plugin-manager-panel__failure-list">${failureSummary}</div>
    </aside>
    <main class="plugin-manager-panel__main">
      <section class="plugin-manager-panel__card">
        <div class="plugin-manager-panel__section-head"><h2>${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'summary.selected'))}</h2><span>${PluginManagerPanelHtml.escape(state.selectedPluginId ?? translatePluginManagerPanelText(locale, 'hero.overview'))}</span></div>
        ${selectedDetail}
      </section>
      <section class="plugin-manager-panel__card">
        <div class="plugin-manager-panel__section-head"><h2>${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'actions.title'))}</h2><span>${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'actions.copy'))}</span></div>
        <div class="plugin-manager-panel__action-bar">
          <button type="button">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'actions.refresh'))}</button>
          <button type="button">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'actions.export'))}</button>
          <button type="button">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'actions.retryCleanup'))}</button>
          <button type="button">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'actions.activate'))}</button>
          <button type="button">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'actions.deactivate'))}</button>
          <button type="button">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'actions.dispose'))}</button>
        </div>
        <div class="plugin-manager-panel__package-note">${PluginManagerPanelHtml.escape(state.lastPackageActionSummary ?? translatePluginManagerPanelText(locale, 'package.pending'))}</div>
      </section>
      <section class="plugin-manager-panel__card">
        <div class="plugin-manager-panel__section-head"><h2>${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'cleanup.title'))}</h2><span>${state.lastCleanupSteps.length}</span></div>
        <div class="plugin-manager-panel__timeline">${cleanupSteps}</div>
      </section>
      <section class="plugin-manager-panel__card">
        <div class="plugin-manager-panel__section-head"><h2>${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.title'))}</h2><span>${PluginManagerPanelHtml.escape(executionDiagnosticsSnapshot?.updatedAt ?? translatePluginManagerPanelText(locale, 'execution.unavailable'))}</span></div>
        ${executionDiagnosticsMarkup}
      </section>
      <section class="plugin-manager-panel__card">
        <div class="plugin-manager-panel__section-head"><h2>开发会话</h2><span>${PluginManagerPanelHtml.escape(state.developmentSession.enabled ? `127.0.0.1:${state.developmentSession.port ?? 'unknown'}` : '未启用')}</span></div>
        ${developmentSessionMarkup}
      </section>
    </main>
  </section>
</section>`;
    }

    /** @description 封装当前内部处理步骤，供本类流程复用并维持状态一致性。 */
    private static renderSummaryCard(title: string, value: string, hint: string): string {
        return `<div class="plugin-manager-panel__summary-card">
  <span class="plugin-manager-panel__summary-title">${PluginManagerPanelHtml.escape(title)}</span>
  <strong class="plugin-manager-panel__summary-value">${PluginManagerPanelHtml.escape(value)}</strong>
  <span class="plugin-manager-panel__summary-hint">${PluginManagerPanelHtml.escape(hint)}</span>
</div>`;
    }

    /** @description 封装当前内部处理步骤，供本类流程复用并维持状态一致性。 */
    private static renderExecutionDiagnosticsMarkup(state: IPluginManagerPanelUiState): string {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const executionDiagnosticsSnapshot = state.executionDiagnosticsSnapshot;
        if (executionDiagnosticsSnapshot == null) {
            return `<div class="plugin-manager-panel__empty">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.noData'))}</div>`;
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const planningRows = PluginManagerPanelExecutionView.getFilteredExecutionDiagnosticGroups(
            executionDiagnosticsSnapshot.currentGroups.filter((groupSnapshot) => {
                return groupSnapshot.stage === 'planning';
            }),
            state.executionPriorityFilter,
            state.showOnlyExceptionalExecutionGroups,
        ).map((groupSnapshot) => {
            return PluginManagerPanelMarkupRenderer.renderExecutionDiagnosticGroupMarkup(state, groupSnapshot);
        }).join('');
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const pendingRows = PluginManagerPanelExecutionView.getFilteredExecutionDiagnosticGroups(
            executionDiagnosticsSnapshot.currentGroups.filter((groupSnapshot) => {
                return groupSnapshot.stage === 'pending_commit';
            }),
            state.executionPriorityFilter,
            state.showOnlyExceptionalExecutionGroups,
        ).map((groupSnapshot) => {
            return PluginManagerPanelMarkupRenderer.renderExecutionDiagnosticGroupMarkup(state, groupSnapshot);
        }).join('');
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const activeRows = PluginManagerPanelExecutionView.getFilteredExecutionDiagnosticGroups(
            executionDiagnosticsSnapshot.currentGroups.filter((groupSnapshot) => {
                return groupSnapshot.stage === 'committing';
            }),
            state.executionPriorityFilter,
            state.showOnlyExceptionalExecutionGroups,
        ).map((groupSnapshot) => {
            return PluginManagerPanelMarkupRenderer.renderExecutionDiagnosticGroupMarkup(state, groupSnapshot);
        }).join('');
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const recentRows = PluginManagerPanelExecutionView.getFilteredExecutionDiagnosticGroups(
            executionDiagnosticsSnapshot.recentGroups,
            state.executionPriorityFilter,
            state.showOnlyExceptionalExecutionGroups,
        ).map((groupSnapshot) => {
            return PluginManagerPanelMarkupRenderer.renderExecutionDiagnosticGroupMarkup(state, groupSnapshot);
        }).join('');
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const selectedGroup = PluginManagerPanelExecutionView.getSelectedExecutionDiagnosticGroup(
            state.executionDiagnosticsSnapshot,
            state.selectedExecutionGroupId,
        );

        return `<div class="plugin-manager-panel__execution-toolbar">
  ${(['all', 'critical', 'high', 'normal', 'low'] as const).map((priority) => {
      // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
      const selectedClass = state.executionPriorityFilter === priority ? ' is-selected' : '';
      return `<button type="button" class="plugin-manager-panel__filter-chip${selectedClass}" data-priority="${priority}">${PluginManagerPanelHtml.escape(translatePluginManagerPanelPriority(locale, priority))}</button>`;
  }).join('')}
  <span class="plugin-manager-panel__execution-updated">${state.showOnlyExceptionalExecutionGroups ? PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.exceptionalGroups')) : PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.allGroups'))}</span>
</div>
<div class="plugin-manager-panel__queue-grid">
  <div class="plugin-manager-panel__queue-column">
    <strong>${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.planning'))}</strong>
    ${planningRows.length > 0 ? planningRows : `<div class="plugin-manager-panel__empty">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.empty'))}</div>`}
  </div>
  <div class="plugin-manager-panel__queue-column">
    <strong>${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.pendingCommit'))}</strong>
    ${pendingRows.length > 0 ? pendingRows : `<div class="plugin-manager-panel__empty">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.empty'))}</div>`}
  </div>
  <div class="plugin-manager-panel__queue-column">
    <strong>${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.activeCommit'))}</strong>
    ${activeRows.length > 0 ? activeRows : `<div class="plugin-manager-panel__empty">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.empty'))}</div>`}
  </div>
</div>
<div class="plugin-manager-panel__queue-column plugin-manager-panel__queue-column--recent">
  <strong>${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.recentGroups'))}</strong>
  ${recentRows.length > 0 ? recentRows : `<div class="plugin-manager-panel__empty">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.empty'))}</div>`}
</div>
${PluginManagerPanelMarkupRenderer.renderExecutionDiagnosticDetailMarkup(selectedGroup, locale)}`;
    }

    /** @description 封装当前内部处理步骤，供本类流程复用并维持状态一致性。 */
    private static renderExecutionDiagnosticGroupMarkup(state: IPluginManagerPanelUiState, groupSnapshot: IExecutionDiagnosticGroupSnapshot): string {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const selectedClass = state.selectedExecutionGroupId === groupSnapshot.groupId ? ' is-selected' : '';
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const exceptionalClass = PluginManagerPanelExecutionView.isExceptionalExecutionDiagnosticGroup(groupSnapshot) ? ' is-exceptional' : '';
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const tags = [
            groupSnapshot.hasTimeout ? `<span class="plugin-manager-panel__status-pill plugin-manager-panel__status-pill--danger">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.flag.timeout'))}</span>` : '',
            groupSnapshot.hasCancellation ? `<span class="plugin-manager-panel__status-pill plugin-manager-panel__status-pill--warning">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.flag.cancelled'))}</span>` : '',
            groupSnapshot.hasReplan ? `<span class="plugin-manager-panel__status-pill plugin-manager-panel__status-pill--neutral">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.flag.replan'))}</span>` : '',
        ].join('');

        return `<button type="button" class="plugin-manager-panel__queue-row${selectedClass}${exceptionalClass}" data-group-id="${PluginManagerPanelHtml.escape(groupSnapshot.groupId)}">
  <span class="plugin-manager-panel__queue-group">${PluginManagerPanelHtml.escape(groupSnapshot.groupId)}</span>
  <span class="plugin-manager-panel__queue-meta">${PluginManagerPanelHtml.escape(translatePluginManagerPanelPriority(locale, groupSnapshot.priority))} · ${PluginManagerPanelHtml.escape(translatePluginManagerPanelStage(locale, groupSnapshot.stage))} · ${PluginManagerPanelHtml.escape(translatePluginManagerPanelState(locale, groupSnapshot.status))}</span>
  <span class="plugin-manager-panel__queue-targets">${PluginManagerPanelHtml.escape(groupSnapshot.targets.join(', ') || translatePluginManagerPanelText(locale, 'execution.noTargets'))}</span>
  <span class="plugin-manager-panel__queue-targets">${PluginManagerPanelHtml.escape(groupSnapshot.taskIds.join(', '))}</span>
  <span class="plugin-manager-panel__queue-flags">${tags || `<span class="plugin-manager-panel__status-pill plugin-manager-panel__status-pill--success">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.flag.ok'))}</span>`}</span>
</button>`;
    }

    /** @description 封装当前内部处理步骤，供本类流程复用并维持状态一致性。 */
    private static renderExecutionDiagnosticDetailMarkup(groupSnapshot: IExecutionDiagnosticGroupSnapshot | null, locale: PluginManagerPanelLocale): string {
        if (groupSnapshot == null) {
            return `<div class="plugin-manager-panel__empty">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.noSelection'))}</div>`;
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const taskSummariesMarkup = groupSnapshot.taskSummaries.map((taskSummary) => {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const traceMarkup = taskSummary.trace == null
                ? `<div class="plugin-manager-panel__empty">${PluginManagerPanelHtml.escape(translatePluginManagerPanelText(locale, 'execution.tracePending'))}</div>`
                : taskSummary.trace.steps.map((traceStep) => {
                      return `<div class="plugin-manager-panel__timeline-row">
  <span class="plugin-manager-panel__timeline-target">${PluginManagerPanelHtml.escape(traceStep.title)}</span>
  <span class="plugin-manager-panel__timeline-id">${PluginManagerPanelHtml.escape(translatePluginManagerPanelState(locale, traceStep.status))}</span>
  <span>${PluginManagerPanelHtml.escape(traceStep.detail ?? translatePluginManagerPanelText(locale, 'execution.noDetail'))}</span>
</div>`;
                  }).join('');
            return `<div class="plugin-manager-panel__detail-card">
  <div class="plugin-manager-panel__detail-header">
    <h3>${PluginManagerPanelHtml.escape(taskSummary.taskId)}</h3>
    <span class="plugin-manager-panel__status-pill plugin-manager-panel__status-pill--${PluginManagerPanelHtml.escape(PluginManagerPanelHtml.toStatusTone(taskSummary.status === 'cancelled' ? 'inactive' : taskSummary.status))}">${PluginManagerPanelHtml.escape(translatePluginManagerPanelState(locale, taskSummary.status))}</span>
  </div>
  <div class="plugin-manager-panel__detail-note">${PluginManagerPanelHtml.escape(taskSummary.errorCode ?? translatePluginManagerPanelText(locale, 'execution.noError'))}</div>
  <div class="plugin-manager-panel__timeline">${traceMarkup}</div>
</div>`;
        }).join('');

        return `<div class="plugin-manager-panel__execution-detail">
  <div class="plugin-manager-panel__detail-header">
    <h3>${PluginManagerPanelHtml.escape(groupSnapshot.groupId)}</h3>
    <span class="plugin-manager-panel__status-pill plugin-manager-panel__status-pill--${PluginManagerPanelHtml.escape(groupSnapshot.status === 'failed' ? 'danger' : groupSnapshot.status === 'cancelled' ? 'warning' : groupSnapshot.status === 'succeeded' ? 'success' : 'neutral')}">${PluginManagerPanelHtml.escape(translatePluginManagerPanelState(locale, groupSnapshot.status))}</span>
  </div>
  <div class="plugin-manager-panel__detail-note">${PluginManagerPanelHtml.escape(groupSnapshot.targets.join(', ') || translatePluginManagerPanelText(locale, 'execution.noTargets'))}</div>
  <div class="plugin-manager-panel__timeline">${taskSummariesMarkup}</div>
</div>`;
    }
}
