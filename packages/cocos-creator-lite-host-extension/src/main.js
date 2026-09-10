'use strict';

const { CpmPackageStore } = require('./cpm-package-store');
const { PluginServiceRegistry } = require('./plugin-service-registry');
const { SystemProtectedKeyStore } = require('./system-protected-key-store');

const CORE_PLUGIN_ID = 'peanut.pod-lite';
const PRO_PLUGIN_ID = 'peanut.cocos-mcp-pro';

let coreModule = null;
let proModule = null;
let toolHandlers = new Map();
const serviceRegistry = new PluginServiceRegistry();
let protectedKeyStore = null;
let hostStatus = createStoppedStatus();

function getEditor() {
    return globalThis.Editor;
}

function requireProjectPath() {
    const projectPath = getEditor()?.Project?.path;
    if (typeof projectPath !== 'string' || projectPath.trim().length === 0) {
        throw new Error('peanut_cocos_mcp_core_project_path_unavailable');
    }
    return projectPath;
}

function createRuntime() {
    const editor = getEditor();
    return Object.freeze({
        version: Object.freeze({ getCurrentVersion: () => editor?.App?.version ?? 'unknown' }),
        project: Object.freeze({
            getProjectName: async () => editor?.Project?.name ?? '',
            getProjectPath: async () => requireProjectPath(),
        }),
        selection: Object.freeze({
            getActiveIds: async () => {
                const selected = editor?.Selection?.getSelected?.('node');
                return Array.isArray(selected) ? selected.filter((value) => typeof value === 'string') : [];
            },
        }),
        message: Object.freeze({
            request: async (target, message, ...args) => {
                const request = editor?.Message?.request;
                if (typeof request !== 'function') {
                    throw new Error('peanut_cocos_mcp_core_message_unavailable');
                }
                return request(target, message, ...args);
            },
        }),
    });
}

function createRegistry() {
    return Object.freeze({
        register(definition, handler) {
            if (typeof definition?.name !== 'string' || typeof handler !== 'function') {
                throw new Error('peanut_cocos_mcp_core_tool_registration_invalid');
            }
            if (toolHandlers.has(definition.name)) {
                throw new Error(`peanut_cocos_mcp_core_tool_duplicate:${definition.name}`);
            }
            toolHandlers.set(definition.name, Object.freeze({ definition, handler }));
            return () => toolHandlers.delete(definition.name);
        },
    });
}

function loadVerifiedModule(verified, expectedPluginId) {
    const loaded = require(verified.mainPath);
    if (typeof loaded.createPluginModule !== 'function') {
        throw new Error(`peanut_cpm_entry_invalid:${expectedPluginId}`);
    }
    const pluginModule = loaded.createPluginModule();
    if (pluginModule?.manifest?.id !== expectedPluginId || pluginModule.manifest.version !== verified.manifest.version) {
        throw new Error(`peanut_cpm_module_manifest_mismatch:${expectedPluginId}`);
    }
    return pluginModule;
}

async function activateCore(packageStore) {
    const verified = packageStore.resolveActivePackage(CORE_PLUGIN_ID, true);
    toolHandlers = new Map();
    coreModule = loadVerifiedModule(verified, CORE_PLUGIN_ID);
    await coreModule.register?.({ logger: createLogger(CORE_PLUGIN_ID) });
    await coreModule.activate({
        runtime: createRuntime(),
        mcp: createRegistry(),
        logger: createLogger(CORE_PLUGIN_ID),
    });
    return verified.manifest.version;
}

