/**
 * @description Prefab 树与节点只读巡检（不改盘）。
 */
import type { LumenComponentPropertySchema } from '../schema/component-property';
import { LumenHierarchyEntry } from './entry';
import type { PrefabEntry } from '../types';

/**
 * @description 树节点摘要。
 */
export interface ILumenTreeNode {
    /**
     * @description 绝对风格路径，如 `/Root/Title`。
     */
    readonly path: string;

    /**
     * @description 节点名。
     */
    readonly name: string;

    /**
     * @description 组件 `__type__` 列表。
     */
    readonly components: readonly string[];

    /**
     * @description 子节点。
     */
    readonly children: readonly ILumenTreeNode[];
}

/**
 * @description 单组件巡检摘要（含白名单属性快照）。
 */
export interface ILumenComponentInspect {
    /**
     * @description 组件条目下标。
     */
    readonly index: number;

    /**
     * @description 组件 `__type__`。
     */
    readonly type: string;

    /**
     * @description `_enabled`；缺失时为 `null`。
     */
    readonly enabled: boolean | null;

    /**
     * @description 白名单公开属性快照；无 schema 时为空对象。
     */
    readonly props: Readonly<Record<string, unknown>>;
}

/**
 * @description 单节点巡检结果。
 */
export interface ILumenNodeInspect {
    /**
     * @description 节点路径。
     */
    readonly path: string;

    /**
     * @description 节点名。
     */
    readonly name: string;

    /**
     * @description 条目下标。
     */
    readonly index: number;

    /**
     * @description 常用节点字段快照。
     */
    readonly node: Readonly<Record<string, unknown>>;

    /**
     * @description 组件摘要（含属性快照）。
     */
    readonly components: readonly ILumenComponentInspect[];
}

/**
 * @description 从 Prefab 条目构建树 / 巡检。
 */
export class LumenPrefabInspector {
    /**
     * @description 从根构建整棵树。
     * @param entries Prefab 数组
     * @returns 根树节点
     */
    public static buildTree(entries: readonly PrefabEntry[]): ILumenTreeNode {
        const rootIndex = this._findRootNodeIndex(entries);
        return this._buildNode(entries, rootIndex, '');
    }

    /**
     * @description 巡检指定路径节点。
     * @param entries Prefab 数组
     * @param nodePath 如 `/Root/Title`
     * @param resolveIndex 路径 → 下标
     * @param propertySchema 属性表；用于解码 props
     * @param pathForEntryIndex 条目下标 → 宿主节点路径
     * @returns 巡检结果
     */
    public static inspectNode(
        entries: readonly PrefabEntry[],
        nodePath: string,
        resolveIndex: (path: string) => number,
        propertySchema?: LumenComponentPropertySchema,
        pathForEntryIndex?: (entryIndex: number) => string | null,
    ): ILumenNodeInspect {
        const index = resolveIndex(nodePath);
        const node = entries[index];
        if (!LumenHierarchyEntry.isNodeOrScene(node)) {
            throw new Error(`lumen_inspect_not_a_node:${nodePath}`);
        }
        const name = typeof node._name === 'string' ? node._name : '';
        const components: ILumenComponentInspect[] = [];
        const refs = Array.isArray(node._components) ? node._components : [];
        for (const ref of refs) {
            if (ref == null || typeof ref !== 'object') {
                continue;
            }
            const componentId = (ref as { __id__?: number }).__id__;
            if (typeof componentId !== 'number') {
                continue;
            }
            const component = entries[componentId];
            if (component == null) {
                continue;
            }
            const type = typeof component.__type__ === 'string' ? component.__type__ : 'unknown';
            const enabled = typeof component._enabled === 'boolean' ? component._enabled : null;
            let props: Record<string, unknown> = {};
            if (propertySchema != null) {
                props = propertySchema.decodeComponentSnapshot(
                    type,
                    component,
                    (entryIndex) => {
                        if (pathForEntryIndex != null) {
                            return pathForEntryIndex(entryIndex);
                        }
                        return null;
                    },
                    (entryIndex) => {
                        const entry = entries[entryIndex];
                        return entry ?? null;
                    },
                );
            }
            components.push({ index: componentId, type, enabled, props });
        }
        return {
            path: nodePath.startsWith('/') ? nodePath : `/${nodePath}`,
            name,
            index,
            node: {
                active: node._active,
                layer: node._layer,
                position: node._lpos,
                scale: node._lscale,
                euler: node._euler,
            },
            components,
        };
    }

    /**
     * @description 定位层次根（Prefab 根节点或 `cc.Scene`）。
     * @param entries Prefab / Scene 数组
     * @returns 根下标
     */
    private static _findRootNodeIndex(entries: readonly PrefabEntry[]): number {
        return LumenHierarchyEntry.rootIndex(entries);
    }

    /**
     * @description 递归构建树节点。
     * @param entries Prefab 数组
     * @param nodeIndex 当前下标
     * @param parentPath 父路径（空表示根）
     * @returns 树节点
     */
    private static _buildNode(
        entries: readonly PrefabEntry[],
        nodeIndex: number,
        parentPath: string,
    ): ILumenTreeNode {
        const node = entries[nodeIndex];
        if (!LumenHierarchyEntry.isNodeOrScene(node)) {
            throw new Error(`lumen_inspect_not_a_node:${nodeIndex}`);
        }
        const name = typeof node._name === 'string' ? node._name : `Node${nodeIndex}`;
        const path = parentPath.length === 0 ? `/${name}` : `${parentPath}/${name}`;
        const components: string[] = [];
        const refs = Array.isArray(node._components) ? node._components : [];
        for (const ref of refs) {
            if (ref == null || typeof ref !== 'object') {
                continue;
            }
            const componentId = (ref as { __id__?: number }).__id__;
            if (typeof componentId !== 'number') {
                continue;
            }
            const type = entries[componentId]?.__type__;
            if (typeof type === 'string') {
                components.push(type);
            }
        }
        const children: ILumenTreeNode[] = [];
        const childRefs = Array.isArray(node._children) ? node._children : [];
        for (const childRef of childRefs) {
            if (childRef == null || typeof childRef !== 'object') {
                continue;
            }
            const childId = (childRef as { __id__?: number }).__id__;
            if (typeof childId !== 'number') {
                continue;
            }
            children.push(this._buildNode(entries, childId, path));
        }
        return { path, name, components, children };
    }
}
