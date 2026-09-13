import type { IPluginRuntimeRecord } from '@peanut/pod-protocol';
import { RuntimeFacade } from '@peanut/pod-engine/runtime';

import { PluginManagerApp } from '../app/plugin-manager-app.js';
import { BuiltinScenePluginModule } from '../builtin/builtin-scene-plugin-module.js';

/**
 * @description 内置场景插件验证入口，用于端到端检查 builtin scene plugin 的授权和任务链路。
 */
export class BuiltinScenePluginHarness {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _runtime: RuntimeFacade;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginManager: PluginManagerApp;

    /**
     * @description 创建一个新的内置场景插件验证入口。
     * @param creatorVersion 当前宿主绑定的 Creator 版本字符串
     */
    public constructor(creatorVersion: string) {
        this._runtime = new RuntimeFacade(creatorVersion, {
            initialState: {
                sceneNodes: [
                    {
                        nodeId: 'root-node',
                        state: {
                            nodeId: 'root-node',
                            enabled: false,
                            name: 'Root Node',
                        },
                    },
                ],
            },
        });
        this._pluginManager = new PluginManagerApp(this._runtime);
    }

    /**
     * @description 激活内置场景插件并返回当前运行时记录和场景验证快照。
     * @returns Promise 返回插件运行时记录与场景验证快照
     */
    public async run(): Promise<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        runtimeRecord: IPluginRuntimeRecord | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        activationSnapshot: ReturnType<BuiltinScenePluginModule['getLastActivationSnapshot']>;
    }> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ builtinScenePluginModule = new BuiltinScenePluginModule();
        this._pluginManager.registerManifest({
            manifest: builtinScenePluginModule.manifest,
            installPath: 'plugins/builtin-scene',
            trustLevel: 'builtin',
        });
        this._pluginManager.attachModule(builtinScenePluginModule.manifest.id, builtinScenePluginModule);
        await this._pluginManager.activatePlugin(builtinScenePluginModule.manifest.id);

        return {
            runtimeRecord:
                this._pluginManager
                    .listRuntimeRecords()
                    .find((pluginRuntimeRecord) => {
                        return pluginRuntimeRecord.pluginId === builtinScenePluginModule.manifest.id;
                    }) ?? null,
            activationSnapshot: builtinScenePluginModule.getLastActivationSnapshot(),
        };
    }
}
