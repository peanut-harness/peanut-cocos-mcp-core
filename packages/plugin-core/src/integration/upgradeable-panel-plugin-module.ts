import type { IPluginManifest } from 'peanut-contracts';

import type { IPluginActivateContext, IPluginModule, IPluginRegisterContext } from '../shared/plugin-manager-contracts.js';

interface IUpgradeablePanelPluginModuleOptions {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly failActivate?: boolean;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly openOnActivate?: boolean;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly pluginId?: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly trackStorageVersion?: boolean;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly version: string;
}

/**
 * @description 可升级面板测试插件，用于验证 plugin-manager 的运行时升级接管与失败回退。
 */
export class UpgradeablePanelPluginModule implements IPluginModule {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _failActivate: boolean;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private _openOnActivate: boolean;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _panelId: string;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _trackStorageVersion: boolean;

    /**
     * @description 可升级面板测试插件运行时清单。
     */
    public readonly manifest: IPluginManifest;

    /**
     * @description 创建一个新的可升级面板测试插件。
     * @param options 插件版本、插件标识与激活故障注入配置
     */
    public constructor(options: IUpgradeablePanelPluginModuleOptions) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginId = options.pluginId ?? 'upgradeable.panel.plugin';
        this._failActivate = options.failActivate ?? false;
        this._openOnActivate = options.openOnActivate ?? true;
        this._trackStorageVersion = options.trackStorageVersion ?? false;
        this._panelId = `${pluginId}.panel`;
        this.manifest = {
            id: pluginId,
            version: options.version,
            kind: 'panel-plugin',
            displayName: 'Upgradeable Panel Plugin',
            description: { 'en-US': 'Exercises plugin-manager runtime upgrade takeover and rollback paths.', 'zh-CN': '演练插件管理器运行时升级接管和回滚路径。' },
            main: './upgradeable-panel-plugin-module.ts',
            engines: {
                host: '^0.1.0',
            },
            activation: {
                autoActivate: false,
                events: [],
            },
            permissions: {
                panel: {
                    open: true,
                    embed: true,
                },
            },
            contributions: {
                panels: [
                    {
                        id: this._panelId,
                        title: 'Upgradeable Panel',
                        entry: 'panels/upgradeable/index.html',
                        placement: 'utility',
                        singleton: true,
                        activationPolicy: 'manual',
                        sessionPolicy: 'restore_layout',
                        permissions: {
                            allowSelectionRead: false,
                        },
                    },
                ],
            },
        };
    }

    /**
     * @description 返回该测试插件注册的面板标识。
     * @returns 测试面板稳定标识
     */
    public get panelId(): string {
        return this._panelId;
    }

    /**
     * @description 调整后续激活流程是否自动打开测试面板。
     * @param openOnActivate `true` 表示激活时自动打开，`false` 表示仅注册桥接能力
     * @returns 无返回值
     */
    public setOpenOnActivate(openOnActivate: boolean): void {
        this._openOnActivate = openOnActivate;
    }

    /**
     * @description 在注册阶段声明升级测试面板。
     * @param context 插件注册阶段上下文
     * @returns Promise 在注册完成后结束
     */
    public async register(context: IPluginRegisterContext): Promise<void> {
        context.registry.registerPanel({
            id: this._panelId,
            title: 'Upgradeable Panel',
            entry: 'panels/upgradeable/index.html',
            placement: 'utility',
            singleton: true,
            activationPolicy: 'manual',
            sessionPolicy: 'restore_layout',
            permissions: {
                allowSelectionRead: false,
            },
        });
    }

    /**
     * @description 在激活阶段打开面板并回传当前版本号。
     * @param context 插件激活阶段上下文
     * @returns Promise 在激活完成后结束
     */
    public async activate(context: IPluginActivateContext): Promise<void> {
        if (this._trackStorageVersion) {
            // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
            const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ currentVersion = await context.storage.get<string>('currentVersion');
            if (currentVersion !== context.plugin.version) {
                await context.storage.set('previousVersion', currentVersion);
                await context.storage.set('currentVersion', context.plugin.version);
            }
        }
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        context.panels.onRequest<{}, { pluginId: string; version: string }>(
            this._panelId,
            'upgradeable.getVersion',
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            async (): Promise<{ pluginId: string; version: string }> => {
                return {
                    pluginId: context.plugin.id,
                    version: context.plugin.version,
                };
            },
        );
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        context.panels.onRequest<{}, { pluginId: string; currentVersion: string | null; previousVersion: string | null }>(
            this._panelId,
            'upgradeable.getStorageState',
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            async (): Promise<{ pluginId: string; currentVersion: string | null; previousVersion: string | null }> => {
                return {
                    pluginId: context.plugin.id,
                    currentVersion: await context.storage.get<string>('currentVersion'),
                    previousVersion: await context.storage.get<string>('previousVersion'),
                };
            },
        );
        if (this._openOnActivate) {
            await context.panels.open(this._panelId);
        }
        if (this._failActivate) {
            throw new Error(`upgradeable_plugin_activate_failed:${context.plugin.version}`);
        }
    }

    /**
     * @description 在停用阶段释放运行态资源。
     * @param reason 插件停用原因
     * @returns Promise 在停用完成后结束
     */
    public async deactivate(reason: 'host_reload' | 'host_shutdown' | 'plugin_update' | 'dependency_lost' | 'manual_disable'): Promise<void> {
        void reason;
    }

    /**
     * @description 在释放阶段执行最终清理。
     * @returns Promise 在释放完成后结束
     */
    public async dispose(): Promise<void> {}
}
