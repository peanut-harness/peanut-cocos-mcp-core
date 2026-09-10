# @peanut/cocos-lumen

Cocos 内容组装会话（品牌名 **lumen**）。**Creator 平台能力，非 Agent。** 可被人、编辑器流程或 Agent 经 `env.runner.exec` / adapter bridge 调用；本身不是 Capability，也不得迁入 `agents/plugins`。

**定位：** 编辑 Creator 资源管理器里能打开、检视器里能改的全部资产。写工程源文件与 `.meta` / `subMetas`；**不维护 `library/` / `temp/`**（Import 交给 Creator）。Prefab/Scene 节点、独立资产文档、图片等 Importer 设置都走本包（CLI + `LumenSession`），不再另起业务插件。

管线：落盘与搭节点 →（可选 Creator Import）→ catalog → 绑定 / 属性编辑 → save。  
模板库：[`products/cocos/default_prefab`](../../../default_prefab/)。索引：[`peanut-asset-catalog`](../../core/asset-catalog/)。

**模块形态：** CommonJS（`require`），源码不用 `node:` 前缀、相对路径不加 `.js`，兼容 Creator 旧 Electron。

## 冻结契约（CRUD 收口）

当前对外稳定面如下。产品目标是 **全资产可编辑**：检视器能改的，Lumen 都能结构化读写。策展白名单是 Prefab 组件的加速层，不是资产种类上限。

| 层 | 位置 | 用途 |
|----|------|------|
| 会话 / CLI | 本包 `source/`、`dist/cli.js` | `scaffold` / `structure` / `comp-*` / `node-*`（含 rename/reorder） / `bind-*` / `catalog` / `save` |
| 配方契约 | `ILumenNodeRecipe`（`source/types.ts`） | 节点树 JSON：`template` / `components` / `props` / `nodeProps` / `children` |
| 属性白名单 | `bundled/schema/` + `LumenComponentPropertySchema` | 一类型一 JSON；加载器把 `kind` 编成 Prefab `_fields` |
| 模板库 | 构建生成 `bundled/default_prefab`（源：`products/cocos/default_prefab`，`npm run bundle:templates`） | 相对路径如 `ui/Label`；`--templates` / `templateCacheDir` 可覆盖 |
| 业务配方 | 各 Creator 项目内（demo：`test-demos/.../tools/recipes/`） | 搭什么树；**不**进 lumen 包、**不**进 Agent Profile pins |

**暂缓：** 多 `templateRoots`。

**当前已落地文档：** Prefab、Scene、Material、AnimationClip、PhysicsMaterial、Terrain（VERSION8 + `region` 窗口）、图片 `.meta`（Texture / SpriteFrame）、Effect `.effect` / chunk、模型 `.fbx` / `.gltf` / `.glb` `.meta`、Auto Atlas `.pac`、LabelAtlas `.labelatlas`、Animation Graph / Variant / Mask、RenderTexture `.rt`、Render Pipeline `.rpp`、Render Flow `.flow`、Render Stage `.stg`、音频 `.meta`、视频 `.meta`、TTF / BitmapFont `.meta`、Spine `.skel` / `.json` `.meta`、DragonBones `.dbbin` / 图集 `.json` `.meta`、CubeMap `.cubemap` `.meta`、TiledMap `.tmx` `.meta`、文件夹 Bundle `.meta`、粒子 / Sprite Atlas `.plist` `.meta`、JSON / 文本 `.meta`、Buffer `.bin` `.meta`、脚本 `.ts`（`source` 全文可写；`.meta` 只读）/ `.js` `.meta`、instantiation dump `.mesh` / `.skeleton` / `.animation` / `.material` `.meta`。**IV.B 检视器 meta 已走通。** 其余见 [LUMEN-ROADMAP.md](../../plugins/integrations/editor-mcp/docs/LUMEN-ROADMAP.md)。**方法：** 不手改 `library/` / `temp/`，不克隆笔刷/曲线/着色器图/状态机节点图/管线 dump 树 UI（同一数据用字段或窗口读写）。废弃组件（LabelOutline/Shadow）与抽象基类仍拒绝。路径共用 `prefabRelativePath`，MCP 可用别名 `assetRelativePath`。扩展名随文档增加，不另开 `lumen.scene-*` / `lumen.image-*`。

