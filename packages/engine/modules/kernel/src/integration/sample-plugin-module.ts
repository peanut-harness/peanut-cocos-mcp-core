import type { IPluginActivateContext, IPluginModule, IPluginRegisterContext } from '../shared/plugin-manager-contracts.js';

/**
 * @description 最小样例插件，用于验证 plugin-manager 的注册、激活、任务提交和面板声明流程。
 */
export class SamplePluginModule implements IPluginModule {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private _lastTaskId: string | null = null;

    /**
     * @description 样例插件运行时清单。
     */
    public readonly manifest = {
        id: 'sample.plugin',
        version: '0.1.0',
        kind: 'panel-plugin',
        displayName: 'Sample Plugin',
        description: { 'en-US': 'A minimal sample plugin for the Peanut Cocos plugin manager skeleton.', 'zh-CN': 'Peanut Cocos 插件管理器骨架的最小示例插件。' },
        main: './sample-plugin-module.ts',
        engines: {
            host: '^0.1.0',
        },
        activation: {
            autoActivate: true,
            events: ['onStartup'],
        },
        permissions: {
            editorMessages: ['sample:ping'],
            assetDb: {
                read: true,
                write: false,
                delete: false,
            },
            panel: {
                open: true,
                embed: true,
            },
        },
        contributions: {
            commands: [
                {
                    id: 'sample.openPanel',
                    title: 'Open Sample Panel',
                    handler: 'sample.open-panel',
                },
            ],
            menus: [
                {
                    id: 'sample.menu.openPanel',
                    title: 'Open Sample Panel',
                    path: 'Tools/Peanut',
                    commandId: 'sample.openPanel',
                },
            ],
            panels: [
                {
                    id: 'sample.panel',
                    title: 'Sample Panel',
                    entry: 'panels/sample/index.html',
                    placement: 'utility',
                    singleton: true,
                    activationPolicy: 'manual',
                    sessionPolicy: 'restore_layout',
                    permissions: {
                        allowSelectionRead: true,
                    },
                },
            ],
            diagnostics: [
                {
                    id: 'sample.diagnostics',
                    handler: 'sample.collect-diagnostics',
                },
            ],
        },
    } as const;

    /**
     * @description 在注册阶段声明样例插件的命令、菜单、面板和诊断贡献。
     * @param context 插件注册阶段上下文
     * @returns Promise 在注册阶段结束后完成
     */
    public async register(context: IPluginRegisterContext): Promise<void> {
        context.registry.registerCommand({
            id: 'sample.openPanel',
            title: 'Open Sample Panel',
            handler: 'sample.open-panel',
        });
        context.registry.registerMenu({
            id: 'sample.menu.openPanel',
            title: 'Open Sample Panel',
            path: 'Tools/Peanut',
            commandId: 'sample.openPanel',
        });
        context.registry.registerPanel({
            id: 'sample.panel',
            title: 'Sample Panel',
            entry: 'panels/sample/index.html',
            placement: 'utility',
            singleton: true,
            activationPolicy: 'manual',
            sessionPolicy: 'restore_layout',
            permissions: {
                allowSelectionRead: true,
            },
        });
        context.registry.registerDiagnostics({
            id: 'sample.diagnostics',
            handler: 'sample.collect-diagnostics',
        });
        context.registry.onDispose(async (): Promise<void> => {
            context.logger.info('Sample plugin disposer called.');
        });
    }

    /**
     * @description 在激活阶段执行一条消息请求、读取选择集并提交一个示例任务。
     * @param context 插件激活阶段上下文
     * @returns Promise 在激活阶段结束后完成
     */
    public async activate(context: IPluginActivateContext): Promise<void> {
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        context.panels.onRequest<{ includeSelection: boolean }, { pluginId: string; activeIds: readonly string[] }>(
            'sample.panel',
            'sample.getState',
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            async (): Promise<{ pluginId: string; activeIds: readonly string[] }> => {
                // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
                const activeIds = (await context.runtime.selection?.getActiveIds()) ?? [];
                return {
                    pluginId: context.plugin.id,
                    activeIds,
                };
            },
        );
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        context.panels.onRequest<{}, { taskId: string | null; status: string | null; kind: string | null; mergePolicy: unknown | null }>(
            'sample.panel',
            'sample.getTaskResult',
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            async (): Promise<{ taskId: string | null; status: string | null; kind: string | null; mergePolicy: unknown | null }> => {
                if (this._lastTaskId == null) {
                    return {
                        taskId: null,
                        status: null,
                        kind: null,
                        mergePolicy: null,
                    };
                }

                // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
                const taskResult = await context.tasks.getResult(this._lastTaskId);
                return {
                    taskId: taskResult?.taskId ?? null,
                    status: taskResult?.status ?? null,
                    kind: typeof taskResult?.data === 'object' && taskResult?.data != null && 'kind' in taskResult.data ? String(taskResult.data.kind) : null,
                    mergePolicy:
                        typeof taskResult?.data === 'object' && taskResult?.data != null && 'mergePolicy' in taskResult.data
                            ? taskResult.data.mergePolicy
                            : null,
                };
            },
        );
        context.panels.onRequest<
            {},
            {
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                taskId: string | null;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                traceId: string | null;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                stepCount: number;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                firstStepStatus: string | null;
            }
        >(
            'sample.panel',
            'sample.getTaskTrace',
            async (): Promise<{
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                taskId: string | null;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                traceId: string | null;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                stepCount: number;
                /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
                firstStepStatus: string | null;
            }> => {
                if (this._lastTaskId == null) {
                    return {
                        taskId: null,
                        traceId: null,
                        stepCount: 0,
                        firstStepStatus: null,
                    };
                }

                // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
                const taskResult = await context.tasks.getResult(this._lastTaskId);
                return {
                    taskId: taskResult?.taskId ?? null,
                    traceId: taskResult?.trace.traceId ?? null,
                    stepCount: taskResult?.trace.steps.length ?? 0,
                    firstStepStatus: taskResult?.trace.steps[0]?.status ?? null,
                };
            },
        );
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        context.panels.onMessage<{ eventName: string }>('sample.panel', 'sample.ping', async (envelope): Promise<void> => {
            context.logger.info('Sample panel ping received.', {
                payload: envelope.payload,
            });
        });
        if (context.runtime.message != null) {
            await context.runtime.message.broadcast('sample:activated', context.plugin.id);
        }
        if (context.runtime.selection != null) {
            // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
            const activeIds = await context.runtime.selection.getActiveIds();
            context.logger.info('Selection snapshot captured.', {
                activeIds,
            });
        }
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const taskReceipt = await context.tasks.submit({
            requestId: 'sample-plugin-activate',
            scope: 'asset',
            priority: 'normal',
            kind: 'asset.query',
            payload: {
                pathOrUuid: 'assets/example.prefab',
            },
            mergePolicy: 'dedupe',
        });
        this._lastTaskId = taskReceipt.taskId;
        await context.panels.notify('sample.panel', {
            id: 'sample-panel-ready',
            event: 'sample.ready',
            payload: {
                pluginId: context.plugin.id,
            },
        });
    }

    /**
     * @description 在停用阶段记录停用原因。
     * @param reason 插件停用原因
     * @returns Promise 在停用阶段结束后完成
     */
    public async deactivate(reason: 'host_reload' | 'host_shutdown' | 'plugin_update' | 'dependency_lost' | 'manual_disable'): Promise<void> {
        void reason;
        this._lastTaskId = null;
    }

    /**
     * @description 在释放阶段执行最终清理。
     * @returns Promise 在释放结束后完成
     */
    public async dispose(): Promise<void> {}
}
