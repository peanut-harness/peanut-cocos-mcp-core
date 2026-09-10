import type { IPluginContributionManifest } from '../contribution/contribution-contracts.js';
import type { IPluginPermissionManifest } from '../permission/permission-contracts.js';
import type { IsoDateTimeString, PluginId, PluginVersion } from '../shared/common-contracts.js';
import type { IPluginFailureIncident } from './plugin-failure-contracts.js';

/**
 * @description 插件信任级别。
 */
export type PluginTrustLevel = 'builtin' | 'trusted' | 'partner' | 'community';

/**
 * @description 插件运行时状态。
 */
export type PluginState =
    | 'discovered'
    | 'validated'
    | 'staged'
    | 'loaded'
    | 'registered'
    | 'active'
    | 'inactive'
    | 'disposed'
    | 'failed';

/**
 * @description 插件停用原因。
 */
export type PluginDeactivateReason = 'host_reload' | 'host_shutdown' | 'plugin_update' | 'dependency_lost' | 'manual_disable';

/**
 * @description 插件类型。
 */
export type PluginKind = 'runtime-plugin' | 'panel-plugin' | 'bridge-plugin' | 'tooling-plugin';

/**
 * @description 面向 Cocos 用户展示的完整双语文本。
 */
export interface ILocalizedText {
    /** @description 英文（美国）文本。 */
    readonly 'en-US': string;

    /** @description 简体中文文本。 */
    readonly 'zh-CN': string;
}

/**
 * @description 可本地化的展示文本；保留字符串格式以兼容已发布的旧插件包。
 */
export type LocalizedText = string | ILocalizedText;

/**
 * @description 插件运行环境要求。
 */
export interface IPluginEngineManifest {
    /**
     * @description 宿主版本约束。
     */
    readonly host: string;

    /**
     * @description 可选的 Cocos Creator 版本约束；缺失时表示兼容历史插件，不在模块加载前阻止执行。
     */
    readonly creator?: string;
}

/**
 * @description 插件激活策略。
 */
export interface IPluginActivationManifest {
    /**
     * @description 是否允许自动激活。
     */
    readonly autoActivate: boolean;

    /**
     * @description 激活事件列表。
     */
    readonly events: readonly string[];
}

/**
 * @description 插件依赖映射。
 */
export interface IPluginDependencyManifest {
    /**
     * @description 必需依赖版本约束。
     */
    readonly required?: Readonly<Record<string, string>>;

    /**
     * @description 可选依赖版本约束。
     */
    readonly optional?: Readonly<Record<string, string>>;
}

/**
 * @description 单个发布文件的完整性记录。
 */
export interface IPluginPackageFileIntegrity {
    /**
     * @description 相对于插件包根目录的 POSIX 路径。
     */
    readonly path: string;

    /**
     * @description 文件内容的 SHA-256 十六进制摘要。
     */
    readonly digest: string;
}

/**
 * @description 发布包中外置第三方库的定位信息。
 */
export interface IPluginPackageLibrary {
    /**
     * @description npm 第三方库名称。
     */
    readonly name: string;

    /**
     * @description 该库被打包时使用的版本号。
     */
    readonly version: string;

    /**
     * @description 库位于包根目录内的相对路径。
     */
    readonly path: string;
}

/**
 * @description 当前发布版本的更新说明。
 */
export interface IPluginChangelogEntry {
    /**
     * @description 对应的插件版本号。
     */
    readonly version: PluginVersion;

    /**
     * @description 发布日期，使用 ISO 时间字符串。
     */
    readonly publishedAt: IsoDateTimeString;

    /**
     * @description 面向用户展示的更新项。
     */
    readonly changes: readonly string[];
}

/**
 * @description 合并进统一插件清单的发布、完整性与更新元信息。
 */
export interface IPluginPackageManifest {
    /**
     * @description 统一目录包格式版本；首版固定为 `1`。
     */
    readonly schemaVersion: 1;

    /**
     * @description 当前包的 SHA-256 汇总摘要。
     */
    readonly digest: string;

    /**
     * @description 可选的发布签名。
     */
    readonly signature?: string;

    /**
     * @description 包构建完成时间，使用 ISO 时间字符串。
     */
    readonly packedAt: IsoDateTimeString;

    /**
     * @description 生成产物所使用的 Peanut SDK 版本。
     */
    readonly sdkVersion: string;

