import type { ILumenLodRecalcBoundsMcpInput } from 'peanut-contracts';
import type { ILumenMessagePort } from '@peanut/cocos-lumen';

/**
 * @description MSI / Creator 3.8.7 probe evidence for LOD bounds recalc.
 */
export const LOD_RECALC_PROBE_EVIDENCE = {
    creatorVersion: '3.8.7',
    engineApi: 'cc.LODGroup.recalculateBounds(): void',
    editorRoute: "scene:execute-component-method { uuid, name: 'recalculateBounds', args: [] }",
    supportingMessages: ['query-node-tree', 'query-node', 'query-component'] as const,
    installPath: 'C:/ProgramData/cocos/editors/Creator/3.8.7',
    note:
        'Engine typedefs expose recalculateBounds; scene message.d.ts has no dedicated recalculateBounds message. Live path uses execute-component-method. Persist via lumen.compSet + lumen.commit (never scene.save).',
} as const;

export interface ILodRecalcBoundsResult {
    readonly available: boolean;
    readonly availability: 'live' | 'fallback' | 'refused';
    readonly message: string;
    readonly agentHint?: string;
    readonly localBoundaryCenter?: unknown;
    readonly objectSize?: unknown;
    readonly componentUuid?: string;
    readonly nodeUuid?: string;
    readonly nodePath?: string;
    readonly recommendedNext?: {
        readonly operation: string;
        readonly input: Record<string, unknown>;
    };
    readonly probe?: unknown;
    readonly data?: unknown;
}

function isUuidLike(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value.trim());
}

function flattenNodeTree(tree: unknown): Array<{ uuid: string; name: string; path: string; raw: Record<string, unknown> }> {
    const out: Array<{ uuid: string; name: string; path: string; raw: Record<string, unknown> }> = [];
    const visit = (node: unknown, parentPath: string): void => {
        if (node == null || typeof node !== 'object' || Array.isArray(node)) {
            return;
        }
        const record = node as Record<string, unknown>;
        const name = typeof record.name === 'string' ? record.name : '';
        const uuid = typeof record.uuid === 'string' ? record.uuid : '';
        const nextPath =
            name.length > 0
                ? parentPath.length === 0
                    ? `/${name}`
                    : `${parentPath}/${name}`
                : parentPath;
        if (uuid.length > 0 && name.length > 0) {
            out.push({ uuid, name, path: nextPath, raw: record });
        }
        const children = record.children;
        if (Array.isArray(children)) {
            for (const child of children) {
                visit(child, nextPath);
            }
        }
    };
    visit(tree, '');
    return out;
}

function extractPropertyValue(raw: unknown): unknown {
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
        return raw;
    }
    const record = raw as Record<string, unknown>;
    if ('value' in record) {
        return record.value;
    }
    return raw;
}

function summarizeDumpShape(nodeDump: unknown): Record<string, unknown> {
    if (nodeDump == null) {
        return { kind: 'null' };
    }
    if (typeof nodeDump !== 'object') {
        return { kind: typeof nodeDump };
    }
    if (Array.isArray(nodeDump)) {
        return { kind: 'array', length: nodeDump.length };
    }
    const record = nodeDump as Record<string, unknown>;
    const comps = record.__comps__ ?? record.components ?? record.__components__;
    const compTypes: string[] = [];
    if (Array.isArray(comps)) {
        for (const comp of comps.slice(0, 12)) {
            if (comp == null || typeof comp !== 'object') {
                continue;
            }
            const c = comp as Record<string, unknown>;
            const typeName =
                (typeof c.type === 'string' && c.type) ||
                (typeof c.__type__ === 'string' && c.__type__) ||
                (typeof c.cid === 'string' && c.cid) ||
                (typeof c.name === 'string' && c.name) ||
                '';
            if (typeName.length > 0) {
                compTypes.push(typeName);
            }
        }
    }
    return {
        kind: 'object',
        keys: Object.keys(record).slice(0, 20),
        hasComps: Array.isArray(comps),
        compsLen: Array.isArray(comps) ? comps.length : 0,
        compTypes,
    };
}

