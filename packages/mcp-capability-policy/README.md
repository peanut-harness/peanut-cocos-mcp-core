# @peanut/cocos-mcp-capability-policy

Public, dependency-free access-policy primitives shared by the Cocos MCP Hub and capability plugins.

The package intentionally does not contain entitlement verification, signing keys, proprietary workflow definitions, or asset data handling.

`CoreCocosMcpCapabilityCatalog` is fail-closed: only explicitly listed read-only operations are public. All other legacy operations remain private migration candidates until deliberately assigned to Core or Pro.

`McpApprovalLeaseStore` is a generic in-memory local confirmation primitive. It binds a short-lived approval to a bridge connection, resource scope, operation allowlist, and maximum risk; it does not implement commercial entitlement.
