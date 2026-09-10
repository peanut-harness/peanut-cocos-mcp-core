import type { PanelId } from '../shared/common-contracts.js';

/**
 * @description 面板默认挂载位置。
 */
export type PanelPlacement = 'main' | 'inspector' | 'utility';

/**
 * @description 面板激活策略。
 */
export type PanelActivationPolicy = 'manual' | 'on_command' | 'on_plugin_activate';

/**
 * @description 面板会话恢复策略。
 */
export type PanelSessionPolicy = 'none' | 'restore_layout' | 'restore_layout_and_state';

/**
 * @description 命令贡献定义。
 */
export interface ICommandContribution {
    /**
     * @description 命令稳定标识。
     */
    readonly id: string;

    /**
     * @description 命令展示名称。
     */
    readonly title: string;

    /**
     * @description 触发该命令时调用的处理器标识。
     */
    readonly handler: string;
}

/**
 * @description 菜单贡献定义。
 */
export interface IMenuContribution {
    /**
     * @description 菜单项稳定标识。
     */
    readonly id: string;

    /**
     * @description 菜单展示名称。
     */
    readonly title: string;

    /**
     * @description 菜单归属路径，例如 `Tools/Peanut`。
     */
    readonly path: string;

    /**
     * @description 点击菜单时要触发的命令标识。
     */
    readonly commandId: string;
}

/**
 * @description 面板尺寸默认值。
 */
export interface IPanelDefaultSize {
    /**
     * @description 默认宽度，单位为像素。
     */
    readonly width: number;

    /**
     * @description 默认高度，单位为像素。
     */
    readonly height: number;

    /**
     * @description 最小宽度，单位为像素。
     */
    readonly minWidth?: number;

    /**
     * @description 最小高度，单位为像素。
     */
    readonly minHeight?: number;
}

/**
 * @description 面板前端权限声明。
 */
export interface IPanelContributionPermission {
    /**
     * @description 是否允许读取当前选择集。
     */
    readonly allowSelectionRead?: boolean;

    /**
     * @description 是否允许读取资源基础信息。
     */
    readonly allowAssetRead?: boolean;

    /**
     * @description 是否允许读取场景基础信息。
     */
    readonly allowSceneRead?: boolean;
}

/**
 * @description 插件面板贡献定义。
 */
export interface IPanelContribution {
    /**
     * @description 面板稳定标识。
     */
    readonly id: PanelId;

    /**
     * @description 面板标题。
     */
    readonly title: string;

    /**
     * @description 面板前端入口相对路径。
     */
    readonly entry: string;

    /**
     * @description 面板图标资源路径。
     */
    readonly icon?: string;

    /**
     * @description 面板挂载位置。
     */
    readonly placement: PanelPlacement;

    /**
     * @description 是否只允许单实例。
     */
    readonly singleton: boolean;

    /**
     * @description 面板默认尺寸。
     */
    readonly defaultSize?: IPanelDefaultSize;

    /**
     * @description 面板激活策略。
     */
    readonly activationPolicy?: PanelActivationPolicy;

    /**
     * @description 面板会话恢复策略。
     */
    readonly sessionPolicy?: PanelSessionPolicy;

    /**
     * @description 面板前端权限声明。
     */
    readonly permissions?: IPanelContributionPermission;
}

/**
 * @description 插件诊断贡献定义。
 */
export interface IDiagnosticsContribution {
    /**
     * @description 诊断提供者稳定标识。
     */
    readonly id: string;

    /**
     * @description 诊断处理器标识。
     */
    readonly handler: string;
}

/**
 * @description 可插入统一 UI Prefab 资源管理工作台的设计来源适配器声明。
 */
export interface IDesignSupporterContribution {
    /** @description 来源稳定标识，例如 figma 或 psd。 */
    readonly id: string;

    /** @description 工作台展示名称。 */
    readonly displayName: string;

    /** @description 支持的 design-supporter 协议版本。 */
    readonly apiVersion: 'design-supporter.v1';

    /** @description 可由该适配器解析的 locator 模式。 */
    readonly locatorPatterns: readonly string[];
}

/**
 * @description 插件 contribution 清单。
 */
export interface IPluginContributionManifest {
    /**
     * @description 命令贡献列表。
     */
    readonly commands?: readonly ICommandContribution[];

    /**
     * @description 菜单贡献列表。
     */
    readonly menus?: readonly IMenuContribution[];

    /**
     * @description 面板贡献列表。
     */
    readonly panels?: readonly IPanelContribution[];

    /**
     * @description 诊断贡献列表。
     */
    readonly diagnostics?: readonly IDiagnosticsContribution[];

    /** @description 设计来源适配器贡献列表。 */
    readonly designSupporters?: readonly IDesignSupporterContribution[];
}
