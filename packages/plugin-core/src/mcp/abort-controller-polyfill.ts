/**
 * @description Creator 3.8.x 部分 Electron 主进程未暴露 AbortController；Hub 请求取消依赖它。
 * 在缺省时安装最小可用 polyfill，避免 `_handleRequest` 抛错后挂死连接。
 */

/**
 * @description 若 `globalThis.AbortController` 缺失则挂上 polyfill。
 * @returns 无返回值
 */
export function ensureAbortControllerPolyfill(): void {
    const host = globalThis as typeof globalThis & {
        AbortController?: typeof AbortController;
        AbortSignal?: typeof AbortSignal;
    };
    if (typeof host.AbortController === 'function') {
        return;
    }

    class PolyfillAbortSignal {
        /** @description 是否已 abort。 */
        public aborted = false;

        /** @description abort 原因。 */
        public reason: unknown;

        /** @description 监听器。 */
        private readonly _listeners = new Set<() => void>();

        /**
         * @description 注册 abort 监听。
         * @param type 事件名
         * @param listener 回调
         * @returns 无返回值
         */
        public addEventListener(type: string, listener: () => void): void {
            if (type === 'abort') {
                this._listeners.add(listener);
            }
        }

        /**
         * @description 移除 abort 监听。
         * @param type 事件名
         * @param listener 回调
         * @returns 无返回值
         */
        public removeEventListener(type: string, listener: () => void): void {
            if (type === 'abort') {
                this._listeners.delete(listener);
            }
        }

        /**
         * @description 触发 abort。
         * @param reason 原因
         * @returns 无返回值
         */
        public _abort(reason?: unknown): void {
            if (this.aborted) {
                return;
            }
            this.aborted = true;
            this.reason = reason;
            for (const listener of [...this._listeners]) {
                listener();
            }
        }
    }

    class PolyfillAbortController {
        /** @description 关联 signal。 */
        public readonly signal = new PolyfillAbortSignal();

        /**
         * @description 取消。
         * @param reason 原因
         * @returns 无返回值
         */
        public abort(reason?: unknown): void {
            this.signal._abort(reason);
        }
    }

    host.AbortController = PolyfillAbortController as unknown as typeof AbortController;
    host.AbortSignal = PolyfillAbortSignal as unknown as typeof AbortSignal;
}
