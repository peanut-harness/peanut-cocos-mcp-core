import type { ILumen24TreeNode, Lumen24PrefabDocument } from './lumen-24-prefab-document.js';

/**
 * @description 按钮点击绑定项。
 */
export interface ILumen24ControllerButtonEvent {
    /** @description 节点名（定位回落）。 */
    readonly nodeName: string;
    /** @description 可选绝对节点路径。 */
    readonly nodePath?: string;
    /** @description 处理方法名。 */
    readonly handler: string;
    /** @description 自定义事件数据。 */
    readonly customEventData?: string;
}

/**
 * @description 控制器绑定入参。
 */
export interface ILumen24ControllerBindOptions {
    /** @description 脚本 compressedUuid。 */
    readonly compressedUuid: string;
    /** @description 类名（ClickEvent.component 显示名）。 */
    readonly className: string;
    /** @description 属性 → 节点定位串。 */
    readonly propertyBindings: Readonly<Record<string, string>>;
    /** @description 属性 → 组件类型。 */
    readonly propertyComponents?: Readonly<Record<string, string>>;
    /** @description 按钮事件。 */
    readonly buttonEvents: readonly ILumen24ControllerButtonEvent[];
}

/**
 * @description 控制器绑定结果。
 */
export interface ILumen24ControllerBindResult {
    readonly rootPath: string;
    readonly bound: readonly string[];
    readonly boundButtons: readonly string[];
    readonly notFound: readonly string[];
    readonly ambiguous: readonly string[];
    readonly degraded: readonly string[];
}

/**
 * @description 2.4 Prefab 上挂脚本 + bindRef + bindClick（对标 3.x OfflinePrefabControllerBinder）。
 */
export class Lumen24ControllerBinder {
    /**
     * @description 在已打开文档上完成绑定。
     * @param document Prefab 文档
     * @param options 绑定选项
     * @returns 摘要
     */
    public static bind(
        document: Lumen24PrefabDocument,
        options: ILumen24ControllerBindOptions,
    ): ILumen24ControllerBindResult {
        if (options.compressedUuid.trim().length === 0) {
            throw new Error('lumen_24_bind_controller_compressed_uuid_required');
        }
        const tree = document.inspectTree();
        const rootPath = tree.path;
        document.attachScriptComponent(rootPath, options.compressedUuid);

        const bound: string[] = [];
        const notFound: string[] = [];
        const ambiguous: string[] = [];
        const degraded: string[] = [];

        for (const [property, locator] of Object.entries(options.propertyBindings)) {
            const hit = Lumen24ControllerBinder._locate(tree, locator);
            if (hit.node == null) {
                notFound.push(`${property} → ${locator}`);
                continue;
            }
            if (hit.ambiguous) {
                ambiguous.push(`${property} → ${locator} (${hit.matches} matches, used ${hit.node.path})`);
            }
            const componentType = options.propertyComponents?.[property];
            const nodeComponents = document.inspectNode(hit.node.path).components;
            if (componentType != null && nodeComponents.includes(componentType)) {
                const componentIndex = Lumen24ControllerBinder._resolveComponentIndex(
                    document,
                    hit.node.path,
                    componentType,
                );
                document.bindRef(rootPath, options.compressedUuid, property, {
                    kind: 'component',
                    index: componentIndex,
                });
                bound.push(`${property} → ${hit.node.path} (${componentType})`);
                continue;
            }
            if (componentType != null) {
                degraded.push(`${property} → ${hit.node.path}: 缺少 ${componentType}，已降级绑节点`);
            }
            document.bindRef(rootPath, options.compressedUuid, property, {
                kind: 'node',
                index: document.findNodeIndex(hit.node.path),
            });
            bound.push(`${property} → ${hit.node.path}`);
        }

        const boundButtons: string[] = [];
        for (const event of options.buttonEvents) {
            const hit = Lumen24ControllerBinder._locate(tree, event.nodePath ?? event.nodeName);
            if (hit.node == null) {
                notFound.push(`${event.nodeName}: node not found`);
                continue;
            }
            if (hit.ambiguous) {
                ambiguous.push(`${event.nodeName} (${hit.matches} matches, used ${hit.node.path})`);
            }
            const nodeComponents = document.inspectNode(hit.node.path).components;
            if (!nodeComponents.includes('cc.Button')) {
                notFound.push(`${event.nodeName}: cc.Button not found`);
                continue;
            }
            document.bindClickEvent(
                hit.node.path,
                rootPath,
                options.className,
                event.handler,
                event.customEventData ?? '',
                options.compressedUuid,
            );
            boundButtons.push(`${event.nodeName} → ${options.className}.${event.handler}`);
        }

        return { rootPath, bound, boundButtons, notFound, ambiguous, degraded };
    }