**场景脚手架契约：** 新建/reset `.scene` 时先挂 `default_prefab/Camera`→`Main Camera`、`light/Directional Light`→`Main Light`（对齐工程 `scene.scene`），再挂可选 `ui/Canvas`。禁止改 Canvas 模板相机去清色。

**meta `ver`：** 写入 `.meta` 时按工程 `creator.version` 查 `bundled/schema/meta-importers.json`（如 3.8.x 材质为 `1.0.21`），禁止套错 importer 版本。

与 ui-prefab 分工：ui-prefab 消费设计文档（UIF），经 MCP `lumen-compile-recipe` 编 Prefab；lumen CLI / `LumenSession` 做离线结构化 CRUD。二者都在 `products/cocos`，都不是 Agent Tool。

## 布局

```text
tools/lumen/
  bundled/            # 随包数据（default_prefab 由 bundle:templates 生成，不入库）
    schema/           # 策展 JSON：components/、types/、node.json、conventions.json、assets.json
    default_prefab/   # 脚手架模板（构建自 products/cocos/default_prefab）
    lumen-templates.manifest.json
  source/
    cli.ts index.ts plugin-runtime.ts session.ts types.ts
    hierarchy/        # Prefab / Scene 文档与节点工具
    schema/           # JSON 加载器、属性表、版本与引擎扫描
    templates/        # default_prefab 缓存与清单
    io/               # 原子写、json 资产、sidecar .meta、catalog / refresh
    standalone/       # 非层次资产：registry + sidecar + json-asset + 专用编解码
core/asset-catalog/   # peanut-asset-catalog
default_prefab/       # 脚手架模板源（相对路径如 ui/Label）
```

## 阶段

```text
stage / scaffold / structure   写资源与节点树（default_prefab 配方；图片沿用已有源文件）
refresh                        可选 AssetDB refresh（CLI 默认 no-op；编辑器内用 `LumenSessionFactory.createWithAssetDbRefresh` 或插件服务 `lumen.editor.refresh`）
catalog / resolve              产品索引
comp-set / node-set / asset-set / bind-*   属性与资源绑定
save                           写回 .prefab / .scene / .mtl / .anim / .pmtl / .terrain / .effect / .chunk 或图片 / 模型 / 音频 / 视频 / 字体 / CubeMap / TiledMap / 文件夹 / 粒子 / Sprite Atlas / JSON / 文本 / Buffer / 脚本 / instantiation dump / Render Flow / Render Stage meta
```

## 命令

