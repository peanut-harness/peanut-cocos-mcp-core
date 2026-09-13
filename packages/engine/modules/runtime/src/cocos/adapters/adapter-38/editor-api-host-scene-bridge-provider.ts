/**
 * @description Creator 3.8 场景脚本调用所需的最小消息接口。
 */
interface ICocosEditorSceneMessageApi {
    /** @description 向 Creator 场景进程发送请求。 */
    request?(target: string, message: string, ...args: unknown[]): Promise<unknown>;
}

/**
 * @description 可能提供 Creator 场景消息接口的宿主全局对象。
 */
export interface IEditorApiSceneHostGlobal extends Record<string, unknown> {
    /** @description Cocos Creator 主进程暴露的全局 API。 */
    readonly Editor?: {
        /** @description Creator 进程间消息 API。 */
        readonly Message?: ICocosEditorSceneMessageApi;
    };
}

/**
 * @description 由宿主场景脚本返回的 JSON 安全场景节点快照。
 */
export interface IEditorApiSceneNodeSnapshot extends Record<string, unknown> {
    /** @description 场景节点稳定标识。 */
    readonly uuid: string;
    /** @description 场景节点显示名称。 */
    readonly name: string;
    /** @description 节点是否激活。 */
    readonly active: boolean;
    /** @description 相对场景根的层级路径（扁平快照时由宿主脚本补齐）。 */
    readonly path?: string;
    /** @description 当前节点的子节点快照。 */
    readonly children: readonly IEditorApiSceneNodeSnapshot[];
}

/**
 * @description 真实 Creator 3.8 场景脚本桥接 provider。
 */
export class EditorApiHostSceneBridgeProvider implements IEditorApiSceneBridgeProvider {
    /** @description Creator 主进程全局对象。 */
    private readonly _hostGlobal: IEditorApiSceneHostGlobal;
    /** @description 提供受控场景读取方法的宿主扩展包名。 */
    private readonly _sceneScriptPackageName: string;

