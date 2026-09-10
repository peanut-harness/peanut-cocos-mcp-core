/**
 * @description Creator 2.4 节点配方（对齐 3.x ILumenNodeRecipe 字段子集）。
 */
export interface ILumen24NodeRecipe {
    /**
     * @description 节点名。
     */
    readonly name: string;
    /**
     * @description 逻辑模板：empty/sprite/label/button（可写 ui/Label 等别名）。
     */
    readonly template?: string;
    /**
     * @description 无模板时挂载的组件（builtin 或脚本 compressedUuid）。
     */
    readonly components?: readonly string[];
    /**
     * @description 写入单一组件的属性；需 `propComponent` 或可由 template 推断。
     */
    readonly props?: Readonly<Record<string, unknown>>;
    /**
     * @description `props` 作用的组件类型。
     */
    readonly propComponent?: string;
    /**
     * @description 按组件类型的属性补丁。
     */
    readonly componentProps?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
    /**
     * @description 节点属性补丁。
     */
    readonly nodeProps?: Readonly<Record<string, unknown>>;
    /**
     * @description 子配方。
     */
    readonly children?: readonly ILumen24NodeRecipe[];
}