async function activateOptionalPro(packageStore) {
    let verified;
    try {
        verified = packageStore.resolveActivePackage(PRO_PLUGIN_ID, false);
        if (verified === null) {
            return Object.freeze({ state: 'absent', version: null, error: null, services: [] });
        }
        proModule = loadVerifiedModule(verified, PRO_PLUGIN_ID);
        protectedKeyStore = new SystemProtectedKeyStore(requireProjectPath(), PRO_PLUGIN_ID, resolveSafeStorage);
        await proModule.register?.({ logger: createLogger(PRO_PLUGIN_ID) });
        await proModule.activate({
            plugin: Object.freeze({ id: PRO_PLUGIN_ID }),
            protectedKeys: protectedKeyStore,
            services: serviceRegistry.createApi(PRO_PLUGIN_ID),
        });
        return Object.freeze({
            state: 'active',
            version: verified.manifest.version,
            error: null,
            services: serviceRegistry.list(PRO_PLUGIN_ID),
        });
    } catch (error) {
        try {
            await proModule?.deactivate?.();
        } catch (deactivateError) {
            getEditor()?.warn?.(`[peanut-pod-lite] pro_deactivate_after_failure_failed:${normalizeError(deactivateError)}`);
        }
        proModule = null;
        serviceRegistry.revokeProvider(PRO_PLUGIN_ID);
        const message = normalizeError(error);
        getEditor()?.warn?.(`[peanut-pod-lite] optional_pro_failed:${message}`);
        return Object.freeze({ state: 'failed', version: verified?.manifest?.version ?? null, error: message, services: [] });
    }
}

async function load() {
    await deactivateModules();
    try {
        const packageStore = new CpmPackageStore(requireProjectPath());
        const coreVersion = await activateCore(packageStore);
        const pro = await activateOptionalPro(packageStore);
        hostStatus = Object.freeze({
            ready: true,
            error: null,
            coreVersion,
            tools: [...toolHandlers.keys()].sort(),
            pro,
        });
        getEditor()?.log?.(`[peanut-pod-lite] lite_host_ready:${hostStatus.tools.length}:pro_${pro.state}`);
    } catch (error) {
        await deactivateModules();
        hostStatus = Object.freeze({
            ready: false,
            error: normalizeError(error),
            coreVersion: null,
            tools: [],
            pro: Object.freeze({ state: 'not_checked', version: null, error: null, services: [] }),
        });
        getEditor()?.error?.(`[peanut-pod-lite] lite_host_failed:${hostStatus.error}`);
        throw error;
    }
}

async function deactivateModules() {
    const deactivationErrors = [];
    try {
        await proModule?.deactivate?.();
    } catch (error) {
        deactivationErrors.push(`pro:${normalizeError(error)}`);
    } finally {
        proModule = null;
        serviceRegistry.revokeProvider(PRO_PLUGIN_ID);
    }
    try {
        await coreModule?.deactivate?.();
    } catch (error) {
        deactivationErrors.push(`core:${normalizeError(error)}`);
    } finally {
        coreModule = null;
        toolHandlers = new Map();
        serviceRegistry.clear();
        protectedKeyStore?.clear();
        protectedKeyStore = null;
    }
    if (deactivationErrors.length > 0) {
        getEditor()?.warn?.(`[peanut-pod-lite] host_deactivate_failed:${deactivationErrors.join(',')}`);
    }
}

async function unload() {
    await deactivateModules();
    hostStatus = createStoppedStatus();
}

function createLogger(pluginId) {
    return Object.freeze({ info: (message) => getEditor()?.log?.(`[${pluginId}] ${message}`) });
}

function createStoppedStatus() {
    return Object.freeze({
        ready: false,
        error: null,
        coreVersion: null,
        tools: [],
        pro: Object.freeze({ state: 'not_checked', version: null, error: null, services: [] }),
    });
}

function normalizeError(error) {
    return error instanceof Error ? error.message : String(error);
}

function resolveSafeStorage() {
    const injected = getEditor()?.App?.safeStorage;
    if (injected !== undefined) {
        return injected;
    }
    try {
        return require('electron').safeStorage;
    } catch {
        throw new Error('peanut_cpm_system_protected_storage_unavailable');
    }
}

const methods = {
    queryStatus() {
        return hostStatus;
    },
    listTools() {
        return hostStatus.tools;
    },
    async invokeTool(name, input = {}) {
        if (!hostStatus.ready) {
            throw new Error('peanut_cocos_mcp_core_host_not_ready');
        }
        const entry = toolHandlers.get(name);
        if (entry === undefined) {
            throw new Error(`peanut_cocos_mcp_core_tool_unknown:${name}`);
        }
        return entry.handler(input);
    },
};

module.exports = { load, unload, methods };
