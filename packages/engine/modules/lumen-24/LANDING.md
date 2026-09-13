# Creator 2.4 lumen 全量落地波次（接口不变）

权威契约：现有 `lumen.*` MCP operation id（**禁止** `lumen24.*`）。
消化面：`@peanut/pod-engine/lumen-24`（`Lumen24McpBridge` / `EditorMcpLumen24Bridge`）+ editor-mcp 再导出。
3.x：`@peanut/pod-engine/lumen` / `peanut.lumen` 零侵入。

产品线对照（防漏面）：[`../mcp/docs/LUMEN-PRODUCT-LINE-PARITY.json`](../mcp/docs/LUMEN-PRODUCT-LINE-PARITY.json)。

## 模式

**interface-first + internal digestion + peel-ready facade**

-   Agent / playbook 只认共享 `lumen.*` + `ProductLineMcpPolicy`
-   2.x Prefab/Scene/meta/AssetDB 差异全在 lumen-24 内
-   **已 peel**：Bridge 住在 `@peanut/pod-engine/lumen-24`；优先名 `Lumen24McpBridge`（兼容导出 `EditorMcpLumen24Bridge`）
-   新 `lumen.*`：先改 contracts + parity JSON + policy，再双消化器；checklist 见 CONTRIBUTING「三件套」
-   未来 Creator 插件壳 `peanut.lumen-24`（若需要）再装目录包，不必再搬 Bridge 文件

## Catalog

-   **主路径 reuse** `@peanut/pod-engine/assets` 扫 `assets/**/*.meta`（2.4 meta 含 `uuid`+`importer`，可用）
-   **同步修复**：`folder` importer → `directory` 分桶（2.4 目录 meta）
-   **写索引**：creator2x allow `asset.catalog.refresh`（与 `lumen.commit` 侧车重建并存）
-   **辅**：必要时再加 adapter-24 AssetDB 补齐，不另起第二套 catalog 格式

## 波次

| Wave                                | 内容                                                                                                                  | Policy 扩面条件       |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------- |
| **A（已完成 · 真机 2.4.11 12/12）** | Prefab 层次闭环：reorder、validateRefs-24、schema/templates/cocosInfo 诚实分流、catalog.refresh、folder→directory     | editor-mcp **0.1.85** |
| **B1（已完成 · 真机 0.1.86）**      | `compAdd/Rm/Set` builtins（Sprite/Label/Button）+ `bindSprite`；拒 UITransform                                        | verified              |
| **B2（已完成 · 真机 0.1.87）**      | `bindClick`（`_componentId`）+ script `compAdd` + 逻辑模板 empty/sprite/label/button                                  | verified              |
| **B3（已完成 · 真机 0.1.91 8/8）**  | `bindRef` / `structure` / `compileRecipe`（内存）；`bindRef` 写 `_N$target` 对齐 2.4 Inspector | verified              |
| **真机全量探针**                    | `probe-lumen24-full-live.mjs`：R/C/L/A/T/B*/C1（含 Wave C 移植面） | editor-mcp **0.1.94** |
| **C1（已完成 · 真机 2.4.11）**       | `.fire` Scene：scaffold + tree/inspect/node* / comp*；`scene.open` 经 `_Scene.loadSceneByUuid` | editor-mcp **0.1.94** |
| **C（已完成）**                     | `assetSet`(2.4 docs 全种类) + `bindSpriteBatch` / `bindController` / `preview.refresh`；3.x-only 仍拒绝 | editor-mcp **0.1.95** |
| **E（已完成）**                     | UI builtin 扩白名单（Widget/Layout/… + Graphics/LabelOutline/BlockInputEvents） | editor-mcp **0.1.110** |
| **default_prefab_24（整树）**        | 从 Creator 2.4.11 安装包 `static/default-assets/prefab` 抽取；scaffold/nodeAdd/structure 克隆整树 | editor-mcp **0.1.110** |
| **F（已完成）**                     | `asset.import` / `asset.ensureSpriteFramesBatch` 2.4 AssetDB 路径；preview/builder 禁盲探 IPC | editor-mcp **0.1.95** |
| **IPC 修复**                        | adapter-24 正确回调 `sendToMain`；2.4 跳过 builder/preview/console 盲探（消除 `no response received`） | editor-mcp **0.1.95** |
| **深测 media kinds**                | full-live：audio/video/ttf/tmx/spine import+inspect；model.fbx 过大易拖垮 2.4 Hub，探针 skip（detectKind 单测覆盖） | editor-mcp **0.1.110** |
## Wave C 备注

-   Creator 2.4 场景文件是 **`.fire`**（见 Creator 安装包 `static/template/new-scene.fire`），不是 3.x `.scene`；codec 必须独立，禁止复用 3.x Scene scaffold。
-   `assetSet` / `bindController` 依赖 3.x standalone / controller 语义，2.4 需另开最小白名单。
-   Prefab 写面（A+B）已齐；C1 真机：`mcp-test-2-4-x`、`--nologin`、artifact `lumen24-c1-live.json`（SceneAsset/Scene、无 PrefabInfo、Canvas 下 nodeAdd、Scene 根 compAdd 拒绝、Panel 挂 Sprite + **真实 PNG** `C1Probe.png` 经 `lumen.refresh` 入 AssetDB 后 `bindSprite`）。

## 永不共享

Prefab/Scene codec、组件 schema、3.8 模板、Message AssetDB、silent-asset 手写 meta。
