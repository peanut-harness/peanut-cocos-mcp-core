# Lite ↔ 旧岛 editor 免费面对齐缺口表（P2 刷新）

时间：2026-09-12 01:22:38 UTC+8
Worktree：`D:\peanut-workspace\peanut-pod-lite-wt-smoke-ab`（`bot/pod-lite-smoke-ab-20260911`）

## 中文结论（先行）

- **P2 目标三项已闭环**：`importPlan`/`managedStatus` 按旧岛只读免租约纠偏；`asset.open` 补齐 Lite 租约入口，同时保留旧岛 Hub plan 路径。
- **旧岛对照依据**：editor-mcp CAPABILITIES 中 importPlan/managedStatus=`readOnly:true`；三者旧岛 tool schema 均无 `_writeControl`。open 在旧岛走 Hub plan / directWrite，而非 MCP input control。
- **综合对齐度估值：~98%**（较 P1 的 ~97% +1pp；剩余为文档措辞、builder 全平台、Pro 面）。

## 本轮明细

| 能力/op | 旧岛状态 | Lite 状态（修后） | 差距类型 | 优先级 |
| --- | --- | --- | --- | --- |
| asset.importPlan | 只读规划，无 control | 只读免租约；无 control | 已对齐 | P2→done |
| asset.managedStatus | 只读账本查询，无 control | 只读免租约；无 control | 已对齐 | P2→done |
| asset.open | 写风险；schema 无 control；Hub plan 路径 | schema 有 control（Lite 租约入口增强）；Hub plan 路径仍可用 | 已对齐（Lite≥旧岛） | P2→done |
