import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { CreatorContextResolver, PluginPanelActivator } from '@peanut/pod-hosts';

import { NodeProtocolShim } from './node-protocol-shim';

/**
 * @description Creator 2.4 IPC 事件（带可选 reply）。
 */
interface ICreator24IpcEvent {
    /**
     * @description 向请求方回复结果。
     * @param error 错误；成功时为 null
     * @param result 结果载荷
     * @returns void
     */
    reply?(error: Error | null, result?: unknown): void;
}

/**
 * @description Creator 2.4 主进程最小 Editor 面。
 */
interface ICreator24EditorGlobal {
    /**
     * @description Editor API。
     */
    readonly Editor?: {
        /**
         * @description 写编辑器日志。
         * @param message 日志文本
         * @returns void
         */
        log?(message: string): void;
        /**
         * @description 工程信息。
         */
        readonly Project?: {
            /**
             * @description 工程路径。
             */
            readonly path?: string;
            /**
             * @description 工程名。
             */
            readonly name?: string;
        };
        /**
         * @description 主进程 AssetDB（只读探测）。
         */
        readonly assetdb?: {
            /**
             * @description 按 url 查询 uuid。
             * @param url db:// 或资源 url
             * @returns uuid 或 null
             */
            urlToUuid?(url: string): string | null;
            /**
             * @description 按 uuid 查 url。
             * @param uuid 资源 uuid
             * @returns url 或 null
             */
            uuidToUrl?(uuid: string): string | null;
            /**
             * @description 资源是否存在。
             * @param url 资源 url
             * @returns 是否存在
             */
            exists?(url: string): boolean;
        };
        /**
         * @description 版本信息。
         */
        readonly versions?: {
            /**
             * @description Creator 版本。
             */
            readonly CocosCreator?: string;
        };
        /**
         * @description App 版本。
         */
        readonly App?: {
            /**
             * @description 版本字符串。
             */
            readonly version?: string;
        };
    };
}

/**
 * @description 解析当前宿主 Creator 版本；未知时拒绝启动，禁止伪装成已知版本。
 * @param hostGlobal 宿主全局
 * @returns 版本字符串
 */
function resolveCreatorVersion(hostGlobal: ICreator24EditorGlobal): string {
    const fromVersions = hostGlobal.Editor?.versions?.CocosCreator;
    if (typeof fromVersions === 'string' && fromVersions.trim().length > 0) {
        return fromVersions.trim();
    }
    const fromApp = hostGlobal.Editor?.App?.version;
    if (typeof fromApp === 'string' && fromApp.trim().length > 0) {
        return fromApp.trim();
    }
    throw new Error('creator_version_unavailable');
}

/**
 * @description 安全回复 IPC（无 reply 时仅打日志）。
 * @param event IPC 事件
 * @param payload 成功载荷
 * @returns void
 */
function replyOk(event: ICreator24IpcEvent | undefined, payload: unknown): void {
    if (event != null && typeof event.reply === 'function') {
        event.reply(null, payload);
        return;
    }
    const hostGlobal = globalThis as ICreator24EditorGlobal;
    hostGlobal.Editor?.log?.(`[peanut-pod-24] reply-fallback ${JSON.stringify(payload)}`);
}

/**
 * @description 安全回复 IPC 错误。
 * @param event IPC 事件
 * @param error 错误
 * @returns void
 */
function replyErr(event: ICreator24IpcEvent | undefined, error: Error): void {
    if (event != null && typeof event.reply === 'function') {
        event.reply(error);
        return;
    }
    const hostGlobal = globalThis as ICreator24EditorGlobal;
    hostGlobal.Editor?.log?.(`[peanut-pod-24] error ${error.message}`);
}

/** @description Plugin Manager + MCP Hub 激活器；load 时创建。 */
let pluginPanelActivator: PluginPanelActivator | null = null;
/** @description 异步启动 Promise，供诊断与卸载等待。 */
let bootPromise: Promise<void> | null = null;
/** @description 最近一次启动错误。 */
let bootError: string | null = null;

/**
 * @description 读取工程 peanut-plugins 已装清单。
 * @param projectPath 工程根
 * @returns 插件条目
 */
