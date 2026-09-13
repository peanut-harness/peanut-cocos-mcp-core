# Lumen AI Playbook

给 MCP / 自动化 Agent 用的最短操作手册。权威契约见 [`@peanut/pod-engine/lumen` README](../../../tools/lumen/README.md)。产品线（stable / early3x / creator2x）门禁与双消化器对照：[LUMEN-PRODUCT-LINE-PARITY.json](./LUMEN-PRODUCT-LINE-PARITY.json)。

**定位：** 改 Creator 里能检视的资产源文件（及 `.meta`），不写 `library/`。独立资产用 `inspect`（可省略 `nodePath`）和 `lumen.assetSet`；不要为每种操作新加工具。图片 Texture / SpriteFrame meta、Effect 源、FBX / glTF meta、Auto Atlas、LabelAtlas、Animation Graph / Variant / Mask、RenderTexture、Render Pipeline、音频 / 视频 / TTF / BitmapFont meta、Spine / DragonBones meta、CubeMap / TiledMap / 文件夹 Bundle meta 已覆盖；字段级对照见 [ASSET-INSPECTOR-PARITY.md](./ASSET-INSPECTOR-PARITY.md)；其余 importer 见 [LUMEN-ROADMAP.md](./LUMEN-ROADMAP.md)。

## 真实调用链

```text
Cursor / MCP Client
  → cpm mcp bridge --project <Creator 工程绝对路径>
  → 127.0.0.1 Hub（.peanut-ai/cocos-mcp.json）
  → peanut.editor-mcp.* 工具
  → 写工具：先 plan → Plugin Manager 审批 → cocos.execute_plan
  → EditorMcpLumenGateway → LumenSession（Prefab / Scene / 独立资产）
```

demo 工程可直接用 `.cursor/mcp.json`（已指向上述 bridge）。**Agent 发现：** `.cursor/skills/peanut-editor-mcp/SKILL.md`、`.peanut-ai/AGENT-MCP-QUICKREF.md`（`lumen-ai-doctor` 从 Hub 生成）。诊断：

```bash
cd products/cocos/editor
npm run lumen-ai-doctor -- --project ../../../test-demos/cocos-for-agent
```

报告含 `schemaFingerprint`：缺 `conventions` / `clickEvents` / 脚本发现时会 `schema_runtime_stale`（`ok: false`）。

## 固定管线

```text
1. peanut.editor-mcp.lumen-templates / lumen-schema / lumen-cocos-info
2. lumen-scaffold
3. lumen-structure（可设 autoCommit:true）/ node* / comp* / lumen-asset-set
4. lumen-commit（若未 autoCommit）—— prefab/scene 会附带 validation
5. lumen-bind-click / lumen-bind-sprite / lumen-bind-ref（先 asset.queryCompatibleTypes）
6. lumen-tree / lumen-inspect
7. 验收：validateRefs（或看 commit.validation）→ preview.refresh → preview.queryErrors → 可选 preview.capture
```

不要跳过第 4 步就去 `bind*`：catalog 未更新时脚本 uuid 会 miss。

### Agent 默认验收流水线（强制习惯）

三条车道互不混用：

| 车道 | 用途 | 典型工具 |
|------|------|----------|
| `lumen-offline` | 静默改 `.prefab` / `.scene` / 资产 | `lumen.*`、`asset.import*`、`asset.copy/move/rename/delete/createFolder/reimport` |
| `editor-ui` | 给人看 / 选区 / live 层级 | `scene.open`、`setSelection`、`focusNode` |
| `preview` | 写后验收 | `preview.refresh` → `queryErrors` → `capture?` |

写盘后**默认**只走 `lumen-offline` → `preview`，不要旁路手改 prefab/scene/anim JSON，**禁止** `scene.save`，**不要**把 `scene.open` / `scene.reload` 当写盘前置：

```text
lumen.* / asset.import*                         # lane:lumen-offline
  → lumen.commit({ paths: ['.prefab'|'.scene', ...] })   # pipeline 含 validate_refs
  → 若 validation[].ok === false：修 bind*/refs，再 commit（recommendedNext → lumen.validateRefs）
  → 若 validation ok：跟 recommendedNext → preview.refresh({ refreshAssets: true })  # lane:preview
  → preview.queryErrors({ sinceOffset })  # 用写前 logOffset；看 verdict=pass|fail；无 sinceOffset 时 verdict=observe（不算失败）
  → 可选 preview.capture / asset.auditUnmanagedWrites
  → （可选，lane:editor-ui）scene.open / setSelection：仅当需要给人看成品时
```

实机探针（Creator 已开工程 + Hub）：

```bash
cd products/cocos/editor
npm run probe:agent-accept -- --project ../../../test-demos/cocos-plugin-verify
# 高强度高批次 + Agent 反模式：
npm run probe:mcp-concurrency-stress -- --project ../../../test-demos/cocos-plugin-verify
# 可选截图：再加 --capture
```

产物：`.peanut-ai/artifacts/agent-accept-pipeline.json`、`.peanut-ai/artifacts/mcp-concurrency-stress/stress-*.json`。

| 信号 | 怎么处理 |
|------|----------|
| `commit.pipeline` 无 `validate_refs` | `paths` 没含 `.prefab`/`.scene`；补上再 commit |
| `commit.acceptancePipeline` | 机器可读整条验收链；跟 `recommendedNext` 走即可（只到 preview，不含 scene.open） |
| `preview.queryErrors.verdict=pass\|fail` | **仅 sinceOffset 模式**；fail 才修写并重跑验收 |
| `preview.queryErrors.verdict=observe` | 无 sinceOffset：历史观测，**不是失败**；用 `logOffset` 再查增量 |
| `capability.lane` / description `[lane:…]` | catalog 分流；写盘勿调 `editor-ui` |
| `validation[].summary.ignoredEngineDefaultUuid > 0` | 引擎/default_prefab 内置图被忽略，不算失败 |
| `preview.query.source=fallback` + `live_tried=…` | Creator message 未命中；Browser Preview 开着即可用端口 fallback |
| Hub 写并发 | 同资源 `LumenResourceWriteLock` 串行；全局写槽默认 ≤16；优先 batch recipe + 一次 commit |
| 大批量写卡顿 | **根因**：每次 `lumen.commit` 打一轮 AssetDB/`refresh-asset`，Assets 面板重建。**做法**：多文件离线写完 → **一次** `lumen.commit({ paths:[...] })`；短窗内多次 refresh 由 `LumenAssetDbRefreshCoalescer`（默认 350ms）自动合并。**commit 返回前**会 `flush` 合并窗并做 hierarchy settle（等 AssetDB 登记 + ready），再给 `recommendedNext → preview.refresh`。禁止「每改一个 scene 就 commit」 |
| Agent 逐步 commit（反模式） | **写法门禁**：≥2 文件必须一次 `paths[]` commit。Skill：`peanut-lumen-write`；静态 `npm run test:agent-write-gate`；实机 `npm run probe:mcp-bulk-write-stress -- --agent-write-gate`（逐步标 `antiPattern: true`；结构门禁 = 一次 commit + paths≥2。墙钟对比仅观测；`--require-batch-faster` 或 `--count ≥16` 才把「batch 更快」纳入 fail） |
| `auditUnmanagedWrites` 有条目 | 有人旁路写盘；改回 MCP/lumen 路径 |
| `scene.save` → `scene_save_refused` | 预期；改走 lumen 离线写 |

