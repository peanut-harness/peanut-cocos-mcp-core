/**
 * @description Creator `Editor.Message` 真实消息桥接所需的最小接口。
 */
interface ICocosEditorMessageApi {
    /**
     * @description 发送消息且不等待结果。
     * @param target 消息目标
     * @param message 消息名
     * @param args 消息参数
     * @returns 无返回值
     */
    send?(target: string, message: string, ...args: unknown[]): void;

    /**
     * @description 请求消息并等待结果。
     * @param target 消息目标
     * @param message 消息名
     * @param args 消息参数
     * @returns 请求结果
     */
    request?(target: string, message: string, ...args: unknown[]): Promise<unknown>;

    /**
     * @description 广播消息。
     * @param message 消息名
     * @param args 消息参数
     * @returns 无返回值
     */
    broadcast?(message: string, ...args: unknown[]): void;
}

/**
 * @description 可能提供 Creator Message API 的宿主全局对象。
 */
export interface IEditorApiMessageHostGlobal extends Record<string, unknown> {
    /**
     * @description Cocos Creator 主进程全局 API。
     */
    readonly Editor?: {
        /**
         * @description 进程间消息 API。
         */
        readonly Message?: ICocosEditorMessageApi;
    };
}

/**
 * @description 通过 Creator `Editor.Message` 转发插件消息，供多个 3.x 阶段共享。
 */
export class EditorApiHostMessageBridgeProvider {
    /**
     * @description Creator 主进程全局对象。
     */
    private readonly _hostGlobal: IEditorApiMessageHostGlobal;

    /**
     * @description 创建真实 Message provider。
     * @param hostGlobal 可选宿主全局；默认 `globalThis`
     */
    public constructor(hostGlobal?: IEditorApiMessageHostGlobal) {
        this._hostGlobal = hostGlobal ?? (globalThis as IEditorApiMessageHostGlobal);
    }

    /**
     * @description 判断当前宿主是否暴露可用的 Message.request。
     * @returns 可用时返回 `true`
     */
    public isAvailable(): boolean {
        return typeof this._hostGlobal.Editor?.Message?.request === 'function';
    }

    /**
     * @description 发送消息，无 send 时降级为 request 并忽略结果。
     * @param target 消息目标
     * @param message 消息名
     * @param args 消息参数
     * @returns 无返回值
     */
    public async send(target: string, message: string, ...args: unknown[]): Promise<void> {
        const messageApi = this._hostGlobal.Editor?.Message;
        if (typeof messageApi?.send === 'function') {
            messageApi.send(target, message, ...args);
            return;
        }
        if (typeof messageApi?.request !== 'function') {
            throw new Error('cocos_editor_message_api_unavailable');
        }
        await messageApi.request(target, message, ...args);
    }

    /**
     * @description 请求消息并返回结果。
     * @param target 消息目标
     * @param message 消息名
     * @param args 消息参数
     * @returns 请求结果
     */
    public async request<TData = unknown>(target: string, message: string, ...args: unknown[]): Promise<TData> {
        const request = this._hostGlobal.Editor?.Message?.request;
        if (typeof request !== 'function') {
            throw new Error('cocos_editor_message_api_unavailable');
        }
        return (await request(target, message, ...args)) as TData;
    }

    /**
     * @description 广播消息，无 broadcast 时尽力通过 send 转发且保持兼容性。
     * @param message 消息名
     * @param args 消息参数
     * @returns 无返回值
     */
    public async broadcast(message: string, ...args: unknown[]): Promise<void> {
        const messageApi = this._hostGlobal.Editor?.Message;
        if (typeof messageApi?.broadcast === 'function') {
            messageApi.broadcast(message, ...args);
            return;
        }
        if (typeof messageApi?.send === 'function') {
            messageApi.send('broadcast', message, ...args);
        }
    }
}
