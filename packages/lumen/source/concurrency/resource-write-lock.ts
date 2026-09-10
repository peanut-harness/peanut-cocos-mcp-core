/**
 * @description 按资源键串行化 lumen 磁盘写，支持高并发下同一 prefab/scene 的 FIFO 排队。
 */
export class LumenResourceWriteLock {
    /** @description 进程内共享实例（MCP 网关 / router 复用）。 */
    private static _shared: LumenResourceWriteLock | null = null;

    /** @description 每个资源键的等待队列与是否已有持有者。 */
    private readonly _queues = new Map<string, Array<() => void>>();
    /** @description 当前持锁的资源键集合。 */
    private readonly _held = new Set<string>();

    /**
     * @description 返回进程内共享写锁协调器。
     * @returns 共享实例。
     */
    public static shared(): LumenResourceWriteLock {
        if (LumenResourceWriteLock._shared == null) {
            LumenResourceWriteLock._shared = new LumenResourceWriteLock();
        }
        return LumenResourceWriteLock._shared;
    }

    /**
     * @description 测试专用：重置共享实例。
     * @returns 无返回值。
     */
    public static resetSharedForTests(): void {
        LumenResourceWriteLock._shared = null;
    }

    /**
     * @description 在单资源键上独占执行异步任务；并发调用按 FIFO 排队。
     * @param lockKey 规范化资源键（如 `assets/ui/Foo.prefab`）。
     * @param worker 受保护任务。
     * @returns worker 结果。
     */
    public async runExclusive<T>(lockKey: string, worker: () => Promise<T>): Promise<T> {
        const normalized = normalizeResourceLockKey(lockKey);
        if (normalized.length === 0) {
            return worker();
        }
        await this._acquire(normalized);
        try {
            return await worker();
        } finally {
            this._release(normalized);
        }
    }

    /**
     * @description 按字典序依次获取多把资源锁后执行 worker，避免 commit/批写死锁。
     * @param lockKeys 资源键列表。
     * @param worker 受保护任务。
     * @returns worker 结果。
     */
    public async runExclusiveMany<T>(lockKeys: readonly string[], worker: () => Promise<T>): Promise<T> {
        const ordered = [...new Set(lockKeys.map((key) => normalizeResourceLockKey(key)).filter((key) => key.length > 0))].sort();
        if (ordered.length === 0) {
            return worker();
        }
        return this._runExclusiveManyOrdered(ordered, 0, worker);
    }

    /**
     * @description 递归按序加锁。
     * @param keys 已排序键。
     * @param index 当前下标。
     * @param worker 最内层任务。
     * @returns worker 结果。
     */
    private async _runExclusiveManyOrdered<T>(
        keys: readonly string[],
        index: number,
        worker: () => Promise<T>,
    ): Promise<T> {
        if (index >= keys.length) {
            return worker();
        }
        const key = keys[index];
        if (key == null) {
            return worker();
        }
        return this.runExclusive(key, () => this._runExclusiveManyOrdered(keys, index + 1, worker));
    }

    /**
     * @description 等待并获取资源锁。
     * @param lockKey 已规范化键。
     * @returns 无返回值。
     */
    private async _acquire(lockKey: string): Promise<void> {
        if (!this._held.has(lockKey)) {
            this._held.add(lockKey);
            return;
        }
        await new Promise<void>((resolve) => {
            const queue = this._queues.get(lockKey) ?? [];
            queue.push(resolve);
            this._queues.set(lockKey, queue);
        });
    }

    /**
     * @description 释放资源锁并唤醒下一个等待者。
     * @param lockKey 已规范化键。
     * @returns 无返回值。
     */
    private _release(lockKey: string): void {
        const queue = this._queues.get(lockKey);
        const next = queue?.shift();
        if (next != null) {
            next();
            if (queue != null && queue.length === 0) {
                this._queues.delete(lockKey);
            }
            return;
        }
        this._held.delete(lockKey);
        this._queues.delete(lockKey);
    }
}

/**
 * @description 规范化 MCP/lumen 资源锁键。
 * @param value 原始路径或 db 路径。
 * @returns 小写 POSIX 相对路径。
 * @oopException 纯字符串规范化，无对象归属。
 */
export function normalizeResourceLockKey(value: string): string {
    return value
        .trim()
        .replace(/\\/gu, '/')
        .replace(/^db:\/\//iu, '')
        .replace(/^\/+/u, '')
        .toLowerCase();
}

/**
 * @description 规范化资源父目录锁键（AssetDB refresh / import 与 commit 共用）。
 * @param value 文件或目录相对/db 路径。
 * @returns `dir:assets/...` 形式键；空输入返回空串。
 * @oopException 纯字符串规范化，无对象归属。
 */
export function normalizeResourceDirectoryLockKey(value: string): string {
    const normalized = normalizeResourceLockKey(value);
    if (normalized.length === 0) {
        return '';
    }
    const slash = normalized.lastIndexOf('/');
    const baseName = slash >= 0 ? normalized.slice(slash + 1) : normalized;
    const dirPath = baseName.includes('.') ? (slash >= 0 ? normalized.slice(0, slash) : 'assets') : normalized;
    return `dir:${dirPath.length > 0 ? dirPath : 'assets'}`;
}
