# peanut-asset-catalog

Peanut Cocos **核心**资产检索表（`core/asset-catalog`）。职责：path ↔ uuid（及类型分桶）快查，落盘到项目 `.peanut-ai/asset-catalog/`。

**不读取、不依赖 `library/` / `temp/`。** 引擎缓存由 Creator 本机再生，不入库。

## 重建后端（同一 schema）

| 后端 | 何时用 | 输入 |
|------|--------|------|
| meta 扫描（默认） | 离线 / CLI / CI | `assets/**/*.meta` |
| AssetDB 消息 | Creator 已 Import 且在线 | `query-assets` / `query-asset-info` |

条目同时包含：

- `uuid`：普通资产 Prefab `__uuid__` 绑定（含 `@f9941` 子资源）
- `compressedUuid`：脚本组件 `__type__` / ClickEvent `_componentId`（本地 compress，接口不直接给）

## 命令

```bash
npm run build
node dist/cli.js refresh --project /path/to/CreatorProject
node dist/cli.js query --project /path/to/CreatorProject --type script --name SeatItem
```

默认输出：`<project>/.peanut-ai/asset-catalog/`

分桶含 `script` / `prefab` / `scene` / `material` / `animationClip` / `animationGraph` / `physicsMaterial` / `terrain` / `effect` / `model` / `mesh` / `autoAtlas` / `font` / `audio` / `video` / `spine` / `dragonBones` / `cubeMap` / `tiledMap` / `particle` / `spriteAtlas` / `renderTexture` / `renderPipeline` / `renderFlow` / `renderStage` / `buffer` 等；未单独分桶的 importer 进 `other`。Catalog 只做 path↔uuid 检索，**不等于**该资产已可经 lumen 编辑。`instantiation-mesh` / `instantiation-material` / `instantiation-animation` 分别进 `mesh` / `material` / `animationClip`；`instantiation-skeleton` 仍进 `other`。

## 依赖图与换引用

- `FileAssetDependencyIndex`：磁盘序列化图依赖 / 反向依赖；`expand: ['materialTextures']` 展开材质→贴图。
- `SilentAssetReferenceReplace`：批量把序列化资产里的 `__uuid__` 从 A 换成 B（支持 `@sub`、`dryRun`）。
- MCP：`asset.queryDependencies` / `asset.replaceReferences`（经 `peanut.editor-mcp`）。

## 与 runtime.asset 的分工

- `peanut-runtime.asset`：Creator AssetDB bridge（在线点查 / 写入）
- 本包：产品索引（模糊搜、批量、离线）；宿主在 `assetDb.read` 时默认注入 `assetCatalog` grant
