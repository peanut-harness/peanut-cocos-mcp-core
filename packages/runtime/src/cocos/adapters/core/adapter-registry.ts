import type { IAdapterProfile, ICreatorAdapter } from './creator-adapter.js';

/**
 * @description Runtime 适配器注册中心，负责保存和解析当前可用适配器。
 */
export class AdapterRegistry {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _adapters: ICreatorAdapter[] = [];

    /**
     * @description 注册一个新的 Creator 版本适配器；同 id 的适配器会被覆盖。
     * @param adapter 要注册的适配器实例
     * @returns 当前注册中心实例，便于链式注册
     */
    public register(adapter: ICreatorAdapter): AdapterRegistry {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ nextAdapters = this._adapters.filter((item) => {
            return item.id !== adapter.id;
        });
        nextAdapters.push(adapter);
        this._adapters.length = 0;
        this._adapters.push(...nextAdapters);
        return this;
    }

    /**
     * @description 返回当前所有已注册适配器。
     * @returns 已注册适配器的只读列表
     */
    public list(): readonly ICreatorAdapter[] {
        return this._adapters;
    }

    /**
     * @description 为指定 Creator 版本选择首个可用适配器。
     * @param creatorVersion Cocos Creator 版本字符串
     * @returns 命中时返回适配器，否则返回 `null`
     */
    public resolve(creatorVersion: string): ICreatorAdapter | null {
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ adapter of this._adapters) {
            if (adapter.supports(creatorVersion)) {
                return adapter;
            }
        }
        return null;
    }

    /**
     * @description 返回指定版本下的适配器诊断快照。
     * @param creatorVersion Cocos Creator 版本字符串
     * @returns 命中时返回适配器诊断，否则返回 `null`
     */
    public getActiveProfile(creatorVersion: string): IAdapterProfile | null {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ adapter = this.resolve(creatorVersion);
        if (adapter == null) {
            return null;
        }
        return adapter.getProfile();
    }
}
