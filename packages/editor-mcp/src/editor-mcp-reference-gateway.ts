import { isAbsolute, resolve as resolvePath } from 'node:path';

import type {
    ContractPayload,
    EditorMcpThinLayerAvailability,
    IReferenceQueryImageMcpInput,
    IReferenceSetImageMcpInput,
} from 'peanut-contracts';
import type { IGrantedRuntimeClientSet } from 'peanut-plugin-sdk';

import { EditorMcpThinLayerAvailabilityMapper } from './editor-mcp-thin-layer-availability.js';

/**
 * @description Scene reference-image MCP result.
 */
export interface IEditorMcpReferenceResult {
    readonly available: boolean;
    readonly message: string;
    readonly availability: EditorMcpThinLayerAvailability;
    readonly data?: unknown;
}

/** @description Creator 3.8.x built-in reference-image package name. */
const REFERENCE_IMAGE_TARGET = 'reference-image';

/**
 * @description MSI probe evidence (Creator 3.8.7 app.asar package.json contributions.messages).
 */
export const REFERENCE_IMAGE_PROBE_EVIDENCE = {
    creatorVersion: '3.8.7',
    packageName: REFERENCE_IMAGE_TARGET,
    installPath: 'C:/ProgramData/cocos/editors/Creator/3.8.7',
    publicMessages: [
        'query-config',
        'query-current',
        'add-image',
        'switch-image',
        'set-image-data',
        'refresh',
        'remove-image',
    ] as const,
    avoidedMessages: ['open', 'remove-image'] as const,
    note:
        'remove-image i18n documents Confirm/Cancel; Agents must not call it. add-image/switch-image/set-image-data/query-* are public and confirm-free when paths are supplied.',
} as const;

/**
 * @description Scene reference-image thin layer over Creator reference-image public messages.
 */
export class EditorMcpReferenceGateway {
    private readonly _runtime: IGrantedRuntimeClientSet | null;
    private readonly _resolveProjectRoot: (() => Promise<string | null>) | null;

    public constructor(
        runtime: IGrantedRuntimeClientSet | null = null,
        resolveProjectRoot: (() => Promise<string | null>) | null = null,
    ) {
        this._runtime = runtime;
        this._resolveProjectRoot = resolveProjectRoot;
    }

    public async queryImage(
        input: IReferenceQueryImageMcpInput,
    ): Promise<IEditorMcpReferenceResult> {
        const message = this._runtime?.message;
        if (message == null) {
            return EditorMcpThinLayerAvailabilityMapper.attach({
                available: false,
                message: 'reference_query_image_refused:runtime_message_missing',
                data: {
                    probe: REFERENCE_IMAGE_PROBE_EVIDENCE,
                    agentHint:
                        'Creator Hub/runtime message grant required. Public API: reference-image query-current / query-config.',
                    ...(input.scenePath != null ? { scenePath: input.scenePath } : {}),
                },
            });
        }
        try {
            const current = await message.request(REFERENCE_IMAGE_TARGET, 'query-current');
            let config: unknown;
            try {
                config = await message.request(REFERENCE_IMAGE_TARGET, 'query-config');
            } catch {
                config = undefined;
            }
            return EditorMcpThinLayerAvailabilityMapper.attach({
                available: true,
                message: 'reference_query_image_ok:query-current',
                data: {
                    current,
                    ...(config === undefined ? {} : { config }),
                    ...(input.scenePath != null ? { scenePath: input.scenePath } : {}),
                    probe: {
                        creatorPackage: REFERENCE_IMAGE_TARGET,
                        messages: ['query-current', 'query-config'],
                    },
                },
            });
        } catch (error) {
            return EditorMcpThinLayerAvailabilityMapper.attach({
                available: false,
                message: 'reference_query_image_refused:reference_image_message_failed',
                data: {
                    error: error instanceof Error ? error.message : String(error),
                    probe: REFERENCE_IMAGE_PROBE_EVIDENCE,
                    agentHint:
                        'reference-image extension missing or inactive. Do not invent a pixel overlay.',
                },
            });
        }
    }

