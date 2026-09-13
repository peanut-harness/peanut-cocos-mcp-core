# Lumen / editor-mcp 落地计划

> **产品定位：** Lumen 编辑 Creator 资源管理器里能打开、检视器里能改的**全部资产**。  
> 写的是工程源文件与 `.meta` / `subMetas`（Importer 设置）；**不手写 `library/` / `temp/`**，Import 仍交给 Creator。  
> 权威契约：[`@peanut/pod-engine/lumen` README](../../../tools/lumen/README.md) · 操作手册：[LUMEN-AI-PLAYBOOK.md](./LUMEN-AI-PLAYBOOK.md) · 检视器对照：[ASSET-INSPECTOR-PARITY.md](./ASSET-INSPECTOR-PARITY.md) · 实机验收：[CREATOR-VERIFY.md](./CREATOR-VERIFY.md)

## 目标与边界

| 目标         | 说明                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| 全资产可编辑 | 检视器能改的字段，Lumen 都能结构化读写（Prefab/Scene 节点、独立资产文件、图片/FBX 等 meta）              |
| 同一套管线   | open → inspect / patch → save → `lumen.commit`；路径共用 `prefabRelativePath` / 别名 `assetRelativePath` |
| 不写缓存目录 | 禁止手改 `library/` / `temp/`                                                                            |
| 真机可回归   | Hub + `cocos-for-agent` 可重复跑                                                                         |

| 方法（不是缩小目标）    | 说明                                                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 不克隆编辑器面板        | 不做地形笔刷窗、曲线编辑器、着色器节点图；用文档字段 / 窗口读写（如地形 `region`）表达同一数据                                          |
| 不迁入 `agents/plugins` | Creator 平台能力，不是 Agent Tool                                                                                                       |
| 不与 ui-prefab 合并     | ui-prefab 不 bundle lumen；经核心 `mcp.invoke` 调本插件已注册工具。见 [`core/plugin-sdk/README.md`](../../../core/plugin-sdk/README.md) |

「全编辑器」= **资产文档覆盖**，不是复刻 Creator 每一个交互控件。Effect 要能改 `.effect` 源，不必做可视化 shader graph；地形要能改高度场，不必做笔刷。

## 现状快照（2026-09-03）

对照「全部资产」，不是对照已点名的四种独立文件。

| 面                        | 约完成度  | 说明                                                                                 |
| ------------------------- | --------- | ------------------------------------------------------------------------------------ |
| Prefab / Scene 节点与组件 | ~90%      | CRUD 高；3.8.3 引擎 `@serializable` 字段缺口已策展收口（87 项）；3.8.7 gap 0         |
| 独立资产文档              | ~90% 种类 | IV.A Create 菜单与 IV.B meta 均已完成（见下表）                                      |
| Catalog 索引              | 中        | 多分桶可查 uuid；索引 ≠ 可编辑；catalog↔tool 有 parity 门禁                         |
| 依赖 / 换引用             | 高        | `queryDependencies`（含 `materialTextures` 二跳）、`replaceReferences`、`waitReady`  |
| MCP / 装包                | 高        | 不按动词加工具；扩面仍走 `inspect` / `assetSet`；装包权威 `pack:demo`                |
| editor-mcp 结构           | 持续 peel | action-router / lumen-gateway 编排；silent-asset、commit、editor、lumen-input 已出网关 |

## 主线阶段

```text
I    Prefab 组件 Inspector 字段     ← 完成（发现层仍会补缺口）
II   Scene 与 Prefab 同一 path      ← 完成
III  第一批独立资产文档             .mtl / .anim / .pmtl / .terrain ← 完成（不是「其它资产」全部）
IV   其余编辑器资产                 Create 菜单 + 图片/FBX 等 meta  ← 完成
V    资产生命周期                   静默 copy/move/… + refresh     ← 完成
```

### I — Prefab 组件字段

| #   | 任务                                                | 状态 |
| --- | --------------------------------------------------- | ---- |
| I.1 | 挂载改为引擎类型 **deny-list**（废弃/抽象基类仍拒） | [x]  |
| I.2 | 从 Prefab **实例 JSON** 发现标量字段                | [x]  |
| I.3 | 子模块 `objectPatch` 叠加发现字段                   | [x]  |
| I.4 | `__id__` 引用、未知嵌套对象走实例发现               | [x]  |
| I.5 | 引擎 `@serializable` 覆盖层                         | [x]  |
| I.6 | TwoCurves / TwoGradients                            | [x]  |

