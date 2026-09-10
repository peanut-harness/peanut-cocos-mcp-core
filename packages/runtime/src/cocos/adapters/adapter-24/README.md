# adapter-24

面向 **Cocos Creator 2.4.x** 的 Editor 适配器产品线。

- Phase：`creator_2x`
- 实现：`EditorApi24Adapter`（`supportLevel: minimal`）
- 决策：[`compatibility.matrix.json`](../../../../../../compatibility.matrix.json) `productLines.creator2x`
- **禁止**从 `adapter-38` 复制后改 `supports()` 冒充可用

## 能力边界

| 能力 | 状态 |
|------|------|
| Runtime 注册 / phase 解析 | 已接线 |
| Message / Project 探测（Ipc / Message / Project） | live 或 memory |
| Prefab / Scene 写盘 | **lumen-24 切片**（经 `ProductLineMcpPolicy` allowlist + `Lumen24McpBridge`） |
| AssetDB 写（import / folder / refresh） | allowlist 内可用 |
| `scene.save` / `builder.build` / `snowb.*` | **拒绝** |
| silent-asset / ui-prefab | 随全栈插件；须 2.4 实机重测 |

宿主包：`examples/cocos-panel-host-extension-24`（`peanut-pod-24`，装入工程 `packages/`）。

权威写盘进度：[`tools/lumen-24/LANDING.md`](../../../../tools/lumen-24/LANDING.md)。


