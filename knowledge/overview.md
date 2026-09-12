# peanut-pod-lite

Cocos Creator 编辑器产品。政策目录 84 操作（39 读、45 需本地审批的写）。可登录并升级订阅，但不执行付费能力。

## 包

| 包 | 拥有 |
| --- | --- |
| `pod-lite-capability-policy` | 目录、schema、校验、审批租约、`EditorMcpGatewayAdapter` |
| `mcp-pod-lite-creator-host` | Lite 插件模块；打包 `peanut.pod-lite`（无需 `PEANUT_COCOS_EDITOR_ROOT`） |
| `cocos-creator-lite-host-extension` | Creator 3.8 扩展、CPM、账号/升级、可选 Pro |

Creator 3.8 的 AssetDB 对尚未进入 Assets 树的新目录或带 sidecar 的新 Prefab/Scene 发送
`refresh-asset`/`create-asset` 会产生 `original asset is not exist` 竞态日志。Lumen 提交路径对此类资产
只等待 Creator 文件监视器登记；无 sidecar 的文本资产仅在父目录已经登记后使用 `create-asset`。

`lumen.validateRefs` 除缺失 UUID 外，还校验序列化 `__id__` 范围、节点/组件双向归属、脚本
`@property` 引用类型、SpriteFrame 资源类型与 ClickEvent 目标脚本。`builder.build` 首次构建优先读取
Creator 默认配置，并为 Web 构建补齐 `outputName`、`taskName`、`mainBundleCompressionType` 与发布态
`debug=false`，避免空任务队列导致构建参数告警。

Creator 3.8.7 的组件 schema 由 99 项持久化矩阵逐项覆盖：每项都生成 Prefab、挂载组件、保存、
重新打开并执行引用校验；`cc.Sprite` 额外绑定真实 SpriteFrame。Lumen 也支持带 `.prefab` 后缀的
绝对模板路径，可将已有业务 Prefab 嵌入独立验收场景进行真实预览交互验证。

| `creator-24-host` / `creator-35-host` | 2.4 / 3.0–3.5 可打包宿主（未 Creator 实机验证） |
| `editor-mcp` / `asset-catalog` / `runtime` / `lumen` / `lumen-24` / `plugin-core` | 编辑器岛源实现 |

Creator host 注入 `grantedRuntime` 后自动接 EditorMcp gateway，注册全部 84 项（排除付费）；无 grant 时回退 9 项只读。目录覆盖 ≠ 全量带参 host-verified。

## 硬规则

- 写操作必须消耗绑定连接/操作/资源/风险的租约。非空 approval ID 不够。
- Lite 永不 import Pro。Pro 缺失不得挡住 Lite 启动。
- 升级走 Pod Server 快照与 checkout；权益不得由 Creator 客户端写入。
- 产品分发是目录包 / CPM，不是 `npm publish`。
- 禁止强杀 Creator；禁止 GUI 与 headless 对同一工程并发。
- Node 单测不是 Creator 冒烟。契约：`../peanut-hub/contracts/pod-product.md`。

## 验证

各包 `npm run build` / `typecheck` / `test`。宿主打包使用本包 esbuild。