写工具不可见时：Plugin Manager → MCP → `peanut.editor-mcp` → **全部**；或确保 `.peanut-ai/cocos-mcp-settings.json` 含 `writeEnabledPluginIds: ["peanut.editor-mcp"]` 后重启 Creator / 调 Hub `reloadSettings`。

## 资源导入（必经 MCP；堵所有 Cursor AI）

把 png / atlas / skel / fnt / 图集闭包等**导入**进 `db://assets/**` 时，**只允许** MCP；禁止 Write / `cp` / 编辑器外写盘。

```text
1. peanut.editor-mcp.asset-import-plan  → 依赖闭包 + 分层计划（只读）
2. 编辑器批准写 plan / 持有有效 approvalToken（默认同资源约 10s 空闲租约；签发时可 `sessionBound: true` → 5min/30min）
3. peanut.editor-mcp.asset-import       → 分层导入 + 每层 AssetDB ready + project.log postflight
4. peanut.editor-mcp.asset-ensure-sprite-frames-batch → 经 save-asset-meta 确保 PNG 具备 @f9941 SpriteFrame（禁止改盘 .meta + reimport）
```

**客户端硬门（Cursor / Cloud Agent）：** 工程须含 `.cursor/hooks.json`（`failClosed`）：

- `preToolUse` matcher `Write|Delete|Shell` → deny 非源码扩展名写入 `assets/`
- `beforeShellExecution` → deny `cp`/`mv`/`rsync` 等把引擎资产拷进 `assets/`
- **不拦截** MCP 工具（导入必须走 Hub）

种子：

```bash
cd products/cocos/editor
npm run seed-cursor-asset-import-guard -- --project <Creator工程绝对路径>
# 或随 install-lumen-ai-demo 自动写入
```

```json
{
  "name": "peanut.editor-mcp.asset-import-plan",
  "arguments": {
    "sources": ["/abs/or/project-relative/hero.png", "/abs/or/project-relative/hero.atlas", "/abs/or/project-relative/hero.skel"]
  }
}
```

```json
{
  "name": "peanut.editor-mcp.asset-import",
  "arguments": {
    "sources": ["/abs/or/project-relative/hero.png", "/abs/or/project-relative/hero.atlas", "/abs/or/project-relative/hero.skel"],
    "target": "db://assets/spines/hero",
    "approvalToken": "<from editor batch approval>",
    "overwrite": false
  }
}
```

```json
{
  "name": "peanut.editor-mcp.asset-ensure-sprite-frames-batch",
  "arguments": {
    "dbPaths": ["db://assets/spines/hero/hero.png"],
    "refreshRoot": "db://assets/spines/hero"
  }
}
```

约束：

- `overwrite: true` 或 `mode: "override"` → risk=`destructive`，必须 `confirmDestructive: true`
- Agent 轨（`cocos-creator` Profile）写盘 Grant 对 `assets/` **只放行源码扩展名**；引擎资产扩展名在 generation / Host 层直接拒绝
- Cursor Hooks 对同一扩展名策略再挡一层 Write/Shell（堵「所有 Cursor AI」，不只 peanut CLI）
- 导入序由服务端保证（Spine `png→atlas→skel|json`；DragonBones；BMFont `dir→png→fnt` 等），不要手排顺序绕过
- MCP 客户端直接调一级工具 `peanut.editor-mcp.asset-import` / `peanut.editor-mcp.asset-import-plan`（输入即该 operation 入参）

写安全与验证矩阵见本 playbook 各节及 `npm run verify:mcp-safety` / `verify:mcp-gate`。

### 测试直写（跳过 plan 审批）

联调时可在 `.peanut-ai/cocos-mcp-settings.json` 设 `"directWriteEnabled": true`，或调 Hub：

```json
{ "action": "setDirectWriteEnabled", "isEnabled": true }
```

此后写工具与只读一样直接 `call` 执行，不再返回待审批 plan。正式环境请保持 `false`。

## 资产生命周期（工程内 copy / move / rename / delete / 换引用）

已在 `db://assets/**` 登记的资源，**改布局或删盘**走静默 MCP（lane:`lumen-offline`），不走 Creator 确认框 / 回收站 / `save-asset`：

```text
asset.createFolder → asset.copy（闭包 + 换新 uuid）
  → asset.rename / asset.move（保留 uuid，迁 file+.meta）
  → asset.reimport（= lumen.refresh，对已登记路径 reimport）
  → asset.delete（confirmDestructive:true；集合外仍有依赖则拒绝）
  → asset.replaceReferences（批量换 __uuid__；先 dryRun）
  → asset.waitReady（导入/刷新后等 AssetDB query-ready）
```

**换图 / 换材质：**

```json
{
  "name": "peanut.editor-mcp.asset-query-dependencies",
  "arguments": {
    "uuid": "<prefab-or-material-uuid>",
    "direction": "dependencies",
    "expand": ["materialTextures"]
  }
}
```

```json
{
  "name": "peanut.editor-mcp.asset-replace-references",
  "arguments": {
    "fromUuid": "<old-image-or-sprite-uuid>",
    "toUuid": "<new-uuid>",
    "dryRun": true
  }
}
```

确认命中后去掉 `dryRun`；写后自动 `lumen.refresh` 改动文件，再走 commit / preview 验收。

**文本直写（Host / VERIFY / `.ts` / `.md` 等）：** Creator 开着时用 `asset.writeText`（可 `files[]` 批量），内部补齐目录 meta 后一次合并 `lumen.refresh`。**禁止**在编辑器打开时对 `assets/` 用 IDE/`prettier`/`writeFile` 批量直写——会触发 Assets 面板 `changed` 竞态（`project.log`：「original asset is not exist」）。

