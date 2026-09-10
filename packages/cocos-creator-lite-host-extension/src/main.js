'use strict';

const { mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

const { LiteAccountController, createSignedOutAccount } = require('./account-controller');
const { CpmPackageStore } = require('./cpm-package-store');
const { createLiteGrantedRuntime, createLiteReadRuntime } = require('./lite-granted-runtime');
const {
    getPluginManagerMethods,
    loadPluginManagerShell,
    unloadPluginManagerShell,
} = require('./plugin-manager-shell');
const { PluginServiceRegistry } = require('./plugin-service-registry');
const { listPremiumOffer } = require('./premium-offer-catalog');
const { SystemProtectedKeyStore } = require('./system-protected-key-store');

const CORE_PLUGIN_ID = 'peanut.pod-lite';
const PRO_PLUGIN_ID = 'peanut.cocos-mcp-pro';
const RUNTIME_DIR_NAME = 'runtime';

let coreModule = null;
let proModule = null;
let toolHandlers = new Map();
const serviceRegistry = new PluginServiceRegistry();
let protectedKeyStore = null;
let accountController = null;
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
    return createLiteReadRuntime();
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
    // Reuse peanut-agents EditorMcp gateways via grantedRuntime; Lite policy still
    // excludes paid ops. Pro stays optional through services.
    await coreModule.activate({
        runtime: createRuntime(),
        grantedRuntime: createLiteGrantedRuntime(),
        services: serviceRegistry.createApi(CORE_PLUGIN_ID),
        mcp: createRegistry(),
        logger: createLogger(CORE_PLUGIN_ID),
        connectionId: 'creator-local',
    });
    return verified.manifest.version;
}

async function deactivateOptionalPro() {
    try {
        await proModule?.deactivate?.();
    } catch (error) {
        getEditor()?.warn?.(`[peanut-pod-lite] pro_deactivate_failed:${normalizeError(error)}`);
    } finally {
        proModule = null;
        serviceRegistry.revokeProvider(PRO_PLUGIN_ID);
        protectedKeyStore?.clear();
        protectedKeyStore = null;
    }
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
        // Plugin Manager shell first — main Lite UI (same stack as peanut-agents host).
        await loadPluginManagerShell();
        const packageStore = new CpmPackageStore(requireProjectPath());
        const coreVersion = await activateCore(packageStore);
        const pro = await activateOptionalPro(packageStore);
        accountController = new LiteAccountController({
            projectPath: requireProjectPath(),
            safeStorageProvider: resolveSafeStorage,
        });
        let account = createSignedOutAccount();
        try {
            account = await accountController.restore(pro);
        } catch (error) {
            account = Object.freeze({
                ...createSignedOutAccount(),
                state: 'error',
                error: normalizeError(error),
            });
        }
        hostStatus = Object.freeze({
            ready: true,
            error: null,
            coreVersion,
            tools: [...toolHandlers.keys()].sort(),
            pro,
            account,
        });
        getEditor()?.log?.(`[peanut-pod-lite] lite_host_ready:${hostStatus.tools.length}:pro_${pro.state}:account_${account.state}`);
        writeHostStatusReport();
        await runStartupSmokeAndWriteReport();
    } catch (error) {
        await deactivateModules();
        try {
            await unloadPluginManagerShell();
        } catch {
            // ignore nested unload errors
        }
        hostStatus = Object.freeze({
            ready: false,
            error: normalizeError(error),
            coreVersion: null,
            tools: [],
            pro: Object.freeze({ state: 'not_checked', version: null, error: null, services: [] }),
            account: createSignedOutAccount(),
        });
        getEditor()?.error?.(`[peanut-pod-lite] lite_host_failed:${hostStatus.error}`);
        writeHostStatusReport();
        throw error;
    }
}

async function deactivateModules() {
    const deactivationErrors = [];
    try {
        await deactivateOptionalPro();
    } catch (error) {
        deactivationErrors.push(`pro:${normalizeError(error)}`);
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
        accountController = null;
    }
    if (deactivationErrors.length > 0) {
        getEditor()?.warn?.(`[peanut-pod-lite] host_deactivate_failed:${deactivationErrors.join(',')}`);
    }
}

