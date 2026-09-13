import type { IPluginEventBus } from './plugin-manager-contracts.js';

type EventDiagnosticReporter = (error: unknown, context: Record<string, unknown>) => void;

/**
 * @description 进程内插件事件总线，用于同一插件上下文中的事件发布与订阅。
 */
export class PluginEventBus implements IPluginEventBus {
    private readonly _reporter?: EventDiagnosticReporter;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _listeners = new Map<string, Set<(payload?: Record<string, unknown>) => void | Promise<void>>>();

    /** @param reporter 插件事件异常诊断回调。 */
    public constructor(reporter?: EventDiagnosticReporter) { this._reporter = reporter; }

    /**
     * @description 发布一个插件域事件。
     * @param event 事件名称
     * @param payload 事件载荷
     * @returns Promise 在事件分发完成后结束
     */
    public async publish(event: string, payload?: Record<string, unknown>): Promise<void> {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ listeners = this._listeners.get(event);
        if (listeners == null) {
            return;
        }

        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ listener of listeners) {
            try {
                await listener(payload);
            } catch (error) {
                this._reporter?.(error, { event });
            }
        }
    }

    /**
     * @description 订阅一个插件域事件。
     * @param event 事件名称
     * @param listener 事件监听器
     * @returns 取消订阅函数
     */
    public subscribe(event: string, listener: (payload?: Record<string, unknown>) => void | Promise<void>): () => void {
        // 维护当前作用域内的去重集合，用于记录处理状态并避免重复操作。
        const /* 维护当前作用域内的去重集合，用于记录处理状态并避免重复操作。 */ listeners = this._listeners.get(event) ?? new Set<(payload?: Record<string, unknown>) => void | Promise<void>>();
        listeners.add(listener);
        this._listeners.set(event, listeners);

        return (): void => {
            // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
            const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ currentListeners = this._listeners.get(event);
            if (currentListeners == null) {
                return;
            }
            currentListeners.delete(listener);
            if (currentListeners.size === 0) {
                this._listeners.delete(event);
            }
        };
    }
}
