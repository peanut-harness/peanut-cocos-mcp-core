# @peanut/pod-panel

`@peanut/pod-panel` 是插件系统的编辑器壳层与静态面板资产包。

## 当前定位

- 这是编辑器壳层包，不承载 plugin-manager 业务控制器
- 业务逻辑、builtin panel module、contracts 与 i18n 由 `@peanut/pod-engine/kernel` 管理
- `panels/*` 是面板 HTML、CSS 与浏览器脚本的唯一源码源头
- 本包只保留：
  - `PluginPanelActivator`
  - 宿主 bridge 安装模板
  - Cocos 扩展示例壳
  - panel 静态资产

## 推荐导入

```typescript
import { PluginPanelActivator } from '@peanut/pod-panel';
```

## 当前包含

- Cocos 编辑器壳层激活器
- 宿主桥安装模板
- Cocos 扩展示例模板

## 静态资产边界

- `panels/plugin-manager/*` 与 `panels/plugin-manager-settings/*` 只在本包维护
- Kernel 不再打包静态面板副本，避免双源漂移
