'use strict';

const { createHash } = require('crypto');
const { existsSync, readFileSync, realpathSync } = require('fs');
const { isAbsolute, join, relative, resolve } = require('path');

const CORE_PLUGIN_ID = 'peanut.pod-lite';
const CORE_MANIFEST_FILE = `${CORE_PLUGIN_ID}.manifest.json`;

let coreModule = null;
let toolHandlers = new Map();
let hostStatus = Object.freeze({ ready: false, error: null, tools: [] });

function getEditor() {
    return globalThis.Editor;
}

function requireProjectPath() {
    const projectPath = getEditor()?.Project?.path;
    if (typeof projectPath !== 'string' || projectPath.trim().length === 0) {
        throw new Error('peanut_cocos_mcp_core_project_path_unavailable');
    }
    return resolve(projectPath);
}

function locateInstalledCorePackage(projectPath) {
    const installedPath = join(projectPath, 'peanut-plugins', 'plugins', CORE_PLUGIN_ID, '0.1.0');
    if (!existsSync(installedPath)) {
        throw new Error(`peanut_cocos_mcp_core_package_missing:${installedPath}`);
    }
    return installedPath;
}

function verifyPackage(packagePath) {
    const manifestPath = join(packagePath, CORE_MANIFEST_FILE);
    if (!existsSync(manifestPath)) {
        throw new Error('peanut_cocos_mcp_core_manifest_missing');
    }
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (manifest.id !== CORE_PLUGIN_ID || typeof manifest.main !== 'string') {
        throw new Error('peanut_cocos_mcp_core_manifest_invalid');
    }
    const records = manifest.package?.files;
    if (!Array.isArray(records) || typeof manifest.package?.digest !== 'string') {
        throw new Error('peanut_cocos_mcp_core_integrity_missing');
    }
    for (const record of records) {
        if (typeof record?.path !== 'string' || typeof record?.digest !== 'string') {
            throw new Error('peanut_cocos_mcp_core_integrity_record_invalid');
        }
        const filePath = requirePackageFile(packagePath, record.path);
        const digest = createHash('sha256').update(readFileSync(filePath)).digest('hex');
        if (digest !== record.digest) {
            throw new Error(`peanut_cocos_mcp_core_integrity_file_mismatch:${record.path}`);
        }
    }
    const digest = createHash('sha256')
        .update(
            [...records]
                .sort((left, right) => left.path.localeCompare(right.path))
                .map((record) => `${record.path}:${record.digest}`)
                .join('\n'),
        )
        .digest('hex');
    if (digest !== manifest.package.digest) {
        throw new Error('peanut_cocos_mcp_core_integrity_digest_mismatch');
    }
    const mainPath = requirePackageFile(packagePath, manifest.main);
    if (!records.some((record) => resolve(packagePath, record.path) === resolve(packagePath, manifest.main))) {
        throw new Error('peanut_cocos_mcp_core_entry_not_integrity_checked');
    }
    return Object.freeze({ manifest, mainPath });
}

function requirePackageFile(packagePath, input) {
    if (typeof input !== 'string' || input.length === 0 || isAbsolute(input) || /^[A-Za-z]:/u.test(input)) {
        throw new Error('peanut_cocos_mcp_core_integrity_path_invalid');
    }
    const root = realpathSync(packagePath);
    const filePath = resolve(root, input);
    const child = relative(root, filePath);
    if (!child || isAbsolute(child) || child === '..' || child.startsWith('../') || child.startsWith('..\\') || !existsSync(filePath)) {
        throw new Error('peanut_cocos_mcp_core_integrity_file_missing');
    }
    const realChild = relative(root, realpathSync(filePath));
    if (!realChild || isAbsolute(realChild) || realChild === '..' || realChild.startsWith('../') || realChild.startsWith('..\\')) {
        throw new Error('peanut_cocos_mcp_core_integrity_path_escape');
    }
    return filePath;
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

async function load() {
    try {
        const packagePath = locateInstalledCorePackage(requireProjectPath());
        const verified = verifyPackage(packagePath);
        if (!existsSync(verified.mainPath)) {
            throw new Error('peanut_cocos_mcp_core_main_missing');
        }
        const loaded = require(verified.mainPath);
        if (typeof loaded.createPluginModule !== 'function') {
            throw new Error('peanut_cocos_mcp_core_entry_invalid');
        }
        toolHandlers = new Map();
        coreModule = loaded.createPluginModule();
        await coreModule.activate({
            runtime: createRuntime(),
            mcp: createRegistry(),
            logger: { info: (message) => getEditor()?.log?.(`[peanut-pod-lite] ${message}`) },
        });
        hostStatus = Object.freeze({ ready: true, error: null, tools: [...toolHandlers.keys()].sort() });
        getEditor()?.log?.(`[peanut-pod-lite] lite_host_ready:${hostStatus.tools.length}`);
    } catch (error) {
        coreModule = null;
        toolHandlers = new Map();
        hostStatus = Object.freeze({ ready: false, error: error instanceof Error ? error.message : String(error), tools: [] });
        getEditor()?.error?.(`[peanut-pod-lite] lite_host_failed:${hostStatus.error}`);
        throw error;
    }
}

async function unload() {
    await coreModule?.deactivate?.();
    coreModule = null;
    toolHandlers = new Map();
    hostStatus = Object.freeze({ ready: false, error: null, tools: [] });
}

const methods = {
    queryStatus() {
        return hostStatus;
    },
    listTools() {
        return hostStatus.tools;
    },
    async invokeTool(name, input = {}) {
        if (!hostStatus.ready) throw new Error('peanut_cocos_mcp_core_host_not_ready');
        const entry = toolHandlers.get(name);
        if (entry == null) throw new Error(`peanut_cocos_mcp_core_tool_unknown:${name}`);
        return entry.handler(input);
    },
};

module.exports = { load, unload, methods };
