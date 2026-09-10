# peanut-plugin-sdk

业务插件作者面契约。只依赖 `peanut-contracts` / `peanut-runtime` / `peanut-packaging` / `peanut-asset-catalog` 类型，不包含宿主实现。

新业务插件应继承 `PluginModuleBase`，并从 sdk 消费宿主授权上下文：

```ts
import { PluginModuleBase } from 'peanut-plugin-sdk';
import type { IPluginActivateContext, IPluginRegisterContext } from 'peanut-plugin-sdk';
```

不要依赖 `peanut-plugin-core`（测试集成除外）。

## AssetDB 就绪

导入/刷新后等待 Creator AssetDB，统一用：

- MCP：`peanut.editor-mcp.asset-wait-ready`
- 代码：`@peanut/cocos-lumen` 的 `LumenAssetDbReadyWaiter`（传入 `runtime.message`）

禁止兄弟插件自行 `sleep(500)` 轮询。

`npm test` 覆盖 `PluginModuleBase` 默认生命周期与清单字段契约（`tests/plugin-module-base.test.ts`）。

插件互调已注册 MCP 工具（不经 Hub plan）见 [`peanut-plugin-editor-mcp` README](../../plugins/integrations/editor-mcp/README.md) 与 [`LUMEN-ROADMAP.md`](../../plugins/integrations/editor-mcp/docs/LUMEN-ROADMAP.md)。