    /**
     * @description 创建一个新的 Creator 3.8 场景脚本 provider。
     * @param sceneScriptPackageName 声明 `contributions.scene.script` 的宿主扩展包名。
     * @param hostGlobal Creator 主进程全局对象；省略时使用 `globalThis`。
     */
    public constructor(sceneScriptPackageName: string, hostGlobal?: IEditorApiSceneHostGlobal) {
        if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)+$/.test(sceneScriptPackageName)) {
            throw new Error('cocos_editor_scene_script_package_invalid');
        }
        this._sceneScriptPackageName = sceneScriptPackageName;
        this._hostGlobal = hostGlobal ?? (globalThis as IEditorApiSceneHostGlobal);
    }

    /**
     * @description 判断当前宿主是否能调用 Creator 场景脚本。
     * @returns 可调用 `Editor.Message.request` 时返回 `true`。
     */
    public isAvailable(): boolean {
        return typeof this._hostGlobal.Editor?.Message?.request === 'function';
    }

    /**
     * @description 获取当前场景根节点的 JSON 安全快照。
     * @returns 当前场景未加载时返回 `null`。
     */
    public async getCurrent(): Promise<IEditorApiSceneNodeSnapshot | null> {
        const result = await this._executeHostScript('getCurrentScene', []);
        return result == null ? null : this._readNodeSnapshot(result);
    }

    /**
     * @description 获取当前场景树的深度优先节点快照列表。
     * @param options 可选；`includeEditorNodes` 默认 false。
     * @returns 当前场景未加载时返回空列表。
     */
    public async getHierarchy(options: { includeEditorNodes?: boolean } = {}): Promise<readonly IEditorApiSceneNodeSnapshot[]> {
        const args = options.includeEditorNodes === true ? ([{ includeEditorNodes: true }] as const) : ([] as const);
        const result = await this._executeHostScript('getSceneHierarchy', args);
        // 场景进程未就绪 / 脚本未挂上时宿主可能返回非数组；按「无层次」处理，避免刷 project.log。
        if (!Array.isArray(result)) {
            return [];
        }
        // 宿主脚本已返回带 path 的扁平列表；勿再按 children 递归，否则 path 丢失且子树重复。
        return result.map((node) => this._readFlatNodeSnapshot(node));
    }

    /**
     * @description 调用已声明场景脚本中的受控方法。
     * @param packageName 提供目标场景脚本的扩展包名。
     * @param method 场景脚本中导出的稳定方法名。
     * @param args 仅允许 JSON 安全的数据参数。
     * @returns 场景脚本返回的 JSON 安全结果。
     */
    public async execute<TData = unknown>(packageName: string, method: string, args: readonly unknown[] = []): Promise<TData> {
        if (!/^[a-z0-9]+(?:[._-][a-z0-9]+)+$/.test(packageName) || !/^[A-Za-z][A-Za-z0-9_]*$/.test(method) || !this._isJsonValue(args)) {
            throw new Error('cocos_editor_scene_script_request_invalid');
        }
        return await this._request<TData>(packageName, method, args);
    }

    /** @description 调用宿主扩展自带、固定名称的只读场景查询方法。 */
    private async _executeHostScript(method: 'getCurrentScene' | 'getSceneHierarchy', args: readonly unknown[]): Promise<unknown> {
        return this._request(this._sceneScriptPackageName, method, args);
    }

    /** @description 通过 Cocos 官方 `execute-scene-script` 消息调用目标方法。 */
    private async _request<TData>(packageName: string, method: string, args: readonly unknown[]): Promise<TData> {
        const request = this._hostGlobal.Editor?.Message?.request;
        if (request == null) {
            throw new Error('cocos_editor_scene_api_unavailable');
        }
        return (await request('scene', 'execute-scene-script', { name: packageName, method, args })) as TData;
    }

    /** @description 校验场景脚本返回的节点快照不会携带 Creator 原生对象。 */
    private _readNodeSnapshot(value: unknown): IEditorApiSceneNodeSnapshot {
        if (typeof value !== 'object' || value == null || Array.isArray(value)) {
            throw new Error('cocos_editor_scene_snapshot_invalid');
        }
        const record = value as Record<string, unknown>;
        if (
            typeof record.uuid !== 'string' ||
            record.uuid.length === 0 ||
            typeof record.name !== 'string' ||
            typeof record.active !== 'boolean' ||
            !Array.isArray(record.children)
        ) {
            throw new Error('cocos_editor_scene_snapshot_invalid');
        }
        const path = typeof record.path === 'string' && record.path.trim().length > 0 ? record.path.trim().replace(/\\/gu, '/') : undefined;
        return {
            uuid: record.uuid,
            name: record.name,
            active: record.active,
            ...(path != null ? { path } : {}),
            children: record.children.map((child) => this._readNodeSnapshot(child)),
        };
    }

    /**
     * @description 读取宿主扁平层次快照（保留 path，忽略嵌套 children 以免重复）。
     * @param value 单行快照。
     * @returns 扁平节点。
     */
    private _readFlatNodeSnapshot(value: unknown): IEditorApiSceneNodeSnapshot {
        if (typeof value !== 'object' || value == null || Array.isArray(value)) {
            throw new Error('cocos_editor_scene_snapshot_invalid');
        }
        const record = value as Record<string, unknown>;
        if (
            typeof record.uuid !== 'string' ||
            record.uuid.length === 0 ||
            typeof record.name !== 'string' ||
            typeof record.active !== 'boolean'
        ) {
            throw new Error('cocos_editor_scene_snapshot_invalid');
        }
        const path =
            typeof record.path === 'string' && record.path.trim().length > 0 ? record.path.trim().replace(/\\/gu, '/') : record.name;
        return {
            uuid: record.uuid,
            name: record.name,
            active: record.active,
            path,
            children: [],
        };
    }

    /** @description 校验跨进程参数由 JSON 安全值组成。 */
    private _isJsonValue(value: unknown): boolean {
        if (value == null || typeof value === 'string' || typeof value === 'boolean') {
            return true;
        }
        if (typeof value === 'number') {
            return Number.isFinite(value);
        }
        if (Array.isArray(value)) {
            return value.every((item) => this._isJsonValue(item));
        }
        if (typeof value !== 'object') {
            return false;
        }
        return Object.values(value as Record<string, unknown>).every((item) => this._isJsonValue(item));
    }
}
import type { IEditorApiSceneBridgeProvider } from '../core/editor-api-scene-bridge-provider.js';
