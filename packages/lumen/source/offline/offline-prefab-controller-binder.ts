import type { ILumenTreeNode } from '../hierarchy/prefab-inspector';
import { LumenPrefabInspector } from '../hierarchy/prefab-inspector';
import type { LumenPrefabDocument } from '../hierarchy/prefab-document';

/**
 * @description 一条按钮点击绑定。
 */
export interface IOfflineButtonEventBinding {
    readonly nodeName: string;
    /** @description 节点在预制体里的绝对路径，如 `/Panel/grid/btn`。 */
    readonly nodePath?: string;
    readonly handler: string;
    readonly customEventData?: string;
}

/**
 * @description 离线控制器绑定入参。
 */
export interface IOfflineControllerBindOptions {
    /** @description 控制器脚本的 compressedUuid（Prefab `__type__`）。 */
    readonly compressedUuid: string;
    /** @description 脚本类名，写入 ClickEvent.component 便于人读。 */
    readonly className: string;
    /** @description `属性名 -> 节点定位串` 的节点引用绑定。 */
    readonly propertyBindings: Readonly<Record<string, string>>;
    /** @description `属性名 -> Cocos 组件类型`（如 `cc.Label`）。 */
    readonly propertyComponents?: Readonly<Record<string, string>>;
    /** @description 按钮点击绑定。 */
    readonly buttonEvents: readonly IOfflineButtonEventBinding[];
}

/**
 * @description 离线控制器绑定结果。
 */
export interface IOfflineControllerBindResult {
    readonly rootPath: string;
    readonly bound: readonly string[];
    readonly boundButtons: readonly string[];
    readonly notFound: readonly string[];
    readonly ambiguous: readonly string[];
    readonly degraded: readonly string[];
}

/**
 * @description 纯离线的控制器绑定器：在内存文档上挂脚本、写节点引用、绑点击事件。
 */
export class OfflinePrefabControllerBinder {
    /**
     * @description 在内存文档上完成控制器绑定。
     * @param document 已打开的 Prefab 文档
     * @param options 绑定选项
     * @returns 绑定摘要
     */
    public static bind(document: LumenPrefabDocument, options: IOfflineControllerBindOptions): IOfflineControllerBindResult {
        if (options.compressedUuid.trim().length === 0) {
            throw new Error('offline_bind_compressed_uuid_required');
        }
        const tree = LumenPrefabInspector.buildTree(document.entries);
        const rootPath = tree.path;
        document.attachScriptComponent(rootPath, options.compressedUuid);

        const bound: string[] = [];
        const notFound: string[] = [];
        const ambiguous: string[] = [];
        const degraded: string[] = [];
        const properties: Record<string, unknown> = {};
        for (const [property, locator] of Object.entries(options.propertyBindings)) {
            const hit = OfflinePrefabControllerBinder._locate(tree, locator);
            if (hit.node == null) {
                notFound.push(`${property} → ${locator}`);
                continue;
            }
            if (hit.ambiguous) {
                ambiguous.push(`${property} → ${locator} (${hit.matches} matches, used ${hit.node.path})`);
            }
            const componentType = options.propertyComponents?.[property];
            if (componentType && hit.node.components.includes(componentType)) {
                properties[property] = { $component: { nodePath: hit.node.path, type: componentType } };
                bound.push(`${property} → ${hit.node.path} (${componentType})`);
                continue;
            }
            if (componentType) {
                degraded.push(`${property} → ${hit.node.path}: 缺少 ${componentType}，已降级绑节点`);
            }
            properties[property] = { $node: hit.node.path };
            bound.push(`${property} → ${hit.node.path}`);
        }
        if (Object.keys(properties).length > 0) {
            document.setScriptProperties(rootPath, options.compressedUuid, properties);
        }

        const boundButtons: string[] = [];
        for (const event of options.buttonEvents) {
            const hit = OfflinePrefabControllerBinder._locate(tree, event.nodePath ?? event.nodeName);
            if (hit.node == null) {
                notFound.push(`${event.nodeName}: node not found`);
                continue;
            }
            if (hit.ambiguous) {
                ambiguous.push(`${event.nodeName} (${hit.matches} matches, used ${hit.node.path})`);
            }
            if (!hit.node.components.includes('cc.Button')) {
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
     * @description 解析节点定位串。
     * @param tree 预制体树
     * @param locator 路径或图层名
     * @returns 命中节点与多义标记
     */
    private static _locate(
        tree: ILumenTreeNode,
        locator: string,
    ): {
        node: ILumenTreeNode | null;
        ambiguous: boolean;
        matches: number;
    } {
        const trimmed = locator.trim();
        if (trimmed.startsWith('/')) {
            const node = OfflinePrefabControllerBinder._findByPath(tree, trimmed);
            return { node, ambiguous: false, matches: node ? 1 : 0 };
        }
        const hits = OfflinePrefabControllerBinder._findAllByName(tree, trimmed);
        return { node: hits[0] ?? null, ambiguous: hits.length > 1, matches: hits.length };
    }

    /**
     * @description 按绝对路径精确定位节点。
     * @param root 根树节点
     * @param path 绝对路径
     * @returns 命中树节点；未命中返回 null
     */
    private static _findByPath(root: ILumenTreeNode, path: string): ILumenTreeNode | null {
        const wanted = path.replace(/\/+$/, '');
        const queue: ILumenTreeNode[] = [root];
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.path === wanted) {
                return current;
            }
            queue.push(...current.children);
        }
        return null;
    }

    /**
     * @description 广度优先收集全部同名后代。
     * @param root 根树节点
     * @param name 目标节点名
     * @returns 命中列表
     */
    private static _findAllByName(root: ILumenTreeNode, name: string): ILumenTreeNode[] {
        const hits: ILumenTreeNode[] = [];
        const queue: ILumenTreeNode[] = [root];
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current !== root && current.name === name) {
                hits.push(current);
            }
            queue.push(...current.children);
        }
        return hits.length > 0 ? hits : root.name === name ? [root] : [];
    }
}
