import type { IPluginStorageApi } from './plugin-manager-contracts.js';

/**
 * @description 插件私有内存存储实现，用于骨架期保存插件级状态。
 */
export class PluginStorage implements IPluginStorageApi {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _storage = new Map<string, unknown>();

    /**
     * @description 读取一个插件私有存储值。
     * @param key 存储键
     * @returns Promise 返回已存储值；未命中时返回 `null`
     */
    public async get<TValue = unknown>(key: string): Promise<TValue | null> {
        if (!this._storage.has(key)) {
            return null;
        }
        return this._storage.get(key) as TValue;
    }

    /**
     * @description 写入一个插件私有存储值。
     * @param key 存储键
     * @param value 要存储的值
     * @returns Promise 在写入结束后完成
     */
    public async set<TValue = unknown>(key: string, value: TValue): Promise<void> {
        this._storage.set(key, value);
    }

    /**
     * @description 删除一个插件私有存储值。
     * @param key 存储键
     * @returns Promise 在删除结束后完成
     */
    public async delete(key: string): Promise<void> {
        this._storage.delete(key);
    }

    /**
     * @description 生成当前插件私有存储的快照副本，用于升级失败时回滚状态。
     * @returns 当前存储条目的只读快照
     */
    public snapshot(): ReadonlyMap<string, unknown> {
        return new Map<string, unknown>(this._storage);
    }

    /**
     * @description 使用给定快照覆盖当前插件私有存储。
     * @param snapshot 要恢复的存储快照
     * @returns 无返回值
     */
    public restore(snapshot: ReadonlyMap<string, unknown>): void {
        this._storage.clear();
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ [key, value] of snapshot.entries()) {
            this._storage.set(key, value);
        }
    }
}
