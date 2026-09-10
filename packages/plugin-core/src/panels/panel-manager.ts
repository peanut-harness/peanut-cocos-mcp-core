import type {
    ICleanupStepResult,
    IPanelBridgeClient,
    IPanelBridgeEnvelope,
    IPanelBridgeMessageHandler,
    IPanelBridgeRequestHandler,
    PluginFailurePhase,
} from 'peanut-contracts';
import type { ICocosRuntime } from 'peanut-runtime';

import { ContributionRegistry } from '../contributions/contribution-registry.js';
import { PluginLeaseStore } from '../hotplug/plugin-lease-store.js';
import type { IPluginPanelApi } from '../shared/plugin-manager-contracts.js';
import { PanelBridgeClient } from './panel-bridge-client.js';
import { PanelBridgeGateway } from './panel-bridge-gateway.js';
import { PanelSessionStore, type IPanelSession } from './panel-session-store.js';

interface IReleasePluginOptions {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly preserveSessions?: boolean;
}

/**
 * @description 面板管理器，负责打开、关闭、聚焦面板并协调面板会话恢复。
 */
export class PanelManager {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _runtime: ICocosRuntime;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _contributionRegistry: ContributionRegistry;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _panelSessionStore: PanelSessionStore;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginLeaseStore: PluginLeaseStore;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _panelBridgeGateway: PanelBridgeGateway;

    /**
     * @description 创建一个新的面板管理器。
     * @param runtime Runtime 门面实例
     * @param contributionRegistry Contribution 注册中心
     * @param panelSessionStore 面板会话存储
     * @param pluginLeaseStore 插件 lease 存储
     * @param panelBridgeGateway 面板桥接网关
     */
    public constructor(
        runtime: ICocosRuntime,
        contributionRegistry: ContributionRegistry,
        panelSessionStore: PanelSessionStore,
        pluginLeaseStore: PluginLeaseStore,
        panelBridgeGateway: PanelBridgeGateway,
    ) {
        this._runtime = runtime;
        this._contributionRegistry = contributionRegistry;
        this._panelSessionStore = panelSessionStore;
        this._pluginLeaseStore = pluginLeaseStore;
        this._panelBridgeGateway = panelBridgeGateway;
    }

    /**
     * @description 为指定插件创建面板辅助接口。
     * @param pluginId 插件标识
     * @returns 插件面板辅助接口
     */
    public createPluginPanelApi(pluginId: string): IPluginPanelApi {
        return {
            open: async (panelId: string): Promise<void> => {
                await this.open(pluginId, panelId);
            },
            close: async (panelId: string): Promise<void> => {
                await this.close(pluginId, panelId);
            },
            focus: async (panelId: string): Promise<void> => {
                await this.focus(pluginId, panelId);
            },
            notify: async <TPayload extends Record<string, unknown> = Record<string, unknown>>(
                panelId: string,
                envelope: IPanelBridgeEnvelope<TPayload>,
            ): Promise<void> => {
                this._requirePanel(pluginId, panelId);
                await this._panelBridgeGateway.notify(pluginId, panelId, envelope);
            },
            onMessage: <TPayload extends Record<string, unknown> = Record<string, unknown>>(
                panelId: string,
                event: string,
                handler: IPanelBridgeMessageHandler<TPayload>,
            ): string => {
                this._requirePanel(pluginId, panelId);
                // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
                const disposer = this._panelBridgeGateway.registerMessageHandler(pluginId, panelId, event, handler as IPanelBridgeMessageHandler);
                return this._pluginLeaseStore.register(pluginId, async (): Promise<void> => {
                    disposer();
                });
            },
            onRequest: <TPayload extends Record<string, unknown> = Record<string, unknown>, TResponse extends Record<string, unknown> = Record<string, unknown>>(
                panelId: string,
                event: string,
                handler: IPanelBridgeRequestHandler<TPayload, TResponse>,
            ): string => {
                this._requirePanel(pluginId, panelId);
                // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
                const disposer = this._panelBridgeGateway.registerRequestHandler(
                    pluginId,
                    panelId,
                    event,
                    handler as IPanelBridgeRequestHandler,
                );
                return this._pluginLeaseStore.register(pluginId, async (): Promise<void> => {
                    disposer();
                });
            },
        };
    }

    /**
     * @description 为指定插件面板创建一个桥接客户端。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @returns 用于面板前端的桥接客户端
     */
    public createPanelBridgeClient(pluginId: string, panelId: string): IPanelBridgeClient {
        this._requirePanel(pluginId, panelId);
        return new PanelBridgeClient(pluginId, panelId, this._panelBridgeGateway);
    }

