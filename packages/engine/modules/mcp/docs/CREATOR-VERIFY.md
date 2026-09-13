# Lumen AI — Creator 实机验收

在装有 Peanut 宿主扩展的 Creator 工程中验收 `peanut.editor-mcp` + `peanut.lumen`。  
离线冒烟（无 Creator）：`npm run --workspace @peanut/pod-engine/mcp test`。

**无人值守总入口（推荐）**：Creator 可自动拉起或复用已开工程时，在 `products/cocos/editor` 执行：

```bash
npm run verify:plugin-system
# 发版/全量：npm run verify:plugin-system -- --with-headless
# 禁止拉起 Creator：npm run verify:plugin-system -- --no-launch
```

该命令默认 **跳过** 嵌套 `verify:full`（只做 Hub → 装包 → doctor → lumen-host → probes）。发版/全量加 `--with-headless`。也可用别名 `npm run verify:host`。

快速装包：

```bash
# 权威全量装包
npm run pack:demo -- --project ../../../test-demos/cocos-plugin-verify --with-host-extension
# 仅 lumen + editor-mcp（可选子集）
node scripts/install-lumen-ai-demo.mjs --project ../../../test-demos/cocos-plugin-verify
```
**默认工程**：[`test-demos/cocos-plugin-verify`](../../../../../test-demos/cocos-plugin-verify)（从 `cocos-for-agent` 拷出的独立验收沙箱；日常改玩法请继续用 `cocos-for-agent`，可用 `--project` 覆盖）。  
拉起 Creator 走验收工程 `npm run creator`（[`launch-creator-with-tslib.sh`](../../../../../test-demos/cocos-plugin-verify/tools/launch-creator-with-tslib.sh)），会先经 `peanut-pod` 的 tslib 同步逻辑再启动；默认带 **`--nologin`**；需要登录时设 `COCOS_CREATOR_FORCE_LOGIN=1`。  
加速：默认已跳过 headless；`--with-headless` 跑全量、`--no-launch`（Hub 已在线时）、`--skip-probes`（只验 lumen-host 收口）。  
**每次验收收口**：`lumen.refresh`（lane:`lumen-offline`）刷新 AssetDB，并检查工程 `temp/logs/project.log` 是否出现新增 `error:`。  
写场景/节点走 lumen 离线写，**不要** `scene.open` 当写前置；需要给人看时再 `scene.open`（lane:`editor-ui`）。

## 0. 装包

```bash
cd products/cocos/editor
# 轻量（仅 lumen + editor-mcp）：
node scripts/install-lumen-ai-demo.mjs --project ../../../test-demos/cocos-plugin-verify
# 完整 demo（业务插件 + host-controller；需先 build，或直接跑脚本）：
npm run pack:demo -- --project=/abs/path/to/peanut-agents/test-demos/cocos-plugin-verify
# 可选同时覆盖宿主扩展（需关闭 Creator，避免 native .node 被锁）：
node scripts/pack-demo-plugins.mjs --project=/abs/path/to/peanut-agents/test-demos/cocos-plugin-verify --with-host-extension
```

预期：`peanut-plugins/plugins/peanut.editor-mcp/<version>/` 与 `peanut.lumen/<version>/` 更新。

打开 `test-demos/cocos-plugin-verify`，确认插件已激活；MCP 暴露模式设为 `all`（写操作需要）。

可选诊断：

```bash
npm run lumen-ai-doctor -- --project ../../../test-demos/cocos-plugin-verify
```

期望：`ok: true`；`findings` 含 `schema_fingerprint_ok`；`schemaFingerprint.stale === false`（含 `conventions` / `scriptPropertyDiscovery` / `Button.clickEvents`；demo 另检 `ProbeButton.scores`）。若出现 `schema_runtime_stale`：装包 reload 后仍缺字段则重启 Creator。

