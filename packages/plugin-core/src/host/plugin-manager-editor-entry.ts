import type { ICocosRuntime } from 'peanut-runtime';

import { PluginDevelopmentControlServer, type IPluginDevelopmentControlServerOptions } from '../development/plugin-development-control-server.js';
import { PluginDevelopmentController } from '../development/plugin-development-controller.js';
import { CocosMcpHub, type ICocosMcpHubOptions } from '../mcp/cocos-mcp-hub.js';
import type { IMcpHubPendingPlan, IMcpHubStatus } from '../mcp/mcp-hub-control.js';

import type { PluginManagerHostShellChangeStrategy } from './plugin-manager-host-shell.js';
import { PluginManagerHostShell, type IPluginManagerHostShellOptions } from './plugin-manager-host-shell.js';
import { resolvePluginManagerHostWatchPaths } from './plugin-manager-host-paths.js';
import type { IPanelBridgeBrowserWindow } from '../panels/browser-panel-bridge-bootstrap.js';
import type { IHostPanelContainerLaunchResult } from '../panels/host-panel-container-launcher.js';

/**
 * @description PluginManager 编辑器入口装配参数。
 */
export interface IPluginManagerEditorEntryOptions extends IPluginManagerHostShellOptions {
    /**
     * @description 稳定复用的 runtime 门面。
     */
    readonly runtime: ICocosRuntime;

    /**
     * @description `peanut-plugin-core` 包根目录；提供时将自动启用默认热更新监听路径。
     */
    readonly packageRootDir?: string;

    /**
     * @description 显式指定的热更新监听路径；提供时优先于 `packageRootDir`。
     */
    readonly watchPaths?: readonly string[];

    /**
     * @description 文件变化后的防抖时间，单位毫秒。
     */
    readonly watchDebounceMs?: number;

    readonly developmentControl?: IPluginDevelopmentControlServerOptions;
    /** @description 可选统一 MCP Hub；提供项目路径后启动动态 loopback Hub。 */
    readonly mcpHub?: ICocosMcpHubOptions;
}

/**
 * @description 面向真实编辑器宿主的最小入口，负责启动/停止 host shell，并可选接上默认文件监听。
 */
export class PluginManagerEditorEntry {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _hostShell: PluginManagerHostShell;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _watchPaths: readonly string[];
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _watchDebounceMs: number;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private _stopWatching: (() => void) | null = null;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private _isLoaded: boolean = false;
    private readonly _developmentControlOptions?: IPluginDevelopmentControlServerOptions;
    private _developmentControlServer: PluginDevelopmentControlServer | null = null;
    private readonly _mcpHubOptions?: ICocosMcpHubOptions;
    private _mcpHub: CocosMcpHub | null = null;

    /**
     * @description 创建一个新的 PluginManager 编辑器入口。
     * @param options 编辑器入口装配参数
     */
    public constructor(options: IPluginManagerEditorEntryOptions) {
        this._mcpHubOptions =
            options.mcpHub == null
                ? undefined
                : {
                      ...options.mcpHub,
                      repairMessage:
                          options.mcpHub.repairMessage ?? {
                              request: (
                                  target: string,
                                  message: string,
                                  ...args: unknown[]
                              ): Promise<unknown> =>
                                  options.runtime.message.request(target, message, ...args),
                          },
                  };
        this._mcpHub =
            this._mcpHubOptions != null
                ? new CocosMcpHub(() => this.getPluginManager(), this._mcpHubOptions)
                : null;
        this._hostShell = new PluginManagerHostShell(options.runtime, {
            ...options,
            bootstrap: async (pluginManagerApp): Promise<void> => {
                pluginManagerApp.setMcpHubControl(this._mcpHub);
                this._mcpHub?.applyPluginExposureSettings(pluginManagerApp);
                await options.bootstrap?.(pluginManagerApp);
            },
        });
        this._watchPaths = options.watchPaths ?? (options.packageRootDir != null ? resolvePluginManagerHostWatchPaths(options.packageRootDir) : []);
        this._watchDebounceMs = options.watchDebounceMs ?? 150;
        this._developmentControlOptions = options.developmentControl;
    }

    /**
     * @description 启动当前编辑器入口，并在配置存在时接上默认文件监听。
     * @returns Promise 在启动完成后结束
     */
    public async load(): Promise<void> {
        if (this._isLoaded) {
            return;
        }

        await this._hostShell.start();
        if (this._developmentControlOptions != null) {
            this._developmentControlServer = new PluginDevelopmentControlServer(() => {
                const pluginManager = this.getPluginManager();
                if (pluginManager == null) {
                    throw new Error('plugin_manager_kernel_unavailable');
                }
                return new PluginDevelopmentController(pluginManager);
            }, this._developmentControlOptions);
            await this._developmentControlServer.start();
        }
        await this._mcpHub?.start();
        if (this._watchPaths.length > 0) {
            this._stopWatching = this._hostShell.watch(this._watchPaths, this._watchDebounceMs);
        }
        this._isLoaded = true;
    }

    /**
     * @description 停止当前编辑器入口并释放全部监听与 host shell 资源。
     * @returns Promise 在释放完成后结束
     */
    public async unload(): Promise<void> {
        this._stopWatching?.();
        this._stopWatching = null;
        await this._mcpHub?.stop();
        this._mcpHub = null;
        await this._developmentControlServer?.stop();
        this._developmentControlServer = null;
        await this._hostShell.dispose();
        this._isLoaded = false;
    }

