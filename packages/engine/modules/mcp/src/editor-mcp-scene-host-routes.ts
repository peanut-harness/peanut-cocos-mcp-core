/**
 * @description Scene host routing table (PinK #873). Documented for Agents; keep refuse reasons stable.
 * Enforced in code via {@link resolveSceneHostRoute} / {@link buildSceneSaveRefusePayload}.
 */
export const EDITOR_MCP_SCENE_HOST_ROUTES = [
    {
        operation: 'scene.open',
        route: 'scene:open-scene(uuid) | asset-db:open-asset',
        confirmFree: true,
        availability: 'live|fallback|refused',
        recommendedNext: { operation: 'scene.queryNode', input: {} },
    },
    {
        operation: 'scene.save',
        route: 'policy-refuse',
        confirmFree: false,
        availability: 'refused',
        refusedReason: 'scene_save_refused:use_lumen_offline_write',
        recommendedNext: {
            operation: 'lumen.commit',
            input: { paths: ['assets/<YourScene>.scene'] },
        },
    },
    {
        operation: 'scene.reload',
        route: 'scene:soft-reload | reload-scene',
        confirmFree: true,
        availability: 'live|refused',
        recommendedNext: { operation: 'preview.refresh', input: { refreshAssets: true } },
    },
    {
        operation: 'scene.queryNode',
        route: 'runtime.scene.getHierarchy | scene:query-node-tree',
        confirmFree: true,
        availability: 'live|fallback|refused',
    },
    {
        operation: 'scene.getHierarchy',
        route: 'runtime.scene.getHierarchy | scene:query-node-tree',
        confirmFree: true,
        availability: 'live|fallback|refused',
    },
    {
        operation: 'scene.focusNode',
        route: 'selection + focus messages',
        confirmFree: true,
        availability: 'live|fallback|refused',
    },
    {
        operation: 'scene.createNode',
        route: 'host scene-script',
        confirmFree: true,
        availability: 'live|refused',
        recommendedNext: { operation: 'lumen.nodeAdd', input: {} },
    },
] as const;

export type EditorMcpSceneHostRoute = (typeof EDITOR_MCP_SCENE_HOST_ROUTES)[number];

export const SCENE_SAVE_REFUSED_REASON = 'scene_save_refused:use_lumen_offline_write' as const;

/** @description Creator scene-save messages that hang Agents with confirm UI. */
export const CREATOR_SCENE_SAVE_MESSAGES = [
    'save-scene',
    'save-as',
    'save-current-scene',
    'save',
] as const;

/**
 * @description Lookup a scene host route by MCP operation id.
 */
export function resolveSceneHostRoute(operation: string): EditorMcpSceneHostRoute | undefined {
    return EDITOR_MCP_SCENE_HOST_ROUTES.find((route) => route.operation === operation);
}

/**
 * @description Stable refuse payload for scene.save (never call Creator save-scene).
 */
export function buildSceneSaveRefusePayload(sceneRelativeHint?: string): {
    readonly available: false;
    readonly message: typeof SCENE_SAVE_REFUSED_REASON;
    readonly data: Record<string, unknown>;
    readonly recommendedNext: { readonly operation: string; readonly input: Record<string, unknown> };
} {
    const hint =
        typeof sceneRelativeHint === 'string' && sceneRelativeHint.trim().length > 0
            ? sceneRelativeHint.trim().replace(/^db:\/\//u, '').replace(/\\/gu, '/')
            : 'assets/<YourScene>.scene';
    const route = resolveSceneHostRoute('scene.save');
    return {
        available: false,
        message: SCENE_SAVE_REFUSED_REASON,
        recommendedNext: {
            operation: 'lumen.commit',
            input: { paths: [hint] },
        },
        data: {
            reason: 'creator_save_dialog_blocks_automation',
            hostRoute: route?.route ?? 'policy-refuse',
            recommendedPipeline: [
                'lumen.node*/comp*/structure/assetSet on .scene',
                `lumen.commit({ paths: ["${hint}"] })`,
                'preview.refresh (AssetDB soft refresh); optional scene.reload',
            ],
            doNotCall: [...CREATOR_SCENE_SAVE_MESSAGES],
            confirmFree: false,
        },
    };
}