Cursor：使用工程内 `.cursor/mcp.json`（`cpm mcp bridge`）。写工具若仍隐藏，在 Plugin Manager → MCP 将 `peanut.editor-mcp` 设为「全部」，或重启 Creator 以加载 `cocos-mcp-settings.json`。

## 1. 能力列表

调用 `cocos.capabilities` / Hub catalog，应能看到：

- 只读：`lumen-schema` / `lumen-templates` / `lumen-tree` / `lumen-inspect` / `lumen-cocos-info`
- 写入：`lumen-scaffold` / `lumen-structure` / … / `lumen-commit`

## 2. Playbook（必过）

统一实机烟测（Creator 已打开本工程 + Hub 可用）：

```bash
cd products/cocos/editor
node scripts/verify-lumen-host.mjs --project ../../../test-demos/cocos-for-agent
# 可选属性绑定样本：
node scripts/verify-lumen-host.mjs --project ../../../test-demos/cocos-for-agent --with-binding
# 可选只跑媒体/Bundle 或 CubeMap / C11：
node scripts/verify-lumen-host.mjs --project ../../../test-demos/cocos-for-agent --only c9
node scripts/verify-lumen-host.mjs --project ../../../test-demos/cocos-for-agent --only c10
node scripts/verify-lumen-host.mjs --project ../../../test-demos/cocos-for-agent --only c11
```

期望：总报告 `ok: true`；含 `doctor` + `c2`..`c12`；产物写在工程 `.peanut-ai/artifacts/lumen-host/`。单步：`verify-lumen-c2.mjs` … `c12.mjs`。

```typescript
const call = (operation, input) =>
  pluginModule.dispatchMcpAction('cocos.call', { operation, input });

await call('lumen.templates', {});
await call('lumen.cocosInfo', { gapOffset: 0, gapLimit: 20 });
await call('lumen.scaffold', {
  prefabRelativePath: 'assets/ui/McpVerify.prefab',
  rootName: 'McpVerify',
  template: 'empty',
});
const structure = await call('lumen.structure', {
  prefabRelativePath: 'assets/ui/McpVerify.prefab',
  parentPath: '/McpVerify',
  recipe: { name: 'Title', template: 'ui/Label', props: { string: 'MCP' } },
  autoCommit: true,
});
```

检查：

| 项 | 期望 |
|----|------|
| `structure.data.commit.editorRefresh.result.triggered` | **true**（有 `Editor.Message`） |
| `structure.data.commit.catalog.generatedAt` | 有时间戳 |
| 资源管理器 | 出现 `assets/ui/McpVerify.prefab`，可打开 |
| Label | 文本为 `MCP` |

`lumen.cocosInfo` 带 `--engine` 时：`engine.inEngineNotInWhitelist` 含 `items` / `total` / `truncated` / `autoMap: "none"`。

若 `triggered === false`：在资源管理器对该 prefab 执行 Import / soft-reload，再 `lumen.commit`，然后重开页签。

场景（同一套工具，路径改 `.scene`）：

空 `.scene` 脚手架会自动挂上与 `scene.scene` 一致的基线：`Main Camera`（`clearFlags=14` 清色）+ `Main Light`，再按 `template` 挂 `ui/Canvas` 等。  
**不要**改 `ui/Canvas` 里 UI 相机的 `clearFlags=6`（叠层语义）。重复生成请传 `reset: true`。

```typescript
await call('lumen.scaffold', {
  prefabRelativePath: 'assets/McpVerify.scene',
  rootName: 'McpVerify',
  template: 'ui/Canvas',
  reset: true,
});
await call('lumen.nodeAdd', {
  prefabRelativePath: 'assets/McpVerify.scene',
  parentPath: '/McpVerify/Canvas',
  template: 'ui/Label',
  name: 'Title',
});
```

`lumen.tree` 的 `kind` 应为 `'scene'`，根下应有 `Main Camera` / `Main Light` / `Canvas`；不要在 `/McpVerify` 上 `comp-add`。

