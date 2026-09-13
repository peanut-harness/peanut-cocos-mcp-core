# @peanut/pod-engine/lumen-24

Creator **2.4.x** Prefab / `.fire` Scene 写盘库。模板从本机 Creator 安装包抽取（`bundle:templates`）；见 [`LANDING.md`](./LANDING.md)、[`compatibility.matrix.json`](../../compatibility.matrix.json) `productLines.creator2x`。

```bash
# 默认读 /Applications/Cocos/Creator/2.4.11/CocosCreator.app/Contents/Resources/...
npm run --workspace @peanut/pod-engine/lumen-24 bundle:templates

# 自定义 Resources 根
COCOS_CREATOR_24_RESOURCES=/path/to/CocosCreator.app/Contents/Resources npm run --workspace @peanut/pod-engine/lumen-24 bundle:templates
```

**不**修改、不 import `@peanut/pod-engine/lumen` / `peanut.lumen`。

## 对外入口

-   `Lumen24WriteFacade` — scaffold / tree / inspect / node* / comp* / bind\* / structure / compileRecipe / validateRefs / schema·templates / assetSet / refresh / import / ensureSpriteFrames
-   `Lumen24WriteGate.status()` — `writes: prefab_scene_standalone_preview_slice`
-   MCP：共享 `lumen.*`（经 `Lumen24McpBridge`）；**禁止** `lumen24.*` 动词；产品线对照见 [LUMEN-PRODUCT-LINE-PARITY.json](../../plugins/integrations/editor-mcp/docs/LUMEN-PRODUCT-LINE-PARITY.json)

## 已落地（真机 mcp-test-2-4-x）

-   Prefab 层次 CRUD + `default_prefab_24` 官方整树（含 `3d-particle` / `3d-stage`）
-   `.fire` Scene + `scene.open`（`_Scene.loadSceneByUuid`）
-   Builtin（含 Graphics / LabelOutline / BlockInputEvents）+ script + bind\*
-   `assetSet` / `inspect`：texture、json、text、js/ts、anim、mtl、effect、pmtl、pac、labelatlas、audio、video、ttf、bitmapFont、particle、atlas、spine、dragonBones、tmx、model、directory
-   `asset.import` / `ensureSpriteFramesBatch` / preview.refresh（AssetDB 路径）
-   全量探针：`test-demos/mcp-test-2-4-x/tools/probe-lumen24-full-live.mjs`

## 诚实拒绝（2.4 无对等磁盘格式）

见 `LUMEN24_STANDALONE_REFUSED_KINDS`：animationGraph(+variant/mask)、terrain、renderPipeline/flow/stage、renderTexture、cubeMap、mesh/skeleton、instantiation\*。  
另：`cc.UITransform` 不存在于 2.4（尺寸在 `cc.Node`）。

**注意：** material / effect / model **已支持** meta/正文路径；勿再按旧 README 写成「永不移植」。

## 产品线 MCP refuse（相对稳定 3.x）

`editor.setSelection`、`asset.open`、`scene.save/reload/focusNode/createNode`、`prefab.apply/revert/…`、`builder.build`、`snowb.bmfont.export` — 见 `ProductLineMcpPolicy`。

## 日后剥离

1. 新建 `peanut.lumen-24` 插件，依赖本包。
2. 把 `editor-mcp-lumen-24-bridge.ts` **整文件**迁入。
3. `tools/lumen` / `peanut.lumen` 保持零 diff。

```bash
npm run test
```
