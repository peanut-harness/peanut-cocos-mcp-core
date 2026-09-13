import { BaseCreatorAdapter } from '../core/base-creator-adapter.js';
import type {
    IAdapterProfile,
    IAssetBridge,
    IMessageBridge,
    IPanelHostBridge,
    IProjectBridge,
    ISceneBridge,
    ISelectionBridge,
} from '../core/creator-adapter.js';
import { CreatorHostState } from '../../shared/host-state.js';
import {
    EditorApi24HostAssetBridgeProvider,
    type ICreator24AssetDbApi,
    type ICreator24AssetDbHostGlobal,
} from './editor-api-24-host-asset-bridge-provider.js';
import type { IEditorApiAssetBridgeProvider } from '../core/editor-api-asset-bridge-provider.js';

/**
 * @description Creator 2.4.x 主进程可能暴露的消息面（Ipc / 旧 Message）与 AssetDB。
 */
export interface ICreator24MessageHostGlobal extends ICreator24AssetDbHostGlobal {
    /**
     * @description Creator 2.x 全局 Editor。
     */
    readonly Editor?: {
        /**
         * @description 旧版 Ipc 发送。
         */
        readonly Ipc?: {
            /**
             * @description 向主进程/扩展发消息。
             * @param message 消息名
             * @param args 参数
             * @returns 可选 Promise
             */
            send?(message: string, ...args: unknown[]): unknown;
            /**
             * @description 请求并等待。
             * @param message 消息名
             * @param args 参数
             * @returns Promise 结果
             */
            sendToMain?(message: string, ...args: unknown[]): Promise<unknown> | unknown;
        };
        /**
         * @description 部分 2.4 构建仍暴露 Message。
         */
        readonly Message?: {
            /**
             * @description 请求消息。
             * @param target 目标
             * @param message 消息名
             * @param args 参数
             * @returns Promise
             */
            request?(target: string, message: string, ...args: unknown[]): Promise<unknown>;
            /**
             * @description 单向发送。
             * @param target 目标
             * @param message 消息名
             * @param args 参数
             * @returns void
             */
            send?(target: string, message: string, ...args: unknown[]): void;
        };
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
         * @description AssetDB（读 + 写）。
         */
        readonly assetdb?: ICreator24AssetDbApi;
    };
}

/**
 * @description 面向 Cocos Creator 2.4.x 的适配器（诊断 + AssetDB 写桥，见 ADR 0003）。
 */
export class EditorApi24Adapter extends BaseCreatorAdapter {
    /** @description 2.4 无对等 handler 的 3.x IPC 目标（禁止盲探）。 */
    private static readonly _skipIpcProbeTargets = new Set([
        'builder',
        'preview',
        'console',
        'programmer',
        'device-manager',
        'server',
    ]);

    /** @description 可选宿主全局，用于探测 2.x Ipc / Project / AssetDB。 */
    private readonly _hostGlobal: ICreator24MessageHostGlobal;
    /** @description AssetDB 写桥 provider。 */
    private readonly _assetBridgeProvider: IEditorApiAssetBridgeProvider;

    /**
     * @description 创建 Creator 2.4 适配器。
     * @param creatorVersion 当前 Runtime 绑定的 Creator 版本字符串
     * @param hostState Creator 宿主内存状态
     * @param hostGlobal 可选 Creator 主进程全局；默认 `globalThis`
     * @param assetBridgeProvider 可选写桥；默认 `EditorApi24HostAssetBridgeProvider`
     */
    public constructor(
        creatorVersion: string,
        hostState: CreatorHostState,
        hostGlobal?: ICreator24MessageHostGlobal,
        assetBridgeProvider?: IEditorApiAssetBridgeProvider,
    ) {
        super('adapter-24', creatorVersion, hostState, ['creator-2x-packages']);
        this._hostGlobal = hostGlobal ?? (globalThis as ICreator24MessageHostGlobal);
        this._assetBridgeProvider =
            assetBridgeProvider ?? new EditorApi24HostAssetBridgeProvider(this._hostGlobal);
    }

    /**
     * @description 返回该适配器是否支持指定版本。
     * @param creatorVersion Cocos Creator 版本字符串
     * @returns 版本属于 2.4.x–2.x 时返回 `true`
     */
    public supports(creatorVersion: string): boolean {
        const [majorPart, minorPart] = creatorVersion.trim().split('.');
        const major = Number(majorPart ?? '0');
        const minor = Number(minorPart ?? '0');
        return major === 2 && minor >= 4;
    }

    /**
     * @description 返回当前版本对应的场景脚本字段名。
     * @returns 2.x 使用的 `scene-script`
     */
    protected getSceneManifestField(): 'scene-script' {
        return 'scene-script';
    }

