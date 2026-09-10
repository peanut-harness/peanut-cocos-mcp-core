import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Lumen24PrefabEntry } from './lumen-24-prefab-document.js';

/**
 * @description 解析 lumen-24 随包 `bundled/default_prefab_24` 根目录。
 */
export class Lumen24DefaultTemplateRoot {
    /**
     * @description 目录名。
     */
    public static readonly DIR_NAME = 'default_prefab_24';

    /**
     * @description 可选覆盖（测试 / Bridge 注入）。
     */
    private static _overrideRoot: string | null = null;

    /**
     * @description 已按工程解析过的根（避免重复扫 installed.json）。
     */
    private static _projectResolvedRoot: string | null = null;

    /**
     * @description 注入模板根（单测或插件显式路径）。
     * @param absoluteRoot 绝对路径或 null 清除
     * @returns void
     */
    public static setOverride(absoluteRoot: string | null): void {
        Lumen24DefaultTemplateRoot._overrideRoot =
            absoluteRoot == null || absoluteRoot.trim().length === 0 ? null : absoluteRoot.trim();
        Lumen24DefaultTemplateRoot._projectResolvedRoot = null;
    }

    /**
     * @description 从 Creator 工程内已安装的 `peanut.editor-mcp` 包解析模板根（fat bundle 下 `import.meta` 不可靠）。
     * @param projectRoot 工程根
     * @returns 模板根；找不到则 null
     */
    public static resolveFromProject(projectRoot: string): string | null {
        const normalized = projectRoot.replace(/\\/g, '/').replace(/\/+$/, '');
        if (normalized.length === 0) {
            return null;
        }
        const pluginHome = join(normalized, 'peanut-plugins', 'plugins', 'peanut.editor-mcp');
        if (!existsSync(pluginHome) || !statSync(pluginHome).isDirectory()) {
            return null;
        }
        let preferred: string | null = null;
        const installedPath = join(normalized, 'peanut-plugins', 'installed.json');
        if (existsSync(installedPath)) {
            try {
                const parsed = JSON.parse(readFileSync(installedPath, 'utf8')) as {
                    readonly plugins?: readonly {
                        readonly pluginId?: string;
                        readonly activeVersion?: string;
                    }[];
                };
                const hit = parsed.plugins?.find((entry) => entry.pluginId === 'peanut.editor-mcp');
                if (hit?.activeVersion != null && hit.activeVersion.trim().length > 0) {
                    preferred = join(pluginHome, hit.activeVersion.trim(), 'bundled', Lumen24DefaultTemplateRoot.DIR_NAME);
                }
            } catch {
                preferred = null;
            }
        }
        const candidates: string[] = [];
        if (preferred != null) {
            candidates.push(preferred);
        }
        for (const name of readdirSync(pluginHome).sort().reverse()) {
            candidates.push(join(pluginHome, name, 'bundled', Lumen24DefaultTemplateRoot.DIR_NAME));
        }
        for (const candidate of candidates) {
            if (Lumen24DefaultTemplateRoot._looksLikeTemplateRoot(candidate)) {
                return candidate;
            }
        }
        return null;
    }

    /**
     * @description 确保工程侧模板根已注入（幂等）。
     * @param projectRoot 工程根
     * @returns void
     */
    public static ensureForProject(projectRoot: string): void {
        if (Lumen24DefaultTemplateRoot._overrideRoot != null) {
            return;
        }
        if (Lumen24DefaultTemplateRoot._projectResolvedRoot != null) {
            return;
        }
        const fromProject = Lumen24DefaultTemplateRoot.resolveFromProject(projectRoot);
        if (fromProject != null) {
            Lumen24DefaultTemplateRoot._projectResolvedRoot = fromProject;
            Lumen24DefaultTemplateRoot._overrideRoot = fromProject;
        }
    }

    /**
     * @description 当前模板根绝对路径。
     * @returns 路径
     */
    public static resolve(): string {
        if (Lumen24DefaultTemplateRoot._overrideRoot != null) {
            return Lumen24DefaultTemplateRoot._overrideRoot;
        }
        let moduleDirectory = '';
        try {
            moduleDirectory = dirname(fileURLToPath(import.meta.url));
        } catch {
            moduleDirectory = '';
        }
        const candidates = [
            ...(moduleDirectory.length > 0
                ? [
                      join(moduleDirectory, 'bundled', Lumen24DefaultTemplateRoot.DIR_NAME),
                      join(moduleDirectory, '..', 'bundled', Lumen24DefaultTemplateRoot.DIR_NAME),
                      join(moduleDirectory, '..', '..', 'bundled', Lumen24DefaultTemplateRoot.DIR_NAME),
                  ]
                : []),
        ];
        for (const candidate of candidates) {
            if (Lumen24DefaultTemplateRoot._looksLikeTemplateRoot(candidate)) {
                return candidate;
            }
        }
        throw new Error(
            `lumen_24_default_prefab_missing:tried=${candidates.join('|') || '(no import.meta)'}`,
        );
    }