材质（同一套路径字段，写入走 `lumen.assetSet`）：

```bash
node scripts/verify-lumen-c4.mjs --project ../../../test-demos/cocos-for-agent
```

期望：`ok: true`；`inspectKindAfter: material`；`roughness: 0.2`；`triggered: true`；磁盘 `.meta` 的 `importer: material`、`ver` 与工程 `creator.version` 对应（见 `bundled/schema/meta-importers.json`，3.8.x 为 `1.0.21`）。重复跑依赖 `reset: true`。

```typescript
await call('lumen.scaffold', {
  assetRelativePath: 'assets/fx/McpVerify.mtl',
  rootName: 'McpVerify',
  template: 'standard',
  reset: true,
});
await call('lumen.inspect', { assetRelativePath: 'assets/fx/McpVerify.mtl' });
await call('lumen.assetSet', {
  assetRelativePath: 'assets/fx/McpVerify.mtl',
  props: { props: { roughness: 0.2 } },
  autoCommit: true,
});
```

`lumen.inspect` 的 `kind` 应为 `'material'`；不要对独立资产调 `lumen.tree`。

动画 / 物理材质 / 地形 / Effect：

```bash
node scripts/verify-lumen-c5.mjs --project ../../../test-demos/cocos-for-agent
```

期望：`ok: true`；`animationClip` / `physicsMaterial` / `terrain` / `effect` 的 inspect kind 与 meta importer 正确，且各步 `triggered: true`。

```typescript
await call('lumen.scaffold', { assetRelativePath: 'assets/anim/McpVerify.anim', rootName: 'McpVerify', reset: true });
await call('lumen.assetSet', { assetRelativePath: 'assets/anim/McpVerify.anim', props: { wrapMode: 'Loop' }, autoCommit: true });
await call('lumen.scaffold', { assetRelativePath: 'assets/phys/McpVerify.pmtl', rootName: 'McpVerify', reset: true });
await call('lumen.scaffold', { assetRelativePath: 'assets/land/McpVerify.terrain', rootName: 'McpVerify', reset: true });
await call('lumen.scaffold', { assetRelativePath: 'assets/fx/McpVerify.effect', rootName: 'McpVerify', reset: true });
```

`lumen.commit` 后 Creator Import 会生成 library `.bin` / `.json`。把地形挂到节点：scaffold `template: 'Terrain'`，再 `comp-set` `cc.Terrain.asset` 为 `.terrain.meta` 的 uuid。

图片只打开已有源文件，改相邻 `.meta`，不 scaffold、不改 PNG 字节：

```bash
node scripts/verify-lumen-c6.mjs --project ../../../test-demos/cocos-for-agent
```

期望：`ok: true`；对 `assets/mcp-verify/Probe.png` 写入 texture/spriteFrame 补丁后 `triggered: true`。

```typescript
await call('lumen.inspect', { assetRelativePath: 'assets/mcp-verify/Probe.png' });
await call('lumen.assetSet', {
  assetRelativePath: 'assets/mcp-verify/Probe.png',
  props: {
    texture: { wrapModeS: 'repeat', anisotropy: 4 },
    spriteFrame: { borderLeft: 8, pivotX: 0.25, packable: false },
  },
  autoCommit: true,
});
```

`lumen.inspect` 的 `kind` 应为 `'image'`。随后 `lumen.commit`，让 Creator 按新 Importer 设置重 Import。

Effect / chunk（YAML 字段与程序文本，不做 shader graph）已并入 C5。

FBX / glTF 只打开已有源文件，改相邻 `.meta`，不 scaffold、不改模型字节：

```bash
node scripts/verify-lumen-c7.mjs --project ../../../test-demos/cocos-for-agent
```

期望：`ok: true`；`checks.model/autoAtlas/labelAtlas/animationGraph/animationGraphVariant/animationMask` 全绿；各步 `triggered: true`。C7 会确保 `assets/mcp-verify/ProbeModel.gltf` 存在（最小 glTF + meta）。

