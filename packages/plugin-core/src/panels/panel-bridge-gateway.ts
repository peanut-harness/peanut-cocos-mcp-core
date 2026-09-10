import type {
    IPanelBridgeEnvelope,
    IPanelBridgeMessageHandler,
    IPanelBridgeRequest,
    IPanelBridgeRequestHandler,
    IPanelBridgeResponse,
} from 'peanut-contracts';

type PanelDiagnosticReporter = (input: { pluginId: string; source: 'panel_message' | 'browser_error' | 'browser_unhandled_rejection'; error: unknown; context: Record<string, unknown> }) => void;

/**
 * @description 面板桥接网关，负责在面板前端和插件运行时之间路由消息、请求和事件订阅。
 */
export class PanelBridgeGateway {
    private readonly _reporter?: PanelDiagnosticReporter;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _messageHandlers = new Map<string, Map<string, Map<string, IPanelBridgeMessageHandler>>>();
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _requestHandlers = new Map<string, Map<string, IPanelBridgeRequestHandler>>();
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _subscribers = new Map<string, Map<string, Map<string, IPanelBridgeMessageHandler>>>();

    /** @param reporter 插件边界诊断回调。 */
    public constructor(reporter?: PanelDiagnosticReporter) { this._reporter = reporter; }

    /**
     * @description 为指定插件面板注册一个单向消息处理器。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @param event 事件名称
     * @param handler 单向消息处理器
     * @returns 取消注册函数
     */
    public registerMessageHandler(pluginId: string, panelId: string, event: string, handler: IPanelBridgeMessageHandler): () => void {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelKey = this._buildPanelKey(pluginId, panelId);
        // 维护当前作用域内的映射索引，用于按键查询并关联后续处理数据。
        const eventHandlers = this._messageHandlers.get(panelKey) ?? new Map<string, Map<string, IPanelBridgeMessageHandler>>();
        // 维护当前作用域内的映射索引，用于按键查询并关联后续处理数据。
        const handlers = eventHandlers.get(event) ?? new Map<string, IPanelBridgeMessageHandler>();
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const handlerId = this._buildEntryId(panelKey, event);

        handlers.set(handlerId, handler);
        eventHandlers.set(event, handlers);
        this._messageHandlers.set(panelKey, eventHandlers);

        return (): void => {
            // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
            const currentEventHandlers = this._messageHandlers.get(panelKey);
            // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
            const currentHandlers = currentEventHandlers?.get(event);
            currentHandlers?.delete(handlerId);
            if (currentHandlers != null && currentHandlers.size === 0) {
                currentEventHandlers?.delete(event);
            }
            if (currentEventHandlers != null && currentEventHandlers.size === 0) {
                this._messageHandlers.delete(panelKey);
            }
        };
    }

    /**
     * @description 为指定插件面板注册一个请求处理器；同一事件只允许存在一个处理器。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @param event 事件名称
     * @param handler 请求处理器
     * @returns 取消注册函数
     */
    public registerRequestHandler(pluginId: string, panelId: string, event: string, handler: IPanelBridgeRequestHandler): () => void {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelKey = this._buildPanelKey(pluginId, panelId);
        // 维护当前作用域内的映射索引，用于按键查询并关联后续处理数据。
        const eventHandlers = this._requestHandlers.get(panelKey) ?? new Map<string, IPanelBridgeRequestHandler>();
        eventHandlers.set(event, handler);
        this._requestHandlers.set(panelKey, eventHandlers);

        return (): void => {
            // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
            const currentEventHandlers = this._requestHandlers.get(panelKey);
            currentEventHandlers?.delete(event);
            if (currentEventHandlers != null && currentEventHandlers.size === 0) {
                this._requestHandlers.delete(panelKey);
            }
        };
    }