    /**
     * @description 纳入完整性校验的发布文件列表。
     */
    readonly files: readonly IPluginPackageFileIntegrity[];

    /**
     * @description 放入 `libs/` 的第三方运行依赖。
     */
    readonly libraries: readonly IPluginPackageLibrary[];

    /**
     * @description 当前版本及历史版本的更新记录。
     */
    readonly changelog: readonly IPluginChangelogEntry[];
}

/**
 * @description 插件运行时清单。
 */
export interface IPluginManifest {
    /**
     * @description 插件稳定标识。
     */
    readonly id: PluginId;

    /**
     * @description 插件版本号。
     */
    readonly version: PluginVersion;

    /**
     * @description 插件类型。
     */
    readonly kind: PluginKind;

    /**
     * @description 插件展示名称。
     */
    readonly displayName: string;

    /**
     * @description 插件说明。
     */
    readonly description?: LocalizedText;

    /**
     * @description 插件包内用于宿主管理界面展示的受控 PNG 图标路径。
     */
    readonly icon?: './assets/icon.png';

    /**
     * @description 插件主入口路径。
     */
    readonly main: string;

    /**
     * @description 运行环境要求。
     */
    readonly engines: IPluginEngineManifest;

    /**
     * @description 激活策略。
     */
    readonly activation: IPluginActivationManifest;

    /**
     * @description 权限申请清单。
     */
    readonly permissions: IPluginPermissionManifest;

    /**
     * @description 插件依赖约束。
     */
    readonly dependencies?: IPluginDependencyManifest;

    /**
     * @description 声明式 contribution 清单。
     */
    readonly contributions?: IPluginContributionManifest;

    /**
     * @description 统一目录包的发布元信息；目录包安装时必须提供。
     */
    readonly package?: IPluginPackageManifest;
}

/**
 * @description 插件分发元信息。
 */
export interface IPluginPackageMeta {
    /**
     * @description 打包产物摘要值。
     */
    readonly digest: string;

    /**
     * @description 可选签名值。
     */
    readonly signature?: string;

    /**
     * @description 打包时间，使用 ISO 时间字符串。
     */
    readonly packedAt: IsoDateTimeString;

    /**
     * @description 产物对应的 SDK 版本。
     */
    readonly sdkVersion: string;
}

/**
 * @description 插件运行时元信息。
 */
export interface IPluginRuntimeMeta {
    /**
     * @description 插件标识。
     */
    readonly id: PluginId;

    /**
     * @description 插件版本。
     */
    readonly version: PluginVersion;

    /**
     * @description 插件安装目录。
     */
    readonly installPath: string;

    /**
     * @description 插件信任级别。
     */
    readonly trustLevel: PluginTrustLevel;
}

/**
 * @description 插件健康快照。
 */
export interface IPluginHealthSnapshot {
    /**
     * @description 健康状态。
     */
    readonly status: 'healthy' | 'degraded' | 'failed';

    /**
     * @description 更新时间，使用 ISO 时间字符串。
     */
    readonly updatedAt: IsoDateTimeString;

    /**
     * @description 健康状态摘要。
     */
    readonly summary: string;

    /**
     * @description 附加诊断信息。
     */
    readonly diagnostics?: readonly string[];
}

/**
 * @description 插件运行时记录。
 */
export interface IPluginRuntimeRecord {
    /**
     * @description 插件标识。
     */
    readonly pluginId: PluginId;

    /**
     * @description 插件版本。
     */
    readonly version: PluginVersion;

    /**
     * @description 当前运行时状态。
     */
    readonly state: PluginState;

    /**
     * @description 插件信任级别。
     */
    readonly trustLevel: PluginTrustLevel;

    /**
     * @description 插件在宿主管理界面使用的展示名称。
     */
    readonly displayName?: string;

    /**
     * @description 插件在宿主管理界面使用的简短说明。
     */
    readonly description?: LocalizedText;

    /**
     * @description 已验证的内联 PNG data URL；缺失时界面使用中性占位符。
     */
    readonly iconUrl?: string;

    /**
     * @description 上次健康快照。
     */
    readonly health?: IPluginHealthSnapshot;

    /**
     * @description 当前失败事件。
     */
    readonly failureIncident?: IPluginFailureIncident;
}


