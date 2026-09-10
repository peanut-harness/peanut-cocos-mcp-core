import type { IPluginRuntimeRecord } from 'peanut-contracts';
import { RuntimeFacade } from 'peanut-runtime';

import { PluginManagerApp } from '../app/plugin-manager-app.js';
import { BuiltinMessagePluginModule } from '../builtin/builtin-message-plugin-module.js';

/**
 * @description 内置消息插件验证入口，用于端到端检查 builtin plugin 的授权、激活和停用链路。
 */
export class BuiltinMessagePluginHarness {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _runtime: RuntimeFacade;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginManager: PluginManagerApp;

    /**
     * @description 创建一个新的内置消息插件验证入口。
     * @param creatorVersion 当前宿主绑定的 Creator 版本字符串
     */
    public constructor(creatorVersion: string) {
        this._runtime = new RuntimeFacade(creatorVersion);
        this._pluginManager = new PluginManagerApp(this._runtime);
    }

    /**
     * @description 激活内置消息插件并返回当前运行时记录和消息链路结果。
     * @returns Promise 返回插件运行时记录与消息回显摘要
     */
    public async run(): Promise<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        runtimeRecord: IPluginRuntimeRecord | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        requestEcho: ReturnType<BuiltinMessagePluginModule['getLastRequestEcho']>;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        activationSummary: ReturnType<BuiltinMessagePluginModule['getLastActivationSummary']>;
    }> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ builtinMessagePluginModule = new BuiltinMessagePluginModule();
        this._pluginManager.registerManifest({
            manifest: builtinMessagePluginModule.manifest,
            installPath: 'plugins/builtin-message',
            trustLevel: 'builtin',
        });
        this._pluginManager.attachModule(builtinMessagePluginModule.manifest.id, builtinMessagePluginModule);
        await this._pluginManager.activatePlugin(builtinMessagePluginModule.manifest.id);

        return {
            runtimeRecord:
                this._pluginManager
                    .listRuntimeRecords()
                    .find((pluginRuntimeRecord) => {
                        return pluginRuntimeRecord.pluginId === builtinMessagePluginModule.manifest.id;
                    }) ?? null,
            requestEcho: builtinMessagePluginModule.getLastRequestEcho(),
            activationSummary: builtinMessagePluginModule.getLastActivationSummary(),
        };
    }

    /**
     * @description 激活后执行停用与释放，验证内置消息插件的运行态缓存可以被清空。
     * @returns Promise 返回停用后的状态摘要
     */
    public async runDeactivateFlow(): Promise<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        inactiveState: string | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        disposedState: string | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        requestEchoCleared: boolean;
    }> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ builtinMessagePluginModule = new BuiltinMessagePluginModule();
        this._pluginManager.registerManifest({
            manifest: builtinMessagePluginModule.manifest,
            installPath: 'plugins/builtin-message',
            trustLevel: 'builtin',
        });
        this._pluginManager.attachModule(builtinMessagePluginModule.manifest.id, builtinMessagePluginModule);
        await this._pluginManager.activatePlugin(builtinMessagePluginModule.manifest.id);
        await this._pluginManager.deactivatePlugin(builtinMessagePluginModule.manifest.id, 'manual_disable');
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ inactiveState =
            this._pluginManager
                .listRuntimeRecords()
                .find((pluginRuntimeRecord) => {
                    return pluginRuntimeRecord.pluginId === builtinMessagePluginModule.manifest.id;
                })?.state ?? null;

        await this._pluginManager.disposePlugin(builtinMessagePluginModule.manifest.id);
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ disposedState =
            this._pluginManager
                .listRuntimeRecords()
                .find((pluginRuntimeRecord) => {
                    return pluginRuntimeRecord.pluginId === builtinMessagePluginModule.manifest.id;
                })?.state ?? null;

        return {
            inactiveState,
            disposedState,
            requestEchoCleared: builtinMessagePluginModule.getLastRequestEcho() == null,
        };
    }
}
