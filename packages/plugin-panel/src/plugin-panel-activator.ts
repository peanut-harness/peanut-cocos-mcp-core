import { EditorApiHostSceneBridgeProvider, RuntimeFacade } from 'peanut-runtime';
import { PackagingApp } from 'peanut-packaging';

import {
    createBuiltinPluginManagerPanelRegistration,
    NodePluginPackageModuleResolver,
    PluginManagerEditorExtensionModule,
    type IPluginManagerEditorEntryOptions,
    type IPluginManagerEditorExtensionMethods,
} from 'peanut-plugin-core';

/**
 * @description `peanut-plugin-panel` 壳层激活器装配参数。
 */
export interface IPluginPanelActivatorOptions extends Omit<IPluginManagerEditorEntryOptions, 'builtinPanelRegistration' | 'runtime'> {
    /**
     * @description 可选宿主全局对象；省略时使用 `globalThis`。
     */
    readonly hostGlobal?: Record<string, unknown>;

    /**
     * @description 可选 Creator 版本字符串；省略时读取真实 `Editor.App.version`，测试可注入 `__PEANUT_CREATOR_VERSION__`。
     */
    readonly creatorVersion?: string;

    /**
     * @description 可选 Cocos 工程根目录；省略时尝试从 Creator `Editor.Project.path` 自动解析。
     */
    readonly projectPath?: string;

    /** @description 声明 Cocos `contributions.scene.script` 的宿主扩展包名；缺失时不启用真实场景脚本 adapter。 */
    readonly sceneScriptPackageName?: string;

    /**
     * @description 缺失真实 panel host bridge 时是否允许自动退回 memory provider；省略时在 bridge 缺失时自动开启。
     */
    readonly allowMemoryPanelWindowProviderFallback?: boolean;
}

/**
 * @description 面向 Cocos 编辑器壳层的最小激活器，负责装配 runtime、builtin panel registration，并把全部业务逻辑委托给 `peanut-plugin-core`。
 */
export class PluginPanelActivator {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _editorExtensionModule: PluginManagerEditorExtensionModule;
    /** @description 稳定复用的 runtime 门面，供启动时写入当前工程路径。 */
    private readonly _runtime: RuntimeFacade;
    /** @description 当前 Cocos 工程根目录；非 Creator 环境可为 `null`。 */
    private readonly _projectPath: string | null;
    /** @description 当前 Cocos 工程显示名；缺失时回退为 `null`。 */
    private readonly _projectName: string | null;

    /**
     * @description 创建一个新的 panel 壳层激活器。
     * @param options 壳层激活器装配参数
     */
    public constructor(options: IPluginPanelActivatorOptions = {}) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ hostGlobal =
                options.hostGlobal ?? (typeof globalThis === 'object' && globalThis != null ? (globalThis as Record<string, unknown>) : {});
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ creatorVersion = this._resolveCreatorVersion(
                options.creatorVersion,
                hostGlobal,
            );
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ hasEditorPanelHostBridge =
                hostGlobal.__PEANUT_EDITOR_PANEL_HOST__ != null;
        // 保存项目级插件仓根目录；真实 Creator 主进程优先使用 Editor.Project.path。
        const projectPath = options.projectPath ?? this._resolveProjectPath(hostGlobal);
        // 保存持久化包装服务；测试和非 Creator 环境仍保留无磁盘副作用的内存模式。
        const packaging = options.packaging ?? (projectPath == null ? undefined : new PackagingApp({ projectPath }));
        const runtime = new RuntimeFacade(creatorVersion, {
            editorApiHostGlobal: hostGlobal,
            editorApiSceneBridgeProvider:
                options.sceneScriptPackageName == null
                    ? undefined
                    : new EditorApiHostSceneBridgeProvider(options.sceneScriptPackageName, hostGlobal),
            allowMemoryPanelWindowProviderFallback: options.allowMemoryPanelWindowProviderFallback ?? !hasEditorPanelHostBridge,
        });

