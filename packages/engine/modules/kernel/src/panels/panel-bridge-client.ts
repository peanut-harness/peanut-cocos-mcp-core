import type { IPanelBridgeClient, IPanelBridgeEnvelope, IPanelBridgeMessageHandler, IPanelBridgeRequest, IPanelBridgeResponse } from '@peanut/pod-protocol';

import { PanelBridgeGateway } from './panel-bridge-gateway.js';

/**
 * @description 面板前端桥接客户端实现，通过 `PanelBridgeGateway` 与插件运行时通信。
 */
export class PanelBridgeClient implements IPanelBridgeClient {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginId: string;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _panelId: string;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _panelBridgeGateway: PanelBridgeGateway;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _disposers: Array<() => void> = [];

    /**
     * @description 创建一个新的面板桥接客户端。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @param panelBridgeGateway 面板桥接网关
     */
    public constructor(pluginId: string, panelId: string, panelBridgeGateway: PanelBridgeGateway) {
        this._pluginId = pluginId;
        this._panelId = panelId;
        this._panelBridgeGateway = panelBridgeGateway;
    }

    /**
     * @description 向插件运行时发送单向消息。
     * @param envelope 面板桥消息信封
     * @returns Promise 在消息发送结束后完成
     */
    public async postMessage<TPayload extends Record<string, unknown> = Record<string, unknown>>(envelope: IPanelBridgeEnvelope<TPayload>): Promise<void> {
        await this._panelBridgeGateway.postMessage(this._pluginId, this._panelId, envelope);
    }

    /**
     * @description 向插件运行时发送请求并等待响应。
     * @param request 面板桥请求
     * @returns Promise 返回结构化响应
     */
    public async request<TPayload extends Record<string, unknown> = Record<string, unknown>, TResponse extends Record<string, unknown> = Record<string, unknown>>(
        request: IPanelBridgeRequest<TPayload>,
    ): Promise<IPanelBridgeResponse<TResponse>> {
        return this._panelBridgeGateway.request<TPayload, TResponse>(this._pluginId, this._panelId, request);
    }

    /**
     * @description 订阅来自插件运行时的面板桥事件。
     * @param event 要订阅的事件名称
     * @param listener 事件监听器
     * @returns 取消订阅函数
     */
    public subscribe<TPayload extends Record<string, unknown> = Record<string, unknown>>(event: string, listener: IPanelBridgeMessageHandler<TPayload>): () => void {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ disposer = this._panelBridgeGateway.subscribe(this._pluginId, this._panelId, event, listener as IPanelBridgeMessageHandler);
        this._disposers.push(disposer);
        return disposer;
    }

    /**
     * @description 释放当前桥接客户端持有的所有订阅。
     * @returns Promise 在资源释放后完成
     */
    public async dispose(): Promise<void> {
        while (this._disposers.length > 0) {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ disposer = this._disposers.pop();
            disposer?.();
        }
    }
}
