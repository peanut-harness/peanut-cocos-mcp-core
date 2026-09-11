# P1 真机矩阵结果（prefab / builder / import / preview / sessionBound）

时间：2026-09-12 01:05:49 UTC+8
汇总：**42/42 PASS**

| family | operation | phase | verdict | error |
| --- | --- | --- | --- | --- |
| sessionBound | issue-local-approval-lease#sessionBound | contract | PASS |  |
| lease | issue-local-approval-lease#matrix | setup | PASS |  |
| prefab | prefab.getInfo | read | PASS |  |
| builder | builder.queryPlatforms | read | PASS |  |
| builder | builder.queryDefaultConfig | read | PASS |  |
| builder | builder.querySchema | read | PASS |  |
| preview | preview.query | read | PASS |  |
| preview | preview.queryErrors | read | PASS |  |
| preview | preview.refresh | write-no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:preview.refresh |
| builder | builder.build | write-no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:builder.build |
| prefab | prefab.apply | write-no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:prefab.apply |
| prefab | prefab.revert | write-no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:prefab.revert |
| prefab | prefab.unpack | write-no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:prefab.unpack |
| prefab | prefab.unlink | write-no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:prefab.unlink |
| prefab | prefab.createFromNode | write-no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:prefab.createFromNode |
| asset | asset.import | write-no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:asset.import |
| asset | asset.move | write-no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:asset.move |
| asset | asset.replaceReferences | write-no-lease | REFUSED_AS_EXPECTED | cocos_mcp_destructive_confirmation_required |
| asset | asset.open | write-no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:asset.open |
| asset | asset.importPlan | write-no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:asset.importPlan |
| asset | asset.managedStatus | write-no-lease | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:asset.managedStatus |
| asset | asset.createFolder | write-with-lease | PASS |  |
| asset | asset.writeText | write-with-lease | PASS |  |
| asset | asset.reimport | write-with-lease | PASS |  |
| asset | asset.rename | write-with-lease | PASS |  |
| asset | asset.copy | write-with-lease | PASS |  |
| asset | asset.move | write-with-lease | PASS |  |
| asset | asset.import | write-with-lease | PASS |  |
| asset | asset.replaceReferences | write-with-lease | PASS |  |
| asset | asset.ensureSpriteFramesBatch | write-with-lease | PASS |  |
| preview | preview.refresh | write-with-lease | PASS |  |
| builder | builder.build | write-with-lease | PASS_PRODUCT_OR_BUSINESS | editor_mcp_destructive_confirmation_required |
| prefab | prefab.apply | write-with-lease | PASS |  |
| prefab | prefab.revert | write-with-lease | PASS |  |
| prefab | prefab.unpack | write-with-lease | PASS_PRODUCT_OR_BUSINESS | editor_mcp_destructive_confirmation_required |
| prefab | prefab.unlink | write-with-lease | PASS_PRODUCT_OR_BUSINESS | editor_mcp_destructive_confirmation_required |
| prefab | prefab.createFromNode | write-with-lease | PASS |  |
| asset | asset.delete | write-with-lease | PASS |  |
| asset | asset.open | write-no-control-schema | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:asset.open |
| asset | asset.importPlan | write-no-control-schema | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:asset.importPlan |
| asset | asset.managedStatus | write-no-control-schema | REFUSED_AS_EXPECTED | core_cocos_mcp_execution_approval_required:asset.managedStatus |
| quiet-gate | project.log#error:approval_required | observe | PASS |  |
