# Lite 能力迁移矩阵

更新时间：2026-09-12。源实现参考为 `peanut-agents/products/cocos/editor/plugins/integrations/editor-mcp`；状态统计当前 `peanut-pod-lite` Creator host 是否已把 Lite 公开 operation 接到 `EditorMcpGatewayAdapter`。 **Creator 3.8.7 实机冒烟/毕业（host-verified）已具备证据**：`evidence/creator38-lite-graduation-20260912/`（83/83 带参全表；网关齐；quiet-gate；Pro 未注册）。诚实边界：host-verified 指网关/租约/执行路径打通，不等于每条业务语义零错误。

## 总览

| 范围 | 总数 | 网关已接入 | 尚未接入 | 说明 |
| --- | ---: | ---: | ---: | --- |
| 只读 | 38 | 38 | 0 | 含 `asset.importPlan`/`asset.managedStatus`（P2 迁回 read）；有网关时由 `EditorMcpGatewayAdapter` 注册；无网关时仍回退 9 项 `CoreCocosCreatorReadAdapter` |
| 本地审批写入/破坏性 | 45 | 45 | 0 | 写入走 dispatcher 审批租约 + 网关 router 端口 |
| Lite 合计 | 83 | 83 | 0 | 83 项网关已接线；**Creator 3.8.7 host-verified 毕业证据已落盘** |

`preview.capture` 不在 Lite 范围内，属于 Pro；SnowB 同样排除，不得注册。

## 按域汇总

| 域 | 总数 | 只读 | 写入/破坏性 | 网关已接入 | 尚未接入 |
| --- | ---: | ---: | ---: | ---: | ---: |
| editor | 4 | 3 | 1 | 4 | 0 |
| asset | 27 | 13 | 14 | 27 | 0 |
| scene | 11 | 5 | 6 | 11 | 0 |
| prefab | 6 | 1 | 5 | 6 | 0 |
| preview | 3 | 2 | 1 | 3 | 0 |
| builder | 4 | 3 | 1 | 4 | 0 |
| lumen | 26 | 8 | 18 | 26 | 0 |
| reference | 2 | 1 | 1 | 2 | 0 |
| **合计** | **83** | **36** | **47** | **83** | **0** |

## 逐项状态

状态含义：

- **网关已接入**：Lite host 在提供 `gateway`/`router`/`executeOperation` 时注册该 operation，并由 `EditorMcpGatewayAdapter` 转发到注入的 router 端口；mock 回归覆盖 83 项注册。
- **已接入（回退读取）**：无网关时仍由 `CoreCocosCreatorReadAdapter` 注册的 9 项读取。
- **Creator 冒烟未验证**：网关接线不等于已在 Creator 3.8.7 实机跑通。

