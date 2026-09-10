/**
 * @description 统一插件错误模型。
 */
export interface IPluginError {
    /**
     * @description 稳定错误码，用于程序化处理。
     */
    readonly code: string;

    /**
     * @description 面向开发者的错误摘要。
     */
    readonly message: string;

    /**
     * @description 是否可通过重试或回退恢复。
     */
    readonly recoverable?: boolean;

    /**
     * @description 辅助排查或恢复的提示列表。
     */
    readonly hints?: readonly string[];
}

/**
 * @description 资源或场景写入变更摘要。
 */
export interface IChangeSetEntry {
    /**
     * @description 变更对象类别。
     */
    readonly kind: 'scene' | 'node' | 'component' | 'asset' | 'prefab' | 'script' | 'unknown';

    /**
     * @description 目标对象标识，例如 uuid 或路径。
     */
    readonly target: string;

    /**
     * @description 执行动作名称。
     */
    readonly operation: string;

    /**
     * @description 变更摘要。
     */
    readonly summary: string;
}