        this._runtime = runtime;
        this._projectPath = projectPath;
        this._projectName = this._resolveProjectName(hostGlobal);
        this._editorExtensionModule = new PluginManagerEditorExtensionModule({
            ...options,
            builtinPanelRegistration: createBuiltinPluginManagerPanelRegistration(),
            packaging,
            pluginPackageModuleResolver: projectPath == null ? undefined : new NodePluginPackageModuleResolver(),
            developmentControl: options.developmentControl ?? (projectPath == null ? undefined : { projectPath }),
            mcpHub: options.mcpHub ?? (projectPath == null ? undefined : { projectPath }),
            diagnosticProjectPath: projectPath ?? undefined,
            runtime,
        });
    }

    /**
     * @description 返回当前可直接转发给宿主消息系统的方法集合。
     * @returns 宿主消息系统方法集合
     */
    public get methods(): IPluginManagerEditorExtensionMethods {
        return this._editorExtensionModule.methods;
    }

    /**
     * @description 启动当前 panel 壳层激活器。
     * @returns Promise 在启动完成后结束
     */
    public async load(): Promise<void> {
        // lumen / editor-mcp 等 grant 读路径依赖 runtime.project；仅解析路径不写入会得到 null。
        if (this._projectPath != null) {
            await this._runtime.project.configure(this._projectPath, this._projectName);
        }
        await this._editorExtensionModule.load();
    }

    /**
     * @description 停止当前 panel 壳层激活器。
     * @returns Promise 在释放完成后结束
     */
    public async unload(): Promise<void> {
        await this._editorExtensionModule.unload();
    }

    /**
     * @description 返回当前内部持有的编辑器入口实例。
     * @returns 当前编辑器入口实例
     */
    public getEditorEntry() {
        return this._editorExtensionModule.getEditorEntry();
    }

    /** @description 从 Creator 主进程全局对象读取当前工程根目录；非编辑器环境安全返回 null。 */
    private _resolveProjectPath(hostGlobal: Record<string, unknown>): string | null {
        // 保存 Creator Editor 全局对象的最小结构，避免壳层依赖完整编辑器类型定义。
        const editorApi = hostGlobal.Editor as { Project?: { path?: unknown } } | undefined;
        // 保存候选工程根路径，仅接受非空字符串以避免向磁盘层传入无效值。
        const projectPath = editorApi?.Project?.path;
        if (typeof projectPath !== 'string' || projectPath.trim().length === 0) {
            return null;
        }
        return projectPath;
    }

    /**
     * @description 从 Creator 主进程全局对象读取当前工程显示名。
     * @param hostGlobal 当前宿主全局对象。
     * @returns 工程显示名；缺失时返回 `null`。
     */
    private _resolveProjectName(hostGlobal: Record<string, unknown>): string | null {
        const editorApi = hostGlobal.Editor as { Project?: { name?: unknown } } | undefined;
        const projectName = editorApi?.Project?.name;
        if (typeof projectName !== 'string' || projectName.trim().length === 0) {
            return null;
        }
        return projectName.trim();
    }

    /**
     * @description 从显式配置、真实 Creator 宿主或测试注入值解析当前编辑器版本，拒绝无版本宿主伪装成受支持版本。
     * @param configuredVersion 调用方显式提供的 Creator 版本。
     * @param hostGlobal 当前宿主全局对象。
     * @returns 经非空校验的 Creator 版本字符串。
     */
    private _resolveCreatorVersion(configuredVersion: string | undefined, hostGlobal: Record<string, unknown>): string {
        const explicitVersion = this._normalizeCreatorVersion(configuredVersion);
        if (explicitVersion != null) {
            return explicitVersion;
        }
        const editorApi = hostGlobal.Editor;
        if (typeof editorApi === 'object' && editorApi != null) {
            const appApi = (editorApi as Record<string, unknown>).App;
            if (typeof appApi === 'object' && appApi != null) {
                const hostVersion = this._normalizeCreatorVersion((appApi as Record<string, unknown>).version);
                if (hostVersion != null) {
                    return hostVersion;
                }
            }
        }
        const injectedVersion = this._normalizeCreatorVersion(hostGlobal.__PEANUT_CREATOR_VERSION__);
        if (injectedVersion != null) {
            return injectedVersion;
        }
        throw new Error('cocos_creator_version_unavailable');
    }

    /**
     * @description 将未知版本输入缩窄为可用的非空版本字符串。
     * @param value 待校验的版本输入。
     * @returns 通过校验的版本字符串；否则返回 `null`。
     */
    private _normalizeCreatorVersion(value: unknown): string | null {
        if (typeof value !== 'string') {
            return null;
        }
        const normalizedValue = value.trim();
        return normalizedValue.length > 0 ? normalizedValue : null;
    }
}