```typescript
await call('lumen.inspect', { assetRelativePath: 'assets/mcp-verify/ProbeModel.gltf' });
await call('lumen.assetSet', {
  assetRelativePath: 'assets/mcp-verify/ProbeModel.gltf',
  props: {
    model: { normals: 1, addVertexColor: true },
    fbx: { animationBakeRate: 30 },
    material: { dumpMaterials: true },
    imageMetas: [{ name: 'albedo', remap: '<texture-uuid>' }],
  },
});
```

`lumen.inspect` 的 `kind` 应为 `'model'`。随后 `lumen.commit`，让 Creator 按新 Importer 设置重 Import。

Auto Atlas / LabelAtlas（配置写 `.meta`，不做打包预览）：

```typescript
await call('lumen.scaffold', { assetRelativePath: 'assets/mcp-verify/Icons.pac', rootName: 'Icons' });
await call('lumen.assetSet', {
  assetRelativePath: 'assets/mcp-verify/Icons.pac',
  props: { pack: { maxWidth: 2048, padding: 4 }, texture: { wrapModeS: 'clamp-to-edge' } },
});
await call('lumen.scaffold', { assetRelativePath: 'assets/mcp-verify/Digits.labelatlas', rootName: 'Digits' });
await call('lumen.assetSet', {
  assetRelativePath: 'assets/mcp-verify/Digits.labelatlas',
  props: { spriteFrameUuid: '<sprite-frame-uuid>', itemWidth: 16, itemHeight: 24, startChar: '0' },
});
```

`lumen.inspect` 的 `kind` 应为 `'autoAtlas'` / `'labelAtlas'`。

Animation Graph / Variant / Mask（不做状态机节点图或骨架树 UI）：

```typescript
await call('lumen.scaffold', { assetRelativePath: 'assets/mcp-verify/Hero.animgraph', rootName: 'HeroGraph' });
await call('lumen.assetSet', {
  assetRelativePath: 'assets/mcp-verify/Hero.animgraph',
  props: {
    layers: [{ index: 0, name: 'Base', weight: 1 }],
    variables: [{ name: 'speed', type: 'FLOAT', value: 1.5 }],
  },
});
await call('lumen.scaffold', { assetRelativePath: 'assets/mcp-verify/Hero.animgraphvari', rootName: 'HeroVariant' });
await call('lumen.assetSet', {
  assetRelativePath: 'assets/mcp-verify/Hero.animgraphvari',
  props: { graph: '<animgraph-uuid>', clips: [{ original: '<clip-uuid>', substitution: '<clip-uuid>' }] },
});
await call('lumen.scaffold', { assetRelativePath: 'assets/mcp-verify/Body.animask', rootName: 'BodyMask' });
await call('lumen.assetSet', {
  assetRelativePath: 'assets/mcp-verify/Body.animask',
  props: { joints: [{ path: 'Root/Hips', enabled: false }] },
});
```

RenderTexture / Pipeline（不做预览或 dump 树）：

```bash
node scripts/verify-lumen-c8.mjs --project ../../../test-demos/cocos-for-agent
```

期望：`ok: true`；`checks.renderTexture/renderPipeline/renderFlow/renderStage` 全绿；各步 `triggered: true`。产物在 `assets/mcp-verify/`。