    /**
     * @description 解析节点上组件 entry 下标。
     * @param document 文档
     * @param nodePath 节点
     * @param componentType 类型
     * @returns entry 下标
     */
    private static _resolveComponentIndex(
        document: Lumen24PrefabDocument,
        nodePath: string,
        componentType: string,
    ): number {
        const wanted = componentType.trim();
        const normalized =
            wanted.startsWith('cc.') || ['Sprite', 'Label', 'Button'].includes(wanted)
                ? wanted.startsWith('cc.')
                    ? wanted
                    : `cc.${wanted}`
                : wanted;
        const targetNode = document.findNodeIndex(nodePath);
        const node = document.entries[targetNode];
        const components = Array.isArray(node?._components) ? node!._components : [];
        for (const item of components) {
            if (item == null || typeof item !== 'object') {
                continue;
            }
            const id = (item as { __id__?: unknown }).__id__;
            if (typeof id !== 'number') {
                continue;
            }
            const type = document.entries[id]?.__type__;
            if (type === normalized || type === wanted) {
                return id;
            }
        }
        throw new Error(`lumen_24_bind_controller_component_missing:${wanted}`);
    }

    /**
     * @description 按路径或名称定位节点。
     * @param tree 树根
     * @param locator 定位串
     * @returns 命中
     */
    private static _locate(
        tree: ILumen24TreeNode,
        locator: string,
    ): { readonly node: ILumen24TreeNode | null; readonly matches: number; readonly ambiguous: boolean } {
        const needle = locator.trim().replace(/^\/+/, '');
        if (needle.length === 0) {
            return { node: null, matches: 0, ambiguous: false };
        }
        const byPath = Lumen24ControllerBinder._findByPath(tree, needle);
        if (byPath != null) {
            return { node: byPath, matches: 1, ambiguous: false };
        }
        const name = needle.includes('/') ? needle.slice(needle.lastIndexOf('/') + 1) : needle;
        const matches: ILumen24TreeNode[] = [];
        Lumen24ControllerBinder._collectByName(tree, name, matches);
        if (matches.length === 0) {
            return { node: null, matches: 0, ambiguous: false };
        }
        return { node: matches[0] ?? null, matches: matches.length, ambiguous: matches.length > 1 };
    }

    /**
     * @description 路径精确匹配。
     * @param node 当前节点
     * @param path 目标路径
     * @returns 节点或 null
     */
    private static _findByPath(node: ILumen24TreeNode, path: string): ILumen24TreeNode | null {
        if (node.path === path || node.path.endsWith(`/${path}`)) {
            return node;
        }
        for (const child of node.children) {
            const hit = Lumen24ControllerBinder._findByPath(child, path);
            if (hit != null) {
                return hit;
            }
        }
        return null;
    }

    /**
     * @description 按名收集。
     * @param node 当前
     * @param name 名
     * @param output 输出
     * @returns void
     */
    private static _collectByName(node: ILumen24TreeNode, name: string, output: ILumen24TreeNode[]): void {
        if (node.name === name) {
            output.push(node);
        }
        for (const child of node.children) {
            Lumen24ControllerBinder._collectByName(child, name, output);
        }
    }
}