function findLodGroupComponentUuid(nodeDump: unknown): string | null {
    if (nodeDump == null || typeof nodeDump !== 'object') {
        return null;
    }
    const record = nodeDump as Record<string, unknown>;
    const comps = record.__comps__ ?? record.components ?? record.__components__;
    if (!Array.isArray(comps)) {
        return null;
    }
    for (const comp of comps) {
        if (comp == null || typeof comp !== 'object') {
            continue;
        }
        const c = comp as Record<string, unknown>;
        const typeName =
            (typeof c.type === 'string' && c.type) ||
            (typeof c.__type__ === 'string' && c.__type__) ||
            (typeof c.cid === 'string' && c.cid) ||
            (typeof c.name === 'string' && c.name) ||
            '';
        const value = c.value != null && typeof c.value === 'object' ? (c.value as Record<string, unknown>) : null;
        const nameFromValue =
            value != null && typeof value.name === 'object' && value.name != null
                ? extractPropertyValue(value.name)
                : value != null && typeof value.name === 'string'
                  ? value.name
                  : '';
        const cidFromValue =
            value != null && typeof value.cid === 'string'
                ? value.cid
                : value != null
                  ? extractPropertyValue(value.cid)
                  : '';
        const joined = `${typeName} ${String(nameFromValue)} ${String(cidFromValue)}`;
        if (!/LODGroup/iu.test(joined) && !/cc\.LODGroup/u.test(joined)) {
            continue;
        }
        const uuidCandidate =
            (typeof c.uuid === 'string' && c.uuid) ||
            (typeof c.value === 'string' && isUuidLike(c.value) && c.value) ||
            (value != null && typeof value.uuid === 'string' && value.uuid) ||
            (value != null ? extractPropertyValue(value.uuid) : null) ||
            (typeof c.__id__ === 'string' && c.__id__) ||
            (typeof c.id === 'string' && c.id);
        if (typeof uuidCandidate === 'string' && uuidCandidate.length > 0) {
            return uuidCandidate;
        }
    }
    return null;
}

