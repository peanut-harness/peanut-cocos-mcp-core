# 本轮已修清单

时间：2026-09-12 00:52:45 UTC+8

| 项 | 说明 | 验证 |
| --- | --- | --- |
| 写 schema `control().resources` | Lite policy 全部原生写工具 + `lumen.structure` 内联字段 | policy 单测 13/13；真机 schema 含 resources |
| editor-mcp `_writeControl` | 补 `approvalId`，保留 `approvalToken`/`resources`/`confirmDestructive` | tsc build |
| 真机 asset 写抽样 | catalog.refresh / createFolder / delete（带 resources + 租约 + 破坏确认） | 7/7 PASS（见 device-verify-resources.json） |
| pack+安装 | pod-lite core + lite-host 覆盖工程 | host ready toolCount=84 |

不回退既有：pathToFileURL、Hub registry 桥、lease、approvalToken 别名、confirmDestructive、empty 模板、quiet-gate。
