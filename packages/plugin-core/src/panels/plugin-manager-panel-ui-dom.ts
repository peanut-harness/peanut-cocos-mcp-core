import type { IExecutionDiagnosticGroupSnapshot } from 'peanut-runtime';

import type { IPluginDevelopmentSessionSnapshot } from '../development/plugin-development-controller.js';
import type {
    IPluginManagerPanelBrowserWindow,
    IPluginManagerPanelDocumentLike,
    IPluginManagerPanelElementLike,
    IPluginManagerPanelUiState,
} from './plugin-manager-panel-ui-types.js';
import { PluginManagerPanelExecutionView } from './plugin-manager-panel-ui-execution-view.js';
import { PluginManagerPanelHtml } from './plugin-manager-panel-ui-html.js';
import { PluginManagerPanelUiStyles } from './plugin-manager-panel-ui-styles.js';
import {
    normalizePluginManagerPanelLocale,
    translatePluginManagerPanelPhase,
    translatePluginManagerPanelPriority,
    translatePluginManagerPanelStage,
    translatePluginManagerPanelState,
    translatePluginManagerPanelText,
    translatePluginManagerPanelTrustLevel,
} from './plugin-manager-panel-i18n.js';

/**
 * @description 插件管理面板 DOM 渲染器，将状态快照同步为浏览器侧真实 DOM 结构。
 */
export class PluginManagerPanelDomRenderer {
    /**
     * @description 用当前状态重建面板文档主体。
     * @param document 面板文档对象
     * @param targetWindow 面板浏览器侧窗口对象
     * @param state 当前 UI 状态快照
     */
    public static render(
        document: IPluginManagerPanelDocumentLike,
        targetWindow: IPluginManagerPanelBrowserWindow,
        state: IPluginManagerPanelUiState,
    ): void {
        renderPluginManagerPanelDom(document, targetWindow, state);
    }
}

function renderPluginManagerPanelDom(
    document: IPluginManagerPanelDocumentLike,
    targetWindow: IPluginManagerPanelBrowserWindow,
    state: IPluginManagerPanelUiState,
): void {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const style = document.createElement('style');
    style.textContent = PluginManagerPanelUiStyles.STYLE_TEXT;
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const root = document.createElement('section');
    root.className = 'plugin-manager-panel';
    root.dataset.status = state.status;

    root.appendChild(createHeroSection(document, state));
    root.appendChild(createSummarySection(document, state));

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const workspace = document.createElement('section');
    workspace.className = 'plugin-manager-panel__workspace';
    workspace.appendChild(createSidebarSection(document, targetWindow, state));
    workspace.appendChild(createMainSection(document, targetWindow, state));
    root.appendChild(workspace);

    document.body.replaceChildren(style, root);
}

function createHeroSection(
    document: IPluginManagerPanelDocumentLike,
    state: IPluginManagerPanelUiState,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const header = document.createElement('header');
    header.className = 'plugin-manager-panel__hero';

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const copy = document.createElement('div');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const eyebrow = document.createElement('p');
    eyebrow.className = 'plugin-manager-panel__eyebrow';
    eyebrow.textContent = translatePluginManagerPanelText(locale, 'hero.controlSurface');
    copy.appendChild(eyebrow);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const heading = document.createElement('h1');
    heading.textContent = translatePluginManagerPanelText(locale, 'hero.title');
    copy.appendChild(heading);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const subtitle = document.createElement('p');
    subtitle.className = 'plugin-manager-panel__subtitle';
    subtitle.textContent = state.lastError ?? translatePluginManagerPanelText(locale, 'hero.subtitle');
    copy.appendChild(subtitle);
    header.appendChild(copy);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const heroStatus = document.createElement('div');
    heroStatus.className = 'plugin-manager-panel__hero-status';
    heroStatus.textContent = translatePluginManagerPanelState(locale, state.status);
    header.appendChild(heroStatus);
    return header;
}

