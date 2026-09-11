# P2 已修清单

时间：2026-09-12 01:22:38 UTC+8

| 项 | 说明 | 验证 |
| --- | --- | --- |
| `asset.importPlan` / `asset.managedStatus` 误入写目录 | 与旧岛 editor-mcp CAPABILITIES 对齐：`readOnly:true` / `risk:read`；从 Lite write catalog 迁回 read catalog；**不**加 control()（避免错误闸门） | 单测 P2；真机无租约可执行；带 approvalToken → `mcp_capability_input_invalid` |
| `asset.open` schema 补 `control()` | Lite write schema + editor-mcp tool catalog `_writeControl()`：`approvalId`/`approvalToken`/`confirmDestructive`/`resources` | schema 探测：伪造 token → `approval_required`（非 input_invalid）；带租约 PASS |
| dispatcher/router 消费 | 仍经 `requiresLocalApproval` + `McpApprovalLeaseStore.consume`；Hub 无 directWrite 时保持旧岛 **plan 确认**路径 | directWrite 下无租约安静拒批；有租约执行；关 directWrite 返回 Hub `planId` |

不回退：resources schema、quiet-gate、sessionBound、approvalToken 别名、confirmDestructive。
