import type { IPanelBridgeBrowserWindow } from '../panels/browser-panel-bridge-bootstrap.js';
import type { IHostPanelContainerLaunchResult } from '../panels/host-panel-container-launcher.js';
import { PluginDevelopmentController } from '../development/plugin-development-controller.js';
import type { PluginManagerEditorEntry, IPluginManagerEditorEntryOptions } from './plugin-manager-editor-entry.js';
import { PluginManagerEditorEntry as PluginManagerEditorEntryImpl } from './plugin-manager-editor-entry.js';
import type { PluginManagerHostShellChangeStrategy } from './plugin-manager-host-shell.js';
import type { IMcpHubPendingPlan, IMcpHubStatus } from '../mcp/mcp-hub-control.js';

/**
 * @description 供真实编辑器宿主转发消息和生命周期的最小方法集合。
 */
export interface IPluginManagerEditorExtensionMethods {
    /**
     * @description 把 builtin plugin-manager panel 绑定到宿主浏览器窗口对象。
     * @param browserWindow 宿主持有的浏览器侧窗口对象
     * @returns Promise 在绑定完成后结束
     */
    bindBuiltinPluginManagerPanel(browserWindow: IPanelBridgeBrowserWindow): Promise<void>;

    /**
     * @description 让宿主通过 runtime panel host 直接打开 builtin plugin-manager panel。
     * @returns Promise 返回当前宿主面板会话、浏览器上下文和桥接注入结果
     */
    openBuiltinPluginManagerPanel(): Promise<IHostPanelContainerLaunchResult>;

    /**
     * @description 执行当前已激活插件声明的宿主命令。
     * @param commandId 命令稳定标识
     * @returns Promise 返回命令打开的宿主面板会话、浏览器上下文和桥接注入结果
     */
    executePluginCommand(commandId: string): Promise<IHostPanelContainerLaunchResult>;

    /**
     * @description 请求调度一次 plugin-manager kernel reload。
     * @returns Promise 在调度完成后结束
     */
    reloadKernel(): Promise<void>;

    /**
     * @description 在当前编辑器进程内立即完成一次 plugin-manager 内核热重载。
     * @returns Promise 在新内核、内置模块和面板注册均恢复后结束
     */
    reloadKernelNow(): Promise<void>;

    /**
     * @description 根据一组变化路径执行最小必要的热更新动作。
     * @param changedPaths 变化文件路径列表
     * @returns Promise 返回本次采用的处理策略
     */
    handleChangedPaths(changedPaths: readonly string[]): Promise<PluginManagerHostShellChangeStrategy>;

    /**
     * @description 启动默认文件监听。
     * @returns 无返回值
     */
    watch(): void;

    /**
     * @description 停止默认文件监听。
     * @returns 无返回值
     */
    unwatch(): void;

    developmentStatus(pluginId?: string): ReturnType<PluginDevelopmentController['status']>;

    reconcileDevelopmentPlugins(): Promise<void>;

    reloadDevelopmentPlugin(pluginId: string): Promise<void>;

    developmentTrace(): ReturnType<PluginDevelopmentController['trace']>;

    /**
     * @description 批准当前编辑器内用户已经审阅的 MCP 写入计划。
     * @param planId 一次性 MCP 计划标识。
     * @returns 计划存在且未过期时返回 `true`。
     */
    approveMcpPlan(planId: string): boolean;

    /**
     * @description 返回编辑器 MCP Hub 状态。
     * @returns 未配置 Hub 时返回 `null`。
     */
    getMcpHubStatus(): IMcpHubStatus | null;

    /**
     * @description 返回等待编辑器用户确认的 MCP 写操作计划。
     * @returns 当前待审批计划摘要。
     */
    listPendingMcpPlans(): readonly IMcpHubPendingPlan[];

    /**
     * @description 修改当前项目 MCP Hub 启用状态。
     * @param isEnabled 是否启用本机 MCP Hub。
     * @returns Promise 在状态切换完成后结束。
     */
    setMcpHubEnabled(isEnabled: boolean): Promise<void>;