function createSummarySection(
    document: IPluginManagerPanelDocumentLike,
    state: IPluginManagerPanelUiState,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const section = document.createElement('section');
    section.className = 'plugin-manager-panel__summary';
    section.appendChild(createSummaryCardElement(document, translatePluginManagerPanelText(locale, 'summary.runtime'), `${state.runtimeRecords.length}`, translatePluginManagerPanelText(locale, 'summary.runtimeHint')));
    section.appendChild(createSummaryCardElement(document, translatePluginManagerPanelText(locale, 'summary.failures'), `${state.failureItems.length}`, translatePluginManagerPanelText(locale, 'summary.failuresHint')));
    section.appendChild(
        createSummaryCardElement(
            document,
            translatePluginManagerPanelText(locale, 'summary.selected'),
            state.selectedRuntimeRecord?.state != null
                ? translatePluginManagerPanelState(locale, state.selectedRuntimeRecord.state)
                : translatePluginManagerPanelText(locale, 'summary.none'),
            state.selectedPluginId ?? translatePluginManagerPanelText(locale, 'summary.noPluginSelected'),
        ),
    );
    section.appendChild(
        createSummaryCardElement(
            document,
            translatePluginManagerPanelText(locale, 'summary.queue'),
            `${PluginManagerPanelExecutionView.getExecutionQueueGroupCount(state.executionDiagnosticsSnapshot)}`,
            state.executionDiagnosticsSnapshot?.queue.activeCommitGroup?.groupId ?? translatePluginManagerPanelText(locale, 'summary.idle'),
        ),
    );
    return section;
}

function createSummaryCardElement(
    document: IPluginManagerPanelDocumentLike,
    title: string,
    value: string,
    hint: string,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const card = document.createElement('article');
    card.className = 'plugin-manager-panel__summary-card';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const label = document.createElement('span');
    label.className = 'plugin-manager-panel__summary-title';
    label.textContent = title;
    card.appendChild(label);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const strong = document.createElement('strong');
    strong.className = 'plugin-manager-panel__summary-value';
    strong.textContent = value;
    card.appendChild(strong);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const note = document.createElement('span');
    note.className = 'plugin-manager-panel__summary-hint';
    note.textContent = hint;
    card.appendChild(note);
    return card;
}

function createSidebarSection(
    document: IPluginManagerPanelDocumentLike,
    targetWindow: IPluginManagerPanelBrowserWindow,
    state: IPluginManagerPanelUiState,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const sidebar = document.createElement('aside');
    sidebar.className = 'plugin-manager-panel__sidebar';
    sidebar.appendChild(createSectionHead(document, translatePluginManagerPanelText(locale, 'sidebar.pluginsTitle'), `${state.runtimeRecords.length}`));
    sidebar.appendChild(createPluginListSection(document, targetWindow, state));
    sidebar.appendChild(createSectionHead(document, translatePluginManagerPanelText(locale, 'sidebar.failuresTitle'), `${state.failureItems.length}`));
    sidebar.appendChild(createFailureSection(document, state));
    return sidebar;
}

function createMainSection(
    document: IPluginManagerPanelDocumentLike,
    targetWindow: IPluginManagerPanelBrowserWindow,
    state: IPluginManagerPanelUiState,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const main = document.createElement('main');
    main.className = 'plugin-manager-panel__main';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const selectedCard = document.createElement('section');
    selectedCard.className = 'plugin-manager-panel__card';
    selectedCard.appendChild(createSectionHead(document, translatePluginManagerPanelText(locale, 'summary.selected'), state.selectedPluginId ?? translatePluginManagerPanelText(locale, 'hero.overview')));
    selectedCard.appendChild(createSelectedSection(document, state));
    main.appendChild(selectedCard);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const actionsCard = document.createElement('section');
    actionsCard.className = 'plugin-manager-panel__card';
    actionsCard.appendChild(createSectionHead(document, translatePluginManagerPanelText(locale, 'actions.title'), translatePluginManagerPanelText(locale, 'actions.copy')));
    actionsCard.appendChild(createActionsSection(document, targetWindow, state));
    main.appendChild(actionsCard);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const cleanupCard = document.createElement('section');
    cleanupCard.className = 'plugin-manager-panel__card';
    cleanupCard.appendChild(createSectionHead(document, translatePluginManagerPanelText(locale, 'cleanup.title'), `${state.lastCleanupSteps.length}`));
    cleanupCard.appendChild(createCleanupSection(document, state));
    main.appendChild(cleanupCard);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const executionQueueCard = document.createElement('section');
    executionQueueCard.className = 'plugin-manager-panel__card';
    executionQueueCard.appendChild(createSectionHead(document, translatePluginManagerPanelText(locale, 'execution.title'), state.executionDiagnosticsSnapshot?.updatedAt ?? translatePluginManagerPanelText(locale, 'execution.unavailable')));
    executionQueueCard.appendChild(createExecutionQueueSection(document, targetWindow, state));
    main.appendChild(executionQueueCard);

    const developmentSessionCard = document.createElement('section');
    developmentSessionCard.className = 'plugin-manager-panel__card';
    developmentSessionCard.appendChild(createSectionHead(document, '开发会话', state.developmentSession.enabled ? `127.0.0.1:${state.developmentSession.port ?? 'unknown'}` : '未启用'));
    developmentSessionCard.appendChild(createDevelopmentSessionSection(document, state.developmentSession));
    main.appendChild(developmentSessionCard);
    return main;
}

