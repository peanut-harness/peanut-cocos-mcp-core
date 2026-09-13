# Scene host command routing contract (PinK #873 direction)

## Availability model

All scene thin-layer results attach `availability: live | fallback | refused` via `EditorMcpThinLayerAvailabilityMapper`.

- **live**: Creator message / scene grant succeeded
- **fallback**: alternate confirm-free path (e.g. hierarchy via `query-node-tree`, open via `asset-db:open-asset`)
- **refused**: policy refuse or no confirm-free route (never hang on UI confirm)

## Host-routed Scene operations (Agents)

| Operation | Route | Confirm-free? | Notes |
| --- | --- | --- | --- |
| `scene.open` | `scene:open-scene(uuid)` -> fallback `asset-db:open-asset` | yes | UUID preferred; path resolved via meta |
| `scene.save` | **policy refuse** | n/a | `scene_save_refused:use_lumen_offline_write` — Agents use lumen source+`.meta` + commit |
| `scene.reload` | `soft-reload` / `reload-scene` | yes | |
| `scene.queryNode` | runtime scene hierarchy -> fallback `query-node-tree` | yes | |
| `scene.getHierarchy` | same as query hierarchy | yes | |
| `scene.focusNode` | selection + focus messages | yes | |
| `scene.createNode` | host scene-script when available | yes if script; else refused with reason | |
| `scene.getCurrent` / `queryCurrentEditorResource` / `restoreEditorResource` | editor gateway | yes | |
| `prefab.*` instance ops | scene-script / asset read | unlink/create may refuse without host script | |

## Refused reason grammar

Prefer stable prefixes Agents can branch on:

- `scene_save_refused:…` — product policy (not a missing message)
- `scene_*_blocked:…` — guard / invalid path
- `scene_*_unavailable:…` — message/grant missing or failed
- `…;scene_script_unavailable` / `…;scene_script_failed:…` — host script gap

## Bridge-host relationship

`products/cocos/editor/bridge-host` is the stdio JSON adapter for `peanut.adapter-bridge-request.v1`. Scene MCP ops above are editor-mcp thin-layer routes; bridge-host does not reimplement Creator UI confirms. Keep destructive confirms via `ProductLineMcpPolicy`.

## Gaps Agents may still hit

- Prefab unlink/create without host scene-script -> refused (explicit), not fake success
- LOD / reference / builder live ops require Hub message grant


## Code enforcement (non-MVP)

- `resolveSceneHostRoute(operation)` and `buildSceneSaveRefusePayload()` in `editor-mcp-scene-host-routes.ts`
- `EditorMcpSceneGateway.save` returns `scene_save_refused:use_lumen_offline_write` + `recommendedNext: lumen.commit`
- Hard-block list shared via `CREATOR_SCENE_SAVE_MESSAGES`
