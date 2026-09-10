import { isAbsolute, resolve } from 'path';
import type { ICommandContribution, IDiagnosticsContribution, IMenuContribution, IPanelContribution } from 'peanut-contracts';

import { PluginLeaseStore } from '../hotplug/plugin-lease-store.js';
import type { IPluginRegistrationApi } from '../shared/plugin-manager-contracts.js';

/**
 * @description Contribution 注册中心，负责登记命令、菜单、面板和诊断贡献，并为其分配 lease。
 */
export class ContributionRegistry {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginLeaseStore: PluginLeaseStore;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    private readonly _commands = new Map<string, { pluginId: string; contribution: ICommandContribution }>();
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    private readonly _menus = new Map<string, { pluginId: string; contribution: IMenuContribution }>();
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    private readonly _panels = new Map<string, { pluginId: string; contribution: IPanelContribution }>();
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    private readonly _diagnostics = new Map<string, { pluginId: string; contribution: IDiagnosticsContribution }>();

    /**
     * @description 创建一个新的 Contribution 注册中心。
     * @param pluginLeaseStore 插件 lease 存储
     */
    public constructor(pluginLeaseStore: PluginLeaseStore) {
        this._pluginLeaseStore = pluginLeaseStore;
    }

    /**
     * @description 为指定插件创建注册期 API。
     * @param pluginId 插件标识
     * @param installPath 插件安装目录；绝对路径时会用于约束面板入口
     * @returns 插件注册期 API
     */
    public createRegistrationApi(pluginId: string, installPath?: string): IPluginRegistrationApi {
        return {
            registerCommand: (command: ICommandContribution): string => {
                return this._registerCommand(pluginId, command);
            },
            registerMenu: (menu: IMenuContribution): string => {
                return this._registerMenu(pluginId, menu);
            },
            registerPanel: (panel: IPanelContribution): string => {
                return this._registerPanel(pluginId, panel, installPath);
            },
            registerDiagnostics: (diagnostics: IDiagnosticsContribution): string => {
                return this._registerDiagnostics(pluginId, diagnostics);
            },
            onDispose: (disposer: () => void | Promise<void>): string => {
                return this._pluginLeaseStore.register(pluginId, disposer);
            },
        };
    }

    /**
     * @description 返回指定插件和面板标识对应的面板贡献。
     * @param pluginId 插件标识
     * @param panelId 面板标识
     * @returns 命中时返回面板贡献，否则返回 `null`
     */
    public getPanel(pluginId: string, panelId: string): IPanelContribution | null {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ panelRecord = this._panels.get(panelId);
        if (panelRecord == null || panelRecord.pluginId !== pluginId) {
            return null;
        }
        return panelRecord.contribution;
    }

    /**
     * @description 返回指定命令标识对应的命令贡献及其所属插件。
     * @param commandId 命令稳定标识
     * @returns 命中时返回所属插件和命令贡献，否则返回 `null`
     */
    public getCommand(commandId: string): { readonly pluginId: string; readonly contribution: ICommandContribution } | null {
        // 保存命令注册记录；命令被卸载后应立即不可再执行。
        const commandRecord = this._commands.get(commandId);
        return commandRecord ?? null;
    }

    /**
     * @description 返回指定插件当前注册的全部面板贡献。
     * @param pluginId 插件标识
     * @returns 该插件的只读面板贡献列表
     */
    public listPanels(pluginId: string): readonly IPanelContribution[] {
        // 保存属于目标插件的面板贡献，供命令路由按单面板约束解析打开目标。
        const panels = Array.from(this._panels.values())
            .filter((panelRecord) => {
                return panelRecord.pluginId === pluginId;
            })
            .map((panelRecord) => {
                return panelRecord.contribution;
            });
        return panels;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _registerCommand(pluginId: string, command: ICommandContribution): string {
        this._assertUniqueContribution(this._commands, command.id, pluginId, 'command');
        this._commands.set(command.id, { pluginId, contribution: command });
        return this._pluginLeaseStore.register(pluginId, async (): Promise<void> => {
            this._commands.delete(command.id);
        });
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _registerMenu(pluginId: string, menu: IMenuContribution): string {
        this._assertUniqueContribution(this._menus, menu.id, pluginId, 'menu');
        this._menus.set(menu.id, { pluginId, contribution: menu });
        return this._pluginLeaseStore.register(pluginId, async (): Promise<void> => {
            this._menus.delete(menu.id);
        });
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _registerPanel(pluginId: string, panel: IPanelContribution, installPath?: string): string {
        // 保存宿主实际加载的面板入口；已安装目录包必须固定解析到自身根目录内。
        const resolvedPanel = this._resolvePanelEntry(panel, installPath);
        this._assertUniqueContribution(this._panels, panel.id, pluginId, 'panel');
        this._panels.set(panel.id, { pluginId, contribution: resolvedPanel });
        return this._pluginLeaseStore.register(pluginId, async (): Promise<void> => {
            this._panels.delete(panel.id);
        });
    }

    /** @description 将已安装目录包的相对面板入口规范化为受安装根目录约束的绝对路径。 */
    private _resolvePanelEntry(panel: IPanelContribution, installPath?: string): IPanelContribution {
        if (installPath == null || !isAbsolute(installPath)) {
            return panel;
        }

        // 保存规范化安装根目录，用于阻止面板入口通过相对路径越出插件包。
        const normalizedInstallPath = resolve(installPath);
        // 保存绝对面板入口，交给 Creator 宿主窗口加载器直接加载。
        const absoluteEntry = resolve(normalizedInstallPath, panel.entry);
        // 保存统一分隔符的安装根目录，保证 Windows 与 POSIX 的边界检查一致。
        const portableInstallPath = normalizedInstallPath.replace(/\\/g, '/');
        // 保存统一分隔符的面板入口，避免反斜杠导致合法 Windows 路径被错误拒绝。
        const portableEntry = absoluteEntry.replace(/\\/g, '/');
        if (portableEntry !== portableInstallPath && !portableEntry.startsWith(`${portableInstallPath}/`)) {
            throw new Error(`plugin_panel_entry_outside_install_root:${panel.id}`);
        }

        return {
            ...panel,
            entry: absoluteEntry,
        };
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _registerDiagnostics(pluginId: string, diagnostics: IDiagnosticsContribution): string {
        this._assertUniqueContribution(this._diagnostics, diagnostics.id, pluginId, 'diagnostics');
        this._diagnostics.set(diagnostics.id, { pluginId, contribution: diagnostics });
        return this._pluginLeaseStore.register(pluginId, async (): Promise<void> => {
            this._diagnostics.delete(diagnostics.id);
        });
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    private _assertUniqueContribution<TRecord extends { pluginId: string }>(
        registry: Map<string, TRecord>,
        contributionId: string,
        pluginId: string,
        contributionType: string,
    ): void {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ existingRecord = registry.get(contributionId);
        if (existingRecord != null && existingRecord.pluginId !== pluginId) {
            throw new Error(`Duplicate ${contributionType} contribution "${contributionId}" is already registered by plugin "${existingRecord.pluginId}".`);
        }
    }
}
