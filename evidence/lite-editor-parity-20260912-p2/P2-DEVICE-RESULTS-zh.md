# P2 真机结果

时间：2026-09-12 01:22:38 UTC+8
通过：10/10

- [PASS] directWriteEnabled: error=None
- [PASS] schema-probe:open-accepts-control: error=core_cocos_mcp_execution_approval_required:asset.open
- [PASS] schema-probe:importPlan-rejects-control: error=mcp_capability_input_invalid:peanut.editor-mcp.asset-import-plan
- [PASS] schema-probe:managedStatus-rejects-control: error=mcp_capability_input_invalid:peanut.editor-mcp.asset-managed-status
- [PASS] importPlan:no-lease: error=None
- [PASS] managedStatus:no-lease: error=None
- [PASS] asset.open:no-lease-directWrite: error=core_cocos_mcp_execution_approval_required:asset.open
- [PASS] asset.open:with-lease: error=None
- [PASS] asset.open:with-approvalId: error=None
- [PASS] asset.open:hub-plan-path-no-directWrite: error=None