```json
{
  "name": "peanut.editor-mcp.asset-write-text",
  "arguments": {
    "files": [
      { "path": "assets/tests/pool/pool-mcp-host.ts", "content": "..." },
      { "path": "assets/tests/pool/VERIFY.md", "content": "..." }
    ]
  }
}
```

```json
{
  "name": "peanut.editor-mcp.asset-copy",
  "arguments": {
    "paths": ["assets/ui/Icon.png"],
    "targetDirectory": "assets/ui/backup"
  }
}
```

```json
{
  "name": "peanut.editor-mcp.asset-reimport",
  "arguments": { "paths": ["assets/ui/Icon.png"] }
}
```

```json
{
  "name": "peanut.editor-mcp.asset-delete",
  "arguments": {
    "paths": ["assets/ui/backup/Icon.png"],
    "confirmDestructive": true
  }
}
```

实机：`verify-lumen-c12.mjs`（见 [CREATOR-VERIFY.md](./CREATOR-VERIFY.md) §5.7）。

## 黄金样例（Hub / bridge）

只读可直接 `tools/call`；写入会返回待审批 plan，在编辑器内批准后调用 `cocos.execute_plan`。

**Prefab vs 场景（默认强制）：** UI `.prefab` 用 `empty`（无 Canvas / Camera），挂到场景后由场景补齐可视根；`ui/Canvas` **只**用于 `.scene`（除非调用方明确例外）。

```json
{
  "name": "peanut.editor-mcp.lumen-scaffold",
  "arguments": {
    "prefabRelativePath": "assets/Game.scene",
    "rootName": "Game",
    "template": "ui/Canvas"
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-scaffold",
  "arguments": {
    "prefabRelativePath": "assets/ui/Demo.prefab",
    "rootName": "Demo",
    "template": "empty"
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-scaffold",
  "arguments": {
    "assetRelativePath": "assets/fx/Lit.mtl",
    "rootName": "Lit",
    "template": "standard"
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-inspect",
  "arguments": {
    "assetRelativePath": "assets/fx/Lit.mtl"
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/fx/Lit.mtl",
    "props": { "props": { "roughness": 0.2 } }
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/anim/Idle.anim",
    "props": { "wrapMode": "Loop", "sample": 30 }
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-inspect",
  "arguments": {
    "assetRelativePath": "assets/land/Field.terrain",
    "region": { "x": 16, "z": 16, "radius": 8 }
  }
}
```

返回 `asset.heights` 为该窗行主序高度，`asset.region` 为解析后的顶点盒，`asset.peaks` 为窗内峰值。同一 `region` 写回：

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/land/Field.terrain",
    "props": {
      "region": { "iMin": 14, "iMax": 18, "jMin": 14, "jMax": 18 },
      "heights": [4.2, 4.3]
    }
  }
}
```

`heights.length` 必须等于 `(iMax-iMin+1)*(jMax-jMin+1)`。稀疏点用 `samples: [{ i, j, height }]`。坐标：`x = i * tileSize`，`z = j * tileSize`（地形本地，不是节点世界坐标）。不要为「抬高/变陡」另加工具。

图片直接传源文件路径，Lumen 只改相邻 `.meta`，不改图片二进制：

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/ui/Icon.png",
    "props": {
      "image": { "fixAlphaTransparencyArtifacts": true },
      "texture": {
        "wrapModeS": "repeat",
        "minfilter": "linear",
        "mipfilter": "none",
        "anisotropy": 4
      },
      "spriteFrame": {
        "borderTop": 8,
        "borderBottom": 8,
        "borderLeft": 8,
        "borderRight": 8,
        "pivotX": 0.5,
        "pivotY": 0.5,
        "packable": true
      }
    }
  }
}
```

Effect 改 YAML `properties` 或 `CCProgram` 源，不做 shader graph：

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/fx/Unlit.effect",
    "props": {
      "properties": { "mainColor": [1, 0, 0, 1] },
      "programs": { "unlit-fs": "\n  vec4 frag () { return vec4(1.0);\n  }\n" }
    }
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/char/Hero.fbx",
    "props": {
      "model": { "normals": 1, "addVertexColor": true },
      "fbx": { "animationBakeRate": 30, "smartMaterialEnabled": true },
      "material": { "dumpMaterials": true },
      "imageMetas": [{ "name": "albedo", "remap": "<texture-uuid>" }]
    }
  }
}
```

FBX / glTF 只打开已有源文件，改相邻 `.meta`，不 scaffold、不改模型二进制。`animationBakeRate` 仅 `0|24|25|30|60`（`0` = auto）。子网格 uuid 见 inspect `subAssets`。

Auto Atlas 可 scaffold `.pac`，配置写 `.meta`，不做打包预览：

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/ui/Icons.pac",
    "props": {
      "pack": { "maxWidth": 2048, "padding": 4, "filterUnused": true },
      "texture": { "wrapModeS": "clamp-to-edge", "anisotropy": 4 }
    }
  }
}
```

LabelAtlas 可 scaffold `.labelatlas`，绑定字图并设格子；`fontSize` 只读：

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/ui/Digits.labelatlas",
    "props": {
      "spriteFrameUuid": "<sprite-frame-uuid>",
      "itemWidth": 16,
      "itemHeight": 24,
      "startChar": "0"
    }
  }
}
```

Animation Graph / Variant / Mask 可 scaffold，只改图层、变量、原图绑定与关节列表，不打开状态机节点图：

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/anim/Hero.animgraph",
    "props": {
      "layers": [{ "index": 0, "name": "Base", "weight": 1, "mask": "<animask-uuid>" }],
      "variables": [{ "name": "speed", "type": "FLOAT", "value": 1.5 }]
    }
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/anim/Hero.animgraphvari",
    "props": {
      "graph": "<animgraph-uuid>",
      "clips": [{ "original": "<clip-uuid>", "substitution": "<clip-uuid>" }]
    }
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/anim/Body.animask",
    "props": {
      "joints": [{ "path": "Root/Hips", "enabled": false }]
    }
  }
}
```

### 动画安全管线（黄金样例 · 禁止硬写 JSON）

论坛实测常见失败：Agent 手改 `.anim` / `.prefab` 序列化 → 五个预制全坏。动画统一走 lumen，禁止旁路。

| 资产 | 允许 | 禁止 |
|------|------|------|
| `.anim` | `wrapMode`/`sample`/`speed`/`events` + **`curves` 简写**（`path`+`property`+`keys`+`values`） | 手改文件；塞整份 clip dump；无 `allowRawTracks` 写 `tracks`/`curveDatas` |
| `.animgraph` | `name` / `layers` / `variables` | 状态机节点图字段 |
| `.animgraphvari` | `graph` / `clips` 替换 | 手改 JSON |
| `.animask` | `joints[].path`（骨骼层级 path） | 把节点**显示名**当 path |
| `.animation` dump | 只读 `inspect` meta | 任何写 dump 源 |