async function unload() {
    await deactivateModules();
    try {
        await unloadPluginManagerShell();
    } catch (error) {
        getEditor()?.warn?.(`[peanut-pod-lite] plugin_manager_unload_failed:${normalizeError(error)}`);
    }
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
        account: createSignedOutAccount(),
    });
}

function normalizeError(error) {
    return error instanceof Error ? error.message : String(error);
}

function runtimeDirectory() {
    return join(requireProjectPath(), 'peanut-plugins', RUNTIME_DIR_NAME);
}

function writeJsonReport(fileName, value) {
    const directory = runtimeDirectory();
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, fileName), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeHostStatusReport() {
    try {
        writeJsonReport('host-status.json', {
            writtenAt: new Date().toISOString(),
            ready: hostStatus.ready,
            error: hostStatus.error,
            coreVersion: hostStatus.coreVersion,
            toolCount: hostStatus.tools.length,
            tools: hostStatus.tools,
            pro: hostStatus.pro,
            account: {
                state: hostStatus.account?.state ?? null,
                recommendedAction: hostStatus.account?.recommendedAction ?? null,
                error: hostStatus.account?.error ?? null,
            },
        });
    } catch (error) {
        getEditor()?.warn?.(`[peanut-pod-lite] host_status_report_failed:${normalizeError(error)}`);
    }
}

async function runStartupSmokeAndWriteReport() {
    const startedAt = new Date().toISOString();
    const results = [];
    // Reads only: writes stay fail-closed without an explicit local approval lease.
    const smokeTools = hostStatus.tools.filter((name) => toolHandlers.get(name)?.definition?.readOnly === true);
    for (const name of smokeTools) {
        const entry = toolHandlers.get(name);
        const item = { name, ok: false, error: null, resultType: null, preview: null };
        try {
            if (entry === undefined) {
                throw new Error('tool_handler_missing');
            }
            // Prefer empty input; skip tools that need required fields (they fail with schema errors).
            const result = await entry.handler({}, { connectionId: 'creator-local', resourceIds: [] });
            item.ok = true;
            item.resultType = result === null ? 'null' : Array.isArray(result) ? 'array' : typeof result;
            item.preview = previewSmokeValue(result);
        } catch (error) {
            const message = normalizeError(error);
            item.error = message;
            // Empty-input smoke: missing required fields are skips, not product failures.
            if (isExpectedEmptyInputRefusal(message)) {
                item.skipped = true;
            }
        }
        results.push(item);
    }
    const proChecks = await runProFailClosedSmoke();
    const failed = results.filter((item) => !item.ok && item.skipped !== true);
    const skipped = results.filter((item) => item.skipped === true);
    const report = {
        writtenAt: new Date().toISOString(),
        startedAt,
        ready: hostStatus.ready,
        toolCount: hostStatus.tools.length,
        gatewayWired: hostStatus.tools.length >= 83,
        passed: results.filter((item) => item.ok).length,
        failed: failed.length,
        skipped: skipped.length,
        results,
        proChecks,
        knownGaps: [
            hostStatus.tools.length < 83
                ? 'creator_host_does_not_inject_editor_mcp_gateway_yet_only_9_reads'
                : null,
        ].filter(Boolean),
    };
    try {
        writeJsonReport('smoke-results.json', report);
    } catch (error) {
        getEditor()?.warn?.(`[peanut-pod-lite] smoke_report_failed:${normalizeError(error)}`);
    }
    getEditor()?.log?.(
        `[peanut-pod-lite] startup_smoke:${report.passed}_passed:${report.failed}_failed:tools_${report.toolCount}`,
    );
}

function previewSmokeValue(value) {
    try {
        const text = JSON.stringify(value);
        if (typeof text !== 'string') {
            return String(value);
        }
        return text.length > 500 ? `${text.slice(0, 500)}…` : text;
    } catch {
        return String(value);
    }
}

function isExpectedEmptyInputRefusal(message) {
    return (
        /_required\b/u.test(message) ||
        /requires_/u.test(message) ||
        /schema_invalid/u.test(message) ||
        /must be/iu.test(message)
    );
}