function inventoryPeanutPlugins(projectPath: string | null): Array<Record<string, unknown>> {
    if (projectPath == null || projectPath.trim().length === 0) {
        return [];
    }
    const installedPath = join(projectPath, 'peanut-plugins', 'installed.json');
    if (!existsSync(installedPath)) {
        return [];
    }
    try {
        const raw = JSON.parse(readFileSync(installedPath, 'utf8')) as {
            plugins?: Array<{ pluginId?: string; id?: string; version?: string; activeVersion?: string }>;
        };
        const plugins = Array.isArray(raw.plugins) ? raw.plugins : [];
        return plugins.map((entry) => {
            const pluginId = typeof entry.pluginId === 'string' ? entry.pluginId : entry.id;
            const version =
                typeof entry.version === 'string'
                    ? entry.version
                    : typeof entry.activeVersion === 'string'
                      ? entry.activeVersion
                      : null;
            const id = typeof pluginId === 'string' ? pluginId : 'unknown';
            const pluginRoot =
                version != null ? join(projectPath, 'peanut-plugins', 'plugins', id, version) : null;
            const manifestPath = pluginRoot != null ? join(pluginRoot, `${id}.manifest.json`) : null;
            return {
                pluginId: id,
                version,
                present: manifestPath != null && existsSync(manifestPath),
                manifestPath,
            };
        });
    } catch {
        return [{ pluginId: '_installed_json', present: false, error: 'installed_json_parse_failed' }];
    }
}

/**
 * @description 读取 MCP Hub 描述符（若已写出）。
 * @param projectPath 工程根
 * @returns Hub 描述摘要
 */
function readHubDescriptor(projectPath: string | null): Record<string, unknown> | null {
    if (projectPath == null) {
        return null;
    }
    const descriptorPath = join(projectPath, '.peanut-ai', 'cocos-mcp.json');
    if (!existsSync(descriptorPath)) {
        return null;
    }
    try {
        const raw = JSON.parse(readFileSync(descriptorPath, 'utf8')) as Record<string, unknown>;
        return {
            present: true,
            port: raw.port ?? null,
            hasToken: typeof raw.token === 'string' && raw.token.length > 0,
        };
    } catch {
        return { present: false, error: 'cocos_mcp_json_parse_failed' };
    }
}

/**
 * @description 把诊断快照落到工程产物。
 * @param snapshot 诊断快照
 * @returns void
 */
function writeLiveDiagnoseArtifact(snapshot: Record<string, unknown>): void {
    const projectPath = typeof snapshot.projectPath === 'string' ? snapshot.projectPath : null;
    if (projectPath == null || projectPath.trim().length === 0) {
        return;
    }
    const outDir = join(projectPath, '.peanut-ai', 'artifacts');
    mkdirSync(outDir, { recursive: true });
    const payload = {
        ...snapshot,
        writtenAt: new Date().toISOString(),
        source: 'peanut-pod-24.load',
    };
    writeFileSync(join(outDir, 'peanut-pod-24-live.json'), `${JSON.stringify(payload, null, 4)}\n`, 'utf8');
}

/**
 * @description 启动 PluginManager、激活 peanut-plugins，并拉起 MCP Hub。
 * @returns Promise
 */
async function bootPluginStack(): Promise<void> {
    const hostGlobal = globalThis as ICreator24EditorGlobal;
    const creatorVersion = resolveCreatorVersion(hostGlobal);
    const creatorContext = CreatorContextResolver.resolve(creatorVersion);
    const projectPath = hostGlobal.Editor?.Project?.path ?? null;
    pluginPanelActivator = new PluginPanelActivator({
        hostGlobal: hostGlobal as never,
        creatorContext,
        projectPath: projectPath ?? undefined,
        allowMemoryPanelWindowProviderFallback: false,
        mcpHub: projectPath == null ? undefined : { projectPath },
    });
    await pluginPanelActivator.load();
    const pluginManager = pluginPanelActivator.getEditorEntry().getPluginManager();
    if (pluginManager == null) {
        throw new Error('plugin_manager_kernel_unavailable');
    }
    await pluginManager.activateInstalledPackages();
    hostGlobal.Editor?.log?.(
        `[peanut-pod-24] plugin-stack ready profile=${creatorContext.profileId} version=${creatorVersion} writes=${creatorContext.writesAllowed} manager=true`,
    );
    writeLiveDiagnoseArtifact(buildDiagnoseSnapshot());
}

/**
 * @description 扩展加载：同步踢出异步内核 + Hub 启动（2.4 load 为同步）。
 * @returns void
 */
export function load(): void {
    NodeProtocolShim.installOnce();
    const hostGlobal = globalThis as ICreator24EditorGlobal;
    const creatorVersion = resolveCreatorVersion(hostGlobal);
    hostGlobal.Editor?.log?.(`[peanut-pod-24] loading plugin-stack creator=${creatorVersion}`);
    bootError = null;
    bootPromise = bootPluginStack()
        .then(() => {
            hostGlobal.Editor?.log?.('[peanut-pod-24] loaded adapter=adapter-24 hub=started');
            writeLiveDiagnoseArtifact(buildDiagnoseSnapshot());
        })
        .catch((error: unknown) => {
            bootError = error instanceof Error ? error.message : String(error);
            hostGlobal.Editor?.log?.(`[peanut-pod-24] boot_failed ${bootError}`);
            writeLiveDiagnoseArtifact(buildDiagnoseSnapshot());
        });
}

