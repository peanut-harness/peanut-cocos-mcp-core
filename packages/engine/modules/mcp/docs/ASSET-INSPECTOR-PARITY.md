# Creator 资产检视器 ↔ Lumen 对照表

> 对照 **Cocos Creator 3.8** 资源管理器 / 属性检查器可编辑字段，与 `lumen.inspect` / `lumen.assetSet`（路径 `assetRelativePath`）实现。  
> 权威源：Cocos Creator 3.8 资产文档、`packages/engine/modules/lumen/bundled/schema/assets.json`、`packages/engine/modules/lumen/source/standalone/*`。
> 状态：**✅ 已实现** · **⚠️ 部分** · **❌ 缺** · **⊘ 有意只读/不做** · **— 官方无独立字段**

写入一律：`peanut.editor-mcp.lumen-asset-set` → `props`；改盘后 `lumen.refresh` / `lumen.commit`。  
**不**改 `library/` / `temp/`；不复刻笔刷 / shader 图 / 图集预览窗。

Prefab / Scene 走节点树 + 组件策展（`lumen.tree` / `node*` / `comp*` / `bind*`），本表不展开组件白名单。

---

## 图例：存储位置

| 缩写 | 含义 |
|------|------|
| `meta.userData.*` | 旁路 `.meta` 顶层 userData |
| `subMetas.<id>.userData.*` | 子资源 meta（如 texture / spriteFrame） |
| 文档 JSON / 文本 | 资产源文件本体（`.mtl` / `.anim` / `.effect`…） |

---

## 1. 2D / UI

### 1.1 图像 Image（`.png` / `.jpg` / …）

