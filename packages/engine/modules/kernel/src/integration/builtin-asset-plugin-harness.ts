import type { IPluginRuntimeRecord } from '@peanut/pod-protocol';
import { RuntimeFacade } from '@peanut/pod-engine/runtime';

import { PluginManagerApp } from '../app/plugin-manager-app.js';
import { BuiltinAssetPluginModule } from '../builtin/builtin-asset-plugin-module.js';

/**
 * @description 内置资源插件验证入口，用于端到端检查 builtin asset plugin 的授权和任务链路。
 */
export class BuiltinAssetPluginHarness {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _runtime: RuntimeFacade;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginManager: PluginManagerApp;

    /**
     * @description 创建一个新的内置资源插件验证入口。
     * @param creatorVersion 当前宿主绑定的 Creator 版本字符串
     */
    public constructor(creatorVersion: string) {
        this._runtime = new RuntimeFacade(creatorVersion, {
            initialState: {
                assets: [
                    {
                        pathOrUuid: 'assets/example.prefab',
                        value: {
                            path: 'assets/example.prefab',
                            uuid: 'example-prefab-uuid',
                            type: 'prefab',
                        },
                    },
                ],
            },
        });
        this._pluginManager = new PluginManagerApp(this._runtime);
    }

    /**
     * @description 激活内置资源插件并返回当前运行时记录和资源验证快照。
     * @returns Promise 返回插件运行时记录与资源验证快照
     */
    public async run(): Promise<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        runtimeRecord: IPluginRuntimeRecord | null;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        activationSnapshot: ReturnType<BuiltinAssetPluginModule['getLastActivationSnapshot']>;
    }> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ builtinAssetPluginModule = new BuiltinAssetPluginModule();
        this._pluginManager.registerManifest({
            manifest: builtinAssetPluginModule.manifest,
            installPath: 'plugins/builtin-asset',
            trustLevel: 'builtin',
        });
        this._pluginManager.attachModule(builtinAssetPluginModule.manifest.id, builtinAssetPluginModule);
        await this._pluginManager.activatePlugin(builtinAssetPluginModule.manifest.id);

        return {
            runtimeRecord:
                this._pluginManager
                    .listRuntimeRecords()
                    .find((pluginRuntimeRecord) => {
                        return pluginRuntimeRecord.pluginId === builtinAssetPluginModule.manifest.id;
                    }) ?? null,
            activationSnapshot: builtinAssetPluginModule.getLastActivationSnapshot(),
        };
    }
}
