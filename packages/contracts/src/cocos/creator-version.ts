/**
 * @description Cocos Creator 版本阶段，用于选择运行时适配器产品线。
 *
 * - `editor_api_stable`：3.6.x–3.8.x（`adapter-38`）
 * - `creator_3x_early`：3.0.x–3.5.x（`adapter-35`）
 * - `creator_2x`：2.4.x–&lt;3.0（`adapter-24` + lumen-24）
 */
export type CreatorPhase = 'editor_api_stable' | 'creator_3x_early' | 'creator_2x';

/**
 * @description 标准化的 Cocos Creator 版本信息。
 */
export interface ICreatorVersionInfo {
    /**
     * @description 原始版本字符串。
     */
    readonly raw: string;

    /**
     * @description 主版本号。
     */
    readonly major: number;

    /**
     * @description 次版本号。
     */
    readonly minor: number;

    /**
     * @description 修订版本号。
     */
    readonly patch: number;

    /**
     * @description 版本对应的适配阶段。
     */
    readonly phase: CreatorPhase;
}


