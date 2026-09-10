import { CreatorHostState } from '../../shared/host-state.js';
import type {
    IAdapterProfile,
    IAssetBridge,
    ICreatorAdapter,
    IMessageBridge,
    IPanelBrowserWindowLike,
    IPanelHostBridge,
    IPanelHostLaunchResult,
    IProjectBridge,
    IPanelHostSessionSnapshot,
    ISceneBridge,
    ISelectionBridge,
} from './creator-adapter.js';

/**
 * @description Creator 适配器抽象基类，封装骨架阶段共享的内存桥接逻辑。
 */
export abstract class BaseCreatorAdapter implements ICreatorAdapter {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    public readonly id: string;

    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    protected readonly _hostState: CreatorHostState;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _creatorVersion: string;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _availableHosts: readonly string[];

    /**
     * @description 创建一个新的 Creator 适配器基类实例。
     * @param id 适配器稳定标识
     * @param creatorVersion 当前适配器对应的 Creator 版本字符串
     * @param hostState Creator 宿主内存状态
     * @param availableHosts 当前适配器可用宿主列表
     */
    protected constructor(id: string, creatorVersion: string, hostState: CreatorHostState, availableHosts: readonly string[]) {
        this.id = id;
        this._creatorVersion = creatorVersion;
        this._hostState = hostState;
        this._availableHosts = availableHosts;
    }

    /**
     * @description 返回该适配器是否支持指定版本。
     * @param creatorVersion Cocos Creator 版本字符串
     * @returns 支持时返回 `true`
     */
    public abstract supports(creatorVersion: string): boolean;

    /**
     * @description 返回当前版本对应的场景脚本字段名。
     * @returns 当前版本使用的场景脚本字段名
     */
    protected abstract getSceneManifestField(): 'scene-script' | 'contributions.scene.script';

    /**
     * @description 返回适配器当前诊断信息。
     * @returns 适配器诊断快照
     */
    public getProfile(): IAdapterProfile {
        return {
            adapterId: this.id,
            creatorVersion: this._creatorVersion,
            supportLevel: 'full',
            availableHosts: this._availableHosts,
            diagnostics: [],
        };
    }

    /**
     * @description 创建 Message 子域桥接实例。
     * @returns Message 子域桥接实例
     */
    public createMessageBridge(): IMessageBridge {
        return {
            send: async (target: string, message: string, ...args: unknown[]): Promise<void> => {
                this._hostState.appendMessage(target, message, args);
            },
            request: async <TData = unknown>(target: string, message: string, ...args: unknown[]): Promise<TData> => {
                this._hostState.appendMessage(target, message, args);
                return {
                    target,
                    message,
                    args,
                    adapterId: this.id,
                } as TData;
            },
            broadcast: async (message: string, ...args: unknown[]): Promise<void> => {
                this._hostState.appendMessage('broadcast', message, args);
            },
        };
    }

    /**
     * @description 创建 Asset 子域桥接实例。
     * @returns Asset 子域桥接实例
     */
    public createAssetBridge(): IAssetBridge {
        return {
            query: async (pathOrUuid: string): Promise<unknown | null> => {
                return this._hostState.getAsset(pathOrUuid);
            },
            queryAssets: async (_options?: { readonly pattern?: string; readonly importer?: string | readonly string[] }): Promise<readonly unknown[]> => {
                return [];
            },
            refresh: async (pathOrUuid: string): Promise<unknown | null> => {
                return this._hostState.refreshAsset(pathOrUuid);
            },
            writePrefab: async (relativePath: string, prefab: readonly Record<string, unknown>[]): Promise<unknown> => {
                const asset = { path: relativePath, type: 'prefab', prefab };
                this._hostState.setAsset(relativePath, asset);
                return asset;
            },
            writeBinary: async (relativePath: string, content: Uint8Array, mediaType: 'image/png' | 'image/svg+xml' | 'application/json' | 'font/ttf' | 'font/otf'): Promise<unknown> => {
                const asset = { path: relativePath, type: mediaType, byteLength: content.byteLength };
                this._hostState.setAsset(relativePath, asset);
                return asset;
            },
            deleteAsset: async (relativePath: string): Promise<void> => {
                this._hostState.deleteAsset(relativePath);
            },
        };
    }

