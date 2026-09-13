import { Lumen24PrefabDocument } from './lumen-24-prefab-document.js';
import type { Lumen24PrefabEntry } from './lumen-24-prefab-document.js';
import type { ILumen24NodeRecipe } from './lumen-24-recipe-types.js';

/**
 * @description 内存配方编译输入。
 */
export interface ILumen24CompileRecipeInput {
    /**
     * @description 相对路径标签。
     */
    readonly prefabRelativePath: string;
    /**
     * @description 根名。
     */
    readonly rootName: string;
    /**
     * @description 模式。
     */
    readonly mode: 'replaceRoot' | 'appendChildren';
    /**
     * @description replaceRoot 根配方。
     */
    readonly recipe?: ILumen24NodeRecipe;
    /**
     * @description appendChildren 子配方。
     */
    readonly recipes?: readonly ILumen24NodeRecipe[];
}

/**
 * @description 把 2.4 配方编译为内存 Prefab 条目（不写盘）。
 */
export class Lumen24RecipeMemoryCompiler {
    /**
     * @description 编译。
     * @param input 输入
     * @returns 条目
     */
    public compile(input: ILumen24CompileRecipeInput): {
        readonly entries: readonly Lumen24PrefabEntry[];
        readonly prefabRelativePath: string;
    } {
        if (input.mode === 'replaceRoot') {
            const recipe = input.recipe;
            if (recipe == null) {
                throw new Error('lumen_24_compile_recipe_missing');
            }
            if (recipe.template != null && recipe.template.length > 0 && recipe.template !== 'empty') {
                throw new Error('lumen_24_compile_replaceRoot_template_unsupported');
            }
            const document = Lumen24PrefabDocument.createEmpty(input.prefabRelativePath, recipe.name);
            // 在根上挂组件 + 子树：用临时父挂子再不够优雅；直接对根 apply components
            for (const componentType of recipe.components ?? []) {
                const trimmed = componentType.trim();
                if (trimmed.startsWith('cc.') || ['Sprite', 'Label', 'Button'].includes(trimmed)) {
                    document.attachBuiltinComponent(recipe.name, trimmed);
                } else if (trimmed.length > 0) {
                    document.attachScriptComponent(recipe.name, trimmed);
                }
            }
            if (recipe.nodeProps != null) {
                document.setNodeProps(recipe.name, {
                    ...(typeof recipe.nodeProps.active === 'boolean' ? { active: recipe.nodeProps.active } : {}),
                    ...(typeof recipe.nodeProps.x === 'number' ? { x: recipe.nodeProps.x } : {}),
                    ...(typeof recipe.nodeProps.y === 'number' ? { y: recipe.nodeProps.y } : {}),
                    ...(typeof recipe.nodeProps.opacity === 'number' ? { opacity: recipe.nodeProps.opacity } : {}),
                });
            }
            if (recipe.children != null && recipe.children.length > 0) {
                document.buildFromRecipe(recipe.name, recipe.children);
            }
            if (recipe.componentProps != null) {
                for (const [componentType, patch] of Object.entries(recipe.componentProps)) {
                    document.setComponentProps(recipe.name, componentType, patch);
                }
            }
            if (recipe.props != null) {
                const type = recipe.propComponent ?? recipe.components?.[0];
                if (type == null) {
                    throw new Error('lumen_24_compile_props_need_propComponent');
                }
                document.setComponentProps(recipe.name, type, recipe.props);
            }
            return { entries: document.cloneEntries(), prefabRelativePath: input.prefabRelativePath };
        }
        const document = Lumen24PrefabDocument.createEmpty(input.prefabRelativePath, input.rootName);
        if (input.recipes == null) {
            throw new Error('lumen_24_compile_recipes_missing');
        }
        document.buildFromRecipe(input.rootName, input.recipes);
        return { entries: document.cloneEntries(), prefabRelativePath: input.prefabRelativePath };
    }
}