export async function executeLodRecalcBounds(
    message: ILumenMessagePort | null,
    input: ILumenLodRecalcBoundsMcpInput,
): Promise<ILodRecalcBoundsResult> {
    if (message == null) {
        return {
            available: false,
            availability: 'refused',
            message: 'lumen_lod_recalc_bounds_refused:runtime_message_missing',
            agentHint:
                'Creator Hub live message required. Engine has cc.LODGroup.recalculateBounds; route via scene execute-component-method. Do not fake success.',
            probe: LOD_RECALC_PROBE_EVIDENCE,
        };
    }
    const nodePath =
        typeof input.nodePath === 'string' && input.nodePath.trim().length > 0
            ? input.nodePath.trim().replace(/\\/gu, '/')
            : undefined;
    if (nodePath == null) {
        return {
            available: false,
            availability: 'refused',
            message: 'lumen_lod_recalc_bounds_refused:node_path_required',
            agentHint:
                'Pass nodePath (hierarchy path or node UUID) for the node that owns cc.LODGroup. Offline mesh bounds calc is not implemented (no fake success).',
            probe: LOD_RECALC_PROBE_EVIDENCE,
            ...(input.prefabRelativePath != null || input.assetRelativePath != null
                ? {
                      data: {
                          prefabRelativePath: input.prefabRelativePath,
                          assetRelativePath: input.assetRelativePath,
                      },
                  }
                : {}),
        };
    }
    let nodeUuid = isUuidLike(nodePath) ? nodePath : null;
    if (nodeUuid == null) {
        try {
            const tree = await message.request('scene', 'query-node-tree');
            const flat = flattenNodeTree(tree);
            const needle = nodePath.startsWith('/') ? nodePath : `/${nodePath}`;
            const hit =
                flat.find((n) => n.path === needle || n.path === nodePath || n.path.endsWith(needle)) ??
                flat.find((n) => n.name === nodePath.replace(/^\//u, '').split('/').pop());
            if (hit == null) {
                return {
                    available: false,
                    availability: 'refused',
                    message: 'lumen_lod_recalc_bounds_refused:node_not_found',
                    nodePath,
                    agentHint: 'Open the scene in Creator and pass an exact hierarchy path.',
                    probe: LOD_RECALC_PROBE_EVIDENCE,
                };
            }
            nodeUuid = hit.uuid;
        } catch (error) {
            return {
                available: false,
                availability: 'refused',
                message: 'lumen_lod_recalc_bounds_refused:query_node_tree_failed',
                nodePath,
                agentHint: error instanceof Error ? error.message : String(error),
                probe: LOD_RECALC_PROBE_EVIDENCE,
            };
        }
    }
    let nodeDump: unknown;
    try {
        nodeDump = await message.request('scene', 'query-node', nodeUuid);
    } catch (error) {
        return {
            available: false,
            availability: 'refused',
            message: 'lumen_lod_recalc_bounds_refused:query_node_failed',
            nodeUuid,
            nodePath,
            agentHint: error instanceof Error ? error.message : String(error),
            probe: LOD_RECALC_PROBE_EVIDENCE,
        };
    }
    const componentUuid = findLodGroupComponentUuid(nodeDump);
    if (componentUuid == null) {
        return {
            available: false,
            availability: 'refused',
            message: 'lumen_lod_recalc_bounds_refused:lodgroup_component_missing',
            nodeUuid,
            nodePath,
            agentHint:
                'Node has no cc.LODGroup in query-node dump (__comps__/components/__components__). Open the scene, select the LOD node, and confirm cc.LODGroup exists.',
            data: { dumpShape: summarizeDumpShape(nodeDump) },
            probe: LOD_RECALC_PROBE_EVIDENCE,
        };
    }
    try {
        await message.request('scene', 'execute-component-method', {
            uuid: componentUuid,
            name: 'recalculateBounds',
            args: [],
        });
    } catch (error) {
        return {
            available: false,
            availability: 'refused',
            message: 'lumen_lod_recalc_bounds_refused:execute_component_method_failed',
            componentUuid,
            nodeUuid,
            nodePath,
            agentHint: error instanceof Error ? error.message : String(error),
            probe: LOD_RECALC_PROBE_EVIDENCE,
        };
    }
    let localBoundaryCenter: unknown;
    let objectSize: unknown;
    try {
        const comp = await message.request('scene', 'query-component', componentUuid);
        if (comp != null && typeof comp === 'object') {
            const value =
                (comp as { value?: Record<string, unknown> }).value ??
                (comp as Record<string, unknown>);
            localBoundaryCenter = extractPropertyValue(value.localBoundaryCenter ?? value._localBoundaryCenter);
            objectSize = extractPropertyValue(value.objectSize ?? value._objectSize);
        }
    } catch {
        // fields optional in response
    }
    const assetPath = input.prefabRelativePath ?? input.assetRelativePath;
    return {
        available: true,
        availability: 'live',
        message: 'lumen_lod_recalc_bounds_ok:execute-component-method:recalculateBounds',
        componentUuid,
        nodeUuid,
        nodePath,
        localBoundaryCenter,
        objectSize,
        agentHint:
            'Bounds recalculated in the live editor scene. Persist with lumen.compSet (localBoundaryCenter/objectSize) then lumen.commit. Never scene.save on the agent write path.',
        recommendedNext:
            assetPath != null && nodePath != null
                ? {
                      operation: 'lumen.compSet',
                      input: {
                          prefabRelativePath: assetPath,
                          nodePath,
                          componentType: 'cc.LODGroup',
                          props: {
                              ...(localBoundaryCenter != null ? { localBoundaryCenter } : {}),
                              ...(objectSize != null ? { objectSize } : {}),
                          },
                      },
                  }
                : {
                      operation: 'lumen.commit',
                      input: {},
                  },
        probe: LOD_RECALC_PROBE_EVIDENCE,
    };
}