`curves[].path` / `joints[].path` / `curveDatas` 键 = **相对动画根的层级 path**（如 `Root/Hips`），不是 Inspector 里好看的显示名、也不是 `db://` 盘路径。改名节点后应改 path，勿假设「同名即同轨」。

`.anim` 推荐写：

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/anim/Idle.anim",
    "props": {
      "wrapMode": "Loop",
      "sample": 30,
      "events": [{ "frame": 0.5, "func": "onStep", "params": ["a"] }],
      "curves": [
        {
          "path": "Root",
          "property": "eulerAngles",
          "keys": [0, 2],
          "values": [[0, 0, 0], [0, 90, 0]]
        }
      ]
    }
  }
}
```

必须写引擎原始 `_tracks` / `curveDatas` 时显式：

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/anim/Idle.anim",
    "props": {
      "allowRawTracks": true,
      "tracks": [{ "_n": "…引擎轨道对象…" }]
    }
  }
}
```

写后：`lumen.commit`（prefab/scene 会附带 `validation`）→ 有层级改动时再 `preview.refresh` → `preview.queryErrors`。怀疑手改过盘：`asset.auditUnmanagedWrites`。

#### 动画黄金路径补强

1. **多轨 clip**：同一 `.anim` 里多条 `curves`（不同 `path`/`property`）；`events[].frame` 用秒。
2. **骨骼 mask**：先 `inspect` 读现有 `joints[].path`，再只改 `enabled`；path 必须对齐 clip 所用层级，禁止用显示名。
3. **Graph → Variant**：先 scaffold/set `.animgraph` 的 `layers`/`variables`，再用 `.animgraphvari` 的 `graph` uuid + `clips` 映射；不要手改状态机节点图 JSON。
4. **挂到节点**：Prefab 上 `cc.Animation` / `sp.Skeleton` 等用 `lumen.comp-set` / `bindRef`，不要把整份 clip dump 塞进组件。
5. **失败自检**：`lumen.inspect` 看 `kind`；raw tracks 被拒时去掉 dump 改 `curves`，或显式 `allowRawTracks:true`；`validateRefs` 对宿主报 `badAnimPath` 时改 clip path 或补齐子节点。

多轨 + 骨骼 mask 推荐写法：

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/anim/Walk.anim",
    "props": {
      "wrapMode": "Loop",
      "sample": 30,
      "curves": [
        {
          "path": "Root",
          "property": "eulerAngles",
          "keys": [0, 1],
          "values": [[0, 0, 0], [0, 90, 0]]
        },
        {
          "path": "Root/Hips",
          "property": "position",
          "keys": [0, 0.5, 1],
          "values": [[0, 0, 0], [0, 0.08, 0], [0, 0, 0]]
        }
      ]
    }
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/anim/Body.animask",
    "props": {
      "joints": [
        { "path": "Root/Hips", "enabled": true },
        { "path": "Root/Hips/Spine", "enabled": false }
      ]
    }
  }
}
```

挂 clip 到 Prefab：`lumen.comp-add` → `cc.Animation`，再用 `lumen.comp-set` / `bindRef` 绑 `defaultClip`；写后 `lumen.commit` → `validation` 应无 `badAnimPath`。

RenderTexture 可 scaffold `.rt`，尺寸写 `.meta` 并同步源 `content.w/h`，不做预览：

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/fx/Screen.rt",
    "props": {
      "width": 512,
      "height": 256,
      "texture": { "wrapModeS": "clamp-to-edge", "anisotropy": 8 }
    }
  }
}
```

Render Pipeline 可 scaffold `empty` 或 `forward`，只改 name / tag / 流名与优先级，不做 dump 树：

```json
{
  "name": "peanut.editor-mcp.lumen-scaffold",
  "arguments": {
    "assetRelativePath": "assets/fx/Forward.rpp",
    "rootName": "ForwardPipe",
    "template": "forward"
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/fx/Forward.rpp",
    "props": {
      "flows": [{ "index": 0, "name": "MainFlow", "priority": 10 }]
    }
  }
}
```

独立 Render Flow / Stage 是 `.flow` / `.stg`（不是 `.rflow` / `.rstage`），只改标量与 uuid 列表：

```json
{
  "name": "peanut.editor-mcp.lumen-scaffold",
  "arguments": {
    "assetRelativePath": "assets/fx/Main.flow",
    "rootName": "MainFlow"
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/fx/Main.flow",
    "props": {
      "name": "MainFlow",
      "priority": 3,
      "stageUuids": ["aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"]
    }
  }
}
```

音频 / 视频 / 字体只改相邻 `.meta`，不改源、不做播放器或字形预览；视频与 TTF 3.8 无可写字段：

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/sfx/Click.wav",
    "props": { "downloadMode": "DOM_AUDIO" }
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/fonts/Score.fnt",
    "props": { "textureUuid": "<sprite-frame-uuid>", "fontSize": 48 }
  }
}
```

Spine 只改相邻 `.meta` 的 `atlasUuid`，不做动画预览；DragonBones 3.8 无可写字段：

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/spine/Hero.skel",
    "props": { "atlasUuid": "<atlas-uuid>" }
  }
}
```