    public async setImage(
        input: IReferenceSetImageMcpInput,
    ): Promise<IEditorMcpReferenceResult> {
        const message = this._runtime?.message;
        if (message == null) {
            return EditorMcpThinLayerAvailabilityMapper.attach({
                available: false,
                message: 'reference_set_image_refused:runtime_message_missing',
                data: {
                    imagePath: input.imagePath,
                    ...(input.scenePath != null ? { scenePath: input.scenePath } : {}),
                    probe: REFERENCE_IMAGE_PROBE_EVIDENCE,
                    agentHint:
                        'Need Creator Hub message grant. Confirm-free: add-image / switch-image / set-image-data.',
                },
            });
        }
        const absolutePath = await this._resolveAbsoluteImagePath(input.imagePath);
        if (absolutePath == null) {
            return EditorMcpThinLayerAvailabilityMapper.attach({
                available: false,
                message: 'reference_set_image_refused:image_path_unresolved',
                data: {
                    imagePath: input.imagePath,
                    agentHint:
                        'Pass an absolute filesystem path or assets-relative path under the open project.',
                },
            });
        }
        const applied: string[] = [];
        try {
            await message.request(REFERENCE_IMAGE_TARGET, 'add-image', [absolutePath]);
            applied.push('add-image');
        } catch {
            // may already be registered
        }
        try {
            await message.request(REFERENCE_IMAGE_TARGET, 'switch-image', absolutePath);
            applied.push('switch-image');
        } catch (error) {
            return EditorMcpThinLayerAvailabilityMapper.attach({
                available: false,
                message: 'reference_set_image_refused:switch_image_failed',
                data: {
                    imagePath: input.imagePath,
                    absolutePath,
                    applied,
                    error: error instanceof Error ? error.message : String(error),
                    probe: REFERENCE_IMAGE_PROBE_EVIDENCE,
                },
            });
        }
        const dataPatches = this._collectImageDataPatches(input);
        for (const [key, value] of dataPatches) {
            try {
                await message.request(REFERENCE_IMAGE_TARGET, 'set-image-data', key, value);
                applied.push(`set-image-data:${key}`);
            } catch (error) {
                return EditorMcpThinLayerAvailabilityMapper.attach({
                    available: false,
                    message: `reference_set_image_refused:set_image_data_failed:${key}`,
                    data: {
                        imagePath: input.imagePath,
                        absolutePath,
                        applied,
                        error: error instanceof Error ? error.message : String(error),
                    },
                });
            }
        }
        let visibilityMode: 'profile_show' | 'opacity_fallback' | undefined;
        if (typeof input.visible === 'boolean') {
            const visibility = await this._applyVisibility(message, input.visible, applied);
            visibilityMode = visibility.mode;
        }
        try {
            await message.request(REFERENCE_IMAGE_TARGET, 'refresh');
            applied.push('refresh');
        } catch {
            // best-effort
        }
        let current: unknown;
        try {
            current = await message.request(REFERENCE_IMAGE_TARGET, 'query-current');
        } catch {
            current = undefined;
        }
        return EditorMcpThinLayerAvailabilityMapper.attach({
            available: true,
            message: 'reference_set_image_ok:reference-image',
            data: {
                imagePath: input.imagePath,
                absolutePath,
                ...(input.scenePath != null ? { scenePath: input.scenePath } : {}),
                applied,
                ...(visibilityMode == null ? {} : { visibilityMode }),
                ...(current === undefined ? {} : { current }),
                probe: {
                    creatorPackage: REFERENCE_IMAGE_TARGET,
                    avoided: ['remove-image', 'open'],
                    visibilityApi: 'profile:reference-image.show (fallback set-image-data opacity)',
                },
            },
        });
    }

    public readQueryInput(input: ContractPayload | undefined): IReferenceQueryImageMcpInput {
        if (input == null) {
            return {};
        }
        if (typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('editor_mcp_invalid_operation_input');
        }
        const record = input as Record<string, unknown>;
        const scenePath =
            typeof record.scenePath === 'string' && record.scenePath.trim().length > 0
                ? record.scenePath.trim().replace(/\\/gu, '/')
                : undefined;
        return scenePath == null ? {} : { scenePath };
    }