    /**
     * @description 将 builtin plugin-manager panel 绑定到一个宿主浏览器窗口对象。
     * @param browserWindow 宿主当前持有的浏览器侧窗口对象
     * @returns Promise 在绑定完成后结束
     */
    public async bindBuiltinPluginManagerPanel(browserWindow: IPanelBridgeBrowserWindow): Promise<void> {
        await this._hostShell.bindBuiltinPluginManagerPanel(browserWindow);
    }

    /**
     * @description 让宿主通过 runtime panel host 直接打开 builtin plugin-manager panel。
     * @returns Promise 返回当前宿主面板会话、浏览器上下文和桥接注入结果
     */
    public async openBuiltinPluginManagerPanel(): Promise<IHostPanelContainerLaunchResult> {
        return this._hostShell.openBuiltinPluginManagerPanel();
    }

    /**
     * @description 执行当前已启动内核中插件声明的宿主命令。
     * @param commandId 命令稳定标识
     * @returns Promise 返回命令打开的宿主面板会话、浏览器上下文和桥接注入结果
     */
    public async executePluginCommand(commandId: string): Promise<IHostPanelContainerLaunchResult> {
        // 保存当前活动的插件管理器；未加载时不允许宿主绕过启动流程执行插件命令。
        const pluginManagerApp = this._hostShell.getPluginManager();
        if (pluginManagerApp == null) {
            throw new Error('plugin_manager_kernel_unavailable');
        }
        return pluginManagerApp.executePluginCommand(commandId);
    }

    /**
     * @description 请求调度一次 plugin-manager kernel reload。
     * @returns Promise 在调度完成后结束
     */
    public async requestReload(): Promise<void> {
        await this._hostShell.requestReload();
    }

    /**
     * @description 在当前编辑器进程内立即完成一次 plugin-manager 内核热重载。
     * @returns Promise 在新内核可用后结束
     */
    public async reloadKernelNow(): Promise<void> {
        await this._hostShell.reloadKernelNow();
    }

    /**
     * @description 根据一组变化路径执行最小必要的热更新动作。
     * @param changedPaths 变化文件路径列表
     * @returns Promise 返回本次采用的处理策略
     */
    public async handleChangedPaths(changedPaths: readonly string[]): Promise<PluginManagerHostShellChangeStrategy> {
        return this._hostShell.handleChangedPaths(changedPaths);
    }

    /**
     * @description 启动默认文件监听；若当前入口已在 `load()` 时接入监听，则会先停止旧监听再重新注册。
     * @returns 取消监听函数
     */
    public watch(): () => void {
        this._stopWatching?.();
        this._stopWatching = this._hostShell.watch(this._watchPaths, this._watchDebounceMs);
        return () => {
            this.unwatch();
        };
    }

    /**
     * @description 停止当前编辑器入口持有的文件监听。
     * @returns 无返回值
     */
    public unwatch(): void {
        this._stopWatching?.();
        this._stopWatching = null;
        this._hostShell.unwatch();
    }

    /**
     * @description 返回当前活动的 plugin-manager 实例。
     * @returns 当前活动 plugin-manager 实例；未启动时返回 `null`
     */
    public getPluginManager() {
        return this._hostShell.getPluginManager();
    }

    /**
     * @description 返回本地开发控制服务当前监听的端口；服务未启用或未启动时返回 `null`。
     * @returns 当前开发控制服务端口
     */
    public getDevelopmentControlPort(): number | null {
        return this._developmentControlServer?.getPort() ?? null;
    }

    /**
     * @description 返回本机 MCP Hub 的动态端口；Hub 未启用或未启动时返回 `null`。
     * @returns 当前 Hub 端口。
     */
    public getMcpHubPort(): number | null {
        return this._mcpHub?.getPort() ?? null;
    }

    /**
     * @description 返回供编辑器扩展宿主展示的 MCP Hub 状态。
     * @returns 未配置 Hub 时返回 `null`。
     */
    public getMcpHubStatus(): IMcpHubStatus | null {
        return this._mcpHub?.getStatus() ?? null;
    }

    /**
     * @description 返回当前等待编辑器用户审批的 MCP 写操作计划。
     * @returns 未配置 Hub 时返回空列表。
     */
    public listPendingMcpPlans(): readonly IMcpHubPendingPlan[] {
        return this._mcpHub?.listPendingPlans() ?? [];
    }

    /**
     * @description 修改当前项目 MCP Hub 的启用状态。
     * @param isEnabled 是否启用 MCP Hub。
     * @returns Promise 在 Hub 完成启动或停止后结束。
     */
    public async setMcpHubEnabled(isEnabled: boolean): Promise<void> {
        if (this._mcpHub == null) {
            throw new Error('cocos_mcp_hub_unavailable');
        }
        await this._mcpHub.setEnabled(isEnabled);
    }

    /**
     * @description 批准一个由 MCP bridge 提交的写入计划；应仅由编辑器内用户确认 UI 调用。
     * @param planId 待批准的一次性计划标识。
     * @returns 计划存在且仍有效时返回 `true`。
     */
    public approveMcpPlan(planId: string): boolean {
        return this._mcpHub?.approvePlan(planId) ?? false;
    }

    /**
     * @description 拒绝一个由 MCP bridge 提交的写入计划。
     * @param planId 待拒绝的一次性计划标识。
     * @returns 计划存在且仍有效时返回 `true`。
     */
    public rejectMcpPlan(planId: string): boolean {
        return this._mcpHub?.rejectPlan(planId) ?? false;
    }
}
