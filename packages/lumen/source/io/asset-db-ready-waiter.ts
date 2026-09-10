/**
 * @description 仅需 `asset-db` / `query-ready` 的最小 message 端口。
 */
export interface ILumenAssetDbReadyMessagePort {
    /**
     * @description 向宿主发送请求。
     * @param target 目标。
     * @param message 消息名。
     * @param args 参数。
     * @returns 宿主返回值。
     */
    request(target: string, message: string, ...args: unknown[]): Promise<unknown>;
}

/**
 * @description AssetDB ready 等待结果。
 */
export interface ILumenAssetDbReadyWaitResult {
    /** @description 等待结束时是否已 ready。 */
    readonly ready: boolean;
    /** @description 轮询次数。 */
    readonly polls: number;
    /** @description 实际等待毫秒。 */
    readonly waitedMs: number;
    /**
     * @description 宿主是否返回明确 boolean。
     * `unsupported` 表示非 boolean / 抛错（与旧宿主兼容，视为可继续）。
     */
    readonly status: 'ready' | 'timeout' | 'unsupported';
}

/**
 * @description 等待选项。
 */
export interface ILumenAssetDbReadyWaitOptions {
    /** @description 最长等待毫秒；默认 1500。 */
    readonly timeoutMs?: number;
    /** @description 轮询间隔毫秒；默认 40。 */
    readonly intervalMs?: number;
    /**
     * @description 超时是否抛错；默认 false（与历史 `_waitAssetDbReady` 行为一致）。
     */
    readonly throwOnTimeout?: boolean;
}

/**
 * @description 统一等待 Creator `asset-db` / `query-ready` 的公开契约。
 *
 * 供 lumen 导入/刷新与兄弟插件复用，避免各自 `sleep`。
 * 仅当宿主明确返回 `false` 时轮询；非 boolean 或抛错视为不支持并立即返回。
 */
export class LumenAssetDbReadyWaiter {
    /** @description 宿主 message 端口。 */
    private readonly _message: ILumenAssetDbReadyMessagePort;

    /**
     * @description 创建等待器。
     * @param message 可调用 `asset-db` 的 message 端口。
     */
    public constructor(message: ILumenAssetDbReadyMessagePort) {
        this._message = message;
    }

    /**
     * @description 轮询直至 ready、超时或不支持。
     * @param options 等待选项。
     * @returns 等待结果。
     */
    public async wait(options: ILumenAssetDbReadyWaitOptions = {}): Promise<ILumenAssetDbReadyWaitResult> {
        const timeoutMs = options.timeoutMs ?? 1500;
        const intervalMs = options.intervalMs ?? 40;
        const throwOnTimeout = options.throwOnTimeout === true;
        const startedAt = Date.now();
        const deadline = startedAt + timeoutMs;
        let polls = 0;
        while (Date.now() < deadline) {
            polls += 1;
            try {
                const ready = await this._message.request('asset-db', 'query-ready');
                if (ready === true) {
                    return {
                        ready: true,
                        polls,
                        waitedMs: Date.now() - startedAt,
                        status: 'ready',
                    };
                }
                if (ready !== false) {
                    return {
                        ready: true,
                        polls,
                        waitedMs: Date.now() - startedAt,
                        status: 'unsupported',
                    };
                }
            } catch {
                return {
                    ready: true,
                    polls,
                    waitedMs: Date.now() - startedAt,
                    status: 'unsupported',
                };
            }
            await new Promise<void>((resolve) => {
                setTimeout(resolve, intervalMs);
            });
        }
        if (throwOnTimeout) {
            throw new Error(`lumen_asset_db_ready_timeout:${timeoutMs}`);
        }
        return {
            ready: false,
            polls,
            waitedMs: Date.now() - startedAt,
            status: 'timeout',
        };
    }
}