缺口报告 **不得** 直接改策展表。

### II — Scene

| #    | 任务                                                | 状态 |
| ---- | --------------------------------------------------- | ---- |
| II.1 | 打开/保存 `.scene`                                  | [x]  |
| II.2 | 场景根、Canvas、持久节点约定                        | [x]  |
| II.3 | 统一 `prefabRelativePath`（不另开 `lumen.scene-*`） | [x]  |

### III — 第一批独立资产（已落地，不是终点）

| #     | 任务                             | 状态 |
| ----- | -------------------------------- | ---- |
| III.1 | Material `.mtl`                  | [x]  |
| III.2 | AnimationClip `.anim`            | [x]  |
| III.3 | Terrain VERSION8 + `region` 窗口 | [x]  |
| III.4 | PhysicsMaterial `.pmtl`          | [x]  |

### IV — 其余编辑器资产（已收口）

同一 MCP：`lumen.inspect` / `lumen.assetSet`；新建文档类，不新开 `lumen.image-*` 一类动词。每种资产仍是文档类编解码；层次操作只对 Prefab / Scene。

**A. 新建菜单里已有、尚无 Lumen 文档**（引擎 `default_file_content`）

| 资产                             | 源                | 状态                                                       |
| -------------------------------- | ----------------- | ---------------------------------------------------------- |
| Effect / chunk                   | `.effect` / chunk | [x] 改 YAML/文本字段，不做节点图 UI                        |
| Animation Graph / Variant / Mask | `.animgraph` 等   | [x] 改图层/变量/原图/关节；不做状态机节点图                |
| Auto Atlas                       | `.pac`            | [x] 改 `.meta` 打包/贴图过滤，不做预览                     |
| LabelAtlas                       | `.labelatlas`     | [x] 改 spriteFrameUuid / 格子；fontSize 只读               |
| RenderTexture                    | `.rt`             | [x] 改宽高与过滤，同步源 `content.w/h`；不做预览           |
| Render Pipeline                  | `.rpp`            | [x] 改 name/tag/流名与优先级；`forward` 模板；不做 dump 树 |
| Render Flow / Stage              | `.flow` / `.stg`  | [x] 改 name/priority/tag；Flow 改 stageUuids；不做 dump 树 |

**B. 检视器改 `.meta` / `subMetas`（仍不写 library）**

| 资产                                      | 改什么                                       | 状态                                                                                                                                                   |
| ----------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 图片 → Texture / SpriteFrame              | 常见图片 `.meta` 九宫、pivot、过滤、packable | [x]                                                                                                                                                    |
| FBX / glTF                                | 导入设置与子资源绑定                         | [x] Model / FBX / Material 页 + imageMetas remap                                                                                                       |
| 音频 / 视频 / TTF / BitmapFont            | meta 可序列化项                              | [x] 音频 `downloadMode`；视频与 TTF 无可写字段；BitmapFont `textureUuid` / `fontSize`；不改源、不做预览                                                |
| Spine / DragonBones                       | 数据资产与 meta                              | [x] Spine `atlasUuid`；DragonBones 骨骼/图集无可写字段；不改源、不做预览                                                                               |
| CubeMap、TiledMap、文件夹 Bundle          | meta                                         | [x] CubeMap 六面 uuid 与过滤；TiledMap 无可写字段；文件夹 `isBundle` / `bundleName` / `priority`；不改源、不做预览                                     |
| 粒子 / Sprite Atlas `.plist`、JSON / 文本 | meta                                         | [x] `.plist` peek importer：`particle` 只读 `spriteFrameUuid`，`sprite-atlas` 只读子图名；JSON / 文本只读 uuid；空补丁；不改源、不做粒子/图集/代码预览 |
| Buffer `.bin`                             | meta                                         | [x] 只读 uuid / importer；空补丁；不改源、不做二进制预览                                                                                               |
| TypeScript `.ts`                          | meta                                         | [x] 只读 uuid / importer；空补丁；不改脚本源；`@property` 发现仍走 Prefab 挂载                                                                         |
| JavaScript `.js`                          | meta                                         | [x] 写 `isPlugin` / `loadPluginInEditor` / `loadPluginInWeb` / `loadPluginInNative` / `loadPluginInMiniGame`；不改脚本源                               |
| instantiation-mesh `.mesh`                | meta                                         | [x] 只读 uuid / importer；空补丁；**不**改引擎 dump 源                                                                                                 |
| instantiation-skeleton `.skeleton`        | meta                                         | [x] 只读 uuid / importer；空补丁；**不**改 dump 源                                                                                                     |
| instantiation-animation `.animation`      | meta                                         | [x] 只读 uuid / importer；与 `.anim` 剪辑文档分开；**不**改 dump 源                                                                                    |
| instantiation-material `.material`        | meta                                         | [x] 只读 uuid / importer；扩展名为 `.material`（不是 `.mtl`）；**不**改 dump 源                                                                        |