    /**
     * @description 处理一条来自面板前端的单向消息。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @param envelope 面板桥消息信封
     * @returns Promise 在所有处理器执行完成后结束
     */
    public async postMessage(pluginId: string, panelId: string, envelope: IPanelBridgeEnvelope): Promise<void> {
        if (envelope.event === 'pluginManager.diagnostic.browserError' || envelope.event === 'pluginManager.diagnostic.browserUnhandledRejection') {
            this._reporter?.({
                pluginId,
                source: envelope.event.endsWith('UnhandledRejection') ? 'browser_unhandled_rejection' : 'browser_error',
                error: {
                    message: envelope.payload?.errorMessage ?? 'browser_panel_error',
                    stack: envelope.payload?.errorStack,
                },
                context: { panelId, event: envelope.event, browser: true, payload: envelope.payload },
            });
            return;
        }
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelKey = this._buildPanelKey(pluginId, panelId);
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const handlers = this._messageHandlers.get(panelKey)?.get(envelope.event);
        if (handlers == null) {
            return;
        }

        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ [, handler] of handlers) {
            try {
                await handler(envelope);
            } catch (error) {
                this._reporter?.({ pluginId, source: 'panel_message', error, context: { panelId, event: envelope.event, direction: 'inbound' } });
            }
        }
    }

    /**
     * @description 处理一条来自面板前端的请求消息。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @param request 面板桥请求
     * @returns Promise 返回结构化响应
     */
    public async request<TPayload extends Record<string, unknown> = Record<string, unknown>, TResponse extends Record<string, unknown> = Record<string, unknown>>(
        pluginId: string,
        panelId: string,
        request: IPanelBridgeRequest<TPayload>,
    ): Promise<IPanelBridgeResponse<TResponse>> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelKey = this._buildPanelKey(pluginId, panelId);
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const handler = this._requestHandlers.get(panelKey)?.get(request.event);
        if (handler == null) {
            return {
                requestId: request.id,
                ok: false,
                error: 'panel_bridge_request_handler_not_found',
            };
        }

        try {
            // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
            const payload = await handler(request);
            return {
                requestId: request.id,
                ok: true,
                payload: payload as TResponse,
            };
        } catch (/* 捕获当前操作失败的异常信息，用于生成失败结果或保留诊断上下文。 */ error) {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const errorMessage = error instanceof Error ? error.message : 'unknown_panel_bridge_request_error';
            return {
                requestId: request.id,
                ok: false,
                error: errorMessage,
            };
        }
    }

    /**
     * @description 向当前面板前端的订阅者广播一条事件。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @param envelope 面板桥消息信封
     * @returns Promise 在广播完成后结束
     */
    public async notify(pluginId: string, panelId: string, envelope: IPanelBridgeEnvelope): Promise<void> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelKey = this._buildPanelKey(pluginId, panelId);
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const subscribers = this._subscribers.get(panelKey)?.get(envelope.event);
        if (subscribers == null) {
            return;
        }

        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ [, subscriber] of subscribers) {
            try {
                await subscriber(envelope);
            } catch (error) {
                this._reporter?.({ pluginId, source: 'panel_message', error, context: { panelId, event: envelope.event, direction: 'outbound' } });
            }
        }
    }

    /**
     * @description 为指定面板前端事件注册订阅者。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @param event 事件名称
     * @param listener 事件监听器
     * @returns 取消订阅函数
     */
    public subscribe(pluginId: string, panelId: string, event: string, listener: IPanelBridgeMessageHandler): () => void {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelKey = this._buildPanelKey(pluginId, panelId);
        // 维护当前作用域内的映射索引，用于按键查询并关联后续处理数据。
        const eventSubscribers = this._subscribers.get(panelKey) ?? new Map<string, Map<string, IPanelBridgeMessageHandler>>();
        // 维护当前作用域内的映射索引，用于按键查询并关联后续处理数据。
        const listeners = eventSubscribers.get(event) ?? new Map<string, IPanelBridgeMessageHandler>();
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const listenerId = this._buildEntryId(panelKey, event);

        listeners.set(listenerId, listener);
        eventSubscribers.set(event, listeners);
        this._subscribers.set(panelKey, eventSubscribers);

        return (): void => {
            // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
            const currentEventSubscribers = this._subscribers.get(panelKey);
            // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
            const currentListeners = currentEventSubscribers?.get(event);
            currentListeners?.delete(listenerId);
            if (currentListeners != null && currentListeners.size === 0) {
                currentEventSubscribers?.delete(event);
            }
            if (currentEventSubscribers != null && currentEventSubscribers.size === 0) {
                this._subscribers.delete(panelKey);
            }
        };
    }

    /**
     * @description 清理指定插件面板的所有桥接处理器和订阅者。
     * @param pluginId 插件标识
     * @param panelId 面板稳定标识
     * @returns 无返回值
     */
    public clearPanel(pluginId: string, panelId: string): void {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelKey = this._buildPanelKey(pluginId, panelId);
        this._messageHandlers.delete(panelKey);
        this._requestHandlers.delete(panelKey);
        this._subscribers.delete(panelKey);
    }

    /**
     * @description 清理指定插件的所有桥接处理器和订阅者。
     * @param pluginId 插件标识
     * @returns 无返回值
     */
    public clearPlugin(pluginId: string): void {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelKeyPrefix = `${pluginId}:`;
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelKey of [...this._messageHandlers.keys()]) {
            if (panelKey.startsWith(panelKeyPrefix)) {
                this._messageHandlers.delete(panelKey);
            }
        }
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelKey of [...this._requestHandlers.keys()]) {
            if (panelKey.startsWith(panelKeyPrefix)) {
                this._requestHandlers.delete(panelKey);
            }
        }
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelKey of [...this._subscribers.keys()]) {
            if (panelKey.startsWith(panelKeyPrefix)) {
                this._subscribers.delete(panelKey);
            }
        }
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _buildPanelKey(pluginId: string, panelId: string): string {
        return `${pluginId}:${panelId}`;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _buildEntryId(panelKey: string, event: string): string {
        return `${panelKey}:${event}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    }
}
