# @peanut/pod-engine/kernel

`@peanut/pod-engine/kernel` 是插件系统的业务主包，承载插件治理、host shell、hot reload 和 builtin plugin-manager panel 逻辑。

## 当前定位

- 这是主逻辑包，不是编辑器壳
- builtin plugin-manager panel 的模块、contracts 与 i18n 由本包管理
- `@peanut/pod-panel` 是所有面板静态资产的唯一源码源头，并负责 Cocos 编辑器壳层

## 推荐导入

```typescript
import { PluginManagerApp, PluginManagerHostShell } from '@peanut/pod-engine/kernel';
```

## 当前包含

- 插件治理与 runtime/panel bridge 主链路
- builtin plugin-manager panel module
- plugin-manager panel browser UI / contracts / i18n
- 面板业务控制器与宿主桥接
