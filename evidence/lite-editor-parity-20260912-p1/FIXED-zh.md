# P1 已修清单

时间：2026-09-12 01:07:25 UTC+8

| 项 | 说明 | 验证 |
| --- | --- | --- |
| `McpApprovalLeaseStore.sessionBound` | 会话空闲 5min / 最长 30min；显式 idle/max 可覆盖；issue 回传 idle/max | 单测 16/16；真机 idleLeaseMs=300000 maxHoldMs=1800000 |
| host `issue-local-approval-lease` | inputSchema 增加 `sessionBound`；回传 idle/max/sessionBound | Hub caps 含字段；真机契约 PASS |
| Hub 租约镜像 | approve/issue 镜像传入 BatchStore **已解析** idle/max（修 sessionBound 时 Lite 仍 10s/60s） | plugin-core 单测 + 代码审查 |
| prefab/builder/import/preview 真机全表 | 读/拒批/带租约写；安静闸门 | `42/42`；confirm 补跑 3/3 |

不回退：resources schema、quiet-gate、approvalToken 别名、confirmDestructive、Hub registry、empty 模板。