async function runProFailClosedSmoke() {
    const checks = [];
    if (hostStatus.pro?.state !== 'active') {
        checks.push({
            name: 'pro.services.present',
            ok: false,
            error: `pro_state_${hostStatus.pro?.state ?? 'unknown'}`,
        });
        return checks;
    }
    const expected = [
        'mcp.admit',
        'mcp.snowb.bmfont.export',
        'mcp.preview.capture',
        'mcp.sdf.font.generate',
        'mcp.sdf.font.import',
        'mcp.ui-prefab.importDesign',
        'mcp.ui-prefab.generate',
        'mcp.asset-version-mover',
        'mcp.content-delivery',
    ];
    const missing = expected.filter((serviceId) => !hostStatus.pro.services.includes(serviceId));
    checks.push({
        name: 'pro.services.complete',
        ok: missing.length === 0,
        error: missing.length === 0 ? null : `missing:${missing.join(',')}`,
        preview: JSON.stringify(hostStatus.pro.services),
    });
    // Unauthorized Lite caller must not execute paid ops.
    try {
        await serviceRegistry.request(CORE_PLUGIN_ID, PRO_PLUGIN_ID, 'mcp.preview.capture', {
            capture: {},
            resourceIds: [],
            hasLocalApproval: false,
            signedPlan: null,
        });
        checks.push({ name: 'pro.preview.capture.refuse_non_editor_mcp_caller', ok: false, error: 'expected_refusal' });
    } catch (error) {
        checks.push({
            name: 'pro.preview.capture.refuse_non_editor_mcp_caller',
            ok: true,
            error: null,
            preview: normalizeError(error),
        });
    }
    // Even the entitled editor-mcp caller must refuse without a signed plan / local approval.
    try {
        await serviceRegistry.request('peanut.editor-mcp', PRO_PLUGIN_ID, 'mcp.preview.capture', {
            capture: {},
            resourceIds: ['db://assets/scene.scene'],
            hasLocalApproval: false,
            signedPlan: null,
        });
        checks.push({ name: 'pro.preview.capture.refuse_without_plan', ok: false, error: 'expected_refusal' });
    } catch (error) {
        checks.push({
            name: 'pro.preview.capture.refuse_without_plan',
            ok: true,
            error: null,
            preview: normalizeError(error),
        });
    }
    return checks;
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
    ...getPluginManagerMethods(),
    queryStatus() {
        return hostStatus;
    },
    listTools() {
        return hostStatus.tools;
    },
    queryPremiumOffer() {
        return accountController?.offer() ?? listPremiumOffer();
    },
    async setPodEndpoint(endpoint) {
        requireReadyAccount();
        accountController.setEndpoint(endpoint);
        hostStatus = withAccount(await accountController.restore(hostStatus.pro));
        return hostStatus.account;
    },
    async setAccessToken(token) {
        requireReadyAccount();
        hostStatus = withAccount(await accountController.setAccessToken(token, hostStatus.pro));
        return hostStatus.account;
    },
    clearAccount() {
        requireReadyAccount();
        hostStatus = withAccount(accountController.clear(hostStatus.pro));
        return hostStatus.account;
    },
    async querySubscription() {
        requireReadyAccount();
        hostStatus = withAccount(await accountController.refresh(hostStatus.pro));
        return hostStatus.account;
    },
    async startCheckout() {
        requireReadyAccount();
        const checkout = await accountController.startCheckout(hostStatus.pro);
        hostStatus = withAccount(accountController.status());
        return checkout;
    },
    async refreshPro() {
        if (!hostStatus.ready) {
            throw new Error('peanut_cocos_mcp_core_host_not_ready');
        }
        await deactivateOptionalPro();
        const pro = await activateOptionalPro(new CpmPackageStore(requireProjectPath()));
        const account = accountController?.withPro(pro) ?? createSignedOutAccount();
        hostStatus = Object.freeze({ ...hostStatus, pro, account });
        return hostStatus;
    },
    async openAccount() {
        await getEditor()?.Panel?.open?.('peanut-pod-lite-host.account');
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

function requireReadyAccount() {
    if (!hostStatus.ready || accountController == null) {
        throw new Error('peanut_cocos_mcp_core_host_not_ready');
    }
}

function withAccount(account) {
    return Object.freeze({ ...hostStatus, account });
}

module.exports = { load, unload, methods };
