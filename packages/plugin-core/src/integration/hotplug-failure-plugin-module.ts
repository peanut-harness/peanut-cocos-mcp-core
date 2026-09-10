import type { IPluginManifest } from 'peanut-contracts';

import type { IGrantedRuntimeClientSet, IPluginActivateContext, IPluginModule, IPluginRegisterContext } from '../shared/plugin-manager-contracts.js';

interface IHotplugFailurePluginModuleOptions {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly disposerFailureCount?: number;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly failureStage?: 'activate' | 'deactivate' | 'dispose' | null;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly pluginId?: string;
}

/**
 * @description 热插拔失败回归测试插件，用于覆盖 activate / deactivate / dispose 与 cleanup retry 场景。
 */
export class HotplugFailurePluginModule implements IPluginModule {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _failureStage: 'activate' | 'deactivate' | 'dispose' | null;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _panelId: string;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private _capturedRuntime: IGrantedRuntimeClientSet | null = null;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private _remainingDisposerFailures: number;

    /**
     * @description 热插拔失败回归测试插件运行时清单。
     */
    public readonly manifest: IPluginManifest;

    /**
     * @description 创建一个新的热插拔失败回归测试插件。
     * @param options 故障阶段、清理失败次数与插件标识配置
     */
    public constructor(options: IHotplugFailurePluginModuleOptions = {}) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginId = options.pluginId ?? 'hotplug.failure.plugin';
        this._failureStage = options.failureStage ?? null;
        this._panelId = `${pluginId}.panel`;
        this._remainingDisposerFailures = options.disposerFailureCount ?? 0;
        this.manifest = {
            id: pluginId,
            version: '0.1.0',
            kind: 'panel-plugin',
            displayName: 'Hotplug Failure Plugin',
            description: { 'en-US': 'Exercises plugin-manager hotplug recovery paths.', 'zh-CN': '演练插件管理器热插拔恢复路径。' },
            main: './hotplug-failure-plugin-module.ts',
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
                        title: 'Hotplug Failure Panel',
                        entry: 'panels/hotplug-failure/index.html',
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
     * @description 清空后续 disposer 的故障注入。
     * @returns 无返回值
     */
    public clearDisposerFailures(): void {
        this._remainingDisposerFailures = 0;
    }

    /**
     * @description 读取激活期缓存的选择集客户端，用于验证 grant 在失败或停用后是否失效。
     * @returns Promise 返回插件缓存的选择集快照；未捕获客户端时返回 `null`
     */
    public async readCapturedSelectionIds(): Promise<readonly string[] | null> {
        if (this._capturedRuntime?.selection == null) {
            return null;
        }
        return this._capturedRuntime.selection.getActiveIds();
    }

    /**
     * @description 在注册阶段声明一个测试面板并挂入可失败 disposer。
     * @param context 插件注册阶段上下文
     * @returns Promise 在注册完成后结束
     */
    public async register(context: IPluginRegisterContext): Promise<void> {
        context.registry.registerPanel({
            id: this._panelId,
            title: 'Hotplug Failure Panel',
            entry: 'panels/hotplug-failure/index.html',
            placement: 'utility',
            singleton: true,
            activationPolicy: 'manual',
            sessionPolicy: 'restore_layout',
            permissions: {
                allowSelectionRead: false,
            },
        });
        context.registry.onDispose(async (): Promise<void> => {
            if (this._remainingDisposerFailures <= 0) {
                return;
            }

            this._remainingDisposerFailures -= 1;
            throw new Error('hotplug_failure_disposer_failed');
        });
    }

    /**
     * @description 在激活阶段打开面板并可按配置抛出异常。
     * @param context 插件激活阶段上下文
     * @returns Promise 在激活完成后结束
     */
    public async activate(context: IPluginActivateContext): Promise<void> {
        this._capturedRuntime = context.runtime;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        context.panels.onRequest<{}, { pluginId: string; panelId: string }>(
            this._panelId,
            'hotplug.failure.getState',
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            async (): Promise<{ pluginId: string; panelId: string }> => {
                return {
                    pluginId: context.plugin.id,
                    panelId: this._panelId,
                };
            },
        );
        await context.panels.open(this._panelId);
        if (this._failureStage === 'activate') {
            throw new Error('hotplug_failure_activate_failed');
        }
    }

    /**
     * @description 在停用阶段按配置抛出异常。
     * @param reason 插件停用原因
     * @returns Promise 在停用完成后结束
     */
    public async deactivate(reason: 'host_reload' | 'host_shutdown' | 'plugin_update' | 'dependency_lost' | 'manual_disable'): Promise<void> {
        void reason;
        if (this._failureStage === 'deactivate') {
            throw new Error('hotplug_failure_deactivate_failed');
        }
    }

    /**
     * @description 在释放阶段按配置抛出异常。
     * @returns Promise 在释放完成后结束
     */
    public async dispose(): Promise<void> {
        if (this._failureStage === 'dispose') {
            throw new Error('hotplug_failure_dispose_failed');
        }
    }
}