function createDevelopmentSessionSection(
    document: IPluginManagerPanelDocumentLike,
    session: IPluginDevelopmentSessionSnapshot,
): IPluginManagerPanelElementLike {
    const section = document.createElement('div');
    section.className = 'plugin-manager-panel__failure-list';
    if (session.recentOperations.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'plugin-manager-panel__empty';
        empty.textContent = '暂无开发控制操作记录。';
        section.appendChild(empty);
        return section;
    }
    for (const operation of session.recentOperations) {
        const item = document.createElement('div');
        item.className = 'plugin-manager-panel__failure-row';
        const title = document.createElement('strong');
        title.textContent = `${operation.ok ? '成功' : '失败'} · ${operation.action}${operation.target == null ? '' : ` · ${operation.target}`}`;
        item.appendChild(title);
        const detail = document.createElement('span');
        detail.textContent = `${operation.completedAt} · ${operation.durationMs}ms${operation.errorMessage == null ? '' : ` · ${operation.errorMessage}`}`;
        item.appendChild(detail);
        section.appendChild(item);
    }
    return section;
}

function createSectionHead(
    document: IPluginManagerPanelDocumentLike,
    title: string,
    meta: string,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const head = document.createElement('div');
    head.className = 'plugin-manager-panel__section-head';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const heading = document.createElement('h2');
    heading.textContent = title;
    head.appendChild(heading);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const tail = document.createElement('span');
    tail.textContent = meta;
    head.appendChild(tail);
    return head;
}

function createPluginListSection(
    document: IPluginManagerPanelDocumentLike,
    targetWindow: IPluginManagerPanelBrowserWindow,
    state: IPluginManagerPanelUiState,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
    // 保存当前流程收集的有序结果，供后续步骤统一处理。
    const list = document.createElement('div');
    list.className = 'plugin-manager-panel__plugin-list';
    if (state.runtimeRecords.length === 0) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const empty = document.createElement('p');
        empty.className = 'plugin-manager-panel__empty';
        empty.textContent = translatePluginManagerPanelText(locale, 'empty.noPlugins');
        list.appendChild(empty);
    } else {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        for (const pluginRuntimeRecord of state.runtimeRecords) {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const button = document.createElement('button');
            button.id = `plugin-select-${pluginRuntimeRecord.pluginId}`;
            button.className = 'plugin-manager-panel__plugin-card';
            if (pluginRuntimeRecord.pluginId === state.selectedPluginId) {
                button.className += ' is-selected';
            }
            button.dataset.pluginId = pluginRuntimeRecord.pluginId;
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const title = document.createElement('span');
            title.className = 'plugin-manager-panel__plugin-title';
            title.textContent = pluginRuntimeRecord.pluginId;
            button.appendChild(title);
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const meta = document.createElement('span');
            meta.className = 'plugin-manager-panel__plugin-meta';
            meta.textContent = `${pluginRuntimeRecord.version} · ${translatePluginManagerPanelTrustLevel(locale, pluginRuntimeRecord.trustLevel)}`;
            button.appendChild(meta);
            button.appendChild(createStatusPill(document, translatePluginManagerPanelState(locale, pluginRuntimeRecord.state), PluginManagerPanelHtml.toStatusTone(pluginRuntimeRecord.state)));
            button.addEventListener('click', async () => {
                await targetWindow.pluginManagerPanelUiActions?.selectPlugin(pluginRuntimeRecord.pluginId);
            });
            list.appendChild(button);
        }
    }
    return list;
}

function createFailureSection(
    document: IPluginManagerPanelDocumentLike,
    state: IPluginManagerPanelUiState,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const section = document.createElement('section');
    section.className = 'plugin-manager-panel__failure-list';

    if (state.failureItems.length === 0) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const empty = document.createElement('p');
        empty.className = 'plugin-manager-panel__empty';
        empty.textContent = translatePluginManagerPanelText(locale, 'empty.noPluginFailures');
        section.appendChild(empty);
        return section;
    }

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。

    for (const pluginFailureListItemPayload of state.failureItems) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const row = document.createElement('div');
        row.className = 'plugin-manager-panel__failure-row';
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const title = document.createElement('strong');
        title.textContent = pluginFailureListItemPayload.pluginId;
        row.appendChild(title);
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const phase = document.createElement('span');
        phase.textContent = translatePluginManagerPanelPhase(locale, pluginFailureListItemPayload.phase);
        row.appendChild(phase);
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const summary = document.createElement('span');
        summary.textContent = pluginFailureListItemPayload.summary ?? translatePluginManagerPanelText(locale, 'execution.noDetail');
        row.appendChild(summary);
        section.appendChild(row);
    }
    return section;
}

