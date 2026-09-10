import type { IPluginActivateContext, IPluginModule, IPluginRegisterContext } from '../shared/plugin-manager-contracts.js';

interface IMessageRequestEcho {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly target: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly message: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly args: readonly unknown[];
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly adapterId: string;
}

interface IMessageActivationSummary {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly sentTarget: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly requestTarget: string;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly broadcastEvent: string;
}

/**
 * @description 内置消息插件，用于验证插件授权、runtime message grant 和宿主消息链路。
 */
export class BuiltinMessagePluginModule implements IPluginModule {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private _lastRequestEcho: IMessageRequestEcho | null = null;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private _lastActivationSummary: IMessageActivationSummary | null = null;

    /**
     * @description 内置消息插件的运行时清单。
     */
    public readonly manifest = {
        id: 'builtin.message',
        version: '0.1.0',
        kind: 'runtime-plugin',
        displayName: 'Builtin Message Plugin',
        description: { 'en-US': 'Validates the plugin-manager to runtime message grant path.', 'zh-CN': '验证插件管理器到运行时的消息授权链路。' },
        main: './builtin/builtin-message-plugin-module.ts',
        engines: {
            host: '^0.1.0',
        },
        activation: {
            autoActivate: true,
            events: ['onStartup'],
        },
        permissions: {
            editorMessages: ['builtin.message.ping', 'builtin.message.request', 'builtin.message.activated'],
        },
    } as const;

    /**
     * @description 在注册阶段记录当前插件即将接入消息能力验证链路。
     * @param context 插件注册阶段上下文
     * @returns Promise 在注册结束后完成
     */
    public async register(context: IPluginRegisterContext): Promise<void> {
        context.logger.info('Builtin message plugin registered.');
    }

    /**
     * @description 在激活阶段执行 send、request 和 broadcast，验证消息 runtime grant 已就绪。
     * @param context 插件激活阶段上下文
     * @returns Promise 在激活流程结束后完成
     */
    public async activate(context: IPluginActivateContext): Promise<void> {
        if (context.runtime.message == null) {
            throw new Error('Builtin message plugin requires runtime message access.');
        }

        await context.runtime.message.send('builtin-host', 'builtin.message.ping', {
            pluginId: context.plugin.id,
        });
        this._lastRequestEcho = await context.runtime.message.request<IMessageRequestEcho>('builtin-host', 'builtin.message.request', {
            pluginId: context.plugin.id,
            trustLevel: context.plugin.trustLevel,
        });
        await context.runtime.message.broadcast('builtin.message.activated', {
            pluginId: context.plugin.id,
        });
        this._lastActivationSummary = {
            sentTarget: 'builtin-host',
            requestTarget: this._lastRequestEcho.target,
            broadcastEvent: 'builtin.message.activated',
        };
    }

    /**
     * @description 在停用阶段清理上一次激活期间缓存的消息回显结果。
     * @param reason 插件停用原因
     * @returns Promise 在停用流程结束后完成
     */
    public async deactivate(reason: 'host_reload' | 'host_shutdown' | 'plugin_update' | 'dependency_lost' | 'manual_disable'): Promise<void> {
        void reason;
        this._lastRequestEcho = null;
        this._lastActivationSummary = null;
    }

    /**
     * @description 在释放阶段执行最终清理。
     * @returns Promise 在资源释放结束后完成
     */
    public async dispose(): Promise<void> {}

    /**
     * @description 返回最近一次消息 request 的宿主回显结果。
     * @returns 命中时返回请求回显结果，否则返回 `null`
     */
    public getLastRequestEcho(): IMessageRequestEcho | null {
        return this._lastRequestEcho;
    }

    /**
     * @description 返回最近一次激活期间的消息发送摘要。
     * @returns 命中时返回消息发送摘要，否则返回 `null`
     */
    public getLastActivationSummary(): IMessageActivationSummary | null {
        return this._lastActivationSummary;
    }
}
