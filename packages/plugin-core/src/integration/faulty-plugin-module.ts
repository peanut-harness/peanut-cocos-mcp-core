import type { IPluginActivateContext, IPluginModule, IPluginRegisterContext } from '../shared/plugin-manager-contracts.js';

/**
 * @description 故障样例插件，用于验证 plugin-manager 在生命周期异常时会进入 failed 状态。
 */
export class FaultyPluginModule implements IPluginModule {
    /**
     * @description 故障样例插件运行时清单。
     */
    public readonly manifest = {
        id: 'faulty.plugin',
        version: '0.1.0',
        kind: 'runtime-plugin',
        displayName: 'Faulty Plugin',
        description: { 'en-US': 'Simulates lifecycle failures for plugin-manager regression tests.', 'zh-CN': '为插件管理器回归测试模拟生命周期故障。' },
        main: './faulty-plugin-module.ts',
        engines: {
            host: '^0.1.0',
        },
        activation: {
            autoActivate: false,
            events: [],
        },
        permissions: {},
    } as const;

    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _failureStage: 'register' | 'activate' | 'deactivate' | 'dispose';

    /**
     * @description 创建一个新的故障样例插件。
     * @param failureStage 指定哪个生命周期阶段主动抛错
     */
    public constructor(failureStage: 'register' | 'activate' | 'deactivate' | 'dispose') {
        this._failureStage = failureStage;
    }

    /**
     * @description 在注册阶段根据配置决定是否主动抛错。
     * @param context 插件注册阶段上下文
     * @returns Promise 在注册流程结束后完成
     */
    public async register(context: IPluginRegisterContext): Promise<void> {
        void context;
        this._throwIfNeeded('register');
    }

    /**
     * @description 在激活阶段根据配置决定是否主动抛错。
     * @param context 插件激活阶段上下文
     * @returns Promise 在激活流程结束后完成
     */
    public async activate(context: IPluginActivateContext): Promise<void> {
        void context;
        this._throwIfNeeded('activate');
    }

    /**
     * @description 在停用阶段根据配置决定是否主动抛错。
     * @param reason 插件停用原因
     * @returns Promise 在停用流程结束后完成
     */
    public async deactivate(reason: 'host_reload' | 'host_shutdown' | 'plugin_update' | 'dependency_lost' | 'manual_disable'): Promise<void> {
        void reason;
        this._throwIfNeeded('deactivate');
    }

    /**
     * @description 在释放阶段根据配置决定是否主动抛错。
     * @returns Promise 在释放流程结束后完成
     */
    public async dispose(): Promise<void> {
        this._throwIfNeeded('dispose');
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _throwIfNeeded(stage: 'register' | 'activate' | 'deactivate' | 'dispose'): void {
        if (this._failureStage === stage) {
            throw new Error(`faulty_plugin_${stage}_failed`);
        }
    }
}