```bash
npm run build
node dist/cli.js scaffold --project /path/to/CreatorProject \
  --prefab assets/ui/Demo.prefab --root Demo --template empty
node dist/cli.js structure --project ... --prefab ... --parent /Demo \
  --recipe /path/to/recipe.json
node dist/cli.js comp-set --project ... --prefab ... --node /Demo/Title \
  --type cc.Label --props ./title.json
node dist/cli.js catalog --project /path/to/CreatorProject
node dist/cli.js schema --project /path/to/CreatorProject --type cc.Label
node dist/cli.js templates --project /path/to/CreatorProject
node dist/cli.js tree --project /path/to/CreatorProject --prefab assets/ui/Demo.prefab
node dist/cli.js inspect --project /path/to/CreatorProject --prefab assets/fx/Lit.mtl
node dist/cli.js asset-set --project ... --prefab assets/anim/Idle.anim --props ./clip.json
node dist/cli.js inspect --project ... --prefab assets/ui/Icon.png
node dist/cli.js asset-set --project ... --prefab assets/ui/Icon.png --props ./image-meta.json
node dist/cli.js inspect --project ... --prefab assets/fx/Unlit.effect
node dist/cli.js asset-set --project ... --prefab assets/fx/Unlit.effect --props ./effect.json
node dist/cli.js inspect --project ... --prefab assets/Hero.fbx
node dist/cli.js asset-set --project ... --prefab assets/Hero.fbx --props ./model-meta.json
node dist/cli.js scaffold --project ... --prefab assets/ui/Icons.pac --root Icons
node dist/cli.js asset-set --project ... --prefab assets/ui/Icons.pac --props ./auto-atlas.json
node dist/cli.js scaffold --project ... --prefab assets/ui/Digits.labelatlas --root Digits
node dist/cli.js scaffold --project ... --prefab assets/anim/Hero.animgraph --root HeroGraph
node dist/cli.js scaffold --project ... --prefab assets/fx/Screen.rt --root Screen
node dist/cli.js scaffold --project ... --prefab assets/fx/Forward.rpp --root ForwardPipe --template forward
node dist/cli.js scaffold --project ... --prefab assets/fx/Main.flow --root MainFlow
node dist/cli.js scaffold --project ... --prefab assets/fx/Opaque.stg --root OpaqueStage
node dist/cli.js inspect --project ... --prefab assets/sfx/Click.wav
node dist/cli.js asset-set --project ... --prefab assets/sfx/Click.wav --props ./audio-meta.json
node dist/cli.js inspect --project ... --prefab assets/fonts/Score.fnt
node dist/cli.js asset-set --project ... --prefab assets/fonts/Score.fnt --props ./bitmap-font.json
node dist/cli.js inspect --project ... --prefab assets/spine/Hero.skel
node dist/cli.js asset-set --project ... --prefab assets/spine/Hero.skel --props ./spine-meta.json
node dist/cli.js inspect --project ... --prefab assets/dragon/Hero.dbbin
node dist/cli.js inspect --project ... --prefab assets/sky/Sky.cubemap
node dist/cli.js asset-set --project ... --prefab assets/sky/Sky.cubemap --props ./cubemap-meta.json
node dist/cli.js inspect --project ... --prefab assets/maps/Level.tmx
node dist/cli.js inspect --project ... --prefab assets/pack
node dist/cli.js asset-set --project ... --prefab assets/pack --props ./bundle-meta.json
node dist/cli.js inspect --project ... --prefab assets/fx/Smoke.plist
node dist/cli.js inspect --project ... --prefab assets/ui/Hero.plist
node dist/cli.js inspect --project ... --prefab assets/cfg/note.json
node dist/cli.js inspect --project ... --prefab assets/cfg/note.txt
node dist/cli.js inspect --project ... --prefab assets/data/Table.bin
node dist/cli.js inspect --project ... --prefab assets/scripts/Probe.ts
node dist/cli.js inspect --project ... --prefab assets/scripts/plugin.js
node dist/cli.js asset-set --project ... --prefab assets/scripts/plugin.js --props ./js-plugin.json
node dist/cli.js inspect --project ... --prefab assets/mesh/Cube.mesh
node dist/cli.js inspect --project ... --prefab assets/mesh/Skin.skeleton
node dist/cli.js inspect --project ... --prefab assets/anim/Walk.animation
node dist/cli.js inspect --project ... --prefab assets/fx/Body.material
node dist/cli.js cocos-info --project /path/to/CreatorProject --engine /path/to/engine-3.8.3
node dist/cli.js bind-click --project ... --prefab ... \
  --button /Demo/Btn --target /Demo --component DemoPanel --handler onClick
node dist/cli.js --help
```

### `default_prefab` 配方约定

| 字段 | 含义 |
|------|------|
| `template` | `default_prefab` 相对路径（无 `.prefab`） |
| `components` | 无模板空壳，如 `["cc.UITransform"]` |
| `props` | 组件公开属性（编辑器可检视） |
| `propComponent` | `props` 目标类型；可省略并由 template 推断 |
| `componentProps` | 按组件类型写入的公开属性（可覆盖 `props` 同名字段） |
| `nodeProps` | 节点 `position` / `active` / `name` 等 |
| `children` | 递归子树 |

