import { randomBytes } from 'node:crypto';

import type { Lumen24PrefabEntry } from './lumen-24-prefab-document.js';

/**
 * @description 深拷贝 JSON 可序列化值（Creator 2.4 Electron 无 `structuredClone`）。
 * @param value 任意值
 * @returns 拷贝
 */
function deepCloneJson<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * @description Prefab 序列化数组中 `__id__` 重映射与本地 fileId 工具（2.4，无 CompPrefabInfo）。
 */
export class Lumen24PrefabIdTools {
    /**
     * @description 生成 Prefab 本地 fileId（22 位）。
     * @returns fileId
     */
    public static createFileId(): string {
        return randomBytes(12).toString('base64').replace(/[+/=]/g, 'x').slice(0, 22);
    }

    /**
     * @description 深拷贝条目并用映射表重写所有 `__id__`。
     * @param entry 原始条目
     * @param idMap 旧下标 → 新下标
     * @returns 重映射后的条目
     */
    public static remapEntry(entry: Lumen24PrefabEntry, idMap: ReadonlyMap<number, number>): Lumen24PrefabEntry {
        return Lumen24PrefabIdTools._remapValue(deepCloneJson(entry), idMap) as Lumen24PrefabEntry;
    }

    /**
     * @description 批量重映射条目数组中的全部 `__id__` 引用。
     * @param entries 条目列表（原地修改）
     * @param idMap 旧下标 → 新下标
     * @returns void
     */
    public static remapEntriesInPlace(entries: Lumen24PrefabEntry[], idMap: ReadonlyMap<number, number>): void {
        for (let index = 0; index < entries.length; index += 1) {
            const entry = entries[index];
            if (entry == null) {
                continue;
            }
            entries[index] = Lumen24PrefabIdTools.remapEntry(entry, idMap);
        }
    }

    /**
     * @description 从模板剥离 `cc.Prefab` 头，生成可挂到目标文档的子树。
     * @param templateEntries 模板完整数组
     * @param baseIndex 目标文档追加起始下标
     * @returns 重映射后的子树条目与新根下标
     */
    public static cloneSubtreeForEmbed(
        templateEntries: readonly Lumen24PrefabEntry[],
        baseIndex: number,
    ): { readonly entries: Lumen24PrefabEntry[]; readonly rootIndex: number } {
        if (templateEntries.length < 2) {
            throw new Error('lumen_24_template_too_short');
        }
        const hasPrefabHeader = templateEntries[0]?.__type__ === 'cc.Prefab';
        const sourceStart = hasPrefabHeader ? 1 : 0;
        const sourceSlice = templateEntries.slice(sourceStart).map((entry) => deepCloneJson(entry));
        const idMap = new Map<number, number>();
        idMap.set(0, 0);
        for (let offset = 0; offset < sourceSlice.length; offset += 1) {
            idMap.set(sourceStart + offset, baseIndex + offset);
        }
        const remapped = sourceSlice.map((entry) => Lumen24PrefabIdTools.remapEntry(entry, idMap));
        Lumen24PrefabIdTools.regenerateLocalFileIds(remapped);
        return { entries: remapped, rootIndex: baseIndex };
    }

    /**
     * @description 嵌入场景：去掉 PrefabInfo，节点 `_prefab` 置 null（2.4 `.fire` 无 PrefabInfo）。
     * @param entries 文档全量条目
     * @param startIndex 本次嵌入起始下标（含）
     * @returns 压缩后的条目与旧→新下标映射
     */
    public static unpackEmbeddedForScene(
        entries: Lumen24PrefabEntry[],
        startIndex: number,
    ): { readonly entries: Lumen24PrefabEntry[]; readonly idMap: Map<number, number> } {
        if (startIndex < 0 || startIndex > entries.length) {
            throw new Error(`lumen_24_embed_range_invalid:${startIndex}`);
        }
        const remove = new Set<number>();
        for (let index = startIndex; index < entries.length; index += 1) {
            const entry = entries[index];
            if (entry == null || typeof entry !== 'object') {
                continue;
            }
            if (entry.__type__ === 'cc.PrefabInfo') {
                remove.add(index);
                continue;
            }
            if (entry.__type__ === 'cc.Node') {
                entry._prefab = null;
            }
        }
        if (remove.size === 0) {
            const identity = new Map<number, number>();
            for (let index = 0; index < entries.length; index += 1) {
                identity.set(index, index);
            }
            return { entries, idMap: identity };
        }
        return Lumen24PrefabIdTools.compactEntries(entries, remove);
    }

