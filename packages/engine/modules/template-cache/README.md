# Lite Lumen template cache

Free, portable template-pack identification and request parsing. Migrated from
the former Pro `lumen-template-cache` package; the stable exported identifiers and
behavior are preserved. Pro consumes this package through its pinned Lite submodule.

`npm run build` and `npm run typecheck` validate the package. This package does not
perform template import/reset or Creator AssetDB refresh; those host operations
still require the native execution adapter and local approval.