属性白名单：`bundled/schema/`（一组件一份 JSON，内嵌模块在 `bundled/schema/types/`，挂载约定在 `conventions.json`）由 `LumenComponentPropertySchema` 加载；对照引擎 `@serializable`；按 **Creator 版本**门控字段。编码器仍在 TypeScript，`kind` 不会写进 JSON 之外的第二套协议。  
组件 JSON 可写生命周期：`since`（开始支持）、`deprecatedSince`（开始弃用，禁止新挂载）、`removedSince`（开始移除，移出清单）；省略表示当前基线无边界。字段仍用 `since` / `until`。Cocos 版本总表以后再加。  
脚本 `@property(Type)` 简名从策展组件类型末段推导（`Label` → `cc.Label`）。配方 `props` 的默认目标组件从克隆后的模板节点推断，不再手写 template→type 表。  
版本解析：`ILumenSessionOptions.cocosVersion` / CLI `--cocos` → 项目 `package.json` 的 `creator.version` → 基线 **`3.8.3`**（对照 `engine-3.8.3`）。  
可选 `--engine` / `engineRoot`：扫描引擎 `.ts` 的 `@serializable`，覆盖到 schema / `comp-set`（不写回策展表）。  
已验证：`3.8.3` 与 demo `3.8.7`；更高小版本靠字段 `since` / `until` 继续门控。  
字段示例：Label 描边/阴影自 `3.8.2`；**不收录**废弃组件（`cc.LabelOutline` / `cc.LabelShadow`）。  
白名单覆盖：常见 UI（含 `nodeRef`/`componentRef`）、2D/3D 渲染与灯光、粒子顶层与常用模块、`cc.Line`、LOD/Sorting2D/UISkew、Tiled 配套、动画控制器（`cc.animation.AnimationController`）、后处理（Bloom/DOF/TAA/…）、动画/音频、刚体与常用碰撞体/角色控制器/单纯形、**2D 关节**与 **3D Constraint**、`sp.Skeleton` / `dragonBones.ArmatureDisplay`、`MotionStreak` 等；挂载与 `comp-set` 均以白名单为准。  

发现面（给人 / AI 共用）：

| 命令 | 用途 |
|------|------|
| `schema` | 组件清单或属性描述（`kind` / `enumHints` / `example` / `since`） |
| `templates` | 列出 `default_prefab` 合法 template id |
| `tree` / `inspect` | 只读读回节点树与组件类型 |
| `cocos-info` | 项目版本 + 可选 `--engine` 对照 `cc.d.ts`（**不**自动改白名单） |

`cocos-info` 可信度：项目 `creator.version` 高；引擎类名扫描中。挂载为引擎类型 deny-list；实例 JSON 可发现标量字段。缺口列表 **不得** 写回策展表。  
`--engine` 时报告含 `engine.inEngineNotInWhitelist`（组件级缺口，可 `--gap-offset` / `--gap-limit` 分页；`truncated` / `nextOffset` 说明截断）。传入引擎 **TypeScript 源**（非 `cc.d.ts`）时另有 `engine.fieldGaps.inEngineNotInWhitelistFields`（字段级缺口，同一分页参数）。**不得**把上述列表自动写入白名单。 