```typescript
await call('lumen.scaffold', { assetRelativePath: 'assets/mcp-verify/Screen.rt', rootName: 'Screen' });
await call('lumen.assetSet', {
  assetRelativePath: 'assets/mcp-verify/Screen.rt',
  props: { width: 512, height: 256, texture: { wrapModeS: 'clamp-to-edge' } },
});
await call('lumen.scaffold', {
  assetRelativePath: 'assets/mcp-verify/Forward.rpp',
  rootName: 'ForwardPipe',
  template: 'forward',
});
await call('lumen.assetSet', {
  assetRelativePath: 'assets/mcp-verify/Forward.rpp',
  props: { flows: [{ index: 0, name: 'MainFlow', priority: 10 }] },
});
await call('lumen.scaffold', { assetRelativePath: 'assets/mcp-verify/Main.flow', rootName: 'MainFlow' });
await call('lumen.assetSet', {
  assetRelativePath: 'assets/mcp-verify/Main.flow',
  props: { name: 'MainFlow', priority: 3, stageUuids: ['aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'] },
});
await call('lumen.scaffold', { assetRelativePath: 'assets/mcp-verify/Opaque.stg', rootName: 'OpaqueStage' });
```

`lumen.inspect` 的 `kind` 应为 `'renderTexture'` / `'renderPipeline'` / `'renderFlow'` / `'renderStage'`。

音频 / 视频 / 字体（只改 `.meta`，不改源、不做播放器或字形预览）：

```bash
node scripts/verify-lumen-c9.mjs --project ../../../test-demos/cocos-for-agent
```

期望：`ok: true`；音频 `DOM_AUDIO`、BitmapFont、目录 Bundle 可写且 `triggered`；json/text/buffer/particle 可 `inspect`。视频 / TTF 在清单中仍为只读 inspect（C9 以可写样本为主）。

```typescript
await call('lumen.inspect', { assetRelativePath: 'assets/mcp-verify/ProbeClick.wav' });
await call('lumen.assetSet', {
  assetRelativePath: 'assets/mcp-verify/ProbeClick.wav',
  props: { downloadMode: 'DOM_AUDIO' },
});
await call('lumen.assetSet', {
  assetRelativePath: 'assets/mcp-verify/ProbeScore.fnt',
  props: { textureUuid: '<sprite-frame-uuid>', fontSize: 48 },
});
await call('lumen.assetSet', {
  assetRelativePath: 'assets/mcp-verify/probe-pack',
  props: { isBundle: true, bundleName: 'mcp-probe-pack', priority: 8 },
});
```

`lumen.inspect` 的 `kind` 应为 `'audio'` / `'bitmapFont'` / `'directory'` / `'json'` / `'text'` / `'buffer'` / `'particle'`。

Spine / DragonBones（非法 `.skel` stub 会触发 AssetDB 刷屏，本冒烟**不落** Spine stub；有真实 `.skel` 时可手动 `assetSet atlasUuid`）：

```bash
node scripts/verify-lumen-c10.mjs --project ../../../test-demos/cocos-for-agent
```

期望：`ok: true`；CubeMap faces/texture 可写且 `triggered`；DragonBones / DragonBonesAtlas / TiledMap 可 `inspect`。

```typescript
await call('lumen.inspect', { assetRelativePath: 'assets/mcp-verify/ProbeHero.dbbin' });
await call('lumen.inspect', { assetRelativePath: 'assets/mcp-verify/ProbeHero_tex.json' });
```

`lumen.inspect` 的 `kind` 应为 `'dragonBones'` / `'dragonBonesAtlas'`。

CubeMap / TiledMap（只改 `.meta`，不改源、不做预览；Bundle 已在 C9）：

```typescript
await call('lumen.inspect', { assetRelativePath: 'assets/mcp-verify/ProbeSky.cubemap' });
await call('lumen.assetSet', {
  assetRelativePath: 'assets/mcp-verify/ProbeSky.cubemap',
  props: { faces: { left: '<image-uuid>' }, texture: { anisotropy: 8 } },
});
await call('lumen.inspect', { assetRelativePath: 'assets/mcp-verify/ProbeLevel.tmx' });
```

`lumen.inspect` 的 `kind` 应为 `'cubeMap'` / `'tiledMap'`。

粒子 / Sprite Atlas `.plist`、JSON / 文本、Buffer `.bin`、TypeScript `.ts`、instantiation dump（`.mesh` / `.skeleton` / `.animation` / `.material`）（只读 `.meta`，不改源、不做预览；`.plist` 须 peek importer，不可按扩展名一刀切）。JavaScript `.js` 可写插件开关：

