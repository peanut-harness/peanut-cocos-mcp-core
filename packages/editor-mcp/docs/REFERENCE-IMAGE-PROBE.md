# Reference image probe evidence (PinK P1)

## Machine / Creator

- Host: MSI
- Creator: **3.8.7** at `C:/ProgramData/cocos/editors/Creator/3.8.7`
- Source: `resources/app.asar` -> `modules/editor-extensions/extensions/reference-image/`

## Public messages (package.json contributions.messages.*.public = true)

| Message | Purpose | Confirm-free when |
| --- | --- | --- |
| `query-config` | Full IReference config | always |
| `query-current` | Current IImageData | always |
| `add-image` | Register image paths | paths string[] supplied (no file dialog) |
| `switch-image` | Select current image | path supplied |
| `set-image-data` | Set path/x/y/sx/sy/opacity | key+value supplied |
| `refresh` | Refresh overlay | always |
| `remove-image` | Remove image | AVOID - i18n documents Confirm/Cancel dialog |

## IImageData (public.d.ts)

`path`, `x`, `y`, `sx`, `sy`, `opacity`, optional `missing`.

## editor-mcp mapping

- `reference.queryImage` -> `query-current` (+ `query-config`)
- `reference.setImage` -> `add-image` -> `switch-image` -> `set-image-data`* -> `refresh`
- Never invent a fighting pixel overlay / shared library panel
- `visible` maps to package profile `reference-image.show` (toolbar toggle) when `Editor.Profile.setConfig` is available; falls back to `set-image-data opacity` only if Profile is missing. Never `remove-image`.

## Messages explicitly not used

- `open` (opens panel UI)
- `remove-image` (UI confirm risk)
