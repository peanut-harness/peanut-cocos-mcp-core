import type { IPluginActivateContext, IPluginModule, IPluginRegisterContext } from '../shared/plugin-manager-contracts.js';

interface IPanelStatePayload extends Record<string, unknown> {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly pluginId: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly panelId: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly isOpen: boolean;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly pingCount: number;
}

/**
 * @description 内置面板插件，用于验证 panel contribution、面板桥和面板生命周期链路。
 */
export class BuiltinPanelPluginModule implements IPluginModule {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private static readonly PANEL_ID: string = 'builtin.panel.main';

    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private _isPanelOpen: boolean = false;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private _pingCount: number = 0;

    /**
     * @description 内置面板插件的运行时清单。
     */
    public readonly manifest = {
        id: 'builtin.panel',
        version: '0.1.0',
        kind: 'panel-plugin',
        displayName: 'Builtin Panel Plugin',
        description: { 'en-US': 'Validates panel contribution lifecycle and panel bridge communication.', 'zh-CN': '验证面板贡献生命周期和面板桥接通信。' },
        main: './builtin/builtin-panel-plugin-module.ts',
        engines: {
            host: '^0.1.0',
        },
        activation: {
            autoActivate: true,
            events: ['onStartup'],
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
                    id: 'builtin.panel.main',
                    title: 'Builtin Panel',
                    entry: 'panels/builtin-panel/index.html',
                    placement: 'utility',
                    singleton: true,
                    activationPolicy: 'on_plugin_activate',
                    sessionPolicy: 'restore_layout',
                },
            ],
        },
    } as const;

    /**
     * @description 在注册阶段声明内置面板贡献。
     * @param context 插件注册阶段上下文
     * @returns Promise 在注册结束后完成
     */
    public async register(context: IPluginRegisterContext): Promise<void> {
        context.registry.registerPanel({
            id: BuiltinPanelPluginModule.PANEL_ID,
            title: 'Builtin Panel',
            entry: 'panels/builtin-panel/index.html',
            placement: 'utility',
            singleton: true,
            activationPolicy: 'on_plugin_activate',
            sessionPolicy: 'restore_layout',
        });
        context.logger.info('Builtin panel plugin registered.');
    }

    /**
     * @description 在激活阶段打开面板并注册桥接请求与消息处理器。
     * @param context 插件激活阶段上下文
     * @returns Promise 在激活流程结束后完成
     */
    public async activate(context: IPluginActivateContext): Promise<void> {
        context.panels.onRequest<{}, IPanelStatePayload>(
            BuiltinPanelPluginModule.PANEL_ID,
            'builtin.panel.getState',
            async (): Promise<IPanelStatePayload> => {
                return this._buildStatePayload(context.plugin.id);
            },
        );
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        context.panels.onRequest<{ isOpen: boolean }, IPanelStatePayload>(
            BuiltinPanelPluginModule.PANEL_ID,
            'builtin.panel.setOpenState',
            async (request): Promise<IPanelStatePayload> => {
                if (request.payload?.isOpen) {
                    await context.panels.open(BuiltinPanelPluginModule.PANEL_ID);
                    await context.panels.focus(BuiltinPanelPluginModule.PANEL_ID);
                    this._isPanelOpen = true;
                } else {
                    await context.panels.close(BuiltinPanelPluginModule.PANEL_ID);
                    this._isPanelOpen = false;
                }
                return this._buildStatePayload(context.plugin.id);
            },
        );
        context.panels.onRequest<{}, IPanelStatePayload>(
            BuiltinPanelPluginModule.PANEL_ID,
            'builtin.panel.emitState',
            async (): Promise<IPanelStatePayload> => {
                // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
                const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelStatePayload = this._buildStatePayload(context.plugin.id);
                await context.panels.notify(BuiltinPanelPluginModule.PANEL_ID, {
                    id: 'builtin-panel-state',
                    event: 'builtin.panel.state',
                    payload: panelStatePayload,
                });
                return panelStatePayload;
            },
        );
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        context.panels.onMessage<{ source: string }>(
            BuiltinPanelPluginModule.PANEL_ID,
            'builtin.panel.ping',
            async (): Promise<void> => {
                this._pingCount += 1;
            },
        );

        await context.panels.open(BuiltinPanelPluginModule.PANEL_ID);
        await context.panels.focus(BuiltinPanelPluginModule.PANEL_ID);
        this._isPanelOpen = true;
    }

    /**
     * @description 在停用阶段重置面板运行态缓存。
     * @param reason 插件停用原因
     * @returns Promise 在停用流程结束后完成
     */
    public async deactivate(reason: 'host_reload' | 'host_shutdown' | 'plugin_update' | 'dependency_lost' | 'manual_disable'): Promise<void> {
        void reason;
        this._isPanelOpen = false;
        this._pingCount = 0;
    }

    /**
     * @description 在释放阶段执行最终清理。
     * @returns Promise 在资源释放结束后完成
     */
    public async dispose(): Promise<void> {}

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _buildStatePayload(pluginId: string): IPanelStatePayload {
        return {
            pluginId,
            panelId: BuiltinPanelPluginModule.PANEL_ID,
            isOpen: this._isPanelOpen,
            pingCount: this._pingCount,
        };
    }
}