function createSelectedSection(
    document: IPluginManagerPanelDocumentLike,
    state: IPluginManagerPanelUiState,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const section = document.createElement('section');
    section.className = 'plugin-manager-panel__detail-card';

    if (state.selectedRuntimeRecord == null) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const empty = document.createElement('p');
        empty.className = 'plugin-manager-panel__empty';
        empty.textContent = translatePluginManagerPanelText(locale, 'empty.noPluginSelected');
        section.appendChild(empty);
        return section;
    }

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const header = document.createElement('div');
    header.className = 'plugin-manager-panel__detail-header';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const title = document.createElement('h2');
    title.textContent = state.selectedRuntimeRecord.pluginId;
    header.appendChild(title);
    header.appendChild(createStatusPill(document, translatePluginManagerPanelState(locale, state.selectedRuntimeRecord.state), PluginManagerPanelHtml.toStatusTone(state.selectedRuntimeRecord.state)));
    section.appendChild(header);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const grid = document.createElement('div');
    grid.className = 'plugin-manager-panel__detail-grid';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const selectedInstalledPackageSnapshot = state.selectedInstalledPackageSnapshot;
    // 保存当前流程收集的有序结果，供后续步骤统一处理。
    const entries = [
        [translatePluginManagerPanelText(locale, 'detail.version'), state.selectedRuntimeRecord.version],
        [translatePluginManagerPanelText(locale, 'detail.trust'), translatePluginManagerPanelTrustLevel(locale, state.selectedRuntimeRecord.trustLevel)],
        [translatePluginManagerPanelText(locale, 'detail.failurePhase'), translatePluginManagerPanelPhase(locale, state.selectedIncident?.phase ?? 'none')],
        [translatePluginManagerPanelText(locale, 'detail.export'), state.selectedDiagnosticExport?.filePath ?? (state.selectedFailureExport == null ? translatePluginManagerPanelText(locale, 'detail.exportPending') : translatePluginManagerPanelText(locale, 'detail.exportReady'))],
        [translatePluginManagerPanelText(locale, 'detail.installedActive'), selectedInstalledPackageSnapshot?.activeVersion ?? translatePluginManagerPanelText(locale, 'detail.notInstalled')],
        [translatePluginManagerPanelText(locale, 'detail.installedVersions'), selectedInstalledPackageSnapshot?.versions.join(', ') ?? translatePluginManagerPanelText(locale, 'detail.none')],
    ];
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    for (const [labelText, valueText] of entries) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const cell = document.createElement('div');
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const label = document.createElement('span');
        label.className = 'plugin-manager-panel__label';
        label.textContent = labelText;
        cell.appendChild(label);
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const value = document.createElement('strong');
        value.textContent = valueText;
        cell.appendChild(value);
        grid.appendChild(cell);
    }
    section.appendChild(grid);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const note = document.createElement('div');
    note.className = 'plugin-manager-panel__detail-note';
    note.textContent = state.selectedIncident?.errorMessage ?? translatePluginManagerPanelText(locale, 'detail.noFailureSelected');
    section.appendChild(note);
    return section;
}

