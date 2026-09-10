/**
 * @description Creator 3.8 `Editor.Message` 真实消息桥接 provider。
 */
interface ICocosEditorMessageApi {
  /** @description 发送不等待。 */
  send?(target: string, message: string, ...args: unknown[]): void;
  /** @description 请求并等待返回。 */
  request?(
    target: string,
    message: string,
    ...args: unknown[]
  ): Promise<unknown>;
  /** @description 广播。 */
  broadcast?(message: string, ...args: unknown[]): void;
}

/**
 * @description 可能提供 Creator Message API 的宿主全局对象。
 */
export interface IEditorApiMessageHostGlobal extends Record<string, unknown> {
  /** @description Cocos Creator 主进程全局 API。 */
  readonly Editor?: {
    /** @description 进程间消息 API。 */
    readonly Message?: ICocosEditorMessageApi;
  };
}

/**
 * @description 通过 Creator `Editor.Message` 转发插件 message grant，避免内存 echo。
 */
export class EditorApiHostMessageBridgeProvider {
  /** @description Creator 主进程全局对象。 */
  private readonly _hostGlobal: IEditorApiMessageHostGlobal;

  /**
   * @description 创建真实 Message provider。
   * @param hostGlobal 可选宿主全局；默认 `globalThis`。
   */
  public constructor(hostGlobal?: IEditorApiMessageHostGlobal) {
    this._hostGlobal =
      hostGlobal ?? (globalThis as IEditorApiMessageHostGlobal);
  }

  /**
   * @description 当前宿主是否暴露可用的 Message.request。
   * @returns 可用时 true。
   */
  public isAvailable(): boolean {
    return typeof this._hostGlobal.Editor?.Message?.request === "function";
  }

  /**
   * @description 发送消息（尽量；无 send 时降级 request 并忽略结果）。
   * @param target 目标包。
   * @param message 消息名。
   * @param args 参数。
   * @returns Promise。
   */
  public async send(
    target: string,
    message: string,
    ...args: unknown[]
  ): Promise<void> {
    const api = this._hostGlobal.Editor?.Message;
    if (api == null) {
      throw new Error("cocos_editor_message_api_unavailable");
    }
    if (typeof api.send === "function") {
      api.send(target, message, ...args);
      return;
    }
    if (typeof api.request === "function") {
      await api.request(target, message, ...args);
      return;
    }
    throw new Error("cocos_editor_message_api_unavailable");
  }

  /**
   * @description 请求消息并返回结果。
   * @param target 目标包。
   * @param message 消息名。
   * @param args 参数。
   * @returns 宿主返回值。
   */
  public async request<TData = unknown>(
    target: string,
    message: string,
    ...args: unknown[]
  ): Promise<TData> {
    const request = this._hostGlobal.Editor?.Message?.request;
    if (request == null) {
      throw new Error("cocos_editor_message_api_unavailable");
    }
    return (await request(target, message, ...args)) as TData;
  }

  /**
   * @description 广播消息。
   * @param message 消息名。
   * @param args 参数。
   * @returns Promise。
   */
  public async broadcast(message: string, ...args: unknown[]): Promise<void> {
    const broadcast = this._hostGlobal.Editor?.Message?.broadcast;
    if (typeof broadcast === "function") {
      broadcast(message, ...args);
      return;
    }
    // 无 broadcast 时尽力用 send 到常见总线；失败不抛，保持与内存桥兼容。
    const send = this._hostGlobal.Editor?.Message?.send;
    if (typeof send === "function") {
      send("broadcast", message, ...args);
    }
  }
}