    /**
     * @description 返回适配器当前诊断信息（MVP 为 minimal）。
     * @returns 适配器诊断快照
     */
    public getProfile(): IAdapterProfile {
        const base = super.getProfile();
        const liveMessage = this._hasLiveMessage();
        const liveProject = typeof this._hostGlobal.Editor?.Project?.path === 'string';
        const writesLive = this._assetBridgeProvider.isAvailable();
        return {
            ...base,
            supportLevel: writesLive ? 'compatible' : 'minimal',
            diagnostics: [
                writesLive ? 'assetdb_write_live' : 'mvp_read_only',
                liveMessage ? 'message_live' : 'message_memory',
                liveProject ? 'project_live' : 'project_memory',
                writesLive ? 'write_via_assetdb' : 'write_refused',
                writesLive ? 'lumen_24_write_ready' : 'lumen_commit_unavailable',
            ],
        };
    }

    /**
     * @description 创建 Message 子域桥接；有 live API 时转发，否则内存 echo。
     * @returns Message 子域桥接实例
     */
    public createMessageBridge(): IMessageBridge {
        const memory = super.createMessageBridge();
        if (!this._hasLiveMessage()) {
            return memory;
        }
        return {
            send: async (target: string, message: string, ...args: unknown[]): Promise<void> => {
                const editorMessage = this._hostGlobal.Editor?.Message;
                if (typeof editorMessage?.send === 'function') {
                    editorMessage.send(target, message, ...args);
                    return;
                }
                const ipc = this._hostGlobal.Editor?.Ipc;
                if (typeof ipc?.send === 'function') {
                    ipc.send(`${target}:${message}`, ...args);
                    return;
                }
                await memory.send(target, message, ...args);
            },
            request: async <TData = unknown>(target: string, message: string, ...args: unknown[]): Promise<TData> => {
                const editorMessage = this._hostGlobal.Editor?.Message;
                if (typeof editorMessage?.request === 'function') {
                    return (await editorMessage.request(target, message, ...args)) as TData;
                }
                // 2.4 没有这些 3.x package IPC；盲发必超时刷屏。
                if (EditorApi24Adapter._skipIpcProbeTargets.has(target)) {
                    throw new Error(`adapter_24_ipc_skipped:${target}:${message}`);
                }
                const ipc = this._hostGlobal.Editor?.Ipc;
                if (typeof ipc?.sendToMain === 'function') {
                    // Creator 2.4：`Editor.Ipc.sendToMain(msg, …args, callback, timeout)`；
                    // 盲等 Promise / 无 callback 会刷 `sendToMain "…" failed, no response received`。
                    return EditorApi24Adapter._requestViaSendToMain<TData>(
                        ipc.sendToMain.bind(ipc),
                        `${target}:${message}`,
                        args,
                    );
                }
                return memory.request(target, message, ...args);
            },
            broadcast: async (message: string, ...args: unknown[]): Promise<void> => {
                await memory.broadcast(message, ...args);
            },
        };
    }

    /**
     * @description 创建 Asset 子域桥接；有 AssetDB 写面时委托 provider，否则只读 + 拒绝写。
     * @returns Asset 子域桥接实例
     */
    public createAssetBridge(): IAssetBridge {
        const memory = super.createAssetBridge();
        const provider = this._assetBridgeProvider;
        if (!provider.isAvailable()) {
            const assetdb = this._hostGlobal.Editor?.assetdb;
            return {
                query: async (pathOrUuid: string): Promise<unknown | null> => {
                    if (assetdb != null) {
                        const key = pathOrUuid.trim();
                        const uuid =
                            typeof assetdb.urlToUuid === 'function' ? assetdb.urlToUuid(key) : null;
                        const url =
                            typeof assetdb.uuidToUrl === 'function' ? assetdb.uuidToUrl(key) : null;
                        if (uuid != null || url != null) {
                            return {
                                path: url ?? key,
                                uuid: uuid ?? key,
                                source: 'editor.assetdb',
                            };
                        }
                    }
                    return memory.query(pathOrUuid);
                },
                queryAssets: async (options?: {
                    readonly pattern?: string;
                    readonly importer?: string | readonly string[];
                }): Promise<readonly unknown[]> => memory.queryAssets(options),
                refresh: async (pathOrUuid: string): Promise<unknown | null> => memory.refresh(pathOrUuid),
                writePrefab: async (): Promise<unknown> => {
                    throw new Error('adapter_24_write_refused:assetdb_unavailable:see_adr_0003_lumen_24');
                },
                writeBinary: async (): Promise<unknown> => {
                    throw new Error('adapter_24_write_refused:assetdb_unavailable:see_adr_0003_lumen_24');
                },
                deleteAsset: async (): Promise<void> => {
                    throw new Error('adapter_24_write_refused:assetdb_unavailable:see_adr_0003_lumen_24');
                },
            };
        }
        return {
            query: async (pathOrUuid: string): Promise<unknown | null> => {
                return (await provider.queryAsset(pathOrUuid)) ?? memory.query(pathOrUuid);
            },
            queryAssets: async (options?: {
                readonly pattern?: string;
                readonly importer?: string | readonly string[];
            }): Promise<readonly unknown[]> => provider.queryAssets(options),
            refresh: async (pathOrUuid: string): Promise<unknown | null> => {
                return (await provider.refreshAsset(pathOrUuid)) ?? memory.refresh(pathOrUuid);
            },
            writePrefab: async (
                relativePath: string,
                prefab: readonly Record<string, unknown>[],
            ): Promise<unknown> => provider.writePrefab(relativePath, prefab),
            writeBinary: async (
                relativePath: string,
                content: Uint8Array,
                mediaType: 'image/png' | 'image/svg+xml' | 'application/json' | 'font/ttf' | 'font/otf',
            ): Promise<unknown> => provider.writeBinary(relativePath, content, mediaType),
            deleteAsset: async (relativePath: string): Promise<void> => provider.deleteAsset(relativePath),
        };
    }

