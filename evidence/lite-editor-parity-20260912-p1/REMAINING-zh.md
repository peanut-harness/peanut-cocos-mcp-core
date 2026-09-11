# 未完成清单（留给下轮）

| 项 | 类型 | 优先级 | 备注 |
| --- | --- | --- | --- |
| `asset.open` / `asset.importPlan` / `asset.managedStatus` schema 无 `control()` | 旧岛同构摩擦 | P2 | 写风险+requiresLocalApproval，但 input 不能带 approvalToken（与旧岛 editor-mcp schema 同构）；租约无法经 MCP input 消费 |
| MATRIX/LEDGER「实机未验证」措辞全量刷到 host-verified | 仅文档 | P2 | 本轮已部分刷新 |
| `builder.build` 全平台矩阵（非 web-desktop） | 覆盖 | P2 | 本轮仅 web-desktop |
| Pro 面（capture/snowb/ui-prefab/sdf/AVM/CD/Figma） | 属Pro | — | 不进 Lite |


> P2 更新（2026-09-12 01:22:38 UTC+8）：open/importPlan/managedStatus 已闭环，详见 `../lite-editor-parity-20260912-p2/`。
