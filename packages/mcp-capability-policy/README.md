# @peanut/cocos-mcp-capability-policy

Public, dependency-free access-policy primitives shared by the Cocos MCP Hub and capability plugins.

The package intentionally does not contain entitlement verification, signing keys, proprietary workflow definitions, or asset data handling.

`CoreCocosMcpCapabilityCatalog` is fail-closed: only explicitly listed read-only operations are public. `CoreCocosNativeWriteCapabilityCatalog` is the companion open-source migration ledger for 29 native Cocos write/destructive operations. Every one remains free (`local` access) but requires a local approval lease; destructive operations retain explicit confirmation. Its exact MCP schemas and Creator execution adapters are deliberately migrated in follow-up batches.

SnowB, Figma/PSD and UI Prefab integrations are not native Core capabilities and remain private paid-support integrations. Other operation families retain their existing ledger assignment until separately classified.

`McpApprovalLeaseStore` is a generic in-memory local confirmation primitive. It binds a short-lived approval to a bridge connection, resource scope, operation allowlist, and maximum risk; it does not implement commercial entitlement.