CubeMap 只改相邻 `.meta` 的六面 uuid 与过滤，不做预览；TiledMap 3.8 无可写字段；文件夹改 Bundle 开关：

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/sky/Sky.cubemap",
    "props": { "faces": { "left": "<image-uuid>" }, "texture": { "anisotropy": 8 } }
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/pack",
    "props": { "isBundle": true, "bundleName": "game-pack", "priority": 8 }
  }
}
```

粒子 / Sprite Atlas `.plist`、JSON / 文本与 Buffer `.bin` 3.8 无可写字段；`.plist` 须按旁路 `.meta` importer 打开，不要按扩展名猜。TypeScript `.ts` 与 instantiation dump（`.mesh` / `.skeleton` / `.animation` / `.material`）同样只读 `.meta`；JavaScript `.js` 可写插件开关，不改源：

```json
{
  "name": "peanut.editor-mcp.lumen-inspect",
  "arguments": {
    "assetRelativePath": "assets/fx/Smoke.plist"
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-inspect",
  "arguments": {
    "assetRelativePath": "assets/scripts/Probe.ts"
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-asset-set",
  "arguments": {
    "assetRelativePath": "assets/scripts/plugin.js",
    "props": { "isPlugin": true, "loadPluginInEditor": true }
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-inspect",
  "arguments": {
    "assetRelativePath": "assets/mesh/Cube.mesh"
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-inspect",
  "arguments": {
    "assetRelativePath": "assets/mesh/Skin.skeleton"
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-structure",
  "arguments": {
    "prefabRelativePath": "assets/ui/Demo.prefab",
    "parentPath": "/Demo",
    "recipe": {
      "name": "Title",
      "template": "ui/Label",
      "props": { "string": "Hello" }
    },
    "autoCommit": true
  }
}
```

```json
{
  "name": "peanut.editor-mcp.lumen-comp-set",
  "arguments": {
    "prefabRelativePath": "assets/ui/Demo.prefab",
    "nodePath": "/Demo/Title",
    "componentType": "cc.Label",
    "props": { "string": "Hi", "fontSize": 28 },
    "autoCommit": true
  }
}
```

复合组件优先 `lumen-node-add` 模板（如 `ui/ScrollView`），再用 `lumen-comp-set` 写 `nodeRef` / `componentRef`（值为节点路径字符串，如 `content: "/Demo/Scroll/view/content"`）。数组引用用 `nodeRefList` / `componentRefList`；`clickEvents` 可用 `eventHandlerList`（元素含 `target`/`component`/`handler`/`componentId`）；粒子 `bursts`、BlitScreen `materials` 用 `objectList`。`lumen-inspect` 返回白名单属性快照。

### `curveRange` / `gradientRange` 简写

`CurveRange.mode`：`0` Constant · `1` Curve · `2` TwoCurves（不收完整双样条）· `3` TwoConstants。  
`GradientRange.mode`：`0` Color · `1` Gradient · `2` TwoColors · `3` TwoGradients（不收）· `4` RandomColor（不收）。

| 写法 | 含义 |
|------|------|
| `rateOverTime: 20` | Constant：`mode=0, constant=20` |
| `{ mode: 3, constantMin: 4, constantMax: 12 }` | TwoConstants |
| `{ keys: [{ time: 0, value: 1 }, { time: 1, value: 3 }] }` | Curve：写入 `spline`（`cc.RealCurve` 简易点列表） |
| `{ r, g, b, a }` | Color：`mode=0` |
| `{ colorKeys: [{ time, color: { r,g,b,a } }], alphaKeys?: [{ time, alpha }] }` | Gradient：`mode=1` |

粒子子模块同一套简写，走 `objectPatch` 内嵌：

```json
{
  "colorOverLifetimeModule": { "enable": true, "color": { "colorKeys": [{ "time": 0, "color": { "r": 255, "g": 255, "b": 255, "a": 255 } }, { "time": 1, "color": { "r": 255, "g": 0, "b": 0, "a": 0 } }] } },
  "sizeOvertimeModule": { "enable": true, "size": { "keys": [{ "time": 0, "value": 1 }, { "time": 1, "value": 0.2 }] } },
  "velocityOvertimeModule": { "enable": true, "y": 12 }
}
```

`shapeModule.arcSpeed`、`forceOvertimeModule.x/y/z`、`limitVelocityOvertimeModule.limit*`、`rotationOvertimeModule.x/y/z` 同为 `curveRange`。

不要把 `inEngineNotInWhitelist` 自动写入白名单；`lumen.cocosInfo` 可传 `gapOffset` / `gapLimit` 分页。

脚本 `@property`：`lumen-schema` 传入脚本类名 / `assets/.../*.ts` / uuid / compressedUuid 时会半自动解析源码并注册；`lumen-comp-add`（scriptName）与随后的 `comp-set` / `inspect` 同样会 `ensure`。不支持完整 TS 类型系统与自定义类字段（会进 `skipped`）。仍可用会话 `registerScriptProperties` 手写覆盖。

### 脚本挂载与 @property 引用（Agent 必守）

**固定顺序**（跳过任一步易出 `catalog_miss` / `component_missing` / `componentRef_path`）：

```text
1. asset.catalog.refresh
2. lumen-scaffold / lumen-structure（ui/Button 模板已含 Label 子节点，勿重复 structure Label）
3. lumen-comp-add（scriptName = assets/.../foo.ts 或 foo.ts，勿在多脚本同名时只用 @ccclass）
4. lumen-schema（type = 同上 scriptName）→ 记 schema.component（compressedUuid）
5. 绑 @property(Label) 等：优先 lumen-comp-set（props: { sampleLabel: "/Root/SampleLabel" }）
   或 lumen-bind-ref（componentRef: { nodePath: "/Root/SampleLabel", type: "cc.Label" }）
6. lumen-bind-click（component = 脚本路径/文件名；handler = 方法名）
7. lumen-commit → validation.ok → preview.refresh → preview.queryErrors（sinceOffset 只看本次）
```

| 参数 | 正确 | 错误（常见） |
|------|------|----------------|
| `comp-add.scriptName` | `panel-host.ts` / `assets/ui/panel-host.ts` | 仅 `PanelHost`（@ccclass，多文件同名时 catalog 撞车） |
| `bind-click.component` | 同上 | 仅 @ccclass（除非工程内唯一且 catalog 能扫到） |
| `comp-set` / `bind-ref` 的 Label 引用 | `"/Root/SampleLabel"` 或 bind-ref 的 `componentRef.nodePath` | 把 `{ nodePath, type }` 塞进 `comp-set.props` |
| `comp-set.componentType` | `lumen-schema` 的 `component`（compressedUuid）或脚本 query | 未 comp-add 就 bind |
| ui/Button | 只 `comp-set` 改子 Label 文案 | 再 `structure` 一个 Label（重复子节点） |

多脚本同 `@ccclass` 或同名文件：删陈旧 re-export、用**完整 assets 路径**消歧。

### 挂载硬约束（Agent 必守）

先调 `lumen.schema`（无 `type`）读 `conventions`；查单个组件时看 `layerRole` / `rendererExclusive`。

1. **渲染互斥**：同一节点只能有一个 `cc.Renderer` 子类（`Label`/`Sprite`/`Graphics`/`ParticleSystem`/`Line`/`MeshRenderer`/`sp.Skeleton`…）。需要组合时拆子节点。lumen `comp-add` / recipe / 模板嵌入冲突会报 `lumen_renderer_exclusive`。
2. **Layers**：UI 节点用 `UI_2D`（`1<<25`）；3D/粒子/Line/Mesh 用 `DEFAULT`（`1<<30`）。挂载与模板嵌入会按组件倾向自动改 `_layer`；相机 Visibility 须覆盖对应 Layer。

## 插件内调试（仍可用）

```typescript
const call = (operation, input) =>
  pluginModule.dispatchMcpAction('cocos.call', { operation, input });

await call('lumen.templates', {});
await call('lumen.scaffold', {
  prefabRelativePath: 'assets/ui/Demo.prefab',
  rootName: 'Demo',
  template: 'empty',
});
```

## 硬约束

| 规则 | 说明 |
|------|------|
| 路径 | `prefabRelativePath` 或别名 `assetRelativePath`；禁止绝对路径与 `..`；`.prefab` / `.scene` / `.mtl` / `.anim` / `.pmtl` / `.terrain` / `.effect` / `.chunk` / `.ts` / `.js` / `.mesh` / `.skeleton` / `.animation` / `.material` 与常见图片扩展名同一字段 |
| 场景 | `.scene` scaffold 自动挂 `Main Camera`（clearFlags=14）+ `Main Light`，再挂 `template`（如 `ui/Canvas`）；Canvas 内 Camera 保持 clearFlags=6；`reset:true` 重建；不可在场景根 `comp-add` |
| 独立资产 | 无节点树；`inspect` 省略 `nodePath`；写入用 `lumen.assetSet` |
| 节点路径 | 必须以 `/` 开头，如 `/Demo/Title` 或 `/Game/Canvas/Title` |
| 属性 | 先 `lumen.schema` 策展字段；模板里已有的 Inspector 标量可经 `inspect` 发现后 `comp-set`（`origin=discovered`） |
| recipe | 内联 JSON，不要传磁盘 recipe 文件路径 |
| 写后收口 | 优先 `autoCommit: true`，或跟随写结果里的 `recommendedNext` 调 `lumen.commit`（prefab/scene 会返回 `validation`） |
| 验收闭环 | `lumen.validateRefs`（或 commit 内附带）→ `preview.refresh` → `preview.queryErrors` → 可选 `preview.capture` |
| 动画 path | `validateRefs` 会对照 clip 曲线/轨道 path 与宿主子层级，问题 kind=`badAnimPath` |
| 选区 / 聚焦 | `editor.setSelection({ paths })`；`scene.focusNode({ path })` |
| 场景持久化 | **禁止** `scene.save`；`.scene` 用 lumen 离线写 → `lumen.commit` → `preview.refresh`（验收）。`scene.open` / `scene.reload` 仅呈现用，不是写盘前置 |
| 缺失引用节点 | `asset.findReferencingNodes({ missingOnly:true, nodeNameContains? })`（对齐 PinK 33） |
| 批量换引用 | `asset.replaceReferences({ fromUuid, toUuid, dryRun? })`；依赖二跳 `queryDependencies` + `expand:['materialTextures']` |
| AssetDB 就绪 | `asset.waitReady`（或 lumen 包 `LumenAssetDbReadyWaiter`）；插件勿自写 sleep |
| 打开资源 | `asset.open({ path|uuid })` 薄层揭示；写权限需 exposure=all |
| 绑引用前 | `asset.queryCompatibleTypes`（类型名或脚本字段）再 `lumen.bind*` |
| 禁止旁路 | **禁止**手改 `.prefab` / `.scene` / `.anim` 等序列化 JSON；动画用 `curves`/`events`，原始轨道须 `allowRawTracks`；旁路侦测用 `asset.auditUnmanagedWrites` |
| 权限 | 写操作 MCP tool 需宿主 exposure=`all`；写完需在 Plugin Manager 批准 plan |

## `lumen.commit` 返回值

输入可用 `paths: string[]`，或与其它 lumen 写操作一致的单路径别名 `prefabRelativePath` / `assetRelativePath`（会并入 `paths`）。`lumen.refresh` 同此规则。

```json
{
  "editorRefresh": { "phase": "...", "result": { "triggered": true, "message": "..." } },
  "catalog": { "generatedAt": "...", "counts": { "...": 0 } },
  "validation": [{ "prefabRelativePath": "assets/ui/Demo.prefab", "ok": true, "issues": [], "summary": {} }],
  "pipeline": ["assetdb_refresh", "catalog_refresh", "validate_refs"],
  "recommendedNext": { "operation": "preview.refresh", "input": { "refreshAssets": true } },
  "nextHint": "..."
}
```

`validation` 仅当 `paths` / 别名指向 `.prefab` / `.scene` 时填充。`triggered: false` 时：当前进程没有可用的 `Editor.Message`（常见于无 Creator 宿主的单测）。在 Creator 内打开工程后重试，或手动 Import 后再 `lumen.commit` / `asset.catalog.refresh`。

## 黄金 recipe 索引

路径均相对 `test-demos/cocos-for-agent/tools/recipes/`。

| recipe | 期望产物 |
|--------|----------|
| `login-server-list.json` | `assets/ui/login/LoginPanel.prefab`（登录 + 服务器列表） |
| `ui-crud-panel.json` | UI CRUD 面板 |
| `mesh-crud-kit.json` | 3D mesh kit |
| `all-ui-kit.json` / `all-mesh-kit.json` / `all-light-kit.json` / `all-misc-kit.json` | 分组模板合集 |
| `all-default-prefab-templates.json` | 全量 42 个 default_prefab |
| `login-props/*.json` | 登录面板属性补丁 |

验证：`bash test-demos/cocos-for-agent/tools/build-login-panel.sh` · `bash test-demos/cocos-for-agent/tools/verify-prefab-crud.sh`。

## 失败码 → 修复

| 码 | 含义 | 怎么修 |
|----|------|--------|
| `lumen_renderer_exclusive` | 同节点两个 Renderer | 拆子节点再挂 |
| `lumen_renderer_exclusive_batch` | recipe 一次挂了多个 Renderer | 每个 Renderer 单独节点 |
| `lumen_layer_mismatch` | Layer 与组件倾向不符 | 信自动 `_layer`，或把 UI 放到 `UI_2D` |
| `lumen_component_deprecated` | LabelOutline / LabelShadow | 用 Label 的 outline/shadow 字段 |
| `lumen_property_not_editable` | 策展未开放且实例无法发现 | 先 `inspect`；再 `comp-set`；双样条用 `keysMin`/`keysMax` 或 `colorKeysMin`/`colorKeysMax` |
| `lumen_property_type:*:componentRef_path` | `comp-set` 把对象当引用值，或旧版 bind-ref bug | 引用值用节点路径字符串；或 `bind-ref` + `componentRef:{ nodePath, type }` |
| `lumen_catalog_miss` + `ccclass` hint | 仅用 @ccclass 且未扫到 / 未 refresh | 改 `assets/.../*.ts` 或文件名；先 `asset.catalog.refresh` |
| `lumen_catalog_ambiguous` + `reason:ccclass` | 多脚本同一 @ccclass | 用完整 assets 路径或删重复脚本 |
| `lumen_component_missing:*` | 未 `comp-add` 就 bind/set | 先挂脚本再 bind-ref / comp-set / bind-click |
| `lumen_cannot_attach_on_scene` | 在 `cc.Scene` 根上挂组件 | 把组件挂到子 `cc.Node`（UI 走 Canvas） |
| `lumen_cannot_remove_root` | 删除场景/Prefab 根 | 只删子节点 |
| `lumen_not_hierarchy_asset` | 对独立资产调了 `tree` / `node*` / `comp*` | 改用 `inspect`（无 nodePath）和 `lumen.assetSet` |
| `lumen_material_template_unknown` | 材质 template 不是 `empty`/`standard` | 用 `empty` 或 `standard` |
| `lumen_standalone_asset_not_open` | 未打开独立资产就 `assetSet` | 先 scaffold / open `.mtl` `.anim` `.pmtl` `.terrain` `.effect` `.pac` `.labelatlas` `.animgraph` `.animgraphvari` `.animask` `.rt` `.rpp` `.flow` `.stg`，或 open 已有图片 / 模型 / 音频 / 视频 / 字体 / Spine / DragonBones / CubeMap / TiledMap / 文件夹 / 粒子 / Sprite Atlas / JSON / 文本 / Buffer / 脚本 / instantiation dump |
| `lumen_effect_property_missing` | Effect 补丁改了 YAML 里不存在的 property | 先 inspect `properties` 再写 |
| `lumen_effect_program_missing` | `programs` 里的 CCProgram 名不存在 | 先 inspect `programs[].name` |
| `lumen_image_meta_missing` | 图片没有相邻 `.meta` | 先让 Creator Import 图片，再重试 |
| `lumen_image_property_not_editable` | 图片补丁写入生成字段或未知字段 | 只改 inspect 暴露的 `image` / `texture` / `spriteFrame` 可编辑项 |
| `lumen_model_scaffold_unsupported` | 对 `.fbx` / `.gltf` / `.glb` 调了 scaffold | 只 `inspect` / `assetSet` 已有模型 |
| `lumen_audio_scaffold_unsupported` | 对音频调了 scaffold | 只 `inspect` / `assetSet` 已有 `.wav` / `.mp3` 等 |
| `lumen_video_scaffold_unsupported` | 对视频调了 scaffold | 只 `inspect` 已有 `.mp4` 等；3.8 无可写字段 |
| `lumen_font_scaffold_unsupported` | 对 TTF / BitmapFont 调了 scaffold | 只 `inspect` / `assetSet` 已有 `.ttf` / `.fnt` |
| `lumen_spine_scaffold_unsupported` | 对 Spine 调了 scaffold | 只 `inspect` / `assetSet` 已有 `.skel` / Spine `.json` |
| `lumen_dragonbones_scaffold_unsupported` | 对 DragonBones 调了 scaffold | 只 `inspect` 已有 `.dbbin` / 图集 `.json` |
| `lumen_cubemap_scaffold_unsupported` | 对 CubeMap 调了 scaffold | 只 `inspect` / `assetSet` 已有 `.cubemap` |
| `lumen_tiledmap_scaffold_unsupported` | 对 TiledMap 调了 scaffold | 只 `inspect` 已有 `.tmx`；3.8 无可写字段 |
| `lumen_directory_scaffold_unsupported` | 对文件夹调了 scaffold | 只 `inspect` / `assetSet` 已有目录 `.meta` |
| `lumen_plist_scaffold_unsupported` | 对缺失的 `.plist` 调了 scaffold | 只 `inspect` 已有粒子或 Sprite Atlas `.plist` |
| `lumen_particle_scaffold_unsupported` | 对粒子调了 scaffold | 只 `inspect` 已有 `importer: particle` 的 `.plist`；3.8 贴图只读 |
| `lumen_spriteatlas_scaffold_unsupported` | 对 Sprite Atlas 调了 scaffold | 只 `inspect` 已有 `importer: sprite-atlas` 的 `.plist` |
| `lumen_json_scaffold_unsupported` | 对 JSON 配置调了 scaffold | 只 `inspect` 已有 `importer: json` 的 `.json`；Spine/DragonBones `.json` 走对应文档 |
| `lumen_text_scaffold_unsupported` | 对文本调了 scaffold | 只 `inspect` 已有 `.txt` / `.md` 等 |
| `lumen_script_scaffold_unsupported` | 对 TypeScript 调了 scaffold | 只 `inspect` 已有 `.ts`；`@property` 仍走 Prefab 挂载 |
| `lumen_javascript_scaffold_unsupported` | 对 JavaScript 调了 scaffold | 只 `inspect` / `assetSet` 已有 `.js` |
| `lumen_mesh_scaffold_unsupported` | 对 `.mesh` dump 调了 scaffold | 只 `inspect` 已有 `instantiation-mesh`；不改 dump 源 |
| `lumen_skeleton_scaffold_unsupported` | 对 `.skeleton` dump 调了 scaffold | 只 `inspect` 已有 `instantiation-skeleton`；不改 dump 源 |
| `lumen_instantiation_animation_scaffold_unsupported` | 对 `.animation` dump 调了 scaffold | 只 `inspect` 已有 `instantiation-animation`；与 `.anim` 剪辑分开 |
| `lumen_instantiation_material_scaffold_unsupported` | 对 `.material` dump 调了 scaffold | 只 `inspect` 已有 `instantiation-material`；与 `.mtl` 材质分开 |
| `lumen_script_property_not_editable` | TypeScript 补丁写入任意字段 | 3.8 无可写 Inspector 字段，补丁须为空对象，不改 `.ts` 源 |
| `lumen_javascript_property_not_editable` | JS 补丁写入未知字段 | 只改 `isPlugin` / `loadPluginInEditor` / `loadPluginInWeb` / `loadPluginInNative` / `loadPluginInMiniGame` |
| `lumen_mesh_property_not_editable` | mesh dump 补丁写入任意字段 | 不改引擎 dump 源，补丁须为空对象 |
| `lumen_skeleton_property_not_editable` | skeleton dump 补丁写入任意字段 | 不改引擎 dump 源，补丁须为空对象 |
| `lumen_instantiation_animation_property_not_editable` | `.animation` dump 补丁写入任意字段 | 不改 dump 源；`.anim` 剪辑仍走 `animationClip` |
| `lumen_instantiation_material_property_not_editable` | `.material` dump 补丁写入任意字段 | 不改 dump 源；`.mtl` 仍走 `material` |
| `lumen_spine_property_not_editable` | Spine 补丁写入未知字段 | 只改 `atlasUuid`；不做预览 |
| `lumen_dragonbones_property_not_editable` | DragonBones 补丁写入任意字段 | 3.8 无可写 Inspector 字段，补丁须为空对象 |
| `lumen_cubemap_property_not_editable` | CubeMap 补丁写入未知字段 | 只改 `faces` / `texture`；不做六面预览 |
| `lumen_tiledmap_property_not_editable` | TiledMap 补丁写入任意字段 | 3.8 无可写 Inspector 字段，补丁须为空对象 |
| `lumen_directory_property_not_editable` | 文件夹补丁写入未知字段 | 只改 `isBundle` / `bundleName` / `priority` / `compressionType` / `isRemoteBundle` |
| `lumen_particle_property_not_editable` | 粒子补丁写入任意字段 | 3.8 `spriteFrameUuid` 只读，补丁须为空对象 |
| `lumen_spriteatlas_property_not_editable` | Sprite Atlas 补丁写入任意字段 | 3.8 无可写 Inspector 字段，补丁须为空对象 |
| `lumen_json_property_not_editable` | JSON 补丁写入任意字段 | 3.8 检视器仅源预览，补丁须为空对象，不改 JSON 源 |
| `lumen_text_property_not_editable` | 文本补丁写入任意字段 | 3.8 检视器仅源预览，补丁须为空对象，不改文本源 |
| `lumen_audio_property_not_editable` | 音频补丁写入未知字段 | 只改 `downloadMode`（`0`/`WEB_AUDIO` 或 `1`/`DOM_AUDIO`） |
| `lumen_video_property_not_editable` | 视频补丁写入任意字段 | 3.8 检视器仅预览，补丁须为空对象 |
| `lumen_font_property_not_editable` | TTF 写了字段，或 BitmapFont 写了未知项 | TTF 补丁须为空；BitmapFont 只改 `textureUuid` / `fontSize` |
| `lumen_model_meta_missing` | 模型没有相邻 `.meta` | 先让 Creator Import 模型，再重试 |
| `lumen_model_property_not_editable` | 模型补丁写入未知字段 | 只改 inspect 暴露的 `model` / `fbx` / `material` / `imageMetas` |
| `lumen_auto_atlas_property_not_editable` | Auto Atlas 补丁写入未知字段 | 只改 `pack` / `texture`；不做预览 |
| `lumen_label_atlas_property_not_editable` | LabelAtlas 补丁写了 `fontSize` 等只读项 | 只改 `spriteFrameUuid` / `itemWidth` / `itemHeight` / `startChar` |
| `lumen_asset_uuid_unresolved` | `assetSet` 补丁含 catalog 不存在的 uuid（含 `@子资源`） | 先 catalog/inspect 取真实 uuid；空串可清空；写后 `commit` |
| `lumen_animation_graph_property_not_editable` | 动画图补丁写了状态机字段 | 只改 `name` / `layers` / `variables`；不做节点图 |
| `lumen_animation_clip_raw_tracks_blocked` | 写了 `tracks`/`curveDatas` 未开闸 | 改用 `curves`/`events`，或显式 `allowRawTracks:true` |
| `lumen_animation_clip_tracks_invalid` | raw tracks 含 clip dump / 非对象 | 不要塞整份 `.anim`；轨道须为引擎 track 对象 |
| `lumen_animation_clip_curve_path_invalid` | `curves[].path` 含空格/`..`/`\` | 用相对动画根的层级 path |
| `lumen_render_texture_property_not_editable` | RenderTexture 补丁写入未知字段 | 只改 `width` / `height` / `texture`；不做预览 |
| `lumen_render_pipeline_property_not_editable` | Pipeline 补丁写了 dump 树或 uuid 流名 | 只改 `name` / `tag` / `flows`（内嵌流）/ `flowUuids`（空管线） |
| `lumen_terrain_corrupt` | `.terrain` 无法按 VERSION8 / 早期 JSON 解码 | 用 `lumen.scaffold` 新建，或确认是 Creator 地形源 |
| `lumen_terrain_region_needs_heights` | 写了 `region` 却没有窗内 `heights` | 先 inspect 同一 region，改数组再写回 |
| `lumen_terrain_region_too_large` | 窗口超过 2048 顶点 | 缩小 radius / 顶点盒 |
| `editor_mcp_lumen_region_terrain_only` | Prefab/其它资产传了 `region` | 只给 `.terrain` 的 inspect 用 |
| `editor_mcp_lumen_nodePath_must_start_with_slash` | Prefab/Scene 的 nodePath 未以 `/` 开头 | 改成 `/Root/...`；省略 nodePath 则默认检视根节点 |
| `editor_mcp_lumen_path_conflict` | `prefabRelativePath` 与 `assetRelativePath` 不一致 | 只传一个，或两者相同 |
| `lumen_template_missing` | template id 不存在 | 先 `lumen.templates` |
| `lumen_cocos_info_gap_limit_invalid` | 分页参数非法 | `gapLimit` 1–200，`gapOffset` ≥ 0 |

## 不要做

- 不要把 lumen 注册为 `agents/plugins` Tool（产品边界）
- 不要维护 `library/` / `temp/`（Import 交给 Creator）
- 不要把 `inEngineNotInWhitelist` 写进策展表
- 不要另开 `lumen.scene-*` / `lumen.image-*`：新资产种类仍走 `assetRelativePath` + `inspect` / `assetSet`
- 不要把独立资产内部字段塞进 Prefab `comp-set`：走 `lumen.assetSet`
- 不要用克隆笔刷/曲线/着色器图 UI 代替文档读写；同一数据用字段或窗口（如地形 `region`）

装包：**权威入口** `npm run pack:demo -- --project <abs> [--with-host-extension]`（迭代加 `--skip-build`）。`install-lumen-ai-demo` 仅装 lumen + editor-mcp 子集；`install:plugin-system` **只 dry-run 选型**，不写盘。

实机验收清单：[`CREATOR-VERIFY.md`](./CREATOR-VERIFY.md)。补全计划：[`LUMEN-ROADMAP.md`](./LUMEN-ROADMAP.md)。

## preview.capture specified scene (P0)

Pass optional `scenePath` or `assetRelativePath` (project-relative `.scene`). Gateway prepares that scene only via confirm-free Creator messages / soft open-asset; otherwise returns `availability: refused`. Never use `scene.save` on the agent write path.
