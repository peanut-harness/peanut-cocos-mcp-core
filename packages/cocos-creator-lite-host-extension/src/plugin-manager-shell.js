'use strict';

/**
 * Minimal Cocos Plugin Manager shell for Lite host.
 * Reuses peanut-plugin-panel / plugin-core (same stack as peanut-agents host),
 * without SnowB host slots or contribution codegen.
 */

const { PluginPanelActivator } = require('peanut-plugin-panel');

const EXTENSION_NAME = 'peanut-pod-lite-host';
const BUILTIN_PLUGIN_MANAGER_PANEL_ID = 'builtin.plugin-manager.panel';

const pluginPanelActivator = new PluginPanelActivator({
    sceneScriptPackageName: EXTENSION_NAME,
});

let loaded = false;

async function ensureLoaded() {
    if (!loaded) {
        await pluginPanelActivator.load();
        loaded = true;
    }
}

function getEditor() {
    return globalThis.Editor;
}

function getPluginManagerPanelBridge(pluginId = BUILTIN_PLUGIN_MANAGER_PANEL_ID, panelId = BUILTIN_PLUGIN_MANAGER_PANEL_ID) {
    const pluginManager = pluginPanelActivator.getEditorEntry().getPluginManager();
    if (pluginManager == null) {
        throw new Error('plugin_manager_kernel_unavailable');
    }
    return pluginManager.createPanelBridgeClient(pluginId, panelId);
}

function isRecord(value) {
    return typeof value === 'object' && value != null && !Array.isArray(value);
}

function isPanelBridgeRequest(value) {
    return (
        isRecord(value) &&
        typeof value.id === 'string' &&
        value.id.length > 0 &&
        typeof value.event === 'string' &&
        value.event.length > 0 &&
        typeof value.expectsResponse === 'boolean' &&
        (value.payload == null || isRecord(value.payload))
    );
}

async function pickDirectory() {
    try {
        const electron = require('electron');
        const result = await electron.dialog.showOpenDialog({
            title: 'Select plugin package directory',
            properties: ['openDirectory', 'treatPackageAsDirectory'],
        });
        if (result?.canceled || !Array.isArray(result.filePaths) || result.filePaths.length === 0) {
            return null;
        }
        return result.filePaths[0];
    } catch {
        return null;
    }
}

const shellMethods = {
    async openPanel() {
        await ensureLoaded();
        await getEditor()?.Panel?.open?.(`${EXTENSION_NAME}.plugin-manager`);
    },
    async openPluginManagerPanel() {
        await shellMethods.openPanel();
    },
    async openPluginManagerSettingsPanel() {
        await ensureLoaded();
        await getEditor()?.Panel?.open?.(`${EXTENSION_NAME}.plugin-manager-settings`);
    },
    getCurrentLocale() {
        const locale = getEditor()?.I18n?.getLanguage?.();
        return typeof locale === 'string' && locale.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
    },
    async postPanelBridge(envelope) {
        await ensureLoaded();
        await getPluginManagerPanelBridge().postMessage(envelope);
    },
    async requestPanelBridge(request) {
        await ensureLoaded();
        if (!isPanelBridgeRequest(request)) {
            throw new Error('cocos_panel_bridge_request_invalid');
        }
        if (request.event === 'pluginManager.package.pickDirectory') {
            return {
                requestId: request.id,
                ok: true,
                payload: { packagePath: await pickDirectory() },
            };
        }
        if (request.event === 'pluginManager.kernel.reload') {
            await pluginPanelActivator.methods.reloadKernelNow?.();
            return {
                requestId: request.id,
                ok: true,
                payload: { accepted: true },
            };
        }
        return getPluginManagerPanelBridge().request(request);
    },
};

module.exports = {
    EXTENSION_NAME,
    async loadPluginManagerShell() {
        // Do not activateInstalledPackages here: peanut.pod-lite is loaded by the
        // CPM host path (activateCore). Plugin Manager package activation expects
        // legacy scoped MCP capability names and conflicts with the Lite catalog.
        await ensureLoaded();
    },
    async unloadPluginManagerShell() {
        if (!loaded) {
            return;
        }
        await pluginPanelActivator.unload();
        loaded = false;
    },
    getPluginManagerMethods() {
        return {
            ...pluginPanelActivator.methods,
            ...shellMethods,
        };
    },
};
