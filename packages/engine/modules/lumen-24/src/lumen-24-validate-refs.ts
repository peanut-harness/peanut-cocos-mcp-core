import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { Lumen24PrefabDocument } from './lumen-24-prefab-document.js';

/**
 * @description Creator 2.4 引用校验结果条目。
 */
export interface ILumen24ValidateRefsIssue {
    /**
     * @description 问题码。
     */
    readonly code: string;
    /**
     * @description uuid（若有）。
     */
    readonly uuid?: string;
    /**
     * @description 说明。
     */
    readonly message: string;
}

/**
 * @description Creator 2.4 Prefab 引用校验：扫 `__uuid__`，对照 assets 下全部 `.meta`。
 * 不走 3.x LumenHierarchyRefValidator（`_lpos`/组件白名单不适用）。
 */
export class Lumen24ValidateRefs {
    /**
     * @description 校验 Prefab 内 uuid 是否都能在工程 meta 中解析。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab 相对路径
     * @returns 校验结果
     */
    public validate(
        projectRoot: string,
        prefabRelativePath: string,
    ): {
        readonly ok: boolean;
        readonly phase: 'creator_2x';
        readonly prefabRelativePath: string;
        readonly referencedUuidCount: number;
        readonly missing: readonly ILumen24ValidateRefsIssue[];
        readonly issues: readonly ILumen24ValidateRefsIssue[];
    } {
        const document = Lumen24PrefabDocument.open(projectRoot, prefabRelativePath);
        const uuids = this._collectUuids(document.entries);
        const index = this._buildUuidIndex(projectRoot);
        const missing: ILumen24ValidateRefsIssue[] = [];
        for (const uuid of uuids) {
            if (!index.has(uuid.toLowerCase())) {
                missing.push({
                    code: 'uuid_missing_in_meta',
                    uuid,
                    message: `no assets/**/*.meta maps to ${uuid}`,
                });
            }
        }
        return {
            ok: missing.length === 0,
            phase: 'creator_2x',
            prefabRelativePath: document.relativePath,
            referencedUuidCount: uuids.length,
            missing,
            issues: missing,
        };
    }

    /**
     * @description 递归收集 `__uuid__`。
     * @param value 任意 JSON
     * @returns uuid 列表（去重保序）
     */
    private _collectUuids(value: unknown): string[] {
        const found: string[] = [];
        const seen = new Set<string>();
        const walk = (node: unknown): void => {
            if (node == null) {
                return;
            }
            if (Array.isArray(node)) {
                for (const item of node) {
                    walk(item);
                }
                return;
            }
            if (typeof node !== 'object') {
                return;
            }
            const record = node as Record<string, unknown>;
            const uuid = record.__uuid__;
            if (typeof uuid === 'string' && uuid.trim().length > 0) {
                const primary = uuid.trim().replace(/@.*$/, '').toLowerCase();
                if (!seen.has(primary)) {
                    seen.add(primary);
                    found.push(uuid.trim().replace(/@.*$/, ''));
                }
            }
            for (const child of Object.values(record)) {
                walk(child);
            }
        };
        walk(value);
        return found;
    }

    /**
     * @description 扫描 assets 下 meta，建立 uuid → 相对路径。
     * @param projectRoot 工程根
     * @returns 小写 uuid 集合
     */
    private _buildUuidIndex(projectRoot: string): Set<string> {
        const assetsRoot = join(projectRoot, 'assets');
        const index = new Set<string>();
        if (!existsSync(assetsRoot)) {
            return index;
        }
        const stack = [assetsRoot];
        while (stack.length > 0) {
            const current = stack.pop();
            if (current == null) {
                continue;
            }
            let entries;
            try {
                entries = readdirSync(current);
            } catch {
                continue;
            }
            for (const name of entries) {
                const absolute = join(current, name);
                let stats;
                try {
                    stats = statSync(absolute);
                } catch {
                    continue;
                }
                if (stats.isDirectory()) {
                    stack.push(absolute);
                    continue;
                }
                if (!name.endsWith('.meta')) {
                    continue;
                }
                try {
                    const parsed = JSON.parse(readFileSync(absolute, 'utf8')) as { uuid?: unknown };
                    if (typeof parsed.uuid === 'string' && parsed.uuid.trim().length > 0) {
                        index.add(parsed.uuid.trim().toLowerCase());
                    }
                } catch {
                    // 跳过损坏 meta
                }
            }
        }
        return index;
    }
}
