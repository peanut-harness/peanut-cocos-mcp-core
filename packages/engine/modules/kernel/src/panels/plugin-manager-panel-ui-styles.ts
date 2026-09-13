/**
 * @description 插件管理面板浏览器侧样式表，集中托管内联 CSS 文本。
 */
export class PluginManagerPanelUiStyles {
    /**
     * @description 面板根节点内联样式文本。
     */
    public static readonly STYLE_TEXT: string = `
.plugin-manager-panel {
    box-sizing: border-box;
    min-height: 100%;
    padding: 20px;
    color: #f4efe7;
    background:
        radial-gradient(circle at top left, rgba(237, 177, 122, 0.20), transparent 34%),
        linear-gradient(180deg, #1d2428 0%, #14181b 100%);
    font-family: Georgia, 'Times New Roman', serif;
}
.plugin-manager-panel__hero,
.plugin-manager-panel__summary,
.plugin-manager-panel__workspace,
.plugin-manager-panel__section-head,
.plugin-manager-panel__detail-header,
.plugin-manager-panel__timeline-row,
.plugin-manager-panel__failure-row {
    display: flex;
}
.plugin-manager-panel__hero,
.plugin-manager-panel__summary,
.plugin-manager-panel__workspace {
    gap: 16px;
}
.plugin-manager-panel__hero {
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 18px;
}
.plugin-manager-panel__eyebrow,
.plugin-manager-panel__subtitle,
.plugin-manager-panel__summary-hint,
.plugin-manager-panel__plugin-meta,
.plugin-manager-panel__label,
.plugin-manager-panel__detail-note,
.plugin-manager-panel__empty,
.plugin-manager-panel__section-head span {
    color: #c9b8a6;
}
.plugin-manager-panel__eyebrow {
    margin: 0 0 6px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-size: 11px;
}
.plugin-manager-panel__hero h1 {
    margin: 0;
    font-size: 34px;
    line-height: 1;
}
.plugin-manager-panel__subtitle {
    margin: 8px 0 0;
    max-width: 620px;
}
.plugin-manager-panel__hero-status,
.plugin-manager-panel__summary-card,
.plugin-manager-panel__card,
.plugin-manager-panel__plugin-card,
.plugin-manager-panel__failure-row,
.plugin-manager-panel__timeline-row {
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(11, 13, 15, 0.42);
    border-radius: 16px;
}
.plugin-manager-panel__hero-status {
    padding: 10px 14px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 12px;
}
.plugin-manager-panel__summary {
    margin-bottom: 16px;
}
.plugin-manager-panel__summary-card {
    flex: 1;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.plugin-manager-panel__summary-value {
    font-size: 28px;
}
.plugin-manager-panel__workspace {
    align-items: flex-start;
}
.plugin-manager-panel__sidebar {
    width: 34%;
    min-width: 280px;
}
.plugin-manager-panel__main {
    flex: 1;
}
.plugin-manager-panel__main,
.plugin-manager-panel__sidebar {
    display: flex;
    flex-direction: column;
    gap: 16px;
}
.plugin-manager-panel__card {
    padding: 16px;
}
.plugin-manager-panel__section-head {
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}
.plugin-manager-panel__section-head h2 {
    margin: 0;
    font-size: 18px;
}
.plugin-manager-panel__plugin-list,
.plugin-manager-panel__failure-list,
.plugin-manager-panel__timeline,
.plugin-manager-panel__execution-diagnostics {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.plugin-manager-panel__plugin-card {
    width: 100%;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: inherit;
    text-align: left;
}
.plugin-manager-panel__plugin-card.is-selected {
    outline: 1px solid rgba(237, 177, 122, 0.8);
    background: rgba(52, 36, 22, 0.72);
}
.plugin-manager-panel__plugin-title {
    font-size: 16px;
}
.plugin-manager-panel__plugin-meta {
    font-size: 12px;
}
.plugin-manager-panel__status-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}
.plugin-manager-panel__status-pill--success {
    background: rgba(69, 133, 90, 0.24);
    color: #b7f0c7;
}
.plugin-manager-panel__status-pill--warning {
    background: rgba(173, 128, 52, 0.24);
    color: #ffd59f;
}
.plugin-manager-panel__status-pill--danger {
    background: rgba(163, 66, 66, 0.24);
    color: #ffc4c4;
}
.plugin-manager-panel__status-pill--neutral {
    background: rgba(120, 128, 138, 0.24);
    color: #d9dde1;
}
.plugin-manager-panel__failure-row,
.plugin-manager-panel__timeline-row {
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
}
.plugin-manager-panel__detail-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
}
.plugin-manager-panel__detail-header {
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}
.plugin-manager-panel__detail-header h2 {
    margin: 0;
}
.plugin-manager-panel__detail-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}
.plugin-manager-panel__detail-grid div {
    padding: 12px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.04);
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.plugin-manager-panel__label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}
.plugin-manager-panel__detail-note {
    padding: 12px;
    border-left: 3px solid rgba(237, 177, 122, 0.8);
    background: rgba(255, 255, 255, 0.03);
}
.plugin-manager-panel__action-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}
.plugin-manager-panel__action-bar button,
.plugin-manager-panel__plugin-card {
    cursor: pointer;
}
.plugin-manager-panel__action-bar button {
    padding: 10px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(237, 177, 122, 0.10);
    color: inherit;
}
.plugin-manager-panel__action-bar button:disabled {
    opacity: 0.45;
    cursor: default;
}
.plugin-manager-panel__timeline-target {
    font-weight: 700;
}
.plugin-manager-panel__timeline-id {
    flex: 1;
    color: #d8cab8;
}
.plugin-manager-panel__queue-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}
.plugin-manager-panel__execution-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 8px;
}
.plugin-manager-panel__filter-chip {
    padding: 8px 12px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
    color: inherit;
    cursor: pointer;
}
.plugin-manager-panel__filter-chip.is-selected {
    background: rgba(237, 177, 122, 0.18);
    border-color: rgba(237, 177, 122, 0.48);
}
.plugin-manager-panel__queue-column {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.04);
}
.plugin-manager-panel__queue-column--recent {
    margin-top: 12px;
}
.plugin-manager-panel__queue-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.18);
    border: 1px solid transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
}
.plugin-manager-panel__queue-row.is-selected {
    border-color: rgba(237, 177, 122, 0.48);
}
.plugin-manager-panel__queue-row.is-exceptional {
    background: rgba(112, 41, 41, 0.18);
}
.plugin-manager-panel__queue-flags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}
.plugin-manager-panel__execution-detail {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-top: 12px;
}
.plugin-manager-panel__queue-group {
    font-weight: 700;
}
.plugin-manager-panel__queue-meta,
.plugin-manager-panel__queue-targets {
    color: #c9b8a6;
    font-size: 12px;
}
@media (max-width: 980px) {
    .plugin-manager-panel__workspace {
        flex-direction: column;
    }
    .plugin-manager-panel__sidebar {
        width: 100%;
    }
    .plugin-manager-panel__queue-grid {
        grid-template-columns: 1fr;
    }
    .plugin-manager-panel__detail-grid {
        grid-template-columns: 1fr;
    }
}
`;
}