```typescript
await call('lumen.inspect', { assetRelativePath: 'assets/fx/Smoke.plist' });
await call('lumen.inspect', { assetRelativePath: 'assets/ui/Hero.plist' });
await call('lumen.inspect', { assetRelativePath: 'assets/cfg/note.json' });
await call('lumen.inspect', { assetRelativePath: 'assets/cfg/note.txt' });
await call('lumen.inspect', { assetRelativePath: 'assets/data/Table.bin' });
await call('lumen.inspect', { assetRelativePath: 'assets/scripts/Probe.ts' });
await call('lumen.inspect', { assetRelativePath: 'assets/mesh/Cube.mesh' });
await call('lumen.inspect', { assetRelativePath: 'assets/mesh/Skin.skeleton' });
await call('lumen.inspect', { assetRelativePath: 'assets/anim/Walk.animation' });
await call('lumen.inspect', { assetRelativePath: 'assets/fx/Body.material' });
await call('lumen.assetSet', {
  assetRelativePath: 'assets/scripts/plugin.js',
  props: { isPlugin: true, loadPluginInEditor: true },
});
```

`lumen.inspect` 的 `kind` 应为 `'particle'` / `'spriteAtlas'` / `'json'` / `'text'` / `'buffer'` / `'script'` / `'mesh'` / `'skeleton'` / `'instantiationAnimation'` / `'instantiationMaterial'`。JavaScript 的 `kind` 为 `'javascript'`。

宿主烟测 C11：

```bash
node scripts/verify-lumen-c11.mjs --project ../../../test-demos/cocos-for-agent
```

期望：`ok: true`；SpriteAtlas / TypeScript 可 inspect；JavaScript `isPlugin` 族可写且 `triggered`（脚本会把插件开关恢复，避免 Scene `exports` 残留报错）。  
说明：不要在 `assets/` 手写空 `.mesh` dump——Creator 会对 `.mesh` 走解压导入，假 JSON 会刷 `unzip` / import 失败；mesh inspect 由 lumen 单测覆盖。SpriteAtlas 须是合法 TexturePacker plist + 同名 `.png`（空 plist 会报 `realTextureFileName`）。

```typescript
await call('lumen.scaffold', {
  prefabRelativePath: 'assets/land/FieldNode.prefab',
  rootName: 'Field',
  template: 'Terrain',
});
await call('lumen.compSet', {
  prefabRelativePath: 'assets/land/FieldNode.prefab',
  nodePath: '/Field',
  componentType: 'cc.Terrain',
  props: { asset: '<terrain-uuid>' },
});
```

## 3. 绑定与验收（可选）

工程内已有脚本与 SpriteFrame 时：

1. `asset.catalog.lookup` 取 script / spriteFrame uuid  
2. `lumen.bindClick` / `lumen.bindSprite`  
3. `lumen.tree` / `lumen.inspect` 核对  

粒子：`lumen.comp-set` `rateOverTime` / `startColor.colorKeys`；TwoCurves 用 `keysMin`/`keysMax`，TwoGradients 用 `colorKeysMin`/`colorKeysMax`。模板粒子上的 `trailModule.widthFromParticle` 等实例字段 `inspect` 能读回。 `__id__` 引用字段 `inspect` 会解码为节点路径。  

## 4. 模板面板（可选）

菜单 `Tools / Peanut / Lumen Templates`：刷新状态、重置 3.8.3、选目录导入版本包。

## 5. 属性绑定真机样本

```bash
node test-demos/cocos-for-agent/tools/verify-property-binding.mjs
# 或并入总入口：
node products/cocos/editor/scripts/verify-lumen-host.mjs --project ../../../test-demos/cocos-for-agent --with-binding
```

