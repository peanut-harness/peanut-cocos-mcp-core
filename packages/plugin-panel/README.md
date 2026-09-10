# peanut-plugin-panel

`peanut-plugin-panel` 是插件系统的编辑器壳层包，只承载 Cocos 编辑器激活器、宿主 bridge 安装模板和示例扩展壳。

## 当前定位

- 这是编辑器壳层包，不承载 plugin-manager 业务本体
- 业务逻辑、builtin panel module、UI、contracts 与 i18n 统一由 `peanut-plugin-core` 管理
- 本包只保留：
  - `PluginPanelActivator`
  - 宿主 bridge 安装模板
  - Cocos 扩展示例壳
  - 必要的 panel 静态壳资源镜像

## 推荐导入

```typescript
import { PluginPanelActivator } from 'peanut-plugin-panel';
```

## 当前包含

- Cocos 编辑器壳层激活器
- 宿主桥安装模板
- Cocos 扩展示例模板

## 镜像资源

- `panels/plugin-manager/*` 在本包中仅作为壳层镜像保留
- 真正的源码源头在 [`peanut-plugin-core/panels/plugin-manager`](../../../core/plugin-core/panels/plugin-manager)