function createActionsSection(
    document: IPluginManagerPanelDocumentLike,
    targetWindow: IPluginManagerPanelBrowserWindow,
    state: IPluginManagerPanelUiState,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const section = document.createElement('div');
    section.className = 'plugin-manager-panel__action-bar';

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const actions: Array<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        id: string;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        label: string;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        onClick: () => Promise<void>;
    }> = [
        {
            id: 'plugin-manager-action-refresh',
            label: translatePluginManagerPanelText(locale, 'actions.refresh'),
            onClick: async () => {
                await targetWindow.pluginManagerPanelUiActions?.refresh();
            },
        },
        {
            id: 'plugin-manager-action-export',
            label: translatePluginManagerPanelText(locale, 'actions.export'),
            onClick: async () => {
                await targetWindow.pluginManagerPanelUiActions?.exportSelectedFailure();
            },
        },
        {
            id: 'plugin-manager-action-retry-cleanup',
            label: translatePluginManagerPanelText(locale, 'actions.retryCleanup'),
            onClick: async () => {
                await targetWindow.pluginManagerPanelUiActions?.retrySelectedCleanup();
            },
        },
        {
            id: 'plugin-manager-action-activate',
            label: translatePluginManagerPanelText(locale, 'actions.activate'),
            onClick: async () => {
                await targetWindow.pluginManagerPanelUiActions?.activateSelectedPlugin();
            },
        },
        {
            id: 'plugin-manager-action-deactivate',
            label: translatePluginManagerPanelText(locale, 'actions.deactivate'),
            onClick: async () => {
                await targetWindow.pluginManagerPanelUiActions?.deactivateSelectedPlugin();
            },
        },
        {
            id: 'plugin-manager-action-dispose',
            label: translatePluginManagerPanelText(locale, 'actions.dispose'),
            onClick: async () => {
                await targetWindow.pluginManagerPanelUiActions?.disposeSelectedPlugin();
            },
        },
        {
            id: 'plugin-manager-action-uninstall-package',
            label: translatePluginManagerPanelText(locale, 'actions.uninstallSelected'),
            onClick: async () => {
                await targetWindow.pluginManagerPanelUiActions?.uninstallSelectedPackage();
            },
        },
    ];

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。

    for (const action of actions) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const button = document.createElement('button');
        button.id = action.id;
        button.textContent = action.label;
        button.disabled =
            (state.selectedPluginId == null && action.id !== 'plugin-manager-action-refresh')
            || (action.id === 'plugin-manager-action-uninstall-package' && state.selectedInstalledPackageSnapshot == null);
        button.addEventListener('click', action.onClick);
        section.appendChild(button);
    }
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const packageNote = document.createElement('p');
    packageNote.className = 'plugin-manager-panel__package-note';
    packageNote.textContent = state.lastPackageActionSummary ?? translatePluginManagerPanelText(locale, 'package.pending');
    section.appendChild(packageNote);
    return section;
}

function createCleanupSection(
    document: IPluginManagerPanelDocumentLike,
    state: IPluginManagerPanelUiState,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const section = document.createElement('section');
    section.className = 'plugin-manager-panel__timeline';

    if (state.lastCleanupSteps.length === 0) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const empty = document.createElement('p');
        empty.className = 'plugin-manager-panel__empty';
        empty.textContent = translatePluginManagerPanelText(locale, 'cleanup.noSteps');
        section.appendChild(empty);
        return section;
    }

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。

    for (const cleanupStepResult of state.lastCleanupSteps) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const row = document.createElement('div');
        row.className = 'plugin-manager-panel__timeline-row';
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const target = document.createElement('span');
        target.className = 'plugin-manager-panel__timeline-target';
        target.textContent = cleanupStepResult.targetType;
        row.appendChild(target);
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const targetId = document.createElement('span');
        targetId.className = 'plugin-manager-panel__timeline-id';
        targetId.textContent = cleanupStepResult.targetId;
        row.appendChild(targetId);
        row.appendChild(createStatusPill(document, cleanupStepResult.ok ? translatePluginManagerPanelText(locale, 'cleanup.ok') : cleanupStepResult.errorMessage ?? translatePluginManagerPanelText(locale, 'cleanup.pending'), cleanupStepResult.ok ? 'success' : 'danger'));
        section.appendChild(row);
    }
    return section;
}