    /**
     * @description 创建 Scene 子域桥接实例。
     * @returns Scene 子域桥接实例
     */
    public createSceneBridge(): ISceneBridge {
        return {
            getManifestField: (): 'scene-script' | 'contributions.scene.script' => {
                return this.getSceneManifestField();
            },
            getCurrent: async (): Promise<Record<string, unknown> | null> => {
                return this._hostState.getSceneNode('root-node');
            },
            getHierarchy: async (_options?: { includeEditorNodes?: boolean }): Promise<readonly Record<string, unknown>[]> => {
                return this._hostState.listSceneNodes();
            },
            execute: async <TData = unknown>(packageName: string, method: string, args?: readonly unknown[]): Promise<TData> => {
                return {
                    packageName,
                    method,
                    args: args ?? [],
                    adapterId: this.id,
                } as TData;
            },
            patch: async (nodeId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> => {
                return this._hostState.patchSceneNode(nodeId, patch);
            },
        };
    }

    /**
     * @description 创建 Selection 子域桥接实例。
     * @returns Selection 子域桥接实例
     */
    public createSelectionBridge(): ISelectionBridge {
        return {
            getActiveIds: async (): Promise<readonly string[]> => {
                return this._hostState.getSelectionIds();
            },
            setActiveIds: async (selectionIds: readonly string[]): Promise<void> => {
                this._hostState.setSelectionIds(selectionIds);
            },
        };
    }

    /**
     * @description 创建 Project 子域桥接实例。
     * @returns Project 子域桥接实例
     */
    public createProjectBridge(): IProjectBridge {
        return {
            getProjectPath: async (): Promise<string | null> => {
                return this._hostState.getProjectPath();
            },
            getProjectName: async (): Promise<string | null> => {
                return this._hostState.getProjectName();
            },
            configure: async (projectPath: string | null, projectName: string | null): Promise<void> => {
                this._hostState.configureProject(projectPath, projectName);
            },
        };
    }

    /**
     * @description 创建 Panel Host 子域桥接实例。
     * @returns Panel Host 子域桥接实例
     */
    public createPanelHostBridge(): IPanelHostBridge {
        return {
            open: async (panelId: string, entry: string): Promise<void> => {
                this._hostState.openPanel(panelId, entry);
            },
            close: async (panelId: string): Promise<void> => {
                this._hostState.closePanel(panelId);
            },
            focus: async (panelId: string): Promise<void> => {
                if (!this._hostState.isPanelOpen(panelId)) {
                    throw new Error(`Panel "${panelId}" is not currently open.`);
                }
                this._hostState.focusPanel(panelId);
            },
            setBootstrapScript: async (panelId: string, bootstrapScript: string): Promise<void> => {
                this._hostState.setPanelBootstrapScript(panelId, bootstrapScript);
            },
            attachBrowserWindow: async (panelId: string, browserWindow: IPanelBrowserWindowLike): Promise<void> => {
                this._hostState.attachPanelBrowserWindow(panelId, browserWindow);
            },
            getSession: async (panelId: string): Promise<IPanelHostSessionSnapshot | null> => {
                return this._hostState.getPanelSession(panelId);
            },
            listSessions: async (): Promise<readonly IPanelHostSessionSnapshot[]> => {
                return this._hostState.listPanelSessions();
            },
            launchContainer: async (panelId: string, entry: string, bootstrapScript: string): Promise<IPanelHostLaunchResult> => {
                this._hostState.openPanel(panelId, entry);
                this._hostState.setPanelBootstrapScript(panelId, bootstrapScript);
                // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
                const panelHostSessionSnapshot = this._hostState.getPanelSession(panelId);
                if (panelHostSessionSnapshot == null) {
                    throw new Error(`Panel "${panelId}" is not currently open.`);
                }
                return {
                    session: panelHostSessionSnapshot,
                    browserWindow: this._hostState.getPanelBrowserWindow(panelId),
                };
            },
        };
    }
}
