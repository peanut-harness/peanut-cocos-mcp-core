# Creator host extension (Hub bridge)

Hub writes `.peanut-ai/cocos-mcp.json` only when a Creator **host** extension is installed under `extensions/` (or `packages/`):

- `peanut-pod` / `peanut-pod-35` / `peanut-pod-24`
- or legacy `@peanut/pod-panel-host-example`

Detector: `products/cocos/editor/scripts/creator-host-extension.mjs` (`detectCreatorHostExtension`).

Without host, `ensure-creator-hub` waits then fails with `descriptor_missing_or_invalid` even if `peanut-plugins` contains `peanut.editor-mcp`.

MSI note (2026-09-07): after copying host + seeding `cocos-mcp-settings.json`, Hub became ready in ~22s on `test-demos/cocos-for-agent`.