    public readSetInput(input: ContractPayload | undefined): IReferenceSetImageMcpInput {
        if (input == null || typeof input.imagePath !== 'string' || input.imagePath.trim().length === 0) {
            throw new Error('editor_mcp_reference_image_path_required');
        }
        const scenePath =
            typeof input.scenePath === 'string' && input.scenePath.trim().length > 0
                ? input.scenePath.trim().replace(/\\/gu, '/')
                : undefined;
        const opacity =
            typeof input.opacity === 'number' && Number.isFinite(input.opacity)
                ? input.opacity
                : undefined;
        const x = typeof input.x === 'number' && Number.isFinite(input.x) ? input.x : undefined;
        const y = typeof input.y === 'number' && Number.isFinite(input.y) ? input.y : undefined;
        const sx = typeof input.sx === 'number' && Number.isFinite(input.sx) ? input.sx : undefined;
        const sy = typeof input.sy === 'number' && Number.isFinite(input.sy) ? input.sy : undefined;
        const visible = typeof input.visible === 'boolean' ? input.visible : undefined;
        return {
            imagePath: input.imagePath.trim().replace(/\\/gu, '/'),
            ...(scenePath == null ? {} : { scenePath }),
            ...(opacity == null ? {} : { opacity }),
            ...(x == null ? {} : { x }),
            ...(y == null ? {} : { y }),
            ...(sx == null ? {} : { sx }),
            ...(sy == null ? {} : { sy }),
            ...(visible == null ? {} : { visible }),
        };
    }


    /**
     * @description Apply Creator reference-image profile `show` for visibility (toolbar toggle API).
     * Falls back to opacity only when Profile is unavailable. Never calls remove-image.
     */
    private async _applyVisibility(
        message: NonNullable<IGrantedRuntimeClientSet['message']>,
        visible: boolean,
        applied: string[],
    ): Promise<{ mode: 'profile_show' | 'opacity_fallback' }> {
        const editorProfile = (
            globalThis as {
                Editor?: {
                    Profile?: {
                        setConfig?: (pkg: string, key: string, value: unknown) => Promise<unknown>;
                    };
                };
            }
        ).Editor?.Profile;
        if (editorProfile?.setConfig != null) {
            try {
                await editorProfile.setConfig(REFERENCE_IMAGE_TARGET, 'show', visible);
                applied.push(visible ? 'profile:show=true' : 'profile:show=false');
                return { mode: 'profile_show' };
            } catch {
                // fall through
            }
        }
        await message.request(REFERENCE_IMAGE_TARGET, 'set-image-data', 'opacity', visible ? 50 : 0);
        applied.push(
            visible
                ? 'set-image-data:opacity(fallback_show)'
                : 'set-image-data:opacity=0(fallback_hide)',
        );
        return { mode: 'opacity_fallback' };
    }

    private _collectImageDataPatches(
        input: IReferenceSetImageMcpInput,
    ): readonly (readonly [string, number])[] {
        const patches: [string, number][] = [];
        // Visibility uses package profile 'show' via _applyVisibility (not opacity-only).
        if (typeof input.opacity === 'number') {
            const opacity =
                input.opacity >= 0 && input.opacity <= 1
                    ? Math.round(input.opacity * 100)
                    : input.opacity;
            patches.push(['opacity', opacity]);
        }
        if (typeof input.x === 'number') {
            patches.push(['x', input.x]);
        }
        if (typeof input.y === 'number') {
            patches.push(['y', input.y]);
        }
        if (typeof input.sx === 'number') {
            patches.push(['sx', input.sx]);
        }
        if (typeof input.sy === 'number') {
            patches.push(['sy', input.sy]);
        }
        return patches;
    }

    private async _resolveAbsoluteImagePath(imagePath: string): Promise<string | null> {
        const trimmed = imagePath.trim();
        if (trimmed.length === 0) {
            return null;
        }
        if (trimmed.startsWith('db://')) {
            const withoutScheme = trimmed.slice('db://'.length);
            const projectRoot =
                this._resolveProjectRoot == null ? null : await this._resolveProjectRoot();
            if (projectRoot == null) {
                return null;
            }
            return resolvePath(projectRoot, withoutScheme).replace(/\\/gu, '/');
        }
        if (isAbsolute(trimmed)) {
            return trimmed.replace(/\\/gu, '/');
        }
        const projectRoot =
            this._resolveProjectRoot == null ? null : await this._resolveProjectRoot();
        if (projectRoot == null) {
            return null;
        }
        return resolvePath(projectRoot, trimmed).replace(/\\/gu, '/');
    }
}
