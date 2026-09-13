# LODGroup recalculateBounds probe evidence (PinK P2)

## Machine / Creator

- Host: MSI
- Creator: **3.8.7** at `C:/ProgramData/cocos/editors/Creator/3.8.7`

## Engine API (present)

Binary scan of `app.asar` finds `cc.LODGroup.recalculateBounds(): void` which recalculates `localBoundaryCenter` and `objectSize`.

Also present: `resetObjectSize()`, `forceLOD(lodLevel)`.

## Editor message surface

- `builtin/scene/@types/message.d.ts` has **no** dedicated `recalculateBounds` message.
- Confirmed route: `scene` / `execute-component-method` with `{ uuid: <LODGroup component uuid>, name: 'recalculateBounds', args: [] }`
- Supporting: `query-node-tree`, `query-node`, `query-component`

## editor-mcp mapping

- `lumen.lodRecalcBounds` (live Hub):
  1. resolve `nodePath` -> node UUID
  2. `query-node` -> find `cc.LODGroup` component uuid
  3. `execute-component-method` `recalculateBounds`
  4. `query-component` -> return serializable fields
  5. `recommendedNext`: `lumen.compSet` / `lumen.commit` (**never** `scene.save`)
- Without runtime message or `nodePath`: `availability: refused` (no fake success)
- Without `cc.LODGroup` on the node (e.g. `/Canvas`): `availability: refused` with `dumpShape` diagnostics

## Live SUCCESS evidence (2026-09-08 Asia/Shanghai)

Fixture scene (intentional, tracked):

- `test-demos/cocos-for-agent/assets/tests/lod-recalc-bounds/LodRecalcBounds.scene`
- Node path: `/LodRecalcBounds/LODGroupNode` (owns `cc.LODGroup`)

Hub call (Creator 3.8.7 / MSI Hub session):

```json
{
  "available": true,
  "availability": "live",
  "message": "lumen_lod_recalc_bounds_ok:execute-component-method:recalculateBounds",
  "localBoundaryCenter": { "x": 0, "y": 0, "z": 0 },
  "objectSize": 0,
  "recommendedNext": {
    "operation": "lumen.compSet",
    "input": {
      "prefabRelativePath": "assets/tests/lod-recalc-bounds/LodRecalcBounds.scene",
      "nodePath": "/LodRecalcBounds/LODGroupNode",
      "componentType": "cc.LODGroup",
      "props": {
        "localBoundaryCenter": { "x": 0, "y": 0, "z": 0 },
        "objectSize": 0
      }
    }
  }
}
```

Reproduce:

```bash
node products/cocos/editor/scripts/ensure-creator-hub.mjs --project <abs-cocos-for-agent>
node products/cocos/editor/scripts/probe-lod-recalc-bounds-live.mjs --project <abs-cocos-for-agent>
```

Notes:

- `objectSize: 0` / zero center is expected when the LOD node has no mesh renderers yet; the success criterion is **live** `availability` (not refused for missing LODGroup).
- Persist guidance remains `lumen.compSet` then `lumen.commit` — never `scene.save`.
