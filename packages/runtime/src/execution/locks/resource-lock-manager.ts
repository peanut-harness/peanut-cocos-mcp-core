/**
 * @description 资源锁管理器骨架，后续用于保护资源级串行提交。
 */
export class ResourceLockManager {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _locks = new Set<string>();

    /**
     * @description 申请一个资源锁。
     * @param lockKey 资源锁键
     * @returns 成功获取时返回 `true`
     */
    public acquire(lockKey: string): boolean {
        if (this._locks.has(lockKey)) {
            return false;
        }
        this._locks.add(lockKey);
        return true;
    }

    /**
     * @description 释放一个资源锁。
     * @param lockKey 资源锁键
     * @returns 成功释放时返回 `true`
     */
    public release(lockKey: string): boolean {
        return this._locks.delete(lockKey);
    }
}