    /**
     * @description 是否像模板根（含至少一个 `.prefab`）。
     * @param absoluteRoot 候选
     * @returns 是否可用
     */
    private static _looksLikeTemplateRoot(absoluteRoot: string): boolean {
        if (!existsSync(absoluteRoot) || !statSync(absoluteRoot).isDirectory()) {
            return false;
        }
        return Lumen24DefaultTemplateRoot._hasPrefab(absoluteRoot);
    }

    /**
     * @description 目录树是否含 `.prefab`。
     * @param absoluteRoot 根
     * @returns 是否含
     */
    private static _hasPrefab(absoluteRoot: string): boolean {
        for (const name of readdirSync(absoluteRoot)) {
            const full = join(absoluteRoot, name);
            if (statSync(full).isDirectory()) {
                if (Lumen24DefaultTemplateRoot._hasPrefab(full)) {
                    return true;
                }
                continue;
            }
            if (name.toLowerCase().endsWith('.prefab')) {
                return true;
            }
        }
        return false;
    }
}

/**
 * @description 模板目录条目。
 */
export interface ILumen24CatalogTemplate {
    /**
     * @description 模板 id（相对路径无扩展名）。
     */
    readonly id: string;
    /**
     * @description 绝对路径。
     */
    readonly absolutePath: string;
    /**
     * @description 种类。
     */
    readonly kind: 'prefab';
}

/**
 * @description 扫描 `default_prefab_24` 列出模板 id。
 */
export class Lumen24TemplateCatalog {
    /**
     * @description 列出全部模板。
     * @param templateRoot 可选根；缺省用默认解析
     * @returns 模板列表
     */
    public static list(templateRoot?: string): readonly ILumen24CatalogTemplate[] {
        const root = templateRoot ?? Lumen24DefaultTemplateRoot.resolve();
        const collected: ILumen24CatalogTemplate[] = [];
        Lumen24TemplateCatalog._walk(root, root, collected);
        collected.sort((left, right) => left.id.localeCompare(right.id));
        return collected;
    }

    /**
     * @description 将模板 id 解析为绝对 `.prefab` 路径。
     * @param templateId 模板 id
     * @param templateRoot 可选根
     * @returns 绝对路径
     */
    public static resolveAbsolutePath(templateId: string, templateRoot?: string): string {
        const root = templateRoot ?? Lumen24DefaultTemplateRoot.resolve();
        const normalized = templateId.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.prefab$/i, '');
        const candidates = [
            join(root, `${normalized}.prefab`),
            join(root, 'ui', `${normalized.replace(/^ui\//i, '')}.prefab`),
        ];
        for (const candidate of candidates) {
            if (existsSync(candidate)) {
                return candidate;
            }
        }
        throw new Error(`lumen_24_template_file_missing:${templateId}`);
    }

    /**
     * @description 读取模板 JSON 数组。
     * @param absolutePath 绝对路径
     * @returns 条目
     */
    public static readEntries(absolutePath: string): Lumen24PrefabEntry[] {
        const parsed = JSON.parse(readFileSync(absolutePath, 'utf8')) as unknown;
        if (!Array.isArray(parsed)) {
            throw new Error(`lumen_24_template_not_array:${absolutePath}`);
        }
        return parsed.map((entry, index) => {
            if (entry == null || typeof entry !== 'object' || Array.isArray(entry)) {
                throw new Error(`lumen_24_template_entry_invalid:${absolutePath}:${index}`);
            }
            return entry as Lumen24PrefabEntry;
        });
    }

    /**
     * @description 递归收集 prefab。
     * @param root 模板根
     * @param directory 当前目录
     * @param out 输出
     * @returns void
     */
    private static _walk(root: string, directory: string, out: ILumen24CatalogTemplate[]): void {
        for (const name of readdirSync(directory)) {
            if (name === 'README.md' || name.startsWith('.')) {
                continue;
            }
            const full = join(directory, name);
            if (statSync(full).isDirectory()) {
                Lumen24TemplateCatalog._walk(root, full, out);
                continue;
            }
            if (!name.toLowerCase().endsWith('.prefab')) {
                continue;
            }
            const relative = full.slice(root.length).replace(/\\/g, '/').replace(/^\//, '');
            const id = relative.replace(/\.prefab$/i, '');
            out.push({ id, absolutePath: full, kind: 'prefab' });
        }
    }
}
