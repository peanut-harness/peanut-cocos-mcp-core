import type { ICreatorVersionInfo } from './creator-version.js';

/**
 * @description Creator 宿主使用的版本适配档案标识。
 */
export type CreatorProfileId =
    | 'creator-24'
    | 'creator-30-35'
    | 'creator-36-37'
    | 'creator-38';

/**
 * @description Creator 宿主 API 的主版本家族。
 */
export type CreatorHostFamily = 'creator-2x' | 'creator-3x';

/**
 * @description 当前版本档案具备的支持等级。
 */
export type CreatorProfileSupport = 'full' | 'experimental' | 'unsupported';

/**
 * @description 宿主解析并向内核传递的可信 Creator 运行上下文。
 */
export interface ICreatorContext {
    /**
     * @description 当前编辑器进程的 Creator 版本。
     */
    readonly version: ICreatorVersionInfo;

    /**
     * @description 当前项目声明的 Creator 版本；无法读取时为 null。
     */
    readonly projectVersion: ICreatorVersionInfo | null;

    /**
     * @description 与当前编辑器版本匹配的适配档案。
     */
    readonly profileId: CreatorProfileId;

    /**
     * @description 当前宿主所属的 Creator API 家族。
     */
    readonly hostFamily: CreatorHostFamily;

    /**
     * @description 当前适配档案的支持等级。
     */
    readonly support: CreatorProfileSupport;

    /**
     * @description 是否具备执行编辑器写操作所需的版本证据。
     */
    readonly writesAllowed: boolean;

    /**
     * @description 供日志和诊断展示的版本适配判定依据。
     */
    readonly diagnostics: readonly string[];
}
