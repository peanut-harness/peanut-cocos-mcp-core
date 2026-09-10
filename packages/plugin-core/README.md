# peanut-plugin-core

`peanut-plugin-core` 是插件系统的业务主包，承载插件治理、host shell、hot reload、builtin plugin-manager panel 逻辑和静态面板内容。

## 当前定位

- 这是主逻辑包，不是编辑器壳
- builtin plugin-manager panel 的模块、UI、contracts、i18n 和静态 `panels/plugin-manager/*` 都以本包为源码源头
- `peanut-plugin-panel` 只负责承接 Cocos 编辑器激活器与宿主 bridge

## 推荐导入

```typescript
import { PluginManagerApp, PluginManagerHostShell } from 'peanut-plugin-core';
```

## 当前包含

- 插件治理与 runtime/panel bridge 主链路
- builtin plugin-manager panel module
- plugin-manager panel browser UI / contracts / i18n
- `panels/plugin-manager/*` 静态内容源码