期望：inspect 断言全绿；Hub `lumen.commit` 的 `editorRefresh.result.triggered === true`；`lumen.schema` 含 Button.`clickEvents` 与 ProbeButton.`scores`。  
依赖 `assets/agent-probe/ProbeButton.ts`（uuid 固定）。若 Hub 写操作仍进 plan，脚本会临时打开 directWrite。

## 5.5 预览验收闭环（Wave A/B）

写盘并 `lumen.commit` 后（**不要** `scene.save`）：

```typescript
await call('lumen.validateRefs', { prefabRelativePath: 'assets/ui/AgentAcceptProbe.prefab' });
// 或写后 lumen.commit({ paths: ['assets/ui/AgentAcceptProbe.prefab'] }) → data.validation[]
// data.recommendedNext.operation === 'preview.refresh'（validation 全绿时）
// data.acceptancePipeline 列出完整验收链
const preview = await call('preview.query', {});
// preview.data.available === true（live）或 source==='fallback' 且 url 指向 7456
await call('preview.refresh', { refreshAssets: true });
const errors = await call('preview.queryErrors', { limit: 50 });
// errors.data.source 可为 live | project_log；errors 行应无新增未预期 error
const shot = await call('preview.capture', {
  outputRelativePath: '.peanut-ai/artifacts/mcp-verify-preview.png',
  // optional: scenePath / assetRelativePath — prepare that .scene without UI confirm;
  // if Creator cannot, availability === 'refused' (no hang).
  // scenePath: 'assets/scenes/AgentAccept.scene',
});
// shot.data.available 依赖 Browser Preview 已开 +（可选）playwright；失败时 message 含原因即可
const compat = await call('asset.queryCompatibleTypes', { typeName: 'SpriteFrame' });
const audit = await call('asset.auditUnmanagedWrites', { limit: 20 });
// audit 用于发现旁路手改；正常 MCP 导入路径应无明显漂移
```

一键实机：

```bash
cd products/cocos/editor
npm run probe:agent-accept -- --project ../../../test-demos/cocos-for-agent
```

产物：`.peanut-ai/artifacts/agent-accept-pipeline.json`。
`validateRefs` / `commit.validation`：引擎与 `default_prefab` 内置 SpriteFrame uuid 会计入 `summary.ignoredEngineDefaultUuid`，**不**抬 `missingUuid`、不导致 `ok:false`。

`preview.query`：优先 Creator live message；失败时对 **Browser Preview HTTP** 做标题命中探测——命中本工程名则 `source=live`（`live_http_title_match`）；仅端口可达无标题命中仍为 `fallback`。`message` 可含 `live_tried=…`。

## 5.6 场景 / Prefab 薄层矩阵

Creator 已开验收工程且 Hub 可用时：

```bash
cd products/cocos/editor
node scripts/probe-scene-thin-layer.mjs --project ../../../test-demos/cocos-plugin-verify
# 可选：--mutate（reload/save/preview.refresh）
```

产物：`.peanut-ai/artifacts/scene-thin-layer-matrix.json`。覆盖 `scene.*` / `prefab.getInfo` / `editor.query|setSelection` / `scene.focusNode` / `preview.query*`；`--mutate` 另试 `createNode` / `unlink` / reload（**不**走 Creator `save-scene`）。`scene.save` 应固定 `available:false` 且 `message` 含 `scene_save_refused:use_lumen_offline_write`。其它 `available:false` 记「尽力 message 未命中」，不挡离线合入。

对照与缺口摘要见 [`LUMEN-ROADMAP.md`](./LUMEN-ROADMAP.md) §薄层 parity。

## 5.7 资产生命周期（静默盘写 + refresh）

Hub 可用且 `directWrite` 已开时：

```bash
cd products/cocos/editor
node scripts/verify-lumen-c12.mjs --project ../../../test-demos/cocos-plugin-verify
# 或并入总入口：
node scripts/verify-lumen-host.mjs --project ../../../test-demos/cocos-plugin-verify --only c12
```

