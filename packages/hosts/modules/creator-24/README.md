# peanut-pod-24

Creator **2.4.x** 宿主（`creator2x`：PluginManager + MCP Hub + peanut-plugins）。

## 边界

- 装入工程 **`packages/peanut-pod-24/`**（不是 3.x 的 `extensions/`）
- 写盘经 `@peanut/pod-engine/lumen-24` + `Editor.assetdb`（Prefab 层次 CRUD）；**不走** 3.x silent-asset / Message AssetDB
- Hub 写能力需 `writeEnabledPluginIds` 含 `peanut.editor-mcp`（`setPluginExposure` mode=`all`）
- 重启编辑器时只杀 **2.4.11** 路径，勿裸 `pkill CocosCreator`（会误杀 3.x）

## 打包

```bash
cd products/cocos/editor
npm install
npm run --workspace peanut-pod-24 pack
```

产物：`examples/cocos-panel-host-extension-24/release/peanut-pod-24-0.2.0/`。

## 安装

```bash
# 权威：选型 + 装本线宿主/插件
npm run pack:demo -- --project /abs/Creator2.4工程 --with-host-extension
# 选型 dry-run（不写盘）
npm run resolve:product-line -- --project /abs/Creator2.4工程
```
