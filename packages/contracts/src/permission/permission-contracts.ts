import type { IsoDateTimeString, PluginId } from '../shared/common-contracts.js';

/**
 * @description Asset 数据库权限声明。
 */
export interface IAssetDbPermissionManifest {
    /**
     * @description 是否允许读取资源数据库。
     */
    readonly read: boolean;

    /**
     * @description 是否允许写入资源数据库。
     */
    readonly write: boolean;

    /**
     * @description 是否允许删除资源数据库条目。
     */
    readonly delete: boolean;
}

/**
 * @description 构建能力权限声明。
 */
export interface IBuildPermissionManifest {
    /**
     * @description 是否允许读取构建配置和目标。
     */
    readonly read: boolean;

    /**
     * @description 是否允许发起构建执行。
     */
    readonly execute: boolean;
}

/**
 * @description 面板能力权限声明。
 */
export interface IPanelPermissionManifest {
    /**
     * @description 是否允许打开插件面板。
     */
    readonly open: boolean;

    /**
     * @description 是否允许把面板嵌入宿主区域。
     */
    readonly embed: boolean;
}

/**
 * @description 宿主外壳能力权限声明。
 */
export interface IShellPermissionManifest {
    /**
     * @description 是否允许打开外部链接或应用。
     */
    readonly openExternal: boolean;

    /**
     * @description 是否允许弹出资源选择器。
     */
    readonly pickAssets: boolean;
}

/**
 * @description 插件文件系统可访问空间声明。
 */
export interface IFileSystemPermissionManifest {
    /**
     * @description 允许访问的沙箱空间列表。
     */
    readonly spaces: readonly ('plugin_data' | 'plugin_cache' | 'project_temp')[];
}

/**
 * @description 网络权限声明。
 */
export interface INetworkPermissionManifest {
    /**
     * @description 是否允许 HTTP 网络请求。
     */
    readonly allowHttp: boolean;

    /**
     * @description 是否允许 WebSocket 连接。
     */
    readonly allowWebSocket: boolean;

    /**
     * @description 允许访问的域名白名单。
     */
    readonly domains?: readonly string[];
}

/**
 * @description 插件申请的宿主原生能力及其兼容版本范围。
 */
export interface INativeCapabilityPermissionManifest {
    /**
     * @description capability 标识到兼容 API 版本范围的映射；例如 `{ canvas: '^1.0.0' }`。
     */
    readonly requirements: Readonly<Record<string, string>>;
}

/**
 * @description 插件权限清单。
 */
export interface IPluginPermissionManifest {
    /**
     * @description 允许发送的编辑器消息路由。
     */
    readonly editorMessages?: readonly string[];

    /**
     * @description 允许执行的场景脚本标识。
     */
    readonly sceneScripts?: readonly string[];

    /**
     * @description 资源数据库权限。
     */
    readonly assetDb?: IAssetDbPermissionManifest;

    /**
     * @description 构建权限。
     */
    readonly build?: IBuildPermissionManifest;

    /**
     * @description 面板权限。
     */
    readonly panel?: IPanelPermissionManifest;

    /**
     * @description 宿主壳层权限。
     */
    readonly shell?: IShellPermissionManifest;

    /**
     * @description 文件系统权限。
     */
    readonly fs?: IFileSystemPermissionManifest;

    /**
     * @description 网络权限。
     */
    readonly network?: INetworkPermissionManifest;

    /**
     * @description 需要由宿主提供、校验并加载的原生能力。
     */
    readonly native?: INativeCapabilityPermissionManifest;
}

/**
 * @description 宿主裁剪后的插件授权结果。
 */
export interface IGrantedPermissionSet {
    /**
     * @description 被授权的插件标识。
     */
    readonly pluginId: PluginId;

    /**
     * @description 授权结果生成时间，使用 ISO 时间字符串。
     */
    readonly grantedAt: IsoDateTimeString;

    /**
     * @description 最终生效的权限集合。
     */
    readonly permissions: IPluginPermissionManifest;
}