function createExecutionQueueSection(
    document: IPluginManagerPanelDocumentLike,
    targetWindow: IPluginManagerPanelBrowserWindow,
    state: IPluginManagerPanelUiState,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const executionDiagnosticsSnapshot = state.executionDiagnosticsSnapshot;
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const section = document.createElement('section');
    section.className = 'plugin-manager-panel__execution-diagnostics';

    if (executionDiagnosticsSnapshot == null) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const empty = document.createElement('p');
        empty.className = 'plugin-manager-panel__empty';
        empty.textContent = translatePluginManagerPanelText(locale, 'execution.noData');
        section.appendChild(empty);
        return section;
    }

    section.appendChild(createExecutionDiagnosticsToolbar(document, targetWindow, state));

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const grid = document.createElement('div');
    grid.className = 'plugin-manager-panel__queue-grid';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const columns: Array<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        title: string;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        groups: readonly IExecutionDiagnosticGroupSnapshot[];
    }> = [
        {
            title: translatePluginManagerPanelText(locale, 'execution.planning'),
            groups: PluginManagerPanelExecutionView.getFilteredExecutionDiagnosticGroups(
                executionDiagnosticsSnapshot.currentGroups.filter((groupSnapshot) => {
                    return groupSnapshot.stage === 'planning';
                }),
                state.executionPriorityFilter,
                state.showOnlyExceptionalExecutionGroups,
            ),
        },
        {
            title: translatePluginManagerPanelText(locale, 'execution.pendingCommit'),
            groups: PluginManagerPanelExecutionView.getFilteredExecutionDiagnosticGroups(
                executionDiagnosticsSnapshot.currentGroups.filter((groupSnapshot) => {
                    return groupSnapshot.stage === 'pending_commit';
                }),
                state.executionPriorityFilter,
                state.showOnlyExceptionalExecutionGroups,
            ),
        },
        {
            title: translatePluginManagerPanelText(locale, 'execution.activeCommit'),
            groups: PluginManagerPanelExecutionView.getFilteredExecutionDiagnosticGroups(
                executionDiagnosticsSnapshot.currentGroups.filter((groupSnapshot) => {
                    return groupSnapshot.stage === 'committing';
                }),
                state.executionPriorityFilter,
                state.showOnlyExceptionalExecutionGroups,
            ),
        },
    ];

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。

    for (const columnConfig of columns) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const column = document.createElement('div');
        column.className = 'plugin-manager-panel__queue-column';
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const title = document.createElement('strong');
        title.textContent = columnConfig.title;
        column.appendChild(title);
        if (columnConfig.groups.length === 0) {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const empty = document.createElement('p');
            empty.className = 'plugin-manager-panel__empty';
            empty.textContent = translatePluginManagerPanelText(locale, 'execution.empty');
            column.appendChild(empty);
        } else {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            for (const groupSnapshot of columnConfig.groups) {
                column.appendChild(createExecutionDiagnosticGroupButton(document, targetWindow, state, groupSnapshot));
            }
        }
        grid.appendChild(column);
    }
    section.appendChild(grid);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const recentColumn = document.createElement('div');
    recentColumn.className = 'plugin-manager-panel__queue-column plugin-manager-panel__queue-column--recent';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const recentTitle = document.createElement('strong');
    recentTitle.textContent = translatePluginManagerPanelText(locale, 'execution.recentGroups');
    recentColumn.appendChild(recentTitle);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const recentGroups = PluginManagerPanelExecutionView.getFilteredExecutionDiagnosticGroups(
        executionDiagnosticsSnapshot.recentGroups,
        state.executionPriorityFilter,
        state.showOnlyExceptionalExecutionGroups,
    );
    if (recentGroups.length === 0) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const empty = document.createElement('p');
        empty.className = 'plugin-manager-panel__empty';
        empty.textContent = translatePluginManagerPanelText(locale, 'execution.empty');
        recentColumn.appendChild(empty);
    } else {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        for (const groupSnapshot of recentGroups) {
            recentColumn.appendChild(createExecutionDiagnosticGroupButton(document, targetWindow, state, groupSnapshot));
        }
    }
    section.appendChild(recentColumn);

    section.appendChild(
        createExecutionDiagnosticDetailSection(
            document,
            state,
            PluginManagerPanelExecutionView.getSelectedExecutionDiagnosticGroup(state.executionDiagnosticsSnapshot, state.selectedExecutionGroupId),
        ),
    );
    return section;
}

