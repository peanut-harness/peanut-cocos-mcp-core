# peanut-pod-lite

Cocos Creator 编辑器产品。政策目录 83 操作（36 读、47 需本地审批的写）。可登录并升级订阅，但不执行付费能力。

## 包

| 包 | 拥有 |
| --- | --- |
| `pod-lite-capability-policy` | 目录、schema、校验、审批租约、`EditorMcpGatewayAdapter` |
| `mcp-pod-lite-creator-host` | Lite 插件模块；打包 `peanut.pod-lite`（无需 `PEANUT_COCOS_EDITOR_ROOT`） |
| `cocos-creator-lite-host-extension` | Creator 3.8 扩展、CPM、账号/升级、可选 Pro |
| `creator-24-host` / `creator-35-host` | 2.4 / 3.0–3.5 可打包宿主（未 Creator 实机验证） |
| `editor-mcp` / `asset-catalog` / `runtime` / `lumen` / `lumen-24` / `plugin-core` | 编辑器岛源实现 |

Creator host 注入 `grantedRuntime` 后自动接 EditorMcp gateway，注册全部 83 项（排除付费）；无 grant 时回退 9 项只读。目录覆盖 ≠ 全量带参 host-verified。

## 硬规则

- 写操作必须消耗绑定连接/操作/资源/风险的租约。非空 approval ID 不够。
- Lite 永不 import Pro。Pro 缺失不得挡住 Lite 启动。
- 升级走 Pod Server 快照与 checkout；权益不得由 Creator 客户端写入。
- 产品分发是目录包 / CPM，不是 `npm publish`。
- 禁止强杀 Creator；禁止 GUI 与 headless 对同一工程并发。
- Node 单测不是 Creator 冒烟。契约：`../peanut-hub/contracts/pod-product.md`。

## 验证

各包 `npm run build` / `typecheck` / `test`。宿主打包使用本包 esbuild。
