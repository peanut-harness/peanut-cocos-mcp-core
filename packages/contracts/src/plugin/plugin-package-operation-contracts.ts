import type { IPluginManifest, IPluginPackageMeta, LocalizedText } from './plugin-contracts.js';
import type { PluginId, PluginVersion } from '../shared/common-contracts.js';

/**
 * @description 插件安装计划动作类型。
 */
export type PluginInstallActionKind = 'validate' | 'stage' | 'switch' | 'cleanup_old' | 'rollback';

/**
 * @description 插件包操作模式。
 */
export type PluginPackageOperationMode = 'install' | 'upgrade';

/**
 * @description 插件安装计划步骤。
 */
export interface IPluginInstallPlanStep {
    /**
     * @description 步骤稳定标识。
     */
    readonly id: string;

    /**
     * @description 步骤动作类型。
     */
    readonly kind: PluginInstallActionKind;

    /**
     * @description 步骤标题。
     */
    readonly title: string;

    /**
     * @description 步骤说明。
     */
    readonly description: LocalizedText;
}

/**
 * @description 插件包结构检查结果。
 */
export interface IPluginPackageInspection {
    /**
     * @description 插件包输入路径。
     */
    readonly packagePath: string;

    /**
     * @description 解析出的插件运行时清单；结构不完整时返回 `null`。
     */
    readonly manifest: IPluginManifest | null;

    /**
     * @description 解析出的插件分发元信息；缺失时返回 `null`。
     */
    readonly packageMeta: IPluginPackageMeta | null;

    /**
     * @description 当前包结构是否满足最小要求。
     */
    readonly isValidStructure: boolean;

    /**
     * @description 检查阶段发现的问题列表。
     */
    readonly issues: readonly string[];
}

/**
 * @description 插件包校验结果。
 */
export interface IPluginPackageValidationResult {
    /**
     * @description 当前插件包是否通过校验。
     */
    readonly ok: boolean;

    /**
     * @description 校验期间发现的问题列表。
     */
    readonly issues: readonly string[];

    /**
     * @description 校验期间产生的告警列表。
     */
    readonly warnings: readonly string[];
}

/**
 * @description 插件安装计划。
 */
export interface IPluginInstallPlan {
    /**
     * @description 当前计划对应的包操作模式。
     */
    readonly operation: PluginPackageOperationMode;

    /**
     * @description 要安装的插件标识。
     */
    readonly pluginId: PluginId;

    /**
     * @description 要安装的插件版本。
     */
    readonly version: PluginVersion;

    /**
     * @description 插件包输入路径。
     */
    readonly packagePath: string;

    /**
     * @description staging 目录路径。
     */
    readonly stagedPath: string;

    /**
     * @description 升级前的活动版本；普通安装时返回 `null`。
     */
    readonly previousVersion: string | null;

    /**
     * @description 安装计划步骤列表。
     */
    readonly steps: readonly IPluginInstallPlanStep[];

    /**
     * @description 计划期间产生的告警列表。
     */
    readonly warnings: readonly string[];
}

/**
 * @description 插件安装结果。
 */
export interface IPluginInstallResult {
    /**
     * @description 当前执行对应的包操作模式。
     */
    readonly operation: PluginPackageOperationMode;

    /**
     * @description 插件标识。
     */
    readonly pluginId: PluginId;

    /**
     * @description 插件版本。
     */
    readonly version: PluginVersion;

    /**
     * @description 当前安装是否成功。
     */
    readonly installed: boolean;

    /**
     * @description 最终安装目录。
     */
    readonly installPath: string;

    /**
     * @description 使用过的 staging 目录。
     */
    readonly stagedPath: string;

    /**
     * @description 升级前的活动版本；普通安装时返回 `null`。
     */
    readonly previousVersion: string | null;

    /**
     * @description 安装期间产生的告警列表。
     */
    readonly warnings: readonly string[];
}

/**
 * @description 插件卸载结果。
 */
export interface IPluginUninstallResult {
    /**
     * @description 插件标识。
     */
    readonly pluginId: PluginId;

    /**
     * @description 是否卸载成功。
     */
    readonly removed: boolean;

    /**
     * @description 原安装目录；未知时返回 `null`。
     */
    readonly installPath: string | null;
}

/**
 * @description 插件修复结果。
 */
export interface IPluginRepairResult {
    /**
     * @description 是否执行了修复动作。
     */
    readonly repaired: boolean;

    /**
     * @description 修复期间执行的动作摘要。
     */
    readonly actions: readonly string[];
}

/**
 * @description 插件打包结果。
 */
export interface IPluginPackResult {
    /**
     * @description 打包输入目录。
     */
    readonly sourcePath: string;

    /**
     * @description 输出包路径。
     */
    readonly packagePath: string;

    /**
     * @description 生成的插件分发元信息。
     */
    readonly packageMeta: IPluginPackageMeta;
}


