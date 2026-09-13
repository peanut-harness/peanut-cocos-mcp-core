/**
 * @description 将短时间窗内的多次 AssetDB refresh 合并为一次，降低大批量 lumen.commit / writeText 打爆 Assets 面板的概率。
 */
export class LumenAssetDbRefreshCoalescer {
    /** @description 合并等待毫秒；结束后合并路径并 flush。 */
    private readonly _windowMs: number;
    /** @description 按工程根分组的待合并路径。 */
    private readonly _pendingByProject = new Map<string, Set<string>>();
    /** @description 按工程根分组的等待方。 */
    private readonly _waitersByProject = new Map<
        string,
        Array<{
            resolve: (result: unknown) => void;
            reject: (error: unknown) => void;
            /** @description 空 paths 表示刷整库 db://assets。 */
            readonly refreshAll: boolean;
        }>
    >();
    /** @description 按工程根的 debounce 定时器。 */
    private readonly _timers = new Map<string, ReturnType<typeof setTimeout>>();
    /** @description 实际执行刷新（已串行化的底层适配器）。 */
    private readonly _flush: (
        projectRoot: string,
        relativePaths: readonly string[],
    ) => Promise<unknown>;

    /**
     * @description 创建合并器。
     * @param flush 底层单次刷新。
     * @param windowMs 合并窗（默认 350ms）。
     */
    public constructor(
        flush: (projectRoot: string, relativePaths: readonly string[]) => Promise<unknown>,
        windowMs = 350,
    ) {
        this._flush = flush;
        this._windowMs = Math.max(50, windowMs);
    }

    /**
     * @description 调度一次刷新；同工程窗内多次调用合并路径，所有等待方拿到同一次结果。
     * @param projectRoot 工程根。
     * @param relativePaths 相对路径；空数组表示刷整库。
     * @returns 合并后的刷新结果。
     */
    public schedule(projectRoot: string, relativePaths: readonly string[]): Promise<unknown> {
        const key = projectRoot.trim();
        if (key.length === 0) {
            return this._flush(projectRoot, relativePaths);
        }
        const refreshAll = relativePaths.length === 0;
        if (!refreshAll) {
            const pending = this._pendingByProject.get(key) ?? new Set<string>();
            for (const pathValue of relativePaths) {
                const normalized = pathValue.replace(/\\/gu, '/').replace(/^\/+/u, '').trim();
                if (normalized.length > 0) {
                    pending.add(normalized);
                }
            }
            this._pendingByProject.set(key, pending);
        }
        return new Promise<unknown>((resolve, reject) => {
            const waiters = this._waitersByProject.get(key) ?? [];
            waiters.push({ resolve, reject, refreshAll });
            this._waitersByProject.set(key, waiters);
            const existing = this._timers.get(key);
            if (existing != null) {
                clearTimeout(existing);
            }
            this._timers.set(
                key,
                setTimeout(() => {
                    void this._flushProject(key);
                }, this._windowMs),
            );
        });
    }

    /**
     * @description 立即刷掉指定工程的待合并刷新（测试/关停用）。
     * @param projectRoot 工程根。
     * @returns flush Promise。
     */
    public async flushNow(projectRoot: string): Promise<void> {
        const key = projectRoot.trim();
        const timer = this._timers.get(key);
        if (timer != null) {
            clearTimeout(timer);
            this._timers.delete(key);
        }
        await this._flushProject(key);
    }

    /**
     * @description 执行一次合并 flush。
     * @param projectRoot 工程根键。
     * @returns 无返回值。
     */
    private async _flushProject(projectRoot: string): Promise<void> {
        this._timers.delete(projectRoot);
        const waiters = this._waitersByProject.get(projectRoot) ?? [];
        this._waitersByProject.delete(projectRoot);
        const pending = this._pendingByProject.get(projectRoot) ?? new Set<string>();
        this._pendingByProject.delete(projectRoot);
        if (waiters.length === 0) {
            return;
        }
        const refreshAll = waiters.some((waiter) => waiter.refreshAll);
        const paths = refreshAll ? [] : [...pending].sort();
        try {
            const result = await this._flush(projectRoot, paths);
            for (const waiter of waiters) {
                waiter.resolve(result);
            }
        } catch (error: unknown) {
            for (const waiter of waiters) {
                waiter.reject(error);
            }
        }
    }
}
