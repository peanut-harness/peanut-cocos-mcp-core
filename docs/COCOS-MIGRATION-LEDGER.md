# Cocos 编辑器能力迁移账本

源清单固定为 `peanut-agents/products/cocos/editor/plugins`。Core 的范围不是只读子集：凡不属于明确商业化清单的 Cocos Creator 编辑器能力，均由 Core 提供，并且可以在 Pro 未安装时独立运行。

## Core

| 源模块 | 迁入范围 | 当前状态 |
| --- | --- | --- |
| `integrations/editor-mcp` | editor、asset、scene、prefab、preview（不含 capture）、builder、Lumen、reference 的 83 个 operation | capability/schema/风险目录已覆盖；执行分发器已接输入验证与审批租约消费；Creator host 在注入 `EditorMcpGatewayAdapter` 时注册全部 83 项（排除 preview.capture 与 snowb）；无网关时回退 9 项读取。 **Creator 3.8.7 实机冒烟/毕业（host-verified）证据**：`evidence/creator38-lite-graduation-20260912/`（83/83；读最小必填 + 写无租约拒批/有租约执行；quiet-gate；builder web-desktop+）。边界：路径打通 ≠ 业务语义全绿 |
| `tools/lumen` | 模板缓存、导入/重置、AssetDB refresh、host 生命周期 | `packages/lumen` + `lumen-24` 已迁入并可构建；模板随 Lite 目录包打包；缓存识别仍在 lumen-template-cache |
| `ui/panel` | 通用宿主壳与生命周期 | `packages/plugin-panel` 已迁入；`creator-24-host` / `creator-35-host` / 3.8 host 可打包（24/35 未 Creator 实机验证） |

Core 写入一律由本地审批租约控制；不得被在线许可证、订阅或 Pro 缺失阻断。

## Pro（唯一例外）

| 源模块 | 付费能力 |
| --- | --- |
| `tools/snowb-bmf` | SnowB / BMFont |
| `providers/ui-prefab` | Figma/PSD → UI Prefab |
| `providers/sdf` | SDF/MSDF Font |
| `integrations/asset-version-mover` | Asset Version Mover |
| `integrations/editor-mcp` | `preview.capture` 截图 |
| `providers/content-delivery` | Content Delivery |

Pro 仅对这张表的能力签发在线计划并校验权益/撤销；不得接管其它 Cocos 编辑器操作。

## 安装顺序

安装 `Core Creator host` → 启动并通过 Core 冒烟测试 → 安装 `Core capability` 包 → 验证本地审批写入。Pro 始终可选，且必须最后安装。

## 2026-09-10 一次性迁入（验收 A）

- Lite：`asset-catalog` / `runtime` / `packaging` / `plugin-core` / `editor-mcp` / `lumen` / `lumen-24` / `plugin-panel` 源码进仓；MCP 打包去掉 `PEANUT_COCOS_EDITOR_ROOT`。
- Lite 网关：有 `gateway`/`router`/`executeOperation` 时注册 83 项；写入走审批租约。Node 单测绿。
- Pro：`snowb-bmfont` / `sdf-font` / `ui-prefab` / `preview-capture` / AVM overlay / content-delivery-plugin 进仓；`activate` 注册 admit + 全部付费执行服务；缺原生 fail-closed。Figma/PSD 仍在 integrations。
- 宿主：3.8 / 3.5 / 2.4 均可打包；仅 3.8 有既有安装记录，24/35 未 host-verified。
- 旧 `products/cocos/editor` **未**退役。

## 2026-09-10 company-tests Creator 3.8.7 冒烟

工程：`/Users/alex/Downloads/company-tests`。启动自检写入 `peanut-plugins/runtime/{host-status,smoke-results}.json`。打开纪律见 Hub `knowledge/cocos-creator-open.md`。

- Host `ready: true`；`peanut.pod-lite@0.1.0` + `peanut.cocos-mcp-pro@0.1.1` 完整性通过。
- **Gateway 已接入**：`grantedRuntime` + `services` → `createEditorMcpExecuteOperation`；`toolCount=83`，`gatewayWired=true`；不含 preview.capture / snowb。
- 空参只读冒烟：约 20 项无参可读通过（version/project/scene/builder/catalog.summary 等）；其余缺必填字段的只读为预期 skip/schema refuse，不是网关未接线。
- Pro `state=active`，9 个付费服务均已注册；非 editor-mcp 调用方拒绝；无本地审批时 `preview.capture` fail-closed。
- 写入仍需本地审批租约；不得把空参写入失败记成回归。
- 2026-09-12 已对全部 83 项做 Creator 3.8.7 带参 host-verified 毕业全表（`evidence/creator38-lite-graduation-20260912/`）；仍勿夸大为「业务语义全绿 / GUI 人工验收完成」。

