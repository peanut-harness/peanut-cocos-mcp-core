# Peanut Pod Lite

Cocos Creator editor product. The current policy and schema catalogs cover 83 free operations: 38 reads and 45 writes/destructive operations. Native writes require a real local approval lease. Lite can sign in and upgrade a subscription; paid execution still requires the Pro package.

## Packages

- `pod-lite-capability-policy`: catalogs, schemas, input validation, approval leases, dispatch, and `EditorMcpGatewayAdapter` (83 ops when a gateway is injected).
- `mcp-pod-lite-creator-host`: Lite directory plugin. With a gateway it registers all 83 free ops; without one it falls back to nine native reads. Pack uses local esbuild (no `PEANUT_COCOS_EDITOR_ROOT`).
- `cocos-creator-lite-host-extension`: Creator 3.8 host, CPM integrity, account/upgrade panel, optional Pro. Missing Pro stays isolated from Lite startup.
- `creator-24-host` / `creator-35-host`: packable 2.4 and 3.0–3.5 hosts (not Creator-verified yet).
- `editor-mcp`, `asset-catalog`, `runtime`, `lumen`, `lumen-24`, `plugin-core`, `packaging`, `plugin-panel`: editor-island implementation packages moved from `products/cocos/editor`.
- `lumen-template-cache`: free cache-pack identification and request parsing.

See [migration ledger](docs/COCOS-MIGRATION-LEDGER.md) and [installation](docs/INSTALLATION.md). The user-designated acceptance project is `D:/workspaces/peanut-agents/test-demos/cocos-for-agent` (Creator 3.8.7). Unit tests do not establish Creator verification.
