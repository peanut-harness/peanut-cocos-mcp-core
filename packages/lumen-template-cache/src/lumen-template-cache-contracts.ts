/**
 * Stable cache-pack identifiers, intentionally independent of the legacy panel plugin.
 */
export const lumenTemplateCacheContracts = Object.freeze({
    manifestFile: 'lumen-templates.manifest.json',
    templateDir: 'default_prefab',
    importUnsupported: 'peanut_lumen_import_unsupported',
    sourceRootKeys: Object.freeze(['sourceRoot', 'from', 'path']),
    refreshPathKeys: Object.freeze(['paths', 'path']),
    errors: Object.freeze({
        importSourceRootRequired: 'peanut_lumen_import_sourceRoot_required',
        editorRefreshRequestInvalid: 'peanut_lumen_editor_refresh_request_invalid',
        editorRefreshProjectRootRequired: 'peanut_lumen_editor_refresh_projectRoot_required',
    }),
    importHint: Object.freeze({
        versionPack: 'version_pack',
        templateManifest: 'template_manifest',
        incompletePack: 'incomplete_pack',
        creatorPrefab: 'creator_prefab',
        lumenRecipe: 'lumen_recipe',
        jsonUnknown: 'json_unknown',
        missing: 'missing',
        unreadable: 'unreadable',
        notJson: 'not_json',
    }),
});