## 2026-09-09 验证记录

- 83 项目录及 schema 覆盖验证通过；新宿主已注册 9 项读取：版本、工程、选区、当前场景、场景层级、三项 Builder 查询和预览查询。
- Lite 注册链路改为“工具定义目录 + 适配器支持列表”驱动；新增 Creator Message 只读端口与旧实现一致的版本兼容候选，后续增量实现只需补适配器即可自动暴露对应工具。
- 增加真实审批租约消费、输入验证、Windows 完整性路径检查及 register 生命周期兼容。
- Lite 目录包和 Creator 扩展在 Windows 打包成功，制品入口及生命周期回归测试通过。
- 新增 6 项只读 Message 适配器单测通过；缺少 Message 端口时 fail-closed，候选消息失败不会产生写入副作用。
- 已安装到用户指定的 `D:/workspaces/peanut-agents/test-demos/cocos-for-agent`，并通过该工程 MCP 的 query-project 确认实际路径。
- 首次 Creator 3.8.7 加载暴露 `plugin_module_export_missing`，已补 register 并替换测试制品；后续软关重启与 2026-09-12 毕业全表已覆盖复验（见 graduation 证据）。
- 本轮打包时检测到多个 Creator 3.8.7 进程仍在运行，按宿主规范未覆盖测试工程中的活动扩展；9 项新制品已生成，待关闭或重启目标工程后安装复验。
- 工程当前还存在 `app-qa-wasm-backend.ts` 无法导入 `./app-qa-observe-buffer` 的 QA 资产错误；该资产不属于本轮 Pod 源码变更。
- 旧测试包保存在工程 `temp/pod-migration-backup/lite-before-register-fix`；现有其它插件和资产未被替换。

## 2026-09-10 Lite 基础能力复核

- Lite 目录完整性通过：36 项只读、47 项本地审批写入，合计 83 项；36 项只读 schema 与 47 项写入 schema 全覆盖。
- `company-tests`（Creator 3.8.7）已移除旧 `peanut.cocos-mcp-core` 系统并安装 `peanut-pod-lite-host` 与 `peanut.pod-lite@0.1.0`；旧文件备份在外部临时目录。
- 修复 Creator host 注册回调把工具名误传给 dispatcher 的问题；现在改为传入稳定 operation，9 项已迁入读取均可实际调用。
- 9 项读取 mock Creator 回归通过：版本、工程、选区、当前场景、场景层级、3 项 Builder 查询和预览查询均命中兼容 Message 路由。
- 当时 Lite 运行覆盖仍为 9/83；47 项写入与其余 27 项只读虽有目录/schema，但没有 Creator 执行适配器，dispatcher 按 fail-closed 拒绝，不能记录为“基础能力完备”。

## 2026-09-10 83 项网关接线

- Lite host 增加 `EditorMcpGatewayAdapter`：注入 `(operation, input) => Promise<unknown>` 后注册全部 83 个 Lite 公开 operation；始终过滤 `preview.capture` 与 snowb。
- 无网关时保持原 9 项 `CoreCocosCreatorReadAdapter` 读取，兼容既有 mock runtime 测试。
- 写入注册时把 `connectionId` + 解析后的 `resources` 交给 dispatcher，继续消费本地审批租约。
- 目录包打包改为本包 esbuild JS API，不再读取 `PEANUT_COCOS_EDITOR_ROOT`。
- Creator 3.8.7 实机冒烟/毕业（host-verified）证据已落盘：`evidence/creator38-lite-graduation-20260912/`（83/83；路径打通 ≠ 业务语义全绿）。

## 2026-09-12 Lite↔editor 免费面对齐

- 盘点：缺实现类 P0 = 0；补写 schema `resources` 字段（policy + editor-mcp tool catalog）。
- 单测：`@peanut/pod-lite-capability-policy` 13/13。
- 真机：pack 安装 worktree host/core → 软关 Creator → 重启；device-verify-resources 7/7。
- P1（2026-09-12 01:07:25 UTC+8）：`sessionBound` 已对齐；prefab/builder/import/preview 真机矩阵见 `evidence/lite-editor-parity-20260912-p1/`（42/42）；剩余 P2：open/importPlan/managedStatus 无 control（旧岛同构）、文档措辞；Pro 面维持禁入。
- 证据目录：`evidence/lite-editor-parity-20260912/`。
