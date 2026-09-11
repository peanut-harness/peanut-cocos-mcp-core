# Creator 3.8 Lite Quiet Gate — 结论（中文先行）

时间：2026-09-12T00:32:11.412306+08:00
Worktree：`D:\peanut-workspace\peanut-pod-lite-wt-smoke-ab`
分支：`bot/pod-lite-smoke-ab-20260911`

## 根因

预期租约闸门拒批在 `CoreCocosMcpExecutionDispatcher.requireApproval` 里以 `throw new Error('core_cocos_mcp_execution_approval_required:…')` 抛出；
`McpCapabilityRegistry._runHandler` catch 后一律交给 `PluginDiagnosticReporter.record` → `console.error('[plugin:peanut.editor-mcp] …')`，
被 Creator 写入 `project.log` 成生产不可容忍的 `error:` 刷屏。

闸门逻辑本身正确（无租约拒、有租约通）；问题是**把预期控制流当成未处理异常打点**。

## 改动（契约层，非单纯降噪）

1. 新增 `McpControlFlowRefusal`（plugin-core + policy 同形 duck-type）：预期闸门/策略拒批专用类型。
2. Dispatcher 缺租约改为 `McpControlFlowRefusal.reject(...)`（稳定码不变）。
3. Registry `_runHandler`：控制流拒批**不**调用 diagnostic reporter，仍 rethrow → Hub `{ok:false,error}` 给调用方。
4. Hub destructive / editor-mcp product-line+destructive 同步改用 `McpControlFlowRefusal`。
5. Diagnostic 安全网：若仍被 record，则 `console.info` 单行，永不 `console.error`。
6. `lumen.scaffold`：create 后 `_createSession(..., true)` + `requestEditorRefreshBarrier([prefab])`，消除新建 prefab 未 import 就改资产的 Window「original asset is not exist」。

## 验证

| 项 | 结果 |
|---|---|
| 无租约 `asset.catalog.refresh` | 拒批 `core_cocos_mcp_execution_approval_required:asset.catalog.refresh` |
| 无租约 `lumen.scaffold` | 拒批 `core_cocos_mcp_execution_approval_required:lumen.scaffold` |
| project.log `error: [plugin:…] approval_required` | **0** |
| 有租约 `asset.catalog.refresh` | **PASS** |
| 单测 policy/dispatcher/registry/diagnostic/hub matrix | PASS |

证据：本目录 `verify-results.json` / `project-log-*-*.txt` / `with-lease-smoke.json` / `host-install.txt` / `CONCLUSION-zh.md`。