脚本 `.ts`：`source` 经 `lumen.assetSet` 写盘；`.meta` 只读；Prefab 挂载仍走 `@property` 发现（与源码文档分开）。

推荐下一刀（不依赖 Creator 3.0–3.5 硬件）：

1. 继续 peel：`preview` capture 栈；可选 snowb / bindController 薄网关
2. 日常 host：`npm run verify:host`（默认跳过嵌套 `verify:full`）；专题 `verify:lumen-host`（仅 `--only` 可跳步，无 ALLOW_SKIP）
3. Nightly：`verify:mcp-nightly`（缺 Creator **默认失败**，可选 `MCP_NIGHTLY_ALLOW_SKIP=1`）

已落地、勿当「下一刀」重复做：Agent 写法门禁、`scaffold-product-line`、catalog parity、lumen-hub-client、silent-asset / commit / editor / lumen-input codec peel。  
early3x 写升 `verified`：仍须本机 Creator **3.0–3.5** 跑 `probe:early3x-write-slice`（硬件门槛，不挡日常治理）。

### Wave 3 证据（Laya 对照 · preview.pause/step）

| 候选         | Creator 3.8.7 证据                                    | 决策                                                                             |
| ------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| play / pause | `builtin/scene` message **`editor-preview-set-play`** | **有证据、不进本轨**（预览播放控制偏宿主 UX / QA 探针；`products/cocos` 不封装） |
| step / 单帧  | 无 `step-frame` / `preview-step` 类 message           | **不做**；交互单步用 Playwright                                                  |

探针（只留证据，不接线）：`node scripts/probe-preview-pause-step-evidence.mjs [--creator /Applications/Cocos/Creator/3.8.7]`。

### V — 资产生命周期（静默盘写 + refresh）

磁盘为真源：先写 file + `.meta`（或删盘），再 `lumen.refresh` / MCP `asset.reimport`；**不走** Creator 确认框、`delete-asset` UI 或 `save-asset`。

| MCP 操作                        | 行为                                                                         | 状态 |
| ------------------------------- | ---------------------------------------------------------------------------- | ---- |
| `asset.copy`                    | 依赖闭包复制、换新 uuid、remap 引用（`SilentAssetClosureCopy`）              | [x]  |
| `asset.move`                    | 盘迁 file+meta，保留 uuid（`SilentAssetMoveRename`）                         | [x]  |
| `asset.rename`                  | 同目录改名，保留 uuid                                                        | [x]  |
| `asset.createFolder`            | 递归建目录 + 最小 `.meta`                                                    | [x]  |
| `asset.delete`                  | 窄口径：依赖门禁 + `confirmDestructive`；盘删后 refresh                      | [x]  |
| `asset.writeText`               | 静默写 UTF-8 文本（可 `files[]`）+ 合并 refresh；Creator 开着时替代 IDE 直写 | [x]  |
| `asset.reimport`                | 对已登记资产仅 `refresh-asset`（= `lumen.refresh` 同路径）                   | [x]  |
| `asset.ensureSpriteFramesBatch` | `save-asset-meta` 批量提升 PNG → `@f9941` SpriteFrame                        | [x]  |

实现：`core/asset-catalog/src/silent-asset-*.ts` · 接线：`EditorMcpSilentAssetGateway`（经 action-router 转发）。

## 完成度自检

| 里程碑 | 判定                                                           |
| ------ | -------------------------------------------------------------- |
| I–II   | Prefab / Scene 可组装                                          |
| III    | 四种独立文件可 inspect / assetSet，**不等于**全资产            |
| IV     | Create 菜单 + 常见 Importer meta 都能走同一 session            |
| 全量   | 资源管理器里能点开的，Lumen 都能改源；library 仍由 Import 生成 |

更新记录：

