import type { ContractPayload } from '../shared/common-contracts.js';

/**
 * @description 面板桥接消息信封。
 */
export interface IPanelBridgeEnvelope<TPayload extends ContractPayload = ContractPayload> {
    /**
     * @description 消息稳定标识。
     */
    readonly id: string;

    /**
     * @description 消息事件名称。
     */
    readonly event: string;

    /**
     * @description 消息载荷。
     */
    readonly payload?: TPayload;
}

/**
 * @description 面板桥接请求。
 */
export interface IPanelBridgeRequest<TPayload extends ContractPayload = ContractPayload> extends IPanelBridgeEnvelope<TPayload> {
    /**
     * @description 请求是否期待响应。
     */
    readonly expectsResponse: boolean;
}

/**
 * @description 面板桥接响应。
 */
export interface IPanelBridgeResponse<TPayload extends ContractPayload = ContractPayload> {
    /**
     * @description 对应请求标识。
     */
    readonly requestId: string;

    /**
     * @description 响应是否成功。
     */
    readonly ok: boolean;

    /**
     * @description 响应返回载荷。
     */
    readonly payload?: TPayload;

    /**
     * @description 失败时的错误摘要。
     */
    readonly error?: string;
}

/**
 * @description 面板桥接单向消息处理器。
 */
export interface IPanelBridgeMessageHandler<TPayload extends ContractPayload = ContractPayload> {
    /**
     * @description 处理一条来自面板桥的单向消息。
     * @param envelope 面板桥消息信封
     * @returns Promise 在消息处理结束后完成
     */
    (envelope: IPanelBridgeEnvelope<TPayload>): void | Promise<void>;
}

/**
 * @description 面板桥接请求处理器。
 */
export interface IPanelBridgeRequestHandler<
    TPayload extends ContractPayload = ContractPayload,
    TResponse extends ContractPayload = ContractPayload,
> {
    /**
     * @description 处理一条来自面板桥的请求消息。
     * @param request 面板桥请求
     * @returns Promise 返回请求处理结果载荷
     */
    (request: IPanelBridgeRequest<TPayload>): TResponse | Promise<TResponse>;
}

/**
 * @description 面板侧可用的桥接客户端接口。
 */
export interface IPanelBridgeClient {
    /**
     * @description 向插件运行时发送单向消息。
     * @param envelope 面板桥消息信封
     * @returns Promise 在消息发送结束后完成
     */
    postMessage<TPayload extends ContractPayload = ContractPayload>(envelope: IPanelBridgeEnvelope<TPayload>): Promise<void>;

    /**
     * @description 向插件运行时发送请求并等待响应。
     * @param request 面板桥请求
     * @returns Promise 返回结构化响应
     */
    request<TPayload extends ContractPayload = ContractPayload, TResponse extends ContractPayload = ContractPayload>(
        request: IPanelBridgeRequest<TPayload>,
    ): Promise<IPanelBridgeResponse<TResponse>>;

    /**
     * @description 订阅来自插件运行时的面板桥事件。
     * @param event 要订阅的事件名称
     * @param listener 事件监听器
     * @returns 取消订阅函数
     */
    subscribe<TPayload extends ContractPayload = ContractPayload>(event: string, listener: IPanelBridgeMessageHandler<TPayload>): () => void;

    /**
     * @description 释放当前桥接客户端持有的所有订阅。
     * @returns Promise 在资源释放后完成
     */
    dispose(): Promise<void>;
}


