# catalog + lumen 审批别名复验表

时间：2026-09-11 21:55:28 UTC+8 → 2026-09-11 21:55:33 UTC+8
Hub：:52935 connectionId=6f7e2d7c26c6e732a11179e0da5c3a51

## 中文结论（先行）

1. **P0 别名已生效**：写 schema 同时接受 `approvalId`/`approvalToken`；dispatcher 双传优先 `approvalId`；签发响应含 `approvalToken` 别名。
2. **catalog 写**：`asset.catalog.refresh` 无租约 → `approval_required`；lease 后仅 token / 仅 id 均 **PASS**。
3. **catalog/lumen 读**：`asset.catalog.summary` 及 Hub 暴露的 lumen 只读工具 **无需租约**；缺参时为业务错，非 `approval_required`。
4. **lumen 写全表**：无租约一律拒；lease 后 token/id 均越过审批门禁（成功或产品/业务错如缺模板/缺节点/缺 uuid）。
5. **附带修复**：editor-mcp `_stripHubControlFields` 增加剥离 `approvalId`；`lumen.bindController` 校验前同样剥离。
6. **剩余缺口**：`lumen.nodeRm`/`compRm` 在 Hub 层仍先要 `confirmDestructive`（Lite 写 schema 未声明该字段，带上会 `input_invalid`）；`lumen.nodeAdd` 缺 bundled empty 模板；部分 bind/structure 需真实图数据。非本 P0 别名回归失败。

## 清单

- Lite 写 focus：asset.catalog.refresh, lumen.scaffold, lumen.structure, lumen.nodeAdd, lumen.nodeRm, lumen.nodeRename, lumen.nodeReorder, lumen.compAdd, lumen.compRm, lumen.compSet, lumen.assetSet, lumen.nodeSet, lumen.bindClick, lumen.bindSprite, lumen.bindSpriteBatch, lumen.bindRef, lumen.bindController, lumen.refresh, lumen.commit
- Lite 读 focus：asset.catalog.summary
- Hub catalog tools：peanut.editor-mcp.asset-catalog-lookup, peanut.editor-mcp.asset-catalog-refresh, peanut.editor-mcp.asset-catalog-summary
- Hub lumen tools：peanut.editor-mcp.lumen-asset-set, peanut.editor-mcp.lumen-bind-click, peanut.editor-mcp.lumen-bind-controller, peanut.editor-mcp.lumen-bind-ref, peanut.editor-mcp.lumen-bind-sprite, peanut.editor-mcp.lumen-bind-sprite-batch, peanut.editor-mcp.lumen-cocos-info, peanut.editor-mcp.lumen-commit, peanut.editor-mcp.lumen-comp-add, peanut.editor-mcp.lumen-comp-rm, peanut.editor-mcp.lumen-comp-set, peanut.editor-mcp.lumen-compile-recipe, peanut.editor-mcp.lumen-inspect, peanut.editor-mcp.lumen-lod-recalc-bounds, peanut.editor-mcp.lumen-node-add, peanut.editor-mcp.lumen-node-rename, peanut.editor-mcp.lumen-node-reorder, peanut.editor-mcp.lumen-node-rm, peanut.editor-mcp.lumen-node-set, peanut.editor-mcp.lumen-refresh, peanut.editor-mcp.lumen-scaffold, peanut.editor-mcp.lumen-schema, peanut.editor-mcp.lumen-structure, peanut.editor-mcp.lumen-templates, peanut.editor-mcp.lumen-tree, peanut.editor-mcp.lumen-validate-refs

## 结果计数

```json
{
  "PASS": 15,
  "REFUSED_AS_EXPECTED": 21,
  "PASS_PRODUCT_OR_BUSINESS": 30,
  "PASS_BUSINESS_OR_UNAVAILABLE": 5,
  "FAIL": 1,
  "SKIP": 0
}
```

## 门禁回归失败数：0
（无：无租约拒 + 有租约不因 approval/schema 别名失败）

## 明细表