| 日期       | 备注                                                                                                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-03 | lumen 输入 peel：`EditorMcpLumenInputCodec`；lumen-gateway ~1.83k→~1.13k                                                                                                                                                                                                                                |
| 2026-09-03 | editor peel：`EditorMcpEditorGateway`（选区 / queryInfo / asset.open / scene.open·restore·prefabRoot）；action-router ~1.85k→~1.25k                                                                                                                                                                     |
| 2026-09-03 | silent-asset/import peel：`EditorMcpSilentAssetGateway`；action-router ~3.1k→~2.2k                                                                                                                                                                                                                      |
| 2026-09-03 | `lumen.commit` peel：`EditorMcpLumenCommitFacade`；hierarchy settle 并入 `EditorMcpSceneGateway`；action-router ~1.85k                                                                                                                                                                                  |
| 2026-09-03 | 优化续：装包文档权威为 pack:demo；catalog 门禁；verify:host 默认跳过 verify:full；snowb vendor 懒装；lumen-host fail-fast；lumen-c\* 共用 LumenHubClient                                                                                                                                                |
| 2026-09-03 | 五条收口：nightly 缺 Creator 勿假绿 + bulk/concurrency；settle 并行登记/事件 quiet；early3x 写切片探针（verified 仍待 3.0–3.5）；`EditorMcpLumen24Bridge` 迁入 `@peanut/pod-engine/lumen-24`；`scaffold-product-line`                                                                                        |
| 2026-09-03 | Agent「多文件一次 commit」写法门禁：skill/playbook + `test:agent-write-gate` + `probe:mcp-bulk-write-stress --agent-write-gate`（结构门禁；墙钟仅大样本/`--require-batch-faster`）；装包种子全部 lane skills；Wave3 证据：`editor-preview-set-play` 存在但**不进 products/cocos 范畴**，step 无 message |
| 2026-09-02 | `asset.replaceReferences` / `asset.waitReady`；依赖 `expand:materialTextures`；Skills 拆车道；Creator API 本地 corpus                                                                                                                                                                                   |
| 2026-09-02 | 治理：`lumen.commit` refresh 路径回归修复（独立资产不再被 prefab/scene 过滤清空）；`CreatorHubSession.launchDetached` 改 fd 日志避免 verify 挂住；editor-mcp **0.1.113**；`verify:plugin-system` 全绿                                                                                                   |
| 2026-08-28 | `verify:plugin-system` 串联 Agent 探针（accept + scene-thin-layer `--mutate`）；headless TS 修复；ui-prefab headless 路径跨平台；Creator 3.8.7 实机全绿                                                                                                                                                 |
| 2026-08-28 | `asset.ensureSpriteFramesBatch`：经 AssetDB `save-asset-meta` 批量确保 PNG 具备 `@f9941`；capability 79                                                                                                                                                                                                 |
| 2026-08-27 | MCP headless 依赖链 `build:mcp-deps`（contracts → asset-catalog → lumen）；`verify:mcp-gate` 先构建再验；capability 78（含 `lumen.bindController`）                                                                                                                                                     |
| 2026-08-27 | Texture Filter Mode 面板别名（`texture.filterMode`）；TrailModule 策展补 `widthFromParticle` / `colorFromParticle`                                                                                                                                                                                      |
| 2026-08-27 | `.ts` 源码文档（`source` 读写）；C12 实机通过（Creator 3.8.7 / cocos-plugin-verify；pack 后须重启 Creator）                                                                                                                                                                                             |
| 2026-08-27 | 字段级 `inEngineNotInWhitelistFields`；AssetDB 混合 stale/present refresh                                                                                                                                                                                                                               |
| 2026-08-26 | 平台压缩 `compressSettings.platforms`；verify-lumen-c12 生命周期；editor-mcp 0.1.77                                                                                                                                                                                                                     |
| 2026-08-26 | 图像 compress/type/trim、AutoAtlas compress；静默资产生命周期 MCP（copy/move/rename/createFolder/delete/reimport）；检视器对照表；editor-mcp 0.1.76                                                                                                                                                     |
| 2026-08-19 | instantiation dump `.skeleton` / `.animation` / `.material` 只读 `.meta`；与 `.anim` / `.mtl` 分开；editor-mcp 0.1.28 · lumen 0.0.23                                                                                                                                                                    |
| 2026-08-19 | 脚本 `.ts` 只读 `.meta`；JavaScript `isPlugin` 族；instantiation-mesh `.mesh` 只读 dump meta；editor-mcp 0.1.27 · lumen 0.0.22                                                                                                                                                                          |
| 2026-08-19 | Render Flow `.flow` / Stage `.stg`：name/priority/tag 与 stageUuids；catalog 分桶含 instantiation-\*；editor-mcp 0.1.26 · lumen 0.0.21 · catalog 0.1.3                                                                                                                                                  |
| 2026-08-19 | Buffer `.bin` `.meta`：只读检视与空补丁；editor-mcp 0.1.25 · lumen 0.0.20 · catalog 0.1.2                                                                                                                                                                                                               |
| 2026-08-18 | 粒子 / Sprite Atlas `.plist` 与 JSON / 文本 `.meta`：只读检视与空补丁；editor-mcp 0.1.24 · lumen 0.0.19                                                                                                                                                                                                 |
| 2026-08-18 | CubeMap / TiledMap / 文件夹 Bundle `.meta`：六面绑定与 Bundle 开关；editor-mcp 0.1.23 · lumen 0.0.18                                                                                                                                                                                                    |
| 2026-08-18 | Spine / DragonBones `.meta`：atlasUuid 与只读骨骼/图集；editor-mcp 0.1.22 · lumen 0.0.17                                                                                                                                                                                                                |
| 2026-08-18 | 音频 / 视频 / TTF / BitmapFont `.meta`：downloadMode 与字图绑定；editor-mcp 0.1.21 · lumen 0.0.16                                                                                                                                                                                                       |
| 2026-08-18 | Animation Graph / Variant / Mask 与 RenderTexture / Pipeline：图层变量与 RT 尺寸/管线流；editor-mcp 0.1.20 · lumen 0.0.15                                                                                                                                                                               |
| 2026-08-18 | Auto Atlas `.pac` / LabelAtlas `.labelatlas`：打包与字图格子写 `.meta`；editor-mcp 0.1.19 · lumen 0.0.14                                                                                                                                                                                                |
| 2026-08-18 | FBX / glTF `.meta`：Model / FBX / Material 页与内嵌图 remap；editor-mcp 0.1.18 · lumen 0.0.13                                                                                                                                                                                                           |
| 2026-08-18 | Effect `.effect` / chunk：YAML properties 与 CCProgram 源；editor-mcp 0.1.17 · lumen 0.0.12                                                                                                                                                                                                             |
| 2026-08-18 | 图片 meta：Texture / SpriteFrame 分组读写；editor-mcp 0.1.16 · lumen 0.0.11                                                                                                                                                                                                                             |
| 2026-08-18 | **定位：** 全资产源文件/meta 可编辑；III 降为第一批而非终点；IV 为当前主线                                                                                                                                                                                                                              |
| 2026-08-18 | 地形 region 窗口读写；editor-mcp 0.1.15 · lumen 0.0.10                                                                                                                                                                                                                                                  |
| 2026-08-18 | Terrain VERSION8 高度场；`cc.Terrain.asset`；editor-mcp 0.1.14 · lumen 0.0.9                                                                                                                                                                                                                            |
| 2026-08-18 | 第一批独立资产 + catalog 分桶；editor-mcp 0.1.13 · lumen 0.0.8                                                                                                                                                                                                                                          |
| 2026-08-18 | Material `.mtl`；editor-mcp 0.1.12 · lumen 0.0.7                                                                                                                                                                                                                                                        |
| 2026-08-18 | `__id__` / TwoCurves / `.scene` 统一 path；editor-mcp 0.1.11                                                                                                                                                                                                                                            |
| 2026-08-18 | 引擎 `@serializable` + 实例发现                                                                                                                                                                                                                                                                         |
| 2026-08-18 | P1–P4 底座；editor-mcp 0.1.10                                                                                                                                                                                                                                                                           |
| 2026-08-17 | P0 脚本发现；doctor 指纹                                                                                                                                                                                                                                                                                |

## 相关路径速查

| 路径                                                     | 用途                                    |
| -------------------------------------------------------- | --------------------------------------- |
| `products/cocos/editor/tools/lumen/`                     | Session / schema / CLI / 资产文档       |
| `lumen-terrain-document.ts`                              | Terrain VERSION8 + region               |
| `lumen-terrain-grid.ts`                                  | 顶点盒 / 本地圆寻址                     |
| `products/cocos/editor/plugins/integrations/editor-mcp/` | MCP 插件                                |
| `products/cocos/default_prefab/`                         | 3.x Prefab 模板源（入库）               |
| Creator 2.4.11 安装包 `static/default-assets/prefab/`    | 2.4 Prefab 模板源（build 抽取，不入库） |
| `test-demos/cocos-for-agent/`                            | 真机 demo / recipes                     |