官方：[图像资源](https://docs.cocos.com/creator/3.8/manual/zh/asset/image.html) · [压缩纹理](https://docs.cocos.com/creator/3.8/manual/zh/asset/compress-texture.html)

| 官方检视器 | meta / 存储 | Lumen `props` | 状态 |
|------------|-------------|---------------|------|
| Type（raw / texture / normal / sprite-frame / texture cube） | `meta.userData.type` | `image.type` | ✅（写 `userData.type` 后须 `lumen.refresh` / `asset.reimport` 触发 Import） |
| useCompressTexture | `meta.userData.useCompressTexture` | `image.useCompressTexture` | ✅ |
| presetId（压缩预设） | `meta.userData.presetId` | `image.presetId`（空串清除） | ✅ |
| 平台压缩覆盖 | `meta.userData.compressSettings.<platform>` | `image.compressSettings.platforms` / AutoAtlas 同字段 | ✅ |
| Flip Vertical | `meta.userData.flipVertical` 等 | `image.flipVertical` | ✅ |
| Bake Offline Mipmaps | `meta.userData` | `image.bakeOfflineMipmaps` | ✅ |
| Fix Alpha Transparency Artifacts | `meta.userData.fixAlphaTransparencyArtifacts` | `image.fixAlphaTransparencyArtifacts` | ✅ |
| Is RGBE | `meta.userData`（cube） | `image.isRGBE` | ✅ |
| Flip Green Channel | `meta.userData`（法线） | `image.flipGreenChannel` | ✅ |

### 1.2 Texture2D 子资源

官方：[纹理贴图](https://docs.cocos.com/creator/3.8/manual/zh/asset/texture.html)

| 官方检视器 | meta / 存储 | Lumen `props` | 状态 |
|------------|-------------|---------------|------|
| Wrap Mode S/T | `subMetas.<texture>.userData.wrapModeS/T` | `texture.wrapModeS` / `wrapModeT` | ✅ |
| Min / Mag / Mip Filter | `…minfilter` / `magfilter` / `mipfilter` | `texture.minfilter` / `magfilter` / `mipfilter` | ✅ |
| Anisotropy | `…anisotropy` | `texture.anisotropy` | ✅ |
| Filter Mode 面板快捷项 | 映射到上述 filter | `texture.filterMode`（`point` / `bilinear` / `trilinear` / `nearest`）或分别写 `minfilter` / `magfilter` / `mipfilter` | ✅ |

### 1.3 SpriteFrame 子资源

官方：[SpriteFrame](https://docs.cocos.com/creator/3.8/manual/zh/asset/sprite-frame.html)

| 官方检视器 | meta / 存储 | Lumen `props` | 状态 |
|------------|-------------|---------------|------|
| Packable | `subMetas.<sf>.userData.packable` | `spriteFrame.packable` | ✅ |
| Trim Type | `…trimType` | `spriteFrame.trimType` | ✅ |
| Trim Threshold | `…trimThreshold` | `spriteFrame.trimThreshold` | ✅ |
| Trim X/Y/Width/Height（Custom） | `…trimX` 等 | `spriteFrame.trimX/trimY/width/height`（写入即强制 `trimType: custom`） | ✅ |
| Border Top/Bottom/Left/Right | `…border*` | `spriteFrame.border*` | ✅ |
| Pivot X/Y | `…pivotX/Y` | `spriteFrame.pivotX` / `pivotY` | ✅ |
| Pixels To Unit | `…pixelsToUnit` | `spriteFrame.pixelsToUnit` | ✅ |
| Mesh Type | `…meshType` | `spriteFrame.meshType` | ✅ |
| Rotated / Offset | 只读 | inspect 可读 | ⊘ |

### 1.4 Auto Atlas（`.pac`）

| 官方 / Importer | meta / 存储 | Lumen `props` | 状态 |
|-----------------|-------------|---------------|------|
| 打包尺寸/边距/算法等 | `meta.userData` pack 族 | `pack.maxWidth/Height`、`padding`、`allowRotation`、`forceSquared`、`powerOfTwo`、`algorithm`、`format`、`quality`、`contourBleed`、`paddingBleed`、`filterUnused`、`remove*InBundle` | ✅ |
| 输出贴图过滤 | texture 族 | `texture.wrapMode*` / `*filter` / `anisotropy` | ✅ |
| useCompressTexture / presetId | 同图像压缩 | `useCompressTexture` / `presetId` + `compressSettings.platforms` | ✅ |
| 合图预览 | UI | — | ⊘ |

### 1.5 LabelAtlas（`.labelatlas`）

| 官方 | 存储 | Lumen `props` | 状态 |
|------|------|---------------|------|
| SpriteFrame | `meta.userData.spriteFrameUuid` | `spriteFrameUuid` | ✅ |
| Item Width/Height | `itemWidth` / `itemHeight` | 同左 | ✅ |
| Start Char | `startChar` | 同左 | ✅ |
| Font Size | `fontSize` | inspect 只读 | ⊘ |

### 1.6 字体 / 图集 / 粒子

| 资产 | 扩展 | 官方可写（摘要） | Lumen `props` | 状态 |
|------|------|------------------|---------------|------|
| BitmapFont | `.fnt` | texture、fontSize | `textureUuid`、`fontSize` | ✅ |
| TTF/OTF | `.ttf/.otf` | 基本无可写 | — | ⊘ |
| Sprite Atlas（TexturePacker `.plist`） | `.plist` | 子图只读 | inspect `spriteFrames` | ⊘ |
| Particle（`.plist`） | `.plist` | 多为导入只读 | inspect `spriteFrameUuid` | ⊘ |
| Spine | `.skel` 等 | atlas 绑定 | `atlasUuid` | ✅ |
| DragonBones | `.dbbin` 等 | 弱 | — | ⊘ |
| TiledMap | `.tmx` | 弱 | — | ⊘ |

### 1.7 RenderTexture（`.rt`）

| 官方 | 存储 | Lumen `props` | 状态 |
|------|------|---------------|------|
| Width / Height | `meta.userData` + 源 `content.w/h` | `width` / `height` | ✅ |
| Wrap / Filter / Anisotropy | `userData` | `texture.*` | ✅ |
| 预览 | UI | — | ⊘ |

---

## 2. 3D / 渲染

### 2.1 模型 FBX / glTF（`.fbx` / `.gltf` / `.glb`）

只改 `.meta`，不改模型二进制。

| 官方页 | meta / 存储 | Lumen `props` | 状态 |
|--------|-------------|---------------|------|
| Model · Normals / Tangents / MorphNormals | `userData.normals` 等 | `model.normals` / `tangents` / `morphNormals` | ✅ |
| Model · Skip Validation 等布尔 | `userData.*` | `model.skipValidation`、`disableMeshSplit`、`allowMeshDataAccess`、`addVertexColor`、`promoteSingleRootNode`、`generateLightmapUVNode` | ✅ |
| FBX · Animation Bake Rate | `userData.fbx.animationBakeRate` | `fbx.animationBakeRate`（`0\|24\|25\|30\|60`） | ✅ |
| FBX · Prefer Local Time Span / Smart Material | `userData.fbx.*` | `fbx.preferLocalTimeSpan` / `smartMaterialEnabled` | ✅ |
| Legacy FBX Importer | `userData.legacyFbxImporter` | `fbx.legacyFbxImporter` | ✅ |
| Material · Dump / Vertex Colors / Depth Write | `userData.*` | `material.dumpMaterials`、`materialDumpDir`、`useVertexColors`、`depthWriteInAlphaModeBlend` | ✅ |
| 内嵌图 remap | `userData.imageMetas[]` | `imageMetas[{name,uri?,remap}]` | ✅ |
| 子网格列表 | `subMetas` | inspect `subAssets` | ⊘（只读） |

### 2.2 Material（`.mtl`）

| 官方 | 存储 | Lumen `props` | 状态 |
|------|------|---------------|------|
| Name | 文档 `_name` | `name` | ✅ |
| Effect Asset | uuid 引用 | `effectAsset` | ✅ |
| Technique | index | `technique` | ✅ |
| Defines / Props / States | 文档体 | `defines` / `props` / `states` | ✅ |

### 2.3 Effect / Chunk（`.effect` / chunk）

| 官方 / 能力 | 存储 | Lumen `props` | 状态 |
|-------------|------|---------------|------|
| YAML properties | 源 YAML | `properties` | ✅ |
| CCProgram 源 | 源文本 | `programs.<name>` | ✅ |
| 整文件 | 源 | `source` / `effectYaml` | ✅ |
| Shader Graph UI | — | — | ⊘ |

### 2.4 PhysicsMaterial（`.pmtl`）

| 官方 | 存储 | Lumen `props` | 状态 |
|------|------|---------------|------|
| Name | `_name` | `name` | ✅ |
| Friction / Rolling / Spinning | `_friction` 等 | `friction` / `rollingFriction` / `spinningFriction` | ✅ |
| Restitution | `_restitution` | `restitution` | ✅ |

### 2.5 Terrain（`.terrain`）

| 官方 / 能力 | 存储 | Lumen `props` | 状态 |
|-------------|------|---------------|------|
| Name / Tile Size / Block Count | 原生 payload | `name` / `tileSize` / `blockCount` | ✅ |
| Weight / Light Map Size | payload | `weightMapSize` / `lightMapSize` | ✅ |
| Layer Infos | payload | `layerInfos` | ✅ |
| 高度（全图 / 窗 / 点） | heightCodes | `flatHeight` / `heights` / `region`+`heights` / `samples` / `ramp` | ✅ |
| 笔刷面板 | UI | — | ⊘ |

### 2.6 AnimationClip（`.anim`）

| 官方 | 存储 | Lumen `props` | 状态 |
|------|------|---------------|------|
| Name / Sample / Speed / Wrap / Duration | 文档头 | `name` / `sample` / `speed` / `wrapMode` / `duration` | ✅ |
| Enable TRS Blending | 文档 | `enableTrsBlending` | ✅ |
| Events | 文档 | `events` | ✅ |
| Curves（结构化） | 文档 | `curves` | ✅ |
| Raw tracks / curveDatas | 文档 | `tracks` / `curveDatas` + `allowRawTracks:true` | ⚠️（需显式放行） |

### 2.7 Animation Graph 族

| 资产 | 可写字段（Lumen） | 状态 | 不做 |
|------|-------------------|------|------|
| `.animgraph` | `name`、`layers[{index,name,weight,mask}]`、`variables[{name,type,value,remove}]` | ✅ | 状态机节点图 |
| `.animgraphvari` | `name`、`graph`、`clips` | ✅ | — |
| `.animask` | `name`、`joints` | ✅ | 骨架树 UI |

### 2.8 Render Pipeline 族

| 资产 | Lumen `props` | 状态 |
|------|---------------|------|
| `.rpp` | `name` / `tag` / `flows` / `flowUuids` | ✅ |
| `.flow` | `name` / `priority` / `tag` / `stageUuids` | ✅ |
| `.stg` | `name` / `priority` / `tag` | ✅ |

### 2.9 CubeMap（`.cubemap`）

| 官方 | Lumen `props` | 状态 |
|------|---------------|------|
| 六面 uuid | `faces.{left,right,top,bottom,front,back}` | ✅ |
| Filter / Wrap / FaceSize / MipBake | `texture.*`（含 `mipBakeMode`） | ✅ |

### 2.10 Instantiation dump（只读 meta）

| 扩展 | 说明 | 状态 |
|------|------|------|
| `.mesh` / `.skeleton` / `.animation` / `.material` | 引擎 dump；inspect 只读 uuid/importer | ⊘ |

---

## 3. 通用 / 工程

| 资产 | Lumen `props` | 状态 |
|------|---------------|------|
| 文件夹 Bundle | `isBundle`、`bundleName`、`priority`、`compressionType`、`isRemoteBundle` | ✅ |
| 音频 | `downloadMode`（`0\|1` / `WEB_AUDIO\|DOM_AUDIO`） | ✅ |
| 视频 | — | ⊘ |
| TypeScript `.ts` | `source`（全文）；`.meta` 只读；Prefab 挂载仍走 `@property` 发现 | ✅ |
| JavaScript `.js` | `isPlugin`、`loadPluginInEditor/Web/Native/MiniGame` | ✅ |
| JSON / 文本 / Buffer | — | ⊘ |

---

## 4. Prefab / Scene（另轨）

| 能力 | 工具 | 状态 |
|------|------|------|
| 树巡检 | `lumen.tree` | ✅ |
| 节点检视（省略 `nodePath` → 根） | `lumen.inspect` | ✅ |
| 增删改节点 / 组件 / 绑定 | `lumen.node*` / `comp*` / `bind*` / `structure` | ✅ |
| 组件字段全量 vs 引擎 | 策展 + 发现层 | ⚠️（持续对表白名单） |

---

## 5. 缺口优先（内容面）

| 优先级 | 项 | 说明 |
|--------|----|------|
| P1 | Texture Filter Mode **面板别名** | 已落地：`texture.filterMode` |
| — | 各类预览 / 笔刷 / 状态机图 | 有意不做 |

P0 图像 compress/type/trim、AutoAtlas compress、**平台压缩覆盖**（`compressSettings.platforms`）已落地；改 meta 后须 `lumen.refresh` / `asset.reimport`。

资产生命周期（`asset.copy` / `move` / `rename` / `delete` / `createFolder` / `asset.reimport`）见 [LUMEN-ROADMAP.md § V](./LUMEN-ROADMAP.md#v--资产生命周期静默盘写--refresh)，**不在本检视器对照表**。

---

## 6. 维护说明

- Sidecar 字段以 `packages/engine/modules/lumen/bundled/schema/assets.json` 为准；文档类以对应 `standalone/*.ts` 的 `applyPatch` allow-list 为准。
- 新增官方字段：先补 schema / 文档类，再更新本表状态列。
- 关联：[LUMEN-ROADMAP.md](./LUMEN-ROADMAP.md) · [LUMEN-AI-PLAYBOOK.md](./LUMEN-AI-PLAYBOOK.md)
