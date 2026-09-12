# Creator 3.8 Lite：静默资源写路径 Quiet + replace not-found 结构化失败

- 时间：2026-09-12 09:57:05 UTC+8
- 验收工程：`D:\mcp-test`
- 分支：`bot/pod-lite-smoke-ab-20260911`
- 结果：**PASS**

## 中文结论

1. **Window「original asset is not exist」根因**：新建 folder/file 后立刻对**新建目录 force `refresh-asset`**，或 rename/move 前后再刷 AssetDB，会与 Creator 3.8.x Assets 面板竞态。不是单纯日志级别问题。
2. **修复**：写路径改为 `create → AssetDB ready（waitReady / 无 force refresh）→ 再改`；`writeText` 等 `.meta`；rename/move **跳过 post refresh-asset**，只 watcher settle + ready。复用 scaffold 的 `refreshForCommit` 仅用于已有文件登记。
3. **`silent_replace_target_not_found`**：假 uuid 是可预期业务失败。gateway 改为 `McpControlFlowRefusal.reject(...)`；`plugin-core` quiet-gate 增加 `silent_replace_` / `silent_delete_` / `silent_move_` 前缀。Host 扩展需同步打包（诊断在 host 侧）。
4. **真机**：`__quiet_asset_ops_tmp` 上 createFolder → writeText → rename → move **project.log 无**对应 Window error；假 uuid replaceReferences（租约+confirm）返回 `silent_replace_target_not_found:...`，**无** `error: [plugin:peanut.editor-mcp] silent_replace_target_not_found`。

## 根因文件 / 改动

| 文件 | 改动 |
|------|------|
| `packages/editor-mcp/src/editor-mcp-silent-asset-gateway.ts` | `_awaitAssetDbRefreshBarrier` / `_awaitNewAssetReadyWithoutForceRefresh`；createFolder/writeText/copy/rename/move/delete/replace 写路径纪律；replace/delete 控制流拒批 |
| `packages/plugin-core/src/mcp/mcp-control-flow-refusal.ts` | quiet 码：`silent_replace_` / `silent_delete_` / `silent_move_` |
| `packages/plugin-core/src/diagnostics/plugin-diagnostic-reporter.ts` | 同步 expected policy 前缀 |
| `packages/plugin-core/tests/plugin-diagnostic-reporter.test.ts` | 覆盖 silent_replace |
| `packages/plugin-core/tests/mcp-capability-registry.test.ts` | silent_replace 不进 diagnostic |
| host pack | `cocos-creator-lite-host-extension` 重打包以带上 quiet-gate |

## 验证

- 单测：plugin-core diagnostic/capability、asset-catalog 绿
- 真机摘要见 `06-verify-summary.json` / `07-verify-summary.json`
- criteria：{"A_no_window_tmp_errors": true, "B_mcp_structured_not_found": true, "B_no_plugin_console_error": true}
- window_tmp_hits：0
- plugin_error_silent_replace_hits：0

## 证据索引

- `01-soft-close.json` … `07-*` 部署与复跑
- `06-project-log-delta.txt` / `07-project-log-delta.txt`
- `06-verify-summary.json` / `07-verify-summary.json`
