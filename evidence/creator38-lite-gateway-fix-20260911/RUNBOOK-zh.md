# Creator 3.8 Lite Gateway Fix — RUNBOOK

时间：2026-09-11（UTC+8）
Worktree：D:\peanut-workspace\peanut-pod-lite-wt-smoke-ab
分支：bot/pod-lite-smoke-ab-20260911

## 根因

`NodePluginPackageModuleResolver.toImportSpecifier` 在检测到 `process.versions.electron` 时返回裸文件系统路径。
Creator 3.8.7 使用默认 ESM loader：Windows 上 `D:\...` 被解析成错误协议 `d:`，导致：

`[plugin:peanut.pod-lite] Plugin module_load failed` / `Received protocol 'd:'`

插件未加载 → gateway 未注入 → toolCount=9 且只读 ops 全部 `operation_not_public`。

## 修复

文件：
- `packages/plugin-core/src/loader/node-plugin-package-module-resolver.ts`
- `packages/plugin-core/tests/node-plugin-package-module-resolver.test.ts`

行为：一律用 Node `pathToFileURL` 把文件系统路径转成 `file://`；已是 `file:` 则幂等返回。
`electronVersion` 参数保留兼容，不再用于返回裸路径。单测覆盖 win32 `D:\...`、posix `/...`、已有 `file://`。

## 构建 / 安装

- `npm run build` @ plugin-core
- `npm run pack` @ cocos-creator-lite-host-extension → worktree host release
- `npm run pack` @ mcp-pod-lite-creator-host → worktree Core release
- 软关 Creator（Stop-Process，无 /F）
- Host 拷贝到 `extensions/peanut-pod-lite-host`
- Core 经 PackagingApp.install；CpmPackageStore 校验 ok（未伪造索引）
- 重新 spawn Creator `--project ... --nologin`

## 验收结果

host-status.json：
- ready=true
- toolCount=**83**
- pro=absent（未装 Pro）

smoke-results.json（宿主 startup smoke）：
- gatewayWired=**true**
- passed=**20** / failed=**0** / skipped=16
- knownGaps=[]
- 无 `core_cocos_mcp_execution_operation_not_public`
- 无 `module_load failed` / `Received protocol 'd:'`

## 剩余缺口

Hub `:52935` 仍 `capabilities=[]` / list tools=0（与宿主 gateway 已接通相对独立）。
宿主侧 83 tools + gatewayWired 已达标；若需 Hub 对外暴露同批 tools，需另查 Hub catalog 注册路径。

## 证据

本目录：host-status / smoke-results / cpm-install-result / cpm-verify / project-log-* / hub-live-status / path-choice / creator-soft-close
