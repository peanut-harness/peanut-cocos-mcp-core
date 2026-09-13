/**
 * @description Inspector parity 拒绝名单：废弃组件与不可挂抽象基类。
 *
 * 挂载策略从「白名单才允许」改为「引擎组件默认可挂，这里点名拒绝」。
 */

/**
 * @description 属性来源（策展白名单 vs 实例序列化发现）。
 */
export type LumenPropertyOrigin = 'curated' | 'discovered' | 'engine';

/**
 * @description 内置组件挂载 / 字段发现的拒绝策略。
 */
export class LumenPropertyDenyList {
    /**
     * @description 抽象或运行时内部基类，禁止作为节点组件挂载。
     */
    private static readonly _attachDeniedTypes: ReadonlySet<string> = new Set([
        'cc.Component',
        'cc.Renderer',
        'cc.UIRenderer',
        'cc.Renderable2D',
        'cc.ModelRenderer',
        'cc.Light',
        'cc.Collider',
        'cc.Collider2D',
        'cc.Joint',
        'cc.Joint2D',
        'cc.Constraint',
        'cc.CharacterController',
        'cc.Force',
        'cc.Asset',
        'cc.Object',
    ]);

    /**
     * @description Prefab 结构字段，不作为 Inspector 可写属性暴露。
     */
    private static readonly _structuralKeys: ReadonlySet<string> = new Set([
        '__type__',
        '__prefab',
        '__id__',
        '_id',
        '_objFlags',
        'node',
        '_name',
        '_enabled',
        '_parent',
        '_children',
        '_components',
        '_prefab',
    ]);

    /**
     * @description 判断类型是否为引擎内置组件前缀（`cc.` / `sp.` / `dragonBones.`）。
     * @param componentType 组件 `__type__`
     * @returns 是否引擎组件名
     */
    public static isEngineComponentType(componentType: string): boolean {
        return (
            componentType.startsWith('cc.') ||
            componentType.startsWith('sp.') ||
            componentType.startsWith('dragonBones.')
        );
    }

    /**
     * @description 判断是否禁止挂载（抽象基类）。废弃组件仍走 `lumen_component_deprecated`。
     * @param componentType 组件 `__type__`
     * @returns 是否拒绝挂载
     */
    public static isAttachDenied(componentType: string): boolean {
        return LumenPropertyDenyList._attachDeniedTypes.has(componentType);
    }

    /**
     * @description 判断序列化键是否为结构字段。
     * @param serializedName Prefab JSON 键
     * @returns 是否跳过
     */
    public static isStructuralKey(serializedName: string): boolean {
        return LumenPropertyDenyList._structuralKeys.has(serializedName);
    }
}