| 域 | Operation | 类型 | 当前状态 | 目标迁移批次 |
| --- | --- | --- | --- | --- |
| editor | `editor.queryVersion` | 只读 | 网关已接入 | 已完成 |
| editor | `editor.queryProject` | 只读 | 网关已接入 | 已完成 |
| editor | `editor.querySelection` | 只读 | 网关已接入 | 已完成 |
| editor | `editor.setSelection` | 写入 | 网关已接入 | A：Editor/Scene 基础 |
| asset | `asset.queryInfo` | 只读 | 网关已接入 | B：AssetDB 读取 |
| asset | `asset.catalog.summary` | 只读 | 网关已接入 | B：AssetDB 读取 |
| asset | `asset.catalog.lookup` | 只读 | 网关已接入 | B：AssetDB 读取 |
| asset | `asset.queryDependencies` | 只读 | 网关已接入 | B：AssetDB 读取 |
| asset | `asset.waitReady` | 只读 | 网关已接入 | B：AssetDB 读取 |
| asset | `asset.scanMissingReferences` | 只读 | 网关已接入 | B：AssetDB 读取 |
| asset | `asset.findReferencingNodes` | 只读 | 网关已接入 | B：AssetDB 读取 |
| asset | `asset.resolve` | 只读 | 网关已接入 | B：AssetDB 读取 |
| asset | `asset.search` | 只读 | 网关已接入 | B：AssetDB 读取 |
| asset | `asset.auditUnmanagedWrites` | 只读 | 网关已接入 | B：AssetDB 读取 |
| asset | `asset.queryPropertySchema` | 只读 | 网关已接入 | B：AssetDB 读取 |
| asset | `asset.queryInheritance` | 只读 | 网关已接入 | B：AssetDB 读取 |
| asset | `asset.queryCompatibleTypes` | 只读 | 网关已接入 | B：AssetDB 读取 |
| asset | `asset.catalog.refresh` | 写入 | 网关已接入 | C：AssetDB 写入 |
| asset | `asset.importPlan` | 写入前计划 | 网关已接入 | C：AssetDB 写入 |
| asset | `asset.import` | 写入 | 网关已接入 | C：AssetDB 写入 |
| asset | `asset.managedStatus` | 写入通道 | 网关已接入 | C：AssetDB 写入 |
| asset | `asset.replaceReferences` | 破坏性 | 网关已接入 | C：AssetDB 写入 |
| asset | `asset.open` | 写入通道 | 网关已接入 | C：AssetDB 写入 |
| asset | `asset.copy` | 写入 | 网关已接入 | C：AssetDB 写入 |
| asset | `asset.move` | 写入 | 网关已接入 | C：AssetDB 写入 |
| asset | `asset.rename` | 写入 | 网关已接入 | C：AssetDB 写入 |
| asset | `asset.createFolder` | 写入 | 网关已接入 | C：AssetDB 写入 |
| asset | `asset.delete` | 破坏性 | 网关已接入 | C：AssetDB 写入 |
| asset | `asset.reimport` | 写入 | 网关已接入 | C：AssetDB 写入 |
| asset | `asset.writeText` | 写入 | 网关已接入 | C：AssetDB 写入 |
| asset | `asset.ensureSpriteFramesBatch` | 写入 | 网关已接入 | C：AssetDB 写入 |
| scene | `scene.getCurrent` | 只读 | 网关已接入 | 已完成 |
| scene | `scene.getHierarchy` | 只读 | 网关已接入 | 已完成 |
| scene | `scene.queryCurrentEditorResource` | 只读 | 网关已接入 | A：Editor/Scene 基础 |
| scene | `scene.resolvePrefabRootUuid` | 只读 | 网关已接入 | A：Editor/Scene 基础 |
| scene | `scene.queryNode` | 只读 | 网关已接入 | A：Editor/Scene 基础 |
| scene | `scene.restoreEditorResource` | 写入 | 网关已接入 | A：Editor/Scene 基础 |
| scene | `scene.open` | 写入 | 网关已接入 | A：Editor/Scene 基础 |
| scene | `scene.save` | 写入 | 网关已接入 | A：Editor/Scene 基础 |
| scene | `scene.reload` | 写入 | 网关已接入 | A：Editor/Scene 基础 |
| scene | `scene.focusNode` | 写入 | 网关已接入 | A：Editor/Scene 基础 |
| scene | `scene.createNode` | 写入 | 网关已接入 | A：Editor/Scene 基础 |
| prefab | `prefab.getInfo` | 只读 | 网关已接入 | D：Prefab |
| prefab | `prefab.createFromNode` | 写入 | 网关已接入 | D：Prefab |
| prefab | `prefab.apply` | 写入 | 网关已接入 | D：Prefab |
| prefab | `prefab.revert` | 写入 | 网关已接入 | D：Prefab |
| prefab | `prefab.unpack` | 写入 | 网关已接入 | D：Prefab |
| prefab | `prefab.unlink` | 写入 | 网关已接入 | D：Prefab |
| preview | `preview.query` | 只读 | 网关已接入 | 已完成 |
| preview | `preview.queryErrors` | 只读 | 网关已接入 | E：Preview/Builder |
| preview | `preview.refresh` | 写入 | 网关已接入 | E：Preview/Builder |
| builder | `builder.queryPlatforms` | 只读 | 网关已接入 | 已完成 |
| builder | `builder.querySchema` | 只读 | 网关已接入 | 已完成 |
| builder | `builder.queryDefaultConfig` | 只读 | 网关已接入 | 已完成 |
| builder | `builder.build` | 写入 | 网关已接入 | E：Preview/Builder |
| lumen | `lumen.schema` | 只读 | 网关已接入 | F：Lumen |
| lumen | `lumen.templates` | 只读 | 网关已接入 | F：Lumen |
| lumen | `lumen.tree` | 只读 | 网关已接入 | F：Lumen |
| lumen | `lumen.inspect` | 只读 | 网关已接入 | F：Lumen |
| lumen | `lumen.validateRefs` | 只读 | 网关已接入 | F：Lumen |
| lumen | `lumen.compileRecipe` | 只读 | 网关已接入 | F：Lumen |
| lumen | `lumen.cocosInfo` | 只读 | 网关已接入 | F：Lumen |
| lumen | `lumen.lodRecalcBounds` | 只读 | 网关已接入 | F：Lumen |
| lumen | `lumen.scaffold` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.structure` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.nodeAdd` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.nodeRm` | 破坏性 | 网关已接入 | F：Lumen |
| lumen | `lumen.nodeRename` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.nodeReorder` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.compAdd` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.compRm` | 破坏性 | 网关已接入 | F：Lumen |
| lumen | `lumen.compSet` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.assetSet` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.nodeSet` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.bindClick` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.bindSprite` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.bindSpriteBatch` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.bindRef` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.bindController` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.refresh` | 写入 | 网关已接入 | F：Lumen |
| lumen | `lumen.commit` | 写入 | 网关已接入 | F：Lumen |
| reference | `reference.queryImage` | 只读 | 网关已接入 | G：Reference |
| reference | `reference.setImage` | 写入 | 网关已接入 | G：Reference |

