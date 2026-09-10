import type { ICreatorAdapter } from '../../adapters/core/creator-adapter.js';
import { AdapterRegistry } from '../../adapters/core/adapter-registry.js';
import { VersionResolver } from '../../version/version-resolver.js';

/**
 * @description Message 子域服务接口。
 */
export interface IMessageRuntimeService {
    /**
     * @description 发送单向消息到指定目标。
     * @param target 消息目标标识
     * @param message 消息名称
     * @param args 附加消息参数
     * @returns Promise 在消息发送完成后结束
     */
    send(target: string, message: string, ...args: unknown[]): Promise<void>;

    /**
     * @description 向指定目标发送请求并等待结果。
     * @param target 消息目标标识
     * @param message 消息名称
     * @param args 附加消息参数
     * @returns Promise 返回目标处理后的结果
     */
    request<TData = unknown>(target: string, message: string, ...args: unknown[]): Promise<TData>;

    /**
     * @description 广播消息到当前可达宿主。
     * @param message 消息名称
     * @param args 附加消息参数
     * @returns Promise 在广播结束后完成
     */
    broadcast(message: string, ...args: unknown[]): Promise<void>;
}

/**
 * @description Message 子域运行时服务。
 */
export class MessageRuntimeService implements IMessageRuntimeService {
    /** @description 默认 Editor.Message 请求超时（毫秒）。 */
    public static readonly DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _adapterRegistry: AdapterRegistry;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _versionResolver: VersionResolver;
    /** @description 单次 request 超时毫秒。 */
    private readonly _requestTimeoutMs: number;

    /**
     * @description 创建一个新的 Message 子域服务。
     * @param adapterRegistry 适配器注册中心
     * @param versionResolver Creator 版本解析器
     * @param requestTimeoutMs 可选请求超时；默认 15000
     */
    public constructor(
        adapterRegistry: AdapterRegistry,
        versionResolver: VersionResolver,
        requestTimeoutMs: number = MessageRuntimeService.DEFAULT_REQUEST_TIMEOUT_MS,
    ) {
        this._adapterRegistry = adapterRegistry;
        this._versionResolver = versionResolver;
        this._requestTimeoutMs = Math.max(1, requestTimeoutMs);
    }

    /**
     * @description 发送单向消息到指定目标。
     * @param target 消息目标标识
     * @param message 消息名称
     * @param args 附加消息参数
     * @returns Promise 在消息发送完成后结束
     */
    public async send(target: string, message: string, ...args: unknown[]): Promise<void> {
        await this._withTimeout(
            this._getActiveAdapter().createMessageBridge().send(target, message, ...args),
            `${target}.${message}`,
        );
    }

    /**
     * @description 向指定目标发送请求并等待结果。
     * @param target 消息目标标识
     * @param message 消息名称
     * @param args 附加消息参数
     * @returns Promise 返回目标处理后的结果
     */
    public async request<TData = unknown>(target: string, message: string, ...args: unknown[]): Promise<TData> {
        return this._withTimeout(
            this._getActiveAdapter().createMessageBridge().request<TData>(target, message, ...args),
            `${target}.${message}`,
        );
    }

    /**
     * @description 广播消息到当前可达宿主。
     * @param message 消息名称
     * @param args 附加消息参数
     * @returns Promise 在广播结束后完成
     */
    public async broadcast(message: string, ...args: unknown[]): Promise<void> {
        await this._withTimeout(
            this._getActiveAdapter().createMessageBridge().broadcast(message, ...args),
            `broadcast.${message}`,
        );
    }

    /**
     * @description 为 Promise 附加超时。
     * @param request 原始请求。
     * @param label 超时标签。
     * @returns 结果。
     */
    private _withTimeout<T>(request: Promise<T>, label: string): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Editor request timed out after ${this._requestTimeoutMs}ms: ${label}`));
            }, this._requestTimeoutMs);
            request.then(
                (value) => {
                    clearTimeout(timer);
                    resolve(value);
                },
                (error: unknown) => {
                    clearTimeout(timer);
                    reject(error);
                },
            );
        });
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _getActiveAdapter(): ICreatorAdapter {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ creatorVersion = this._versionResolver.getCurrentVersion().raw;
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ adapter = this._adapterRegistry.resolve(creatorVersion);
        if (adapter == null) {
            throw new Error(`No Creator adapter registered for version "${creatorVersion}".`);
        }
        return adapter;
    }
}