粒子模块以 `curveRange` 为主：数字 = Constant；`{ mode: 3, constantMin, constantMax }` = TwoConstants；`{ keys: [{ time, value }] }` = Curve；`{ keysMin, keysMax }` = TwoCurves（mode=2）。`startColor` 的 `gradientRange`：`{r,g,b,a}` = Color；`{ colorKeys }` = Gradient；`{ colorKeysMin, colorKeysMax }` = TwoGradients（mode=3）。`sizeOvertimeModule.size`、`velocityOvertimeModule.x/y/z` 等同为嵌套 `curveRange`。实例 JSON 里的 `{ __id__ }` 可发现为 `nodeRef` / `componentRef` / `curveRange` / `objectPatch`。独立资产、图片、Effect、模型与图集走 `inspect` / `asset-set`。图片补丁按 `image` / `texture` / `spriteFrame` 分组。Effect 补丁为 `properties`（YAML value）、`programs`（CCProgram 源）或 `effectYaml` / `source`；不做 shader graph UI。模型补丁按 `model` / `fbx` / `material` / `imageMetas` 分组，只改 `.meta`。Auto Atlas 补丁按 `pack` / `texture` 分组；LabelAtlas 写 `spriteFrameUuid` / `itemWidth` / `itemHeight` / `startChar`。Animation Graph 写 `name` / `layers` / `variables`；Variant 写 `graph` / `clips`；Mask 写 `joints`；不做状态机节点图。RenderTexture 写 `width` / `height` / `texture` 并同步源宽高。Pipeline 写 `name` / `tag` / `flows` / `flowUuids`；`template: forward` 可 scaffold Forward 管线。独立 Render Flow `.flow` 写 `name` / `priority` / `tag` / `stageUuids`；Render Stage `.stg` 写 `name` / `priority` / `tag`。不做图集预览、RT 预览或管线 dump 树 UI。音频写 `downloadMode`（`0`/`WEB_AUDIO` 或 `1`/`DOM_AUDIO`）；视频与 TTF 3.8 无可写 Inspector 字段；BitmapFont 写 `textureUuid` / `fontSize`。不改音频/视频/字体源，不做播放器或字形预览，不解析 `.fnt`。Spine 写 `atlasUuid`；DragonBones 骨骼与图集 3.8 无可写字段。不改骨骼源，不做动画预览。CubeMap 写 `faces` / `texture`；TiledMap 3.8 无可写字段；文件夹写 `isBundle` / `bundleName` / `priority` / `compressionType` / `isRemoteBundle`。不改 `.cubemap` / `.tmx` 源，不做六面或地图预览。粒子 `.plist` 只读 `spriteFrameUuid`；Sprite Atlas `.plist` 只读子图名；JSON / 文本 / Buffer / TypeScript `.ts` / instantiation dump（`.mesh` / `.skeleton` / `.animation` / `.material`）只读 uuid。JavaScript `.js` 写 `isPlugin` / `loadPluginInEditor` / `loadPluginInWeb` / `loadPluginInNative` / `loadPluginInMiniGame`，不改脚本源。3.8 空检视器种类补丁须为空对象，不改源、不做粒子/图集/代码/二进制/网格预览。`.plist` 按旁路 `.meta` importer 区分 `particle` 与 `sprite-atlas`，不可按扩展名一刀切。Terrain：VERSION8 原生二进制；局部改高用同一套 `region`。`cc.Terrain.asset` 绑 uuid。`bursts` / `BlitScreen.materials` 走 `objectList`；`Button.clickEvents` 走 `eventHandlerList`（`bind-click` 仍可用）。`cc.IKConstraint` 为 dragonBones 运行时内部类，**不是**可挂节点组件，故不收录。引用类字段：`nodeRef` / `componentRef` 及列表。脚本自定义 `@property`：会话会按 catalog 半自动解析 `.ts`。优先用 `default_prefab` 模板搭树，再用 `comp-set` 改引用与标量。`.scene` / `.prefab` / `.mtl` / `.anim` / `.pmtl` / `.terrain` / `.effect` / `.chunk` / `.fbx` / `.gltf` / `.glb` / `.pac` / `.labelatlas` / `.animgraph` / `.animgraphvari` / `.animask` / `.rt` / `.rpp` / `.flow` / `.stg` / `.wav` / `.mp4` / `.ttf` / `.fnt` / `.skel` / `.dbbin` / `.cubemap` / `.tmx` / `.plist` / `.txt` / `.bin` / `.ts` / `.js` / `.mesh` / `.skeleton` / `.animation` / `.material` 与常见图片扩展名共用 CLI `--prefab`。`.json` 若旁路 meta 为 `spine-data` / `dragonbones` / `dragonbones-atlas` 则按对应文档打开，为 `json` 则按配置打开；无扩展名路径若旁路 meta 为 `directory` 则按文件夹打开。示例：`test-demos/cocos-for-agent/tools/recipes/`。

挂载约定（与引擎一致；`schema` 无参时返回 `conventions`，按组件查时返回 `layerRole` / `rendererExclusive`；类型表来自 `bundled/schema/conventions.json`）：

- **渲染互斥**：同节点仅允许一个 `cc.Renderer` 子类（Label/Sprite/ParticleSystem/Line/Mesh…）；冲突报 `lumen_renderer_exclusive`，请拆子节点。
- **Layers**：UI → `UI_2D`（`1<<25`）；3D/粒子/线/网格 → `DEFAULT`（`1<<30`）。`attach` / `addChildFromSpec` / 模板嵌入会对子树写入 `_layer`。