    /**
     * @description 嵌入 Prefab：清模板引擎 uuid，PrefabInfo.root 改绑文档根，重生 fileId。
     * @param entries 文档全量条目
     * @param startIndex 嵌入起始
     * @param documentRootIndex 文档根节点下标
     * @returns void
     */
    public static rebindEmbeddedPrefabInfos(
        entries: Lumen24PrefabEntry[],
        startIndex: number,
        documentRootIndex: number,
    ): void {
        for (let index = startIndex; index < entries.length; index += 1) {
            const entry = entries[index];
            if (entry == null || entry.__type__ !== 'cc.PrefabInfo') {
                continue;
            }
            entry.asset = null;
            entry.root = { __id__: documentRootIndex };
            entry.fileId = Lumen24PrefabIdTools.createFileId();
        }
    }

    /**
     * @description 克隆为工程根 Prefab：清模板 asset uuid，重生全部 fileId。
     * @param entries 条目（原地）
     * @returns void
     */
    public static prepareClonedRootPrefab(entries: Lumen24PrefabEntry[]): void {
        Lumen24PrefabIdTools.regenerateLocalFileIds(entries);
        for (const entry of entries) {
            if (entry == null || entry.__type__ !== 'cc.PrefabInfo') {
                continue;
            }
            entry.asset = null;
        }
    }

    /**
     * @description 为条目树中所有 `fileId` 重新生成唯一本地 id。
     * @param entries 条目数组（原地修改）
     * @returns void
     */
    public static regenerateLocalFileIds(entries: Lumen24PrefabEntry[]): void {
        const used = new Set<string>();
        for (const entry of entries) {
            if (entry == null || typeof entry !== 'object') {
                continue;
            }
            if (typeof entry.fileId === 'string' && entry.fileId.length > 0) {
                let next = Lumen24PrefabIdTools.createFileId();
                while (used.has(next)) {
                    next = Lumen24PrefabIdTools.createFileId();
                }
                used.add(next);
                entry.fileId = next;
            }
        }
    }

    /**
     * @description 删除指定下标后重建连续数组与 id 映射。
     * @param entries 原条目
     * @param removeSet 待删下标
     * @returns 新条目与旧→新映射
     */
    public static compactEntries(
        entries: readonly Lumen24PrefabEntry[],
        removeSet: ReadonlySet<number>,
    ): { readonly entries: Lumen24PrefabEntry[]; readonly idMap: Map<number, number> } {
        const idMap = new Map<number, number>();
        const next: Lumen24PrefabEntry[] = [];
        for (let oldIndex = 0; oldIndex < entries.length; oldIndex += 1) {
            if (removeSet.has(oldIndex)) {
                continue;
            }
            const entry = entries[oldIndex];
            if (entry == null) {
                continue;
            }
            idMap.set(oldIndex, next.length);
            next.push(deepCloneJson(entry));
        }
        Lumen24PrefabIdTools.remapEntriesInPlace(next, idMap);
        return { entries: next, idMap };
    }

    /**
     * @description 递归重映射任意 JSON 值中的 `__id__`。
     * @param value 任意值
     * @param idMap 映射表
     * @returns 重映射后的值
     */
    private static _remapValue(value: unknown, idMap: ReadonlyMap<number, number>): unknown {
        if (Array.isArray(value)) {
            return value.map((item) => Lumen24PrefabIdTools._remapValue(item, idMap));
        }
        if (value == null || typeof value !== 'object') {
            return value;
        }
        const record = value as Record<string, unknown>;
        const next: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(record)) {
            if (key === '__id__' && typeof child === 'number') {
                next[key] = idMap.get(child) ?? child;
            } else {
                next[key] = Lumen24PrefabIdTools._remapValue(child, idMap);
            }
        }
        return next;
    }
}
