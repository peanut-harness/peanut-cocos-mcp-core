# Creator 3.8 Lite 缺口清理结论（中文先行）

时间：2026-09-11（UTC+8）
分支：bot/pod-lite-smoke-ab-20260911
Worktree：D:\peanut-workspace\peanut-pod-lite-wt-smoke-ab
工程：D:\workspaces\peanut-agents\test-demos\cocos-for-agent
证据：evidence/creator38-lite-gap-cleanup-20260911/

## 总评

**本轮缺口清理完成**：`empty` 逻辑模板、Hub↔Lite 破坏写确认字段、Hub 签发租约双写 Lite store，均已落地并通过单测与 Creator 回归；工程侧 app-qa 缺模块已补齐。

## A. project.log 真问题

### A1) `lumen_template_missing:.../empty.prefab`

- **根因**：`empty` 本是逻辑模板（`scaffoldPrefab` / recipe 走 `createEmpty` / `addChildFromSpec`），但 `lumen.nodeAdd` → `LumenSession.addChildFromTemplate` 无条件 `_resolveTemplatePath('empty')`，去找不存在的 `bundled/default_prefab/empty.prefab`。
- **来源说明**：`bundle-default-prefab.cjs` 从 monorepo `default_prefab` 打包；Lite 仓跳过并用现有 bundled。Creator 官方 default-assets **没有** 名为 empty.prefab 的文件；empty 从未应由打包生成。
- **修复**：`packages/lumen/source/session.ts` 对归一化后 `empty` 改走 `addChildFromSpec`（`cc.UITransform`），与 recipe 路径一致。
- **单测**：`addChildFromTemplate empty is logical` PASS
- **回归**：`lumen.nodeAdd` template=empty → **PASS**（不再 `lumen_template_missing`）

### A2) Scene import：`app-qa-wasm-backend.ts` 找不到 `./app-qa-observe-buffer`

- **根因**：缺文件，不是单纯扩展名问题。「遗漏了扩展名」是 SystemJS 在模块解析失败时的连带告警。
- **证据**：importer 在 `assets/peanut/extensions/debug/app-qa/`；`app-qa-observe-buffer.ts` 只存在于 `assets/peanut/debug/app-qa/`（及 agents-qa 模板）。
- **修复（工程侧）**：把 `app-qa-observe-buffer.ts` + 新 uuid 的 `.meta` 拷入 `extensions/debug/app-qa/`，与同目录相对 import 对齐。
- **说明**：工程侧改动在 cocos-for-agent，不在 peanut-pod-lite worktree commit 内。

### A3) approval_required / lumen_child_missing

- 冒烟矩阵预期，**未当作产品 bug 修**。

## B. P1 产品缺口

### B1) Hub `confirmDestructive` ↔ Lite 写 schema

- Lite `control()`（及 `lumen.structure`）增加 `confirmDestructive: boolean`，在 `additionalProperties:false` 下可合法传入。
- 回归：无确认 → `cocos_mcp_destructive_confirmation_required`；带 `confirmDestructive:true` → **PASS**（不再 schema_invalid）。

### B2) Hub `issueApprovalToken` / `approvePlanAndIssueToken` 顺带写 Lite store

- `McpApprovalLeaseStore` 支持 `preferredToken`（与 Hub token 对齐）。
- Hub 增加 `mirrorLocalApprovalLease` / `setLocalApprovalLeaseMirror`；签发后返回双字段：`approvalToken` + `approvalId` + `liteMirrored`。
- Lite host `bindHubLocalApprovalLeaseMirror()` 在 core 就绪后晚绑定。
- **不自动免审**；仅镜像租约。
- 回归：`liteMirrored=true` 且双字段同值；catalog/lumen 写可用该 token。

### B3) 回归

见 `REGRESSION.json`：`PASS=7` / `REFUSED_AS_EXPECTED=2` / `FAIL=0`  
覆盖：issueApprovalToken 双写、catalog 拒/过、scaffold、nodeAdd empty、nodeRm 破坏确认。

## 单测

- `@peanut/cocos-lumen`：empty nodeAdd 单测 PASS（此前全量 160/161，已修断言后专项 PASS）
- `@peanut/pod-lite-capability-policy`：12/12 PASS（含 confirmDestructive + preferredToken）
- `plugin-core` matrix/hub：20/20 PASS（含 mirror 测试）

## 安装与 Creator

- 软关 Creator（CloseMainWindow，无 /F）
- pack：lumen → editor-mcp → pod-lite core → lite-host
- 安装到工程 extensions + peanut-plugins；Hub 84 caps 就绪

## 提交

同分支 commit，**不 push**。

## app-qa 复检

- 启动瞬时（22:21:35）仍有一次历史 Scene 导入失败（observe-buffer）；文件已在 extensions 目录。
- 对 ssets/peanut/extensions/debug/app-qa 做 asset.reimport 后，**无新增** observe-buffer / 找不到模块 日志。
