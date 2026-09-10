/**
 * @description Prefab 编辑器中按根节点名解析 uuid 所需的节点快照形状。
 */
export interface IPrefabEditorHierarchyNode {
    /** @description 节点 uuid。 */
    readonly uuid?: unknown;
    /** @description 节点名。 */
    readonly name?: unknown;
    /** @description 子节点。 */
    readonly children?: unknown;
    /** @description 其它字段透传。 */
    readonly [key: string]: unknown;
}

/**
 * @description 在 Prefab 编辑模式下按根名定位真正的根节点 uuid。
 *
 * Creator Prefab 编辑器常包一层隐藏 facade；真正根节点名与 Prefab 文件名（无扩展名）一致。
 */
export class PrefabEditorRootResolver {
    /**
     * @description 在层次快照中按名称查找第一个匹配节点的 uuid。
     * @param nodes 层次根列表或单根。
     * @param rootName 期望根名。
     * @returns uuid；未找到为 `undefined`。
     */
    public findUuidByName(
        nodes: readonly IPrefabEditorHierarchyNode[] | IPrefabEditorHierarchyNode | null | undefined,
        rootName: string,
    ): string | undefined {
        const expected = this._readRootName(rootName);
        const list = this._asNodeList(nodes);
        for (const node of list) {
            const found = this._walk(node, expected);
            if (found != null) {
                return found;
            }
        }
        return undefined;
    }

    /**
     * @description 轮询加载层次直到找到根 uuid 或超时。
     * @param loadHierarchy 加载层次的异步函数。
     * @param rootName 期望根名。
     * @param timeoutMs 超时毫秒。
     * @param pollMs 轮询间隔。
     * @returns uuid；超时为 `undefined`。
     */
    public async waitForRootUuid(
        loadHierarchy: () => Promise<
            readonly IPrefabEditorHierarchyNode[] | IPrefabEditorHierarchyNode | null | undefined
        >,
        rootName: string,
        timeoutMs = 10_000,
        pollMs = 200,
    ): Promise<string | undefined> {
        const expected = this._readRootName(rootName);
        const deadline = Date.now() + Math.max(1, timeoutMs);
        const interval = Math.max(20, pollMs);
        while (Date.now() < deadline) {
            const hierarchy = await loadHierarchy();
            const uuid = this.findUuidByName(hierarchy, expected);
            if (uuid != null) {
                return uuid;
            }
            await new Promise((resolvePromise) => {
                setTimeout(resolvePromise, interval);
            });
        }
        return undefined;
    }

    /**
     * @description 从 Prefab 相对/绝对路径推导默认根名。
     * @param prefabPath Prefab 路径。
     * @returns 无扩展名的 basename。
     */
    public rootNameFromPrefabPath(prefabPath: string): string {
        if (typeof prefabPath !== 'string' || prefabPath.trim().length === 0) {
            throw new Error('prefab_editor_root_prefab_path_invalid');
        }
        const normalized = prefabPath.trim().replace(/\\/gu, '/');
        const base = normalized.includes('/')
            ? (normalized.slice(normalized.lastIndexOf('/') + 1) ?? normalized)
            : normalized;
        return base.replace(/\.prefab$/iu, '');
    }

    /**
     * @description 深度优先按名称查找。
     * @param node 当前节点。
     * @param rootName 期望名。
     * @returns uuid。
     */
    private _walk(node: IPrefabEditorHierarchyNode, rootName: string): string | undefined {
        const name = typeof node.name === 'string' ? node.name : undefined;
        const uuid = typeof node.uuid === 'string' ? node.uuid : undefined;
        if (name === rootName && uuid != null && uuid.trim().length > 0) {
            return uuid.trim();
        }
        for (const child of this._asNodeList(node.children)) {
            const found = this._walk(child, rootName);
            if (found != null) {
                return found;
            }
        }
        return undefined;
    }

    /**
     * @description 将未知层次收窄为节点列表。
     * @param value 输入。
     * @returns 节点列表。
     */
    private _asNodeList(value: unknown): readonly IPrefabEditorHierarchyNode[] {
        if (value == null) {
            return [];
        }
        if (Array.isArray(value)) {
            return value.filter(
                (item): item is IPrefabEditorHierarchyNode =>
                    item != null && typeof item === 'object' && !Array.isArray(item),
            );
        }
        if (typeof value === 'object') {
            return [value as IPrefabEditorHierarchyNode];
        }
        return [];
    }

    /**
     * @description 校验根名。
     * @param rootName 输入。
     * @returns 规范化根名。
     */
    private _readRootName(rootName: string): string {
        if (typeof rootName !== 'string' || rootName.trim().length === 0) {
            throw new Error('prefab_editor_root_name_invalid');
        }
        return rootName.trim();
    }
}