| family | operation | phase | verdict | error | skipReason |
|---|---|---|---|---|---|
| catalog-read | asset.catalog.summary | read-no-lease | PASS |  |  |
| catalog-read | asset-catalog-lookup | read-no-lease | PASS_BUSINESS_OR_UNAVAILABLE | editor_mcp_catalog_lookup_requires_uuid_or_type_or_name_or_path |  |
| lumen-read | lumen-cocos-info | read-no-lease | PASS |  |  |
| lumen-read | lumen-compile-recipe | read-no-lease | PASS_BUSINESS_OR_UNAVAILABLE | mcp_capability_input_invalid:peanut.editor-mcp.lumen-compile-recipe |  |
| lumen-read | lumen-inspect | read-no-lease | PASS_BUSINESS_OR_UNAVAILABLE | editor_mcp_lumen_prefabRelativePath_required |  |
| lumen-read | lumen-lod-recalc-bounds | read-no-lease | PASS |  |  |
| lumen-read | lumen-schema | read-no-lease | PASS |  |  |
| lumen-read | lumen-templates | read-no-lease | PASS |  |  |
| lumen-read | lumen-tree | read-no-lease | PASS_BUSINESS_OR_UNAVAILABLE | editor_mcp_lumen_prefabRelativePath_required |  |
| lumen-read | lumen-validate-refs | read-no-lease | PASS_BUSINESS_OR_UNAVAILABLE | editor_mcp_lumen_prefabRelativePath_required |  |
| catalog-write | asset.catalog.refresh | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:asset.catalog.refresh |  |
| catalog-write | asset.catalog.refresh | with-lease-approvalToken | PASS |  |  |
| catalog-write | asset.catalog.refresh | with-lease-approvalId | PASS |  |  |
| lumen-write | lumen.refresh | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.refresh |  |
| lumen-write | lumen.refresh | with-lease-approvalToken | PASS |  |  |
| lumen-write | lumen.refresh | with-lease-approvalId | PASS |  |  |
| lumen-write | lumen.commit | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.commit |  |
| lumen-write | lumen.commit | with-lease-approvalToken | PASS |  |  |
| lumen-write | lumen.commit | with-lease-approvalId | PASS |  |  |
| lumen-write | lumen.scaffold | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.scaffold |  |
| lumen-write | lumen.scaffold | with-lease-approvalToken | PASS |  |  |
| lumen-write | lumen.scaffold | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.scaffold |  |
| lumen-write | lumen.scaffold | with-lease-approvalId | PASS |  |  |
| lumen-write | lumen.structure | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.structure |  |
| lumen-write | lumen.structure | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | editor_mcp_lumen_structure_recipe_name_required |  |
| lumen-write | lumen.structure | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | editor_mcp_lumen_structure_recipe_name_required |  |
| lumen-write | lumen.nodeAdd | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.nodeAdd |  |
| lumen-write | lumen.nodeAdd | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | lumen_template_missing:D:\workspaces\peanut-agents\test-demos\cocos-for-agent\peanut-plugins\plugins\peanut.pod-lite\0.1.0\bundled\default_p |  |
| lumen-write | lumen.nodeAdd | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | lumen_template_missing:D:\workspaces\peanut-agents\test-demos\cocos-for-agent\peanut-plugins\plugins\peanut.pod-lite\0.1.0\bundled\default_p |  |
| lumen-write | lumen.nodeRename | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.nodeRename |  |
| lumen-write | lumen.nodeRename | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | lumen_child_missing:SmokeRoot/ChildA |  |
| lumen-write | lumen.nodeRename | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | lumen_child_missing:SmokeRoot/ChildA |  |
| lumen-write | lumen.nodeReorder | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.nodeReorder |  |
| lumen-write | lumen.nodeReorder | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | lumen_child_missing:ChildB |  |
| lumen-write | lumen.nodeReorder | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | lumen_child_missing:ChildB |  |
| lumen-write | lumen.nodeSet | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.nodeSet |  |
| lumen-write | lumen.nodeSet | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | lumen_child_missing:SmokeRoot/ChildB |  |
| lumen-write | lumen.nodeSet | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | lumen_child_missing:SmokeRoot/ChildB |  |
| lumen-write | lumen.compAdd | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.compAdd |  |
| lumen-write | lumen.compAdd | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | lumen_child_missing:SmokeRoot/ChildB |  |
| lumen-write | lumen.compAdd | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | lumen_child_missing:SmokeRoot/ChildB |  |
| lumen-write | lumen.compSet | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.compSet |  |
| lumen-write | lumen.compSet | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | lumen_child_missing:SmokeRoot/ChildB |  |
| lumen-write | lumen.compSet | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | lumen_child_missing:SmokeRoot/ChildB |  |
| lumen-write | lumen.assetSet | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.assetSet |  |
| lumen-write | lumen.assetSet | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | lumen_standalone_asset_not_open |  |
| lumen-write | lumen.assetSet | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | lumen_standalone_asset_not_open |  |
| lumen-write | lumen.bindSprite | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.bindSprite |  |
| lumen-write | lumen.bindSprite | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | lumen_bind_sprite_uuid_invalid:00000000-0000-0000-0000-000000000000 |  |
| lumen-write | lumen.bindSprite | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | lumen_bind_sprite_uuid_invalid:00000000-0000-0000-0000-000000000000 |  |
| lumen-write | lumen.bindSpriteBatch | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.bindSpriteBatch |  |
| lumen-write | lumen.bindSpriteBatch | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | lumen_bind_sprite_uuid_invalid:00000000-0000-0000-0000-000000000000 |  |
| lumen-write | lumen.bindSpriteBatch | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | lumen_bind_sprite_uuid_invalid:00000000-0000-0000-0000-000000000000 |  |
| lumen-write | lumen.bindClick | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.bindClick |  |
| lumen-write | lumen.bindClick | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | lumen_bind_click_handler_must_be_user_script:cc.Button:pass_project_script_name_or_uuid |  |
| lumen-write | lumen.bindClick | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | lumen_bind_click_handler_must_be_user_script:cc.Button:pass_project_script_name_or_uuid |  |
| lumen-write | lumen.bindRef | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.bindRef |  |
| lumen-write | lumen.bindRef | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | lumen_component_missing:cc.Node:node=1 |  |
| lumen-write | lumen.bindRef | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | lumen_component_missing:cc.Node:node=1 |  |
| lumen-write | lumen.bindController | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:lumen.bindController |  |
| lumen-write | lumen.bindController | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | editor_mcp_bind_script_not_found:assets/__missing_controller.ts |  |
| lumen-write | lumen.bindController | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | editor_mcp_bind_script_not_found:assets/__missing_controller.ts |  |
| lumen-write | lumen.compRm | no-lease | REFUSED_AS_EXPECTED | cocos_mcp_destructive_confirmation_required |  |
| lumen-write | lumen.compRm | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | cocos_mcp_destructive_confirmation_required |  |
| lumen-write | lumen.compRm | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | cocos_mcp_destructive_confirmation_required |  |
| lumen-write | lumen.nodeRm | no-lease | REFUSED_AS_EXPECTED | cocos_mcp_destructive_confirmation_required |  |
| lumen-write | lumen.nodeRm | with-lease-approvalToken | PASS_PRODUCT_OR_BUSINESS | cocos_mcp_destructive_confirmation_required |  |
| lumen-write | lumen.nodeRm | with-lease-approvalId | PASS_PRODUCT_OR_BUSINESS | cocos_mcp_destructive_confirmation_required |  |
| cleanup | asset.delete | cleanup-temp | FAIL_SCHEMA | mcp_capability_input_invalid:peanut.editor-mcp.asset-delete |  |
| lumen-write | scene.createNode | no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:scene.createNode |  |
| lumen-write | scene.createNode | with-lease-approvalToken | PASS |  |  |
| scene-sample-cleanup | scene.reload | with-lease-approvalId | PASS |  |  |