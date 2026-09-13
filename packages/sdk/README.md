# @peanut/pod-sdk

业务插件作者面契约。只依赖 `@peanut/pod-protocol` / `@peanut/pod-engine/runtime` / `@peanut/pod-engine/installation` / `@peanut/pod-engine/assets` 类型，不包含宿主实现。

新业务插件应继承 `PluginModuleBase`，并从 sdk 消费宿主授权上下文：

```ts
import { PluginModuleBase } from '@peanut/pod-sdk';
import type { IPluginActivateContext, IPluginRegisterContext } from '@peanut/pod-sdk';
```

不要依赖 `@peanut/pod-engine/kernel`（测试集成除外）。

## AssetDB 就绪

导入/刷新后等待 Creator AssetDB，统一用：

- MCP：`peanut.editor-mcp.asset-wait-ready`
- 代码：`@peanut/pod-engine/lumen` 的 `LumenAssetDbReadyWaiter`（传入 `runtime.message`）

禁止兄弟插件自行 `sleep(500)` 轮询。

`npm test` 覆盖 `PluginModuleBase` 默认生命周期与清单字段契约（`tests/plugin-module-base.test.ts`）。

插件互调已注册 MCP 工具（不经 Hub plan）见 [`@peanut/pod-engine/mcp` README](../engine/modules/mcp/README.md) 与 [`LUMEN-ROADMAP.md`](../engine/modules/mcp/docs/LUMEN-ROADMAP.md)。
