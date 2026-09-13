import type { ICreatorVersionInfo } from './creator-version.js';
import type { CreatorHostFamily, CreatorProfileId, CreatorProfileSupport } from './creator-profile-catalog.js';

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
