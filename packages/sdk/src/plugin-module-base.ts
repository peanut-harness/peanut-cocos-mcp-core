import type { IPluginManifest, PluginDeactivateReason } from '@peanut/pod-protocol';

import type { IPluginActivateContext, IPluginModule, IPluginRegisterContext } from './plugin-module-contracts.js';

/**
 * @description 业务插件模块基类，提供空生命周期实现；作者只需覆盖实际使用的钩子。
 */
export abstract class PluginModuleBase implements IPluginModule {
    /**
     * @description 插件运行时清单，供宿主校验权限、入口和 contribution。
     */
    public abstract readonly manifest: IPluginManifest;

    /**
     * @description 默认空注册钩子。
     * @param _context 插件注册阶段上下文
     * @returns Promise 在注册完成后结束
     */
    public async register(_context: IPluginRegisterContext): Promise<void> {}

    /**
     * @description 默认空激活钩子。
     * @param _context 插件激活阶段上下文
     * @returns Promise 在激活完成后结束
     */
    public async activate(_context: IPluginActivateContext): Promise<void> {}

    /**
     * @description 默认空停用钩子。
     * @param _reason 插件停用原因
     * @returns Promise 在停用完成后结束
     */
    public async deactivate(_reason: PluginDeactivateReason): Promise<void> {}

    /**
     * @description 默认空释放钩子。
     * @returns Promise 在释放完成后结束
     */
    public async dispose(): Promise<void> {}
}