/**
 * @description 扩展卸载。
 * @returns void
 */
export function unload(): void {
    const pending = bootPromise;
    bootPromise = null;
    void (async () => {
        try {
            await pending;
        } catch {
            // ignore boot failure on unload
        }
        if (pluginPanelActivator != null) {
            await pluginPanelActivator.unload();
            pluginPanelActivator = null;
        }
    })();
}

/**
 * @description 返回宿主 + 插件栈诊断快照。
 * @returns 诊断对象
 */
export function buildDiagnoseSnapshot(): Record<string, unknown> {
    const hostGlobal = globalThis as ICreator24EditorGlobal;
    const projectPath = hostGlobal.Editor?.Project?.path ?? null;
    const plugins = inventoryPeanutPlugins(projectPath);
    const hub = readHubDescriptor(projectPath);
    const pluginManager =
        pluginPanelActivator != null ? pluginPanelActivator.getEditorEntry().getPluginManager() : null;
    const activePluginIds =
        pluginManager != null
            ? pluginManager.listRuntimeRecords().map((record: { readonly pluginId: string }) => record.pluginId)
            : [];
    return {
        ok: bootError == null && pluginManager != null && hub?.present === true,
        lineId: 'creator2x',
        phase: 'creator_2x',
        creatorVersion: resolveCreatorVersion(hostGlobal),
        adapterId: 'adapter-24',
        supportLevel: 'minimal',
        bootError,
        hub,
        pluginManagerReady: pluginManager != null,
        activePluginIds,
        mvp: 'full-stack-port',
        writes: 'prefab_comp_bind_slice',
        installRoot: 'packages',
        assetdbLive: typeof hostGlobal.Editor?.assetdb?.urlToUuid === 'function',
        projectPath,
        plugins,
        pluginsOk: plugins.every((entry) => entry.present === true),
    };
}

/**
 * @description Creator 2.4 `messages` 表（短名 → 实际 IPC 为 peanut-pod-24:*）。
 */
export const messages = {
    /**
     * @description 菜单触发的诊断日志。
     * @param event IPC 事件
     * @returns void
     */
    diagnose(event?: ICreator24IpcEvent): void {
        void (async () => {
            try {
                await bootPromise;
            } catch {
                // surface via snapshot.bootError
            }
            const snapshot = buildDiagnoseSnapshot();
            const hostGlobal = globalThis as ICreator24EditorGlobal;
            hostGlobal.Editor?.log?.(`[peanut-pod-24] diagnose ${JSON.stringify(snapshot)}`);
            replyOk(event, snapshot);
        })();
    },
    /**
     * @description 供外部请求的诊断快照（须 event.reply）。
     * @param event IPC 事件
     * @returns void
     */
    'query-diagnose'(event?: ICreator24IpcEvent): void {
        void (async () => {
            try {
                await bootPromise;
                replyOk(event, buildDiagnoseSnapshot());
            } catch (error) {
                replyErr(event, error instanceof Error ? error : new Error(String(error)));
            }
        })();
    },
    /**
     * @description 查询工程路径/名称。
     * @param event IPC 事件
     * @returns void
     */
    'query-project'(event?: ICreator24IpcEvent): void {
        const hostGlobal = globalThis as ICreator24EditorGlobal;
        replyOk(event, {
            ok: true,
            path: hostGlobal.Editor?.Project?.path ?? null,
            name: hostGlobal.Editor?.Project?.name ?? null,
        });
    },
    /**
     * @description 只读解析资源 url ↔ uuid（依赖 Editor.assetdb）。
     * @param event IPC 事件
     * @param urlOrUuid 资源 url 或 uuid
     * @returns void
     */
    'query-asset'(event?: ICreator24IpcEvent, urlOrUuid?: string): void {
        const hostGlobal = globalThis as ICreator24EditorGlobal;
        const assetdb = hostGlobal.Editor?.assetdb;
        if (assetdb == null || typeof urlOrUuid !== 'string' || urlOrUuid.trim().length === 0) {
            replyOk(event, { ok: false, error: 'assetdb_or_key_unavailable' });
            return;
        }
        const key = urlOrUuid.trim();
        const uuid = typeof assetdb.urlToUuid === 'function' ? assetdb.urlToUuid(key) : null;
        const url = typeof assetdb.uuidToUrl === 'function' ? assetdb.uuidToUrl(key) : null;
        const exists = typeof assetdb.exists === 'function' ? assetdb.exists(key) : null;
        replyOk(event, {
            ok: true,
            key,
            uuid: uuid ?? (url != null ? key : null),
            url: url ?? (uuid != null ? key : null),
            exists,
        });
    },
};

/**
 * @description CommonJS 兼容：Creator 2.4 需要 module.exports 形状。
 */
export default {
    load,
    unload,
    messages,
};
