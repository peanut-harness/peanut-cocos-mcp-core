/** @description 插件服务处理器；调用方标识始终由宿主注入，不能由请求伪造。 */
export type PluginServiceHandler = (callerPluginId: string, request: unknown) => Promise<unknown>;

/** @description 管理已激活插件公开的进程内服务。 */
export class PluginServiceRegistry {
    /** @description 按提供者插件和服务标识保存当前可调用服务。 */
    private readonly _services = new Map<string, Map<string, PluginServiceHandler>>();

    /** @description 注册服务并返回只移除本次注册的清理函数。 */
    public register(providerPluginId: string, serviceId: string, handler: PluginServiceHandler): () => void {
        const providerServices = this._services.get(providerPluginId) ?? new Map<string, PluginServiceHandler>();
        if (providerServices.has(serviceId)) {
            throw new Error(`Plugin service "${serviceId}" is already registered by "${providerPluginId}".`);
        }
        providerServices.set(serviceId, handler);
        this._services.set(providerPluginId, providerServices);
        return (): void => {
            const currentServices = this._services.get(providerPluginId);
            if (currentServices?.get(serviceId) !== handler) {
                return;
            }
            currentServices.delete(serviceId);
            if (currentServices.size === 0) {
                this._services.delete(providerPluginId);
            }
        };
    }

    /** @description 请求指定已激活插件服务。 */
    public async request(callerPluginId: string, providerPluginId: string, serviceId: string, request: unknown): Promise<unknown> {
        const handler = this._services.get(providerPluginId)?.get(serviceId);
        if (handler == null) {
            throw new Error(`Plugin service "${providerPluginId}/${serviceId}" is unavailable.`);
        }
        return handler(callerPluginId, request);
    }

    /** @description 撤销一个插件提供的全部服务。 */
    public revokeProvider(providerPluginId: string): void {
        this._services.delete(providerPluginId);
    }
}