    /**
     * @description 创建 Scene 子域桥接（内存快照；MVP 不做 2.x scene-script 写）。
     * @returns Scene 子域桥接实例
     */
    public createSceneBridge(): ISceneBridge {
        return super.createSceneBridge();
    }

    /**
     * @description 创建 Selection 子域桥接（内存）。
     * @returns Selection 子域桥接实例
     */
    public createSelectionBridge(): ISelectionBridge {
        return super.createSelectionBridge();
    }

    /**
     * @description 创建 Panel Host 子域桥接（内存；2.4 独立 panel 壳另由宿主包提供）。
     * @returns Panel Host 子域桥接实例
     */
    public createPanelHostBridge(): IPanelHostBridge {
        return super.createPanelHostBridge();
    }

    /**
     * @description 创建 Project 子域桥接；优先读 Editor.Project。
     * @returns Project 子域桥接实例
     */
    public createProjectBridge(): IProjectBridge {
        const memory = super.createProjectBridge();
        const project = this._hostGlobal.Editor?.Project;
        if (typeof project?.path !== 'string' && typeof project?.name !== 'string') {
            return memory;
        }
        return {
            getProjectPath: async (): Promise<string | null> => {
                return typeof project.path === 'string' ? project.path : memory.getProjectPath();
            },
            getProjectName: async (): Promise<string | null> => {
                return typeof project.name === 'string' ? project.name : memory.getProjectName();
            },
            configure: async (projectPath: string | null, projectName: string | null): Promise<void> => {
                await memory.configure(projectPath, projectName);
            },
        };
    }

    /**
     * @description 当前宿主是否暴露可用的 live 消息 API。
     * @returns 可用时 true
     */
    private _hasLiveMessage(): boolean {
        const editor = this._hostGlobal.Editor;
        return (
            typeof editor?.Message?.request === 'function' ||
            typeof editor?.Message?.send === 'function' ||
            typeof editor?.Ipc?.send === 'function' ||
            typeof editor?.Ipc?.sendToMain === 'function'
        );
    }

    /**
     * @description 以 2.4 回调约定包装 `Ipc.sendToMain`（短超时；超时即 reject，不挂死）。
     * @param sendToMain 宿主 IPC
     * @param channel `target:message`
     * @param args 业务参数（不含 callback）
     * @returns 主进程 reply
     */
    private static _requestViaSendToMain<TData>(
        sendToMain: (message: string, ...args: unknown[]) => Promise<unknown> | unknown,
        channel: string,
        args: readonly unknown[],
    ): Promise<TData> {
        const timeoutMs = 400;
        return new Promise<TData>((resolve, reject) => {
            let settled = false;
            const finish = (error: Error | null, value?: unknown): void => {
                if (settled) {
                    return;
                }
                settled = true;
                if (error != null) {
                    reject(error);
                    return;
                }
                resolve(value as TData);
            };
            try {
                const maybe = sendToMain(
                    channel,
                    ...args,
                    (error: Error | null, ...reply: unknown[]) => {
                        if (error != null) {
                            finish(error);
                            return;
                        }
                        finish(null, reply.length <= 1 ? reply[0] : reply);
                    },
                    timeoutMs,
                );
                if (maybe != null && typeof (maybe as { then?: unknown }).then === 'function') {
                    Promise.resolve(maybe).then(
                        (value) => finish(null, value),
                        (error: unknown) =>
                            finish(error instanceof Error ? error : new Error(String(error))),
                    );
                }
            } catch (error: unknown) {
                finish(error instanceof Error ? error : new Error(String(error)));
            }
        });
    }
}
