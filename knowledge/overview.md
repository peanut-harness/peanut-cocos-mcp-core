# peanut-pod-lite

Cocos Creator 编辑器产品。政策目录 83 操作（36 读、47 需本地审批的写）。可登录并升级订阅，但不执行付费能力。

## 包

| 包 | 拥有 |
| --- | --- |
| `packages/pod-lite-capability-policy` | 目录、schema、校验、审批租约 |
| `packages/mcp-pod-lite-creator-host` | Lite 插件模块；打包 `peanut.pod-lite` |
| `packages/cocos-creator-lite-host-extension` | Creator 3.8 扩展、CPM、账号/升级、可选 Pro |
| `packages/lumen-template-cache` | 免费缓存包识别 |

宿主当前只注册 9 个原生读。其余 74 个仍需真实适配器。目录覆盖 ≠ 原生执行。

## 硬规则

- 写操作必须消耗绑定连接/操作/资源/风险的租约。非空 approval ID 不够。
- Lite 永不 import Pro。Pro 缺失不得挡住 Lite 启动。
- 升级走 Pod Server 快照与 checkout；权益不得由 Creator 客户端写入。
- 产品分发是目录包 / CPM，不是 `npm publish`。
- 禁止强杀 Creator；禁止 GUI 与 headless 对同一工程并发。
- Node 单测不是 Creator 冒烟。契约：`../peanut-hub/contracts/pod-product.md`。

## 验证

各包 `npm run build` / `typecheck` / `test`。宿主打包使用本包 esbuild。
