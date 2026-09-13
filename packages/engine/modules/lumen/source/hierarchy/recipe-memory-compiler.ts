import { join } from 'path';

import { LumenDefaultTemplateRoot } from '../templates/default-root';
import { LumenPrefabDocument } from './prefab-document';
import type { ILumenNodeRecipe, PrefabEntry } from '../types';

/**
 * @description 内存配方编译输入（不写盘）。
 */
export interface ILumenRecipeMemoryCompileInput {
    /**
     * @description 写入结果中的相对路径标签。
     */
    readonly prefabRelativePath: string;
    /**
     * @description 空壳根节点名；`replaceRoot` 时会被配方根名替换。
     */
    readonly rootName: string;
    /**
     * @description `replaceRoot` 用单棵配方替换根；`appendChildren` 在空根下挂子树。
     */
    readonly mode: 'replaceRoot' | 'appendChildren';
    /**
     * @description `replaceRoot` 的根配方。
     */
    readonly recipe?: ILumenNodeRecipe;
    /**
     * @description `appendChildren` 的同级子配方。
     */
    readonly recipes?: readonly ILumenNodeRecipe[];
    /**
     * @description `appendChildren` 时写入空根 UITransform.contentSize。
     */
    readonly rootContentSize?: Readonly<{ width: number; height: number }>;
    /**
     * @description `appendChildren` 时写入空根 UITransform.anchorPoint。
     */
    readonly rootAnchorPoint?: Readonly<{ x: number; y: number }>;
    /**
     * @description 可选 `default_prefab` 模板根；配方含 `template` 时用于解析。
     */
    readonly templateRoot?: string;
    /**
     * @description 自定义模板解析；优先于 `templateRoot`。
     */
    readonly resolveTemplateAbsolutePath?: (template: string) => string;
}

/**
 * @description 内存配方编译结果。
 */
export interface ILumenRecipeMemoryCompileResult {
    /**
     * @description Prefab 序列化数组。
     */
    readonly entries: readonly PrefabEntry[];
}

/**
 * @description 把 lumen 配方编译为内存 Prefab 条目，供 MCP / 测试复用。
 */
export class LumenRecipeMemoryCompiler {
    /**
     * @description 按模式编译配方。
     * @param input 已收窄的编译输入
     * @returns 序列化条目
     */
    public compile(input: ILumenRecipeMemoryCompileInput): ILumenRecipeMemoryCompileResult {
        const prefabDocument = LumenPrefabDocument.createEmpty(input.prefabRelativePath, input.rootName);
        const resolveTemplate = this._resolveTemplateFn(input);
        if (input.mode === 'replaceRoot') {
            const recipe = input.recipe;
            if (recipe == null) {
                throw new Error('lumen_compile_recipe_missing');
            }
            if (recipe.template != null && recipe.template.length > 0 && recipe.template !== 'empty') {
                throw new Error(
                    'lumen_root_template_unsupported:replaceRoot_requires_components_not_template',
                );
            }
            prefabDocument.buildRootFromRecipe(recipe, resolveTemplate);
            return { entries: prefabDocument.entries };
        }
        const recipes = input.recipes ?? [];
        if (input.rootContentSize != null || input.rootAnchorPoint != null) {
            prefabDocument.setComponentProperty(`/${input.rootName}`, 'cc.UITransform', {
                ...(input.rootContentSize == null ? {} : { contentSize: input.rootContentSize }),
                ...(input.rootAnchorPoint == null ? {} : { anchorPoint: input.rootAnchorPoint }),
            });
        }
        if (recipes.length > 0) {
            if (this._recipesNeedTemplate(recipes) && resolveTemplate == null) {
                throw new Error(
                    'lumen_compile_recipe_template_requires_resolver:pass_templateRoot_or_resolveTemplateAbsolutePath',
                );
            }
            prefabDocument.buildFromRecipe(`/${input.rootName}`, recipes, resolveTemplate);
        }
        return { entries: prefabDocument.entries };
    }

    /**
     * @description 解析模板回调；优先自定义，其次 templateRoot / 内置包。
     * @param input 编译输入。
     * @returns 解析函数；无需模板时可为 undefined。
     */
    private _resolveTemplateFn(
        input: ILumenRecipeMemoryCompileInput,
    ): ((template: string) => string) | undefined {
        if (input.resolveTemplateAbsolutePath != null) {
            return input.resolveTemplateAbsolutePath;
        }
        const needsTemplate =
            (input.recipe != null && this._recipesNeedTemplate([input.recipe])) ||
            this._recipesNeedTemplate(input.recipes ?? []);
        if (!needsTemplate) {
            return undefined;
        }
        const templateRoot =
            input.templateRoot != null && input.templateRoot.trim().length > 0
                ? input.templateRoot.trim()
                : LumenDefaultTemplateRoot.resolve();
        if (templateRoot == null || templateRoot.length === 0) {
            return undefined;
        }
        return (template: string): string => {
            const trimmed = template.trim();
            if (trimmed.length === 0) {
                throw new Error('lumen_template_id_empty');
            }
            return join(templateRoot, `${trimmed}.prefab`);
        };
    }

    /**
     * @description 递归判断配方树是否声明 template。
     * @param recipes 配方列表。
     * @returns 是否需要模板解析。
     */
    private _recipesNeedTemplate(recipes: readonly ILumenNodeRecipe[]): boolean {
        for (const recipe of recipes) {
            if (recipe.template != null && recipe.template.length > 0 && recipe.template !== 'empty') {
                return true;
            }
            if (recipe.children != null && this._recipesNeedTemplate(recipe.children)) {
                return true;
            }
        }
        return false;
    }
}