## 迁移批次与验收

### A：Editor/Scene 基础（10 项）

复用参考 editor 的 Editor/Scene gateway，但改写为 Lite host 的受限 Creator Message/AssetDB port；写入必须携带宿主解析后的资源范围并消费本地审批租约。验收覆盖选区设置、场景打开/保存/重载、节点查询与创建、Prefab 根解析，以及停用后的注销。

### B：AssetDB 读取（13 项）

先接 `AssetDB` 只读端口和本地 asset catalog 查询；磁盘诊断类操作不得直接把旧 router 引入 Lite。验收覆盖真实 `company-tests/assets` 快照、UUID/path 双向解析、依赖/反向依赖和缺失引用扫描。

### C：AssetDB 写入（14 项）

接入 import/copy/move/rename/delete/write/reimport 等受控端口；`replaceReferences`、`delete` 和覆盖导入按破坏性风险处理。每项都要验证输入拒绝、审批范围不匹配拒绝、失败无部分提交、AssetDB refresh/ready 可观测。

### D：Prefab（6 项）

接入 Prefab/Scene 编辑端口，保留 apply/revert/unpack/unlink 的风险区分；禁止以文件复制模拟 Creator Prefab 操作。验收使用项目现有 Prefab 与可恢复备份。

### E：Preview/Builder（3 项）

补齐 preview 错误/刷新和 builder build；构建执行必须有平台参数、输出范围和审批，不能把查询 adapter 当作 build 实现。

### F：Lumen（26 项）

先迁入 Lite 已有 `lumen-template-cache` 的 Creator import/reset/AssetDB refresh port，再接 schema/tree/inspect/validate/compile 只读与 Prefab 写入。`lumen.commit` 必须是可观测的最终提交步骤，所有写入仍走本地审批。

### G：Reference（2 项）

接入 reference image 的查询/设置端口，校验图片路径、场景范围和输出资源；不得把 Pro 的 capture 混入 Lite。

## 当前结论

Lite 的公开边界、风险目录、输入 schema、本地审批和 **83 项网关接线**已经完整（`EditorMcpGatewayAdapter`；无网关时回退 9 项读取）。`preview.capture` 与 SnowB 始终排除。Creator 3.8.7 实机冒烟仍未验证，不得记录为 host-verified。后续按 A→B→C→D→E→F→G 做 fixture parity 与 `company-tests` 冒烟。

## 2026-09-12 免费面对齐盘点（lite-editor-parity）

- 对照旧岛 `products/cocos/editor`：公开 **83** 项网关/schema 仍全齐；Hub 实机 **84**（+ `issue-local-approval-lease`）。
- Pro 排除不变：`preview.capture` / snowb / ui-prefab / sdf / AVM / content-delivery / Figma·PSD。
- **行为差 P0 已修**：写工具 `control()` 增加 `resources`（与旧岛 Hub `_writeControl` 对齐），避免旧客户端带 `resources` 时 `mcp_capability_input_invalid`。
- 真机抽样（cocos-for-agent 3.8.7）：`asset.catalog.refresh` / `asset.createFolder` / `asset.delete` 带 `resources`+租约 PASS；无租约仍 `approval_required`。
- 证据：`evidence/lite-editor-parity-20260912/`（GAP-MATRIX / FIXED / REMAINING / CONCLUSION / device-verify-resources）。
- 免费面对齐度粗估 **~97%**（P1 @ 2026-09-12 01:07:25 UTC+8）；`sessionBound` 已对齐；prefab/builder/import/preview 真机 42/42；剩余见 `evidence/lite-editor-parity-20260912-p1/REMAINING-zh.md`。