    /**
     * @description 打开指定插件声明的一个面板。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @returns Promise 在打开动作完成后结束
     */
    public async open(pluginId: string, panelId: string): Promise<void> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panel = this._requirePanel(pluginId, panelId);
        await this._runtime.panelHost.open(panel.id, panel.entry);
        this._panelSessionStore.update(pluginId, panelId, true);
    }

    /**
     * @description 关闭指定插件声明的一个面板。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @returns Promise 在关闭动作完成后结束
     */
    public async close(pluginId: string, panelId: string): Promise<void> {
        this._requirePanel(pluginId, panelId);
        await this._runtime.panelHost.close(panelId);
        this._panelSessionStore.update(pluginId, panelId, false);
    }

    /**
     * @description 聚焦指定插件声明的一个面板。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @returns Promise 在聚焦动作完成后结束
     */
    public async focus(pluginId: string, panelId: string): Promise<void> {
        this._requirePanel(pluginId, panelId);
        await this._runtime.panelHost.focus(panelId);
    }

    /**
     * @description 回收指定插件的所有面板状态和宿主面板实例。
     * @param pluginId 插件标识
     * @param phase 当前释放动作所属失败阶段
     * @returns Promise 返回结构化面板回收结果列表
     */
    public async releasePlugin(
        pluginId: string,
        phase: PluginFailurePhase = 'cleanup',
        options: IReleasePluginOptions = {},
    ): Promise<readonly ICleanupStepResult[]> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelSessions = this._panelSessionStore.listPluginSessions(pluginId);
        // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
        const cleanupStepResults: ICleanupStepResult[] = [];
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelSession of panelSessions) {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            let panelCloseErrorMessage: string | undefined;
            if (panelSession.isOpen) {
                try {
                    await this._runtime.panelHost.close(panelSession.panelId);
                } catch (/* 捕获当前操作失败的异常信息，用于生成失败结果或保留诊断上下文。 */ error) {
                    panelCloseErrorMessage = error instanceof Error ? error.message : 'unknown_panel_release_error';
                }
            }
            this._panelBridgeGateway.clearPanel(pluginId, panelSession.panelId);
            if (panelCloseErrorMessage == null) {
                if (options.preserveSessions === true && (panelSession.isOpen || panelSession.restoreOnActivate)) {
                    if (panelSession.isOpen) {
                        this._panelSessionStore.markForRestore(pluginId, panelSession.panelId);
                    }
                } else {
                    this._panelSessionStore.delete(pluginId, panelSession.panelId);
                }
                cleanupStepResults.push({
                    stepId: `${pluginId}:panel:${panelSession.panelId}`,
                    phase,
                    targetType: 'panel',
                    targetId: panelSession.panelId,
                    ok: true,
                    summary: `Panel "${panelSession.panelId}" released.`,
                });
            } else {
                cleanupStepResults.push({
                    stepId: `${pluginId}:panel:${panelSession.panelId}`,
                    phase,
                    targetType: 'panel',
                    targetId: panelSession.panelId,
                    ok: false,
                    summary: `Panel "${panelSession.panelId}" release failed.`,
                    errorMessage: panelCloseErrorMessage,
                });
            }
        }
        this._panelBridgeGateway.clearPlugin(pluginId);
        return cleanupStepResults;
    }

    /**
     * @description 恢复指定插件在热插拔前标记为待恢复的面板会话。
     * @param pluginId 插件标识
     * @returns Promise 在所有可恢复面板重新打开后结束
     */
    public async restorePluginSessions(pluginId: string): Promise<void> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const restorablePanelSessions = this._panelSessionStore.listRestorableSessions(pluginId);
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelSession of restorablePanelSessions) {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const panel = this._contributionRegistry.getPanel(pluginId, panelSession.panelId);
            if (panel == null) {
                this._panelSessionStore.delete(pluginId, panelSession.panelId);
                continue;
            }

            await this.open(pluginId, panel.id);
        }
    }

    /**
     * @description 生成指定插件当前面板会话的快照副本，用于升级失败后的恢复。
     * @param pluginId 插件标识
     * @returns 当前插件面板会话快照的只读列表
     */
    public snapshotPluginSessions(pluginId: string): readonly IPanelSession[] {
        return this._panelSessionStore.listPluginSessions(pluginId).map((panelSession) => {
            return { ...panelSession };
        });
    }

    /**
     * @description 使用给定快照恢复指定插件的面板会话状态。
     * @param pluginId 插件标识
     * @param panelSessions 需要恢复的面板会话快照列表
     * @returns 无返回值
     */
    public restorePluginSessionSnapshot(pluginId: string, panelSessions: readonly IPanelSession[]): void {
        this._panelSessionStore.clearPlugin(pluginId);
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelSession of panelSessions) {
            this._panelSessionStore.update(
                panelSession.pluginId,
                panelSession.panelId,
                panelSession.isOpen,
                panelSession.restoreOnActivate,
            );
        }
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _requirePanel(pluginId: string, panelId: string) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panel = this._contributionRegistry.getPanel(pluginId, panelId);
        if (panel == null) {
            throw new Error(`Panel "${panelId}" is not registered by plugin "${pluginId}".`);
        }
        return panel;
    }
}