function createExecutionDiagnosticsToolbar(
    document: IPluginManagerPanelDocumentLike,
    targetWindow: IPluginManagerPanelBrowserWindow,
    state: IPluginManagerPanelUiState,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const toolbar = document.createElement('div');
    toolbar.className = 'plugin-manager-panel__execution-toolbar';

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。

    for (const priority of ['all', 'critical', 'high', 'normal', 'low'] as const) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const button = document.createElement('button');
        button.id = `execution-priority-${priority}`;
        button.className = 'plugin-manager-panel__filter-chip';
        if (state.executionPriorityFilter === priority) {
            button.className += ' is-selected';
        }
        button.textContent = translatePluginManagerPanelPriority(locale, priority);
        button.addEventListener('click', async () => {
            await targetWindow.pluginManagerPanelUiActions?.setExecutionPriorityFilter(priority);
        });
        toolbar.appendChild(button);
    }

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const exceptionalToggle = document.createElement('button');
    exceptionalToggle.id = 'execution-toggle-exceptional';
    exceptionalToggle.className = 'plugin-manager-panel__filter-chip';
    if (state.showOnlyExceptionalExecutionGroups) {
        exceptionalToggle.className += ' is-selected';
    }
    exceptionalToggle.textContent = state.showOnlyExceptionalExecutionGroups
        ? translatePluginManagerPanelText(locale, 'execution.exceptionalOnly')
        : translatePluginManagerPanelText(locale, 'execution.showExceptional');
    exceptionalToggle.addEventListener('click', async () => {
        await targetWindow.pluginManagerPanelUiActions?.toggleExceptionalExecutionGroups();
    });
    toolbar.appendChild(exceptionalToggle);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const refreshButton = document.createElement('button');
    refreshButton.id = 'execution-refresh';
    refreshButton.className = 'plugin-manager-panel__filter-chip';
    refreshButton.textContent = translatePluginManagerPanelText(locale, 'execution.refresh');
    refreshButton.addEventListener('click', async () => {
        await targetWindow.pluginManagerPanelUiActions?.refreshExecutionDiagnostics();
    });
    toolbar.appendChild(refreshButton);

    const reconcileButton = document.createElement('button');
    reconcileButton.id = 'development-reconcile';
    reconcileButton.className = 'plugin-manager-panel__filter-chip';
    reconcileButton.textContent = 'Dev Reconcile';
    reconcileButton.addEventListener('click', async () => {
        await targetWindow.pluginManagerPanelUiActions?.reconcileDevelopmentPlugins();
    });
    toolbar.appendChild(reconcileButton);

    const reloadButton = document.createElement('button');
    reloadButton.id = 'development-reload-selected';
    reloadButton.className = 'plugin-manager-panel__filter-chip';
    reloadButton.textContent = 'Dev Reload Selected';
    reloadButton.addEventListener('click', async () => {
        await targetWindow.pluginManagerPanelUiActions?.reloadSelectedDevelopmentPlugin();
    });
    toolbar.appendChild(reloadButton);

    return toolbar;
}

function createExecutionDiagnosticGroupButton(
    document: IPluginManagerPanelDocumentLike,
    targetWindow: IPluginManagerPanelBrowserWindow,
    state: IPluginManagerPanelUiState,
    groupSnapshot: IExecutionDiagnosticGroupSnapshot,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const button = document.createElement('button');
    button.id = `execution-group-${groupSnapshot.groupId}`;
    button.className = 'plugin-manager-panel__queue-row';
    if (state.selectedExecutionGroupId === groupSnapshot.groupId) {
        button.className += ' is-selected';
    }
    if (PluginManagerPanelExecutionView.isExceptionalExecutionDiagnosticGroup(groupSnapshot)) {
        button.className += ' is-exceptional';
    }
    button.dataset.groupId = groupSnapshot.groupId;

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const group = document.createElement('span');
    group.className = 'plugin-manager-panel__queue-group';
    group.textContent = groupSnapshot.groupId;
    button.appendChild(group);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const meta = document.createElement('span');
    meta.className = 'plugin-manager-panel__queue-meta';
    meta.textContent = `${translatePluginManagerPanelPriority(locale, groupSnapshot.priority)} · ${translatePluginManagerPanelStage(locale, groupSnapshot.stage)} · ${translatePluginManagerPanelState(locale, groupSnapshot.status)}`;
    button.appendChild(meta);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const queueTargets = document.createElement('span');
    queueTargets.className = 'plugin-manager-panel__queue-targets';
    queueTargets.textContent = groupSnapshot.targets.join(', ') || translatePluginManagerPanelText(locale, 'execution.noTargets');
    button.appendChild(queueTargets);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskIds = document.createElement('span');
    taskIds.className = 'plugin-manager-panel__queue-targets';
    taskIds.textContent = groupSnapshot.taskIds.join(', ');
    button.appendChild(taskIds);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const flags = document.createElement('span');
    flags.className = 'plugin-manager-panel__queue-flags';
    if (groupSnapshot.hasTimeout) {
        flags.appendChild(createStatusPill(document, translatePluginManagerPanelText(locale, 'execution.flag.timeout'), 'danger'));
    }
    if (groupSnapshot.hasCancellation) {
        flags.appendChild(createStatusPill(document, translatePluginManagerPanelText(locale, 'execution.flag.cancelled'), 'warning'));
    }
    if (groupSnapshot.hasReplan) {
        flags.appendChild(createStatusPill(document, translatePluginManagerPanelText(locale, 'execution.flag.replan'), 'neutral'));
    }
    if (!groupSnapshot.hasTimeout && !groupSnapshot.hasCancellation && !groupSnapshot.hasReplan) {
        flags.appendChild(createStatusPill(document, translatePluginManagerPanelText(locale, 'execution.flag.ok'), 'success'));
    }
    button.appendChild(flags);

    button.addEventListener('click', async () => {
        await targetWindow.pluginManagerPanelUiActions?.selectExecutionGroup(groupSnapshot.groupId);
    });
    return button;
}

