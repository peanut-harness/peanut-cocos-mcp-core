'use strict';

/**
 * Keeps process-local plugin services and injects the caller identity from each plugin context.
 */
class PluginServiceRegistry {
    constructor() {
        this.providers = new Map();
    }

    createApi(pluginId) {
        return Object.freeze({
            register: (serviceId, handler) => this.register(pluginId, serviceId, handler),
            request: (providerPluginId, serviceId, request) => this.request(pluginId, providerPluginId, serviceId, request),
        });
    }

    register(providerPluginId, serviceId, handler) {
        if (typeof serviceId !== 'string' || serviceId.length === 0 || typeof handler !== 'function') {
            throw new Error('peanut_cpm_service_registration_invalid');
        }
        const services = this.providers.get(providerPluginId) ?? new Map();
        if (services.has(serviceId)) {
            throw new Error(`peanut_cpm_service_duplicate:${providerPluginId}:${serviceId}`);
        }
        services.set(serviceId, handler);
        this.providers.set(providerPluginId, services);
        return () => {
            if (this.providers.get(providerPluginId)?.get(serviceId) !== handler) {
                return;
            }
            services.delete(serviceId);
            if (services.size === 0) {
                this.providers.delete(providerPluginId);
            }
        };
    }

    async request(callerPluginId, providerPluginId, serviceId, request) {
        const handler = this.providers.get(providerPluginId)?.get(serviceId);
        if (handler === undefined) {
            throw new Error(`peanut_cpm_service_unavailable:${providerPluginId}:${serviceId}`);
        }
        return handler(callerPluginId, request);
    }

    revokeProvider(pluginId) {
        this.providers.delete(pluginId);
    }

    list(pluginId) {
        return [...(this.providers.get(pluginId)?.keys() ?? [])].sort();
    }

    clear() {
        this.providers.clear();
    }
}

module.exports = { PluginServiceRegistry };
