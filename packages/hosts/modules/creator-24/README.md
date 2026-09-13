# peanut-pod-24

Creator **2.4.x** 宿主（`creator2x`：PluginManager + MCP Hub + peanut-plugins）。

## 边界

- 装入工程 `packages/peanut-pod-24/`，不是 3.x 的 `extensions/`。
- 写盘经 `@peanut/pod-engine/lumen-24` 与 `Editor.assetdb`；不走 3.x silent-asset / Message AssetDB。
- 当前画像为 experimental，默认禁止写入。
- 重启编辑器时只能处理已核实属于当前工程的 2.4 进程，禁止裸 `pkill CocosCreator`。

## 打包

```bash
cd peanut-pod-lite
npm install
npm run pack --prefix packages/hosts/modules/creator-24
```

产物：`packages/hosts/modules/creator-24/release/peanut-pod-24-0.2.1/`。

## 安装

复制发布目录到目标工程 `packages/peanut-pod-24/`，然后完整重启 Creator 2.4。