function createExecutionDiagnosticDetailSection(
    document: IPluginManagerPanelDocumentLike,
    state: IPluginManagerPanelUiState,
    groupSnapshot: IExecutionDiagnosticGroupSnapshot | null,
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const locale = normalizePluginManagerPanelLocale(state.preferences.locale);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const section = document.createElement('section');
    section.className = 'plugin-manager-panel__execution-detail';

    if (groupSnapshot == null) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const empty = document.createElement('p');
        empty.className = 'plugin-manager-panel__empty';
        empty.textContent = translatePluginManagerPanelText(locale, 'execution.noSelection');
        section.appendChild(empty);
        return section;
    }

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const header = document.createElement('div');
    header.className = 'plugin-manager-panel__detail-header';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const title = document.createElement('h3');
    title.textContent = groupSnapshot.groupId;
    header.appendChild(title);
    header.appendChild(
        createStatusPill(
            document,
            translatePluginManagerPanelState(locale, groupSnapshot.status),
            groupSnapshot.status === 'failed' ? 'danger' : groupSnapshot.status === 'cancelled' ? 'warning' : groupSnapshot.status === 'succeeded' ? 'success' : 'neutral',
        ),
    );
    section.appendChild(header);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const note = document.createElement('div');
    note.className = 'plugin-manager-panel__detail-note';
    note.textContent = groupSnapshot.targets.join(', ') || translatePluginManagerPanelText(locale, 'execution.noTargets');
    section.appendChild(note);

    // 保存当前流程收集的有序结果，供后续步骤统一处理。
    const taskList = document.createElement('div');
    taskList.className = 'plugin-manager-panel__timeline';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    for (const taskSummary of groupSnapshot.taskSummaries) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const taskCard = document.createElement('div');
        taskCard.className = 'plugin-manager-panel__detail-card';
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const taskHeader = document.createElement('div');
        taskHeader.className = 'plugin-manager-panel__detail-header';
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const taskTitle = document.createElement('h3');
        taskTitle.textContent = taskSummary.taskId;
        taskHeader.appendChild(taskTitle);
        taskHeader.appendChild(
            createStatusPill(
                document,
                translatePluginManagerPanelState(locale, taskSummary.status),
                taskSummary.status === 'failed' ? 'danger' : taskSummary.status === 'cancelled' ? 'warning' : taskSummary.status === 'succeeded' ? 'success' : 'neutral',
            ),
        );
        taskCard.appendChild(taskHeader);

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const taskNote = document.createElement('div');
        taskNote.className = 'plugin-manager-panel__detail-note';
        taskNote.textContent = taskSummary.errorCode ?? translatePluginManagerPanelText(locale, 'execution.noError');
        taskCard.appendChild(taskNote);

        // 保存当前流程收集的有序结果，供后续步骤统一处理。
        const traceList = document.createElement('div');
        traceList.className = 'plugin-manager-panel__timeline';
        if (taskSummary.trace == null) {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const empty = document.createElement('p');
            empty.className = 'plugin-manager-panel__empty';
            empty.textContent = translatePluginManagerPanelText(locale, 'execution.tracePending');
            traceList.appendChild(empty);
        } else {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            for (const traceStep of taskSummary.trace.steps) {
                // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
                const row = document.createElement('div');
                row.className = 'plugin-manager-panel__timeline-row';
                // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
                const stepTitle = document.createElement('span');
                stepTitle.className = 'plugin-manager-panel__timeline-target';
                stepTitle.textContent = traceStep.title;
                row.appendChild(stepTitle);
                // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
                const stepStatus = document.createElement('span');
                stepStatus.className = 'plugin-manager-panel__timeline-id';
                stepStatus.textContent = translatePluginManagerPanelState(locale, traceStep.status);
                row.appendChild(stepStatus);
                // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
                const stepDetail = document.createElement('span');
                stepDetail.textContent = traceStep.detail ?? translatePluginManagerPanelText(locale, 'execution.noDetail');
                row.appendChild(stepDetail);
                traceList.appendChild(row);
            }
        }
        taskCard.appendChild(traceList);
        taskList.appendChild(taskCard);
    }
    section.appendChild(taskList);
    return section;
}

function createStatusPill(
    document: IPluginManagerPanelDocumentLike,
    text: string,
    tone: 'success' | 'warning' | 'danger' | 'neutral',
): IPluginManagerPanelElementLike {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const pill = document.createElement('span');
    pill.className = `plugin-manager-panel__status-pill plugin-manager-panel__status-pill--${tone}`;
    pill.textContent = text;
    return pill;
}
