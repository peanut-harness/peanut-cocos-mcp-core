# Lite ↔ 旧岛 editor 免费面对齐缺口表

时间：2026-09-12 00:52:45 UTC+8
Worktree：`D:\peanut-workspace\peanut-pod-lite-wt-smoke-ab`（`bot/pod-lite-smoke-ab-20260911`）
旧岛只读：`D:\workspaces\peanut-agents\products\cocos`
验收工程：`D:\workspaces\peanut-agents\test-demos\cocos-for-agent`（Creator 3.8.7）

## 中文结论（先行）

- **公开免费面 83 op**：Lite policy catalog + Hub 注册 + editor-mcp gateway **已齐**（Hub 实机 84 = 83 + `issue-local-approval-lease`）。
- **Pro/付费禁入 Lite**：`preview.capture` / snowb / ui-prefab / sdf / AVM / content-delivery / Figma·PSD — 旧岛 `compatibility.matrix` stable 装包列表含这些插件，**属 Pro/integrations**，Lite 不实现。
- **本轮 P0 已修**：写 schema `control()` 缺 `resources`（旧 Agent/Hub 常传；`additionalProperties:false` 会 `mcp_capability_input_invalid`）。已补齐并真机验证 `asset.catalog.refresh` / `createFolder` / `delete`。
- **缺实现类 P0**：盘点后 **0**（网关 case / silent-asset / scene / lumen / builder / reference 均有实现；非整岛覆盖拷贝）。
- **剩余**：主要为 P1 行为差（`sessionBound` 长租约）与 P1/P2 真机覆盖广度（prefab 写全表、builder.build 全链路）。

## 总览计数

| 差距类型 | 条数（约） | 说明 |
| --- | ---: | --- |
| 已对齐 | 83+支撑项 | catalog/schema/gateway/租约别名/安静闸门/empty 模板/Hub 桥 |
| 缺实现 P0 | 0 | 本轮无新缺实现 |
| 行为差 P0（本轮已修） | 1 | `resources` 写控制字段 |
| 行为差 P1 | 若干 | sessionBound；部分 schema 缺参业务错属预期 |
| 仅文档 | 若干 | MATRIX 仍写「实机冒烟未验证」需刷 |
| 属 Pro | 7+ | 见下表 |

## 缺口明细

| 能力/op | 旧岛状态 | Lite 状态 | 差距类型 | 优先级 |
| --- | --- | --- | --- | --- |
| editor.queryVersion/Project/Selection | 免费只读稳定 | Hub+gateway PASS | 已对齐 | — |
| editor.setSelection | 免费写+approvalToken | 租约+approvalId/Token 别名 PASS | 已对齐 | — |
| asset.* 读 13 项（含 waitReady/search/…） | 免费只读 | catalog 齐；缺参业务错预期 | 已对齐 | — |
| asset.catalog.refresh | 免费写 | 租约后 PASS；现接受 resources | 已对齐（本轮修） | P0→done |
| asset.createFolder/move/copy/rename/delete/import… | silent-asset-gateway | 同源实现；本轮 createFolder+delete+resources 真机 PASS | 已对齐（抽样） | P0→done |
| asset.replaceReferences | 破坏性+confirm | schema+Hub confirm 齐 | 已对齐（未全真机） | P1 |
| scene.* 读/写（除 save） | 免费 | createNode/focus/reload 等 PASS | 已对齐 | — |
| scene.save | 拒 Creator 确认框 | 同策略 `scene_save_refused:use_lumen_offline_write` | 行为差（产品一致） | P2 |
| prefab.* 6 项 | scene gateway | 已接线；真机全表未跑 | 行为差/覆盖不足 | P1 |
| preview.query/queryErrors/refresh | 免费（capture 除外） | 已接线 | 已对齐（refresh 未本轮真机） | P1 |
| preview.capture | stable 包可选 | **禁入 Lite** | 属Pro | — |
| builder.query* / build | 免费 | 已接线；build 真机未本轮 | 覆盖不足 | P1 |
| lumen.* 26 项 | 免费 | empty 模板/租约/破坏确认已修；矩阵 PASS | 已对齐 | — |
| reference.queryImage/setImage | 旧 stub→Lite 已接 Creator message | Lite ≥ 旧岛 | 已对齐（增强） | — |
| lumen.lodRecalcBounds | 旧 stub | Lite 已接 execute-component-method | 已对齐（增强） | — |
| snowb.bmfont.* | stable 插件 | 禁入 | 属Pro | — |
| peanut.ui-prefab / sdf-font / content-delivery / AVM | stable 插件 | 禁入 | 属Pro | — |
| Figma/PSD integrations | providers | 禁入 | 属Pro | — |
| Hub registry 可见性 | editor-mcp activate 自注册 | Lite host publishToolsToHubRegistry | 已对齐 | — |
| approvalToken ↔ approvalId | 旧仅 Token | 双字段+consume 别名 | 已对齐 | — |
| confirmDestructive | Hub+router | schema+Hub+router | 已对齐 | — |
| 写 input `resources` | `_writeControl` 含 | **曾缺**→本轮 control()+emcp 对齐 | 行为差→已修 | P0 |
| McpControlFlowRefusal 安静闸门 | 旧 throw→error 刷屏 | 控制流拒不打 diagnostic error | 已对齐 | — |
| issue-local-approval-lease / Hub mirror | 旧 Hub batch store | Lite store + mirror | 已对齐 | — |
| sessionBound 长租约（5m/30m） | Hub batch 有 | Lite store 无 | 行为差 | P1 |
| default_prefab 打包 | monorepo 90 文件 | Lite lumen bundled 90 文件同字节 | 已对齐 | — |
| bridge-host | 旧岛包 | **不迁入 Lite**（硬约束） | 属边界 | — |

## P0 定义复核

旧岛免费面 Agent/Editor 常用且 Lite 缺或明显不对齐（schema/租约/Hub/时序）。本轮唯一仍属该类的是 **`resources` schema**；已修并真机验证。
