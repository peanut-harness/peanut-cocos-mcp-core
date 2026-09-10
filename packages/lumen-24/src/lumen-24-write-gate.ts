/**
 * @description Creator 2.4 lumen 写盘门禁：未实现的操作拒绝；层次 + 配方/绑定 + `.fire` Scene 切片已开放。
 */
export class Lumen24WriteGate {
    /** @description 已实现的操作。 */
    private static readonly _ready = new Set([
        'scaffoldPrefab',
        'scaffoldScene',
        'saveEmptyPrefab',
        'refresh',
        'deleteAssets',
        'openPrefab',
        'inspectTree',
        'inspectNode',
        'addEmptyChild',
        'removeNode',
        'renameNode',
        'reorderChild',
        'setNodeProps',
        'attachBuiltinComponent',
        'attachScriptComponent',
        'removeComponent',
        'setComponentProps',
        'bindSpriteFrame',
        'bindSpriteBatch',
        'bindClickEvent',
        'bindRef',
        'bindController',
        'assetSet',
        'ensureSpriteFrames',
        'importAssets',
        'structure',
        'compileRecipe',
        'validateRefs',
        'describeSchema',
        'listTemplates',
        'save',
        'openScene',
    ]);

    /** @description Wave B 已清空（兼容字段）。 */
    public static readonly pendingWaveB = [] as const;

    /** @description 3.x-only 独立资产仍拒绝（非空仅为文档提示）。 */
    public static readonly pendingWaveC = [] as const;

    /**
     * @description 若操作未实现则抛错。
     * @param operation 操作名
     * @returns void
     */
    public static assertReady(operation: string): void {
        if (!Lumen24WriteGate._ready.has(operation)) {
            const waveHint = (Lumen24WriteGate.pendingWaveC as readonly string[]).includes(operation) ? ':wave_c_pending' : '';
            throw new Error(`lumen_24_write_not_implemented:${operation}${waveHint}:see_adr_0003`);
        }
    }

    /**
     * @description 断言当前不允许写盘（兼容旧调用）。
     * @param operation 操作名
     * @returns never
     */
    public static refuse(operation: string): never {
        throw new Error(`lumen_24_write_not_implemented:${operation}:see_adr_0003`);
    }

    /**
     * @description 返回脚手架状态快照。
     * @returns 状态
     */
    public static status(): Readonly<{
        ready: true;
        phase: 'creator_2x';
        adr: '0003';
        writes: 'prefab_scene_recipe_bind_slice' | 'prefab_scene_standalone_preview_slice';
        implemented: readonly string[];
        pendingWaveB: readonly string[];
        pendingWaveC: readonly string[];
    }> {
        return {
            ready: true,
            phase: 'creator_2x',
            adr: '0003',
            writes: 'prefab_scene_standalone_preview_slice',
            implemented: [...Lumen24WriteGate._ready],
            pendingWaveB: [...Lumen24WriteGate.pendingWaveB],
            pendingWaveC: [...Lumen24WriteGate.pendingWaveC],
        };
    }
}
