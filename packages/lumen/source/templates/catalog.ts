/**
 * @description default_prefab 模板目录扫描（供 AI / CLI 发现合法 template 路径）。
 */
import { existsSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

/**
 * @description 单条模板摘要。
 */
export interface ILumenTemplateEntry {
    /**
     * @description 相对模板根的路径（无 `.prefab`），如 `ui/Label`。
     */
    readonly id: string;

    /**
     * @description 相对模板根的文件路径（含 `.prefab`）。
     */
    readonly relativePath: string;
}

/**
 * @description 扫描模板根下全部 `.prefab`。
 */
export class LumenTemplateCatalog {
    /**
     * @description 列出模板；目录不存在则抛错。
     * @param templateRoot 模板根绝对路径
     * @returns 按 id 排序的模板列表
     */
    public static list(templateRoot: string): readonly ILumenTemplateEntry[] {
        if (!existsSync(templateRoot) || !statSync(templateRoot).isDirectory()) {
            throw new Error(`lumen_template_root_missing:${templateRoot}`);
        }
        const found: ILumenTemplateEntry[] = [];
        this._walk(templateRoot, templateRoot, found);
        return found.sort((left, right) => left.id.localeCompare(right.id));
    }

    /**
     * @description 递归收集 prefab。
     * @param root 模板根
     * @param current 当前目录
     * @param out 输出
     */
    private static _walk(root: string, current: string, out: ILumenTemplateEntry[]): void {
        for (const name of readdirSync(current)) {
            if (name.startsWith('.')) {
                continue;
            }
            const absolute = join(current, name);
            const stat = statSync(absolute);
            if (stat.isDirectory()) {
                this._walk(root, absolute, out);
                continue;
            }
            if (!name.endsWith('.prefab')) {
                continue;
            }
            const relativePath = relative(root, absolute).split(sep).join('/');
            const id = relativePath.replace(/\.prefab$/i, '');
            out.push({ id, relativePath });
        }
    }
}
