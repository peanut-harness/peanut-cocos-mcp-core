# Creator 3.8 Lite Hub Parity — RUNBOOK

时间：2026-09-11（UTC+8）
Worktree：D:\peanut-workspace\peanut-pod-lite-wt-smoke-ab
分支：bot/pod-lite-smoke-ab-20260911
验收工程：D:\workspaces\peanut-agents\test-demos\cocos-for-agent

## 根因

Lite 宿主经 CPM `activateCore` 把 83 个工具注册进**进程内** `toolHandlers`（`createRegistry()`），
host-status / invokeTool / startup smoke 都走这条私有表，所以 gatewayWired=true、toolCount=83。

但 Hub（CocosMcpHub :52935）只读 Plugin Manager 的 `McpCapabilityRegistry`。
参考旧岛（editor-mcp）在 `activate` 时调用 `context.mcp.register(...)` 写入该 registry；
Lite 刻意不走 `activateInstalledPackages`（避免与 Lite catalog 冲突），又未把 CPM 工具桥进 registry，
导致 Hub `capabilities=[]` / catalog tools=0，尽管 `writeEnabledPluginIds` 已含 `peanut.editor-mcp`。

链路缺口：`host toolHandlers` →（缺失）→ `McpCapabilityRegistry` → Hub status/catalog/call。

## 修复

文件：
- `packages/cocos-creator-lite-host-extension/src/plugin-manager-shell.js`
  - 导出 `getPluginManagerKernel()`
- `packages/cocos-creator-lite-host-extension/src/main.js`
  - `publishToolsToHubRegistry()`：将 toolHandlers 以 pluginId=`peanut.editor-mcp` 注册进 registry
    （工具名已是 `peanut.editor-mcp.*`，registry 要求 name 必须以 pluginId. 开头）
  - activateCore 后立刻 publish；deactivate 时 dispose
  - host-status / smoke-results 增加 `hubPublishedCount`

## 复验

host-status：
- ready=true
- toolCount=**83**
- hubPublishedCount=**83**
- gatewayWired=true（smoke-results）

Hub :52935：
- status capabilities=**83**
- catalog tools=**83** / revision=83
- writeEnabledPluginIds=["peanut.editor-mcp"]

冒烟（经 Hub 一级工具 call，非 query/call 通用入口）：
- INSTALLATION 只读 9 ops：**9 pass / 0 fail**
- 参考 A 批只读子集 12 ops：**12 pass / 0 fail**
  - `scene.resolvePrefabRootUuid` 需 `prefabRelativePath`（schema additionalProperties=false；误用 `path` 会 input_invalid）

## 与参考基线对比

| 面 | 数量 |
|---|---|
| 宿主 toolCount | 83 |
| Hub catalog | 83 |
| 参考旧岛 Hub（creator38-smoke-ab） | 76 |

catalog-diff-vs-ref76.json：
- overlap=69
- 仅参考有（7，多为 Pro/付费面）：content-delivery / preview-capture / snowb / sdf-font / ui-prefab 等
- 仅 Lite 有（14）：更多 asset 写面 + asset-wait-ready + lumen-bind-controller + reference-* 等

## 剩余差距

- Pro 专属工具面（preview.capture / snowb / sdf / ui-prefab / content-delivery）在 Lite 无 Pro 包时仍不可用（符合 Lite 策略）
- 未跑完整 A→B 写路径冒烟（本轮聚焦 Hub 暴露 + 只读复验）；写工具已在 Hub catalog 暴露（writeEnabled=all）

## 证据

本目录：host-status / smoke-results / hub-live-status / hub-capabilities / hub-readonly-smoke / catalog-diff-vs-ref76 / host-install / creator-open-plan / creator-soft-close / path-choice