期望：`createFolder` → `copy`（换新 uuid）→ `rename` → `asset.reimport`（= `lumen.refresh`）→ `move` → `delete`（`confirmDestructive: true`）全绿；`project.log` 无新增 `error:`。

**实机（2026-08-27 · Creator 3.8.7 / cocos-plugin-verify）：** C12 已通过（`logErrorCount: 0`）。证据：`.peanut-ai/artifacts/lumen-host/verify-lumen-c12-2026-08-27.json`。  
**装包注意：** `pack:demo` / `install-lumen-ai-demo` 后须 **重启 Creator**（或完整 development install+reload）；仅 `reloadSettings` 不会替换已加载的 plugin bundle。图片 rename/move 会分段 refresh 并在 stale 摘除后等待 AssetDB 稳定。

手测示例（`cocos.call` / 一级工具等价）：

```typescript
await call('asset.createFolder', { path: 'assets/mcp-verify/lifecycle-work' });
await call('asset.copy', {
  paths: ['assets/mcp-verify/Probe.png'],
  targetDirectory: 'assets/mcp-verify/lifecycle-out',
});
await call('asset.rename', {
  path: 'assets/mcp-verify/lifecycle-out/Probe.png',
  newName: 'RenamedProbe.png',
});
await call('asset.reimport', { paths: ['assets/mcp-verify/lifecycle-out/RenamedProbe.png'] });
await call('asset.move', {
  from: 'assets/mcp-verify/lifecycle-out/RenamedProbe.png',
  to: 'assets/mcp-verify/lifecycle-work/RenamedProbe.png',
});
await call('asset.delete', {
  paths: ['assets/mcp-verify/lifecycle-work/RenamedProbe.png'],
  confirmDestructive: true,
});
```

**禁止**走 Creator 回收站 / `delete-asset` UI；**禁止**对已登记资产用 `save-asset` 当 reimport。磁盘为真源，改后一律 `lumen.refresh` / `asset.reimport`。

## 6. 记录

把 Creator 版本、`triggered` 真值、是否需手动 Import 记在 PR / issue，便于收口「实机闭环」剩余缺口。

相关：[`LUMEN-AI-PLAYBOOK.md`](./LUMEN-AI-PLAYBOOK.md) · 补全计划：[`LUMEN-ROADMAP.md`](./LUMEN-ROADMAP.md)

## PinK-inspired P0-P3 notes (align5)

- **P0** `preview.capture`: optional `scenePath`/`assetRelativePath`; live evidence via `probe:agent-accept --capture --capture-scene`. Nightly fail-closed unless `MCP_NIGHTLY_ALLOW_SKIP=1`.
- **P1** `reference.queryImage`/`setImage`: live via Creator `reference-image`; see `REFERENCE-IMAGE-PROBE.md`.
- **P2** `lumen.lodRecalcBounds`: live via `scene:execute-component-method` `recalculateBounds`; see `LOD-RECALC-BOUNDS-PROBE.md` (live SUCCESS on fixture `assets/tests/lod-recalc-bounds/LodRecalcBounds.scene`); never `scene.save`.
- **P3** `builder.build`: richer artifact extraction + `add-task` candidate; hooks unchanged.
- **Scene routing**: `SCENE-HOST-ROUTING.md` (PinK #873).


## PinK non-MVP (continue)

- Windows Creator Hub session: `resolveDefaultCreatorBinary`, Win32 PID listing via CIM, `taskkill` soft-close.
- `visible` -> package profile `reference-image.show` (opacity fallback only).
- Scene save refuse grammar enforced via `buildSceneSaveRefusePayload` + `recommendedNext: lumen.commit`.
- LOD missing-component dumps include `dumpShape` diagnostics.
- Builder artifact extraction synthesizes `build/<platform>` from Creator task fixtures.
- Live Hub E2E on MSI still requires cocos-mcp.json (descriptor); if missing, record refused evidence — do not fake success.
