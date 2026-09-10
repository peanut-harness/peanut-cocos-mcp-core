import type { PluginDeactivateReason } from 'peanut-contracts';

import { PluginRegistry } from '../registry/plugin-registry.js';
import type { IPluginActivateContext, IPluginModule, IPluginRegisterContext } from '../shared/plugin-manager-contracts.js';

/**
 * @description 插件装载器，负责挂载模块实例并执行 register / activate / deactivate / dispose 生命周期。
 */
export class PluginLoader {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginRegistry: PluginRegistry;

    /**
     * @description 创建一个新的插件装载器。
     * @param pluginRegistry 插件注册中心
     */
    public constructor(pluginRegistry: PluginRegistry) {
        this._pluginRegistry = pluginRegistry;
    }

    /**
     * @description 绑定指定插件的模块实例，并将状态更新为 `loaded`。
     * @param pluginId 插件标识
     * @param pluginModule 插件模块实例
     * @returns 成功绑定时返回 `true`
     */
    public load(pluginId: string, pluginModule: IPluginModule): boolean {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ attached = this._pluginRegistry.attachModule(pluginId, pluginModule);
        if (!attached) {
            return false;
        }
        this._pluginRegistry.updateState(pluginId, 'loaded');
        return true;
    }

    /**
     * @description 执行指定插件的 register 生命周期。
     * @param pluginId 插件标识
     * @param context 插件注册阶段上下文
     * @returns Promise 在注册结束后完成
     */
    public async register(pluginId: string, context: IPluginRegisterContext): Promise<void> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginModule = this._requireModule(pluginId);
        try {
            await pluginModule.register(context);
            this._pluginRegistry.updateState(pluginId, 'registered');
        } catch (/* 捕获当前操作失败的异常信息，用于生成失败结果或保留诊断上下文。 */ error) {
            this._pluginRegistry.updateState(pluginId, 'failed');
            throw error;
        }
    }

    /**
     * @description 执行指定插件的 activate 生命周期。
     * @param pluginId 插件标识
     * @param context 插件激活阶段上下文
     * @returns Promise 在激活结束后完成
     */
    public async activate(pluginId: string, context: IPluginActivateContext): Promise<void> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginModule = this._requireModule(pluginId);
        try {
            await pluginModule.activate(context);
            this._pluginRegistry.updateState(pluginId, 'active');
        } catch (/* 捕获当前操作失败的异常信息，用于生成失败结果或保留诊断上下文。 */ error) {
            this._pluginRegistry.updateState(pluginId, 'failed');
            throw error;
        }
    }

    /**
     * @description 执行指定插件的 deactivate 生命周期。
     * @param pluginId 插件标识
     * @param reason 插件停用原因
     * @returns Promise 在停用结束后完成
     */
    public async deactivate(pluginId: string, reason: PluginDeactivateReason): Promise<void> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginModule = this._requireModule(pluginId);
        try {
            await pluginModule.deactivate(reason);
            this._pluginRegistry.updateState(pluginId, 'inactive');
        } catch (/* 捕获当前操作失败的异常信息，用于生成失败结果或保留诊断上下文。 */ error) {
            this._pluginRegistry.updateState(pluginId, 'failed');
            throw error;
        }
    }

    /**
     * @description 执行指定插件的 dispose 生命周期。
     * @param pluginId 插件标识
     * @returns Promise 在释放结束后完成
     */
    public async dispose(pluginId: string): Promise<void> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginModule = this._requireModule(pluginId);
        try {
            await pluginModule.dispose();
            this._pluginRegistry.updateState(pluginId, 'disposed');
        } catch (/* 捕获当前操作失败的异常信息，用于生成失败结果或保留诊断上下文。 */ error) {
            this._pluginRegistry.updateState(pluginId, 'failed');
            throw error;
        }
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _requireModule(pluginId: string): IPluginModule {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginModule = this._pluginRegistry.getModule(pluginId);
        if (pluginModule == null) {
            throw new Error(`Plugin module "${pluginId}" is not loaded.`);
        }
        return pluginModule;
    }
}