    /**
     * @description 拒绝一个 MCP 写操作计划。
     * @param planId 待拒绝的一次性计划标识。
     * @returns 计划存在且仍有效时返回 `true`。
     */
    rejectMcpPlan(planId: string): boolean;
}

/**
 * @description 面向真实编辑器主进程的最小入口模块，提供 `load/unload` 生命周期和可直接转发的 host methods。
 */
export class PluginManagerEditorExtensionModule {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    public readonly methods: IPluginManagerEditorExtensionMethods;

    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _editorEntry: PluginManagerEditorEntry;

    /**
     * @description 创建一个新的 PluginManager 编辑器入口模块。
     * @param options 编辑器入口装配参数
     */
    public constructor(options: IPluginManagerEditorEntryOptions) {
        this._editorEntry = new PluginManagerEditorEntryImpl(options);
        this.methods = {
            bindBuiltinPluginManagerPanel: async (browserWindow: IPanelBridgeBrowserWindow): Promise<void> => {
                await this._editorEntry.bindBuiltinPluginManagerPanel(browserWindow);
            },
            openBuiltinPluginManagerPanel: async (): Promise<IHostPanelContainerLaunchResult> => {
                return this._editorEntry.openBuiltinPluginManagerPanel();
            },
            executePluginCommand: async (commandId: string): Promise<IHostPanelContainerLaunchResult> => {
                return this._editorEntry.executePluginCommand(commandId);
            },
            reloadKernel: async (): Promise<void> => {
                await this._editorEntry.requestReload();
            },
            reloadKernelNow: async (): Promise<void> => {
                await this._editorEntry.reloadKernelNow();
            },
            handleChangedPaths: async (changedPaths: readonly string[]): Promise<PluginManagerHostShellChangeStrategy> => {
                return this._editorEntry.handleChangedPaths(changedPaths);
            },
            watch: (): void => {
                this._editorEntry.watch();
            },
            unwatch: (): void => {
                this._editorEntry.unwatch();
            },
            developmentStatus: (pluginId?: string) => {
                return this._developmentController().status(pluginId);
            },
            reconcileDevelopmentPlugins: async (): Promise<void> => {
                await this._developmentController().reconcile();
            },
            reloadDevelopmentPlugin: async (pluginId: string): Promise<void> => {
                await this._developmentController().reload(pluginId);
            },
            developmentTrace: async () => {
                return this._developmentController().trace();
            },
            approveMcpPlan: (planId: string): boolean => {
                return this._editorEntry.approveMcpPlan(planId);
            },
            getMcpHubStatus: (): IMcpHubStatus | null => {
                return this._editorEntry.getMcpHubStatus();
            },
            listPendingMcpPlans: (): readonly IMcpHubPendingPlan[] => {
                return this._editorEntry.listPendingMcpPlans();
            },
            setMcpHubEnabled: async (isEnabled: boolean): Promise<void> => {
                await this._editorEntry.setMcpHubEnabled(isEnabled);
            },
            rejectMcpPlan: (planId: string): boolean => {
                return this._editorEntry.rejectMcpPlan(planId);
            },
        };
    }

    /**
     * @description 启动当前入口模块。
     * @returns Promise 在启动完成后结束
     */
    public async load(): Promise<void> {
        await this._editorEntry.load();
    }

    /**
     * @description 停止当前入口模块。
     * @returns Promise 在释放完成后结束
     */
    public async unload(): Promise<void> {
        await this._editorEntry.unload();
    }

    private _developmentController(): PluginDevelopmentController {
        const pluginManagerApp = this._editorEntry.getPluginManager();
        if (pluginManagerApp == null) {
            throw new Error('Plugin manager kernel is not loaded.');
        }
        return new PluginDevelopmentController(pluginManagerApp);
    }

    /**
     * @description 返回当前内部持有的编辑器入口实例。
     * @returns 当前编辑器入口实例
     */
    public getEditorEntry(): PluginManagerEditorEntry {
        return this._editorEntry;
    }
}