实机验证（全量模板 + kit + 对比产物）：

```bash
bash test-demos/cocos-for-agent/tools/verify-prefab-crud.sh
```

属性绑定真机样本（clickEvents / bursts / gradient / objectList / 脚本清单；需 Creator Hub 在线）：

```bash
node test-demos/cocos-for-agent/tools/verify-property-binding.mjs
```

产物：`assets/prefab-binding-verify/BindingVerify.prefab`；报告：`.peanut-ai/artifacts/property-binding/<run>/`。

生成资源在 `assets/prefab-crud-verify/catalog/`（逐模板）与 `kits/`（分组）；对比在 `.peanut-ai/artifacts/prefab-crud/<run>/`。

业务示例（登录 + 服务器列表）：

```bash
bash test-demos/cocos-for-agent/tools/build-login-panel.sh
```

产物：`assets/ui/login/LoginPanel.prefab` + `LoginPanelController.ts`；配方：`tools/recipes/login-server-list.json`。

## 分发边界

| 内容 | 是否进 `@peanut/cocos-lumen` 包 |
|------|--------------------------------|
| CLI / Session / schema / enum / `cocos-info` | 是（`dist/`） |
| `default_prefab` 模板库 | **是**（`bundled/default_prefab`，**默认 Creator 3.8.3** + manifest） |
| 业务 recipe | 否（各 Creator 项目） |
| 引擎源码 / `cc.d.ts` | 否（本机 `--engine`） |
| 设置面板 | 独立插件 [`peanut-plugin-lumen`](../../plugins/tools/lumen/)（`peanut.lumen`）；装包只消费 `@peanut/cocos-lumen/plugin-runtime` |
| AI / MCP | 否（经 [`peanut.editor-mcp`](../../plugins/integrations/editor-mcp/) 的 `lumen.*` / `lumen.commit`；手册 [`LUMEN-AI-PLAYBOOK.md`](../../plugins/integrations/editor-mcp/docs/LUMEN-AI-PLAYBOOK.md)；补全计划 [`LUMEN-ROADMAP.md`](../../plugins/integrations/editor-mcp/docs/LUMEN-ROADMAP.md)） |

插件启动时同步缓存；也可 CLI：

```bash
node dist/cli.js cache-sync --cache /path/to/plugin-cache
node dist/cli.js cache-status --cache /path/to/plugin-cache
node dist/cli.js cache-reset --cache /path/to/plugin-cache          # 强制回 3.8.3 内置
node dist/cli.js cache-import --cache /path/to/plugin-cache --from /path/to/version-pack
node dist/cli.js templates --project /path/to/CreatorProject --template-cache /path/to/plugin-cache
```

版本包布局与缓存相同：`lumen-templates.manifest.json`（含 `cocosVersion`）+ `default_prefab/`。

```ts
// 插件 activate（peanut.lumen 已内置）
const sync = LumenDefaultTemplateRoot.ensurePluginCache(pluginCacheDir);
```

仓库源仍在 [`products/cocos/default_prefab`](../../../default_prefab/)；`npm run build` / `bundle:templates` 打进包并标注 `cocosVersion: "3.8.3"`。

## 固定约定（Creator 兼容）

1. **`fileId` 重写**：`cloneFromTemplate` / `cloneSubtreeForEmbed` 必须为全部本地 `fileId` 重新生成，禁止复用 `default_prefab` 模板 id（否则同 prefab 多 Button 等实例会触发 `generatePrefabUUIDMap … already exist`）。
2. **覆盖写原子性**：`save` 先写同目录临时文件再 `rename`，避免半截 JSON；覆盖已有 `.prefab` 时不要删 `.meta`。验证脚本只 `rm` `.prefab`；否则 Creator `library/<old-uuid>.json` 会成孤儿，编辑器 soft-reload 仍读旧撞号内容。
3. **不写 `library/` / `temp/`**：索引走 `peanut-asset-catalog`；Import / soft-reload 交给 Creator。若仍见旧撞号日志：关掉 prefab 页签 → 确认磁盘 fileId 已唯一 → 清无对应 orphan library → 从资源管理器重开。
