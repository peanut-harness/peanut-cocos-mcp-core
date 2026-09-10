# adapter-35

面向 **Cocos Creator 3.0.x–3.5.x** 的 Editor API 适配器产品线。

- Phase：`creator_3x_early`
- 实现：`EditorApi35Adapter`（`supportLevel: compatible`）
- 与 `adapter-38` 同属 3.x 消息族，但 AssetDB / Panel 语义有漂移；silent-asset / lumen 须在 **Creator 3.0–3.5** 实机重测（`npm run probe:early3x-write-slice -- --project <abs>`）
- 写盘切片未绿前：`ProductLineMcpPolicy` 对 early3x 保持写 refuse；`productLines.early3x.verified` 保持 `null`
- 决策：[`compatibility.matrix.json`](../../../../../../compatibility.matrix.json) `productLines.early3x`

宿主包：`examples/cocos-panel-host-extension-35`（`peanut-pod-35`，装入工程 `extensions/`）。


