# Peanut Pod Lite

Public, free Cocos Creator capabilities. The current policy and schema catalogs cover 83 operations: 36 reads and 47 writes/destructive operations. Native writes require a real local approval lease; no subscription or online plan is required.

## Packages

- `pod-lite-capability-policy`: catalogs, schemas, input validation, approval leases and dispatch.
- `mcp-pod-lite-creator-host`: registers nine native reads (version, project, selection, scene snapshot/hierarchy, Builder queries and preview query). The remaining 74 operations still need real host adapters and Creator parity verification.
- `cocos-creator-lite-host-extension`: native extension entry, CPM `installed.json` discovery, exact payload integrity checks, process-local service isolation, and optional Pro loading. Missing or invalid Pro packages remain isolated from Lite startup.
- `lumen-template-cache`: free cache-pack identification and request parsing, moved from Pro. Import/reset/AssetDB refresh still require a native adapter.

See [migration ledger](docs/COCOS-MIGRATION-LEDGER.md) and [installation](docs/INSTALLATION.md). The user-designated acceptance project is `D:/workspaces/peanut-agents/test-demos/cocos-for-agent` (Creator 3.8.7). Unit tests do not establish Creator verification.
