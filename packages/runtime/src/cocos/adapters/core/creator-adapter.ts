/**
 * @description 版本适配器支持级别。
 */
export type AdapterSupportLevel = 'full' | 'compatible' | 'minimal' | 'unsupported';

/**
 * @description Message 子域桥接接口。
 */
export interface IMessageBridge {
    /**
     * @description 发送单向消息到指定目标。
     * @param target 消息目标标识
     * @param message 消息名称
     * @param args 附加消息参数
     * @returns Promise 在消息发送完成后结束
     */
    send(target: string, message: string, ...args: unknown[]): Promise<void>;

    /**
     * @description 向指定目标发送请求并等待结果。
     * @param target 消息目标标识
     * @param message 消息名称
     * @param args 附加消息参数
     * @returns Promise 返回目标处理后的结果
     */
    request<TData = unknown>(target: string, message: string, ...args: unknown[]): Promise<TData>;

    /**
     * @description 广播消息到所有可达目标。
     * @param message 消息名称
     * @param args 附加消息参数
     * @returns Promise 在广播结束后完成
     */
    broadcast(message: string, ...args: unknown[]): Promise<void>;
}

/**
 * @description Asset 子域桥接接口。
 */
export interface IAssetBridge {
    /**
     * @description 查询资源数据库中的对象。
     * @param pathOrUuid 资源路径或 uuid
     * @returns Promise 返回查询结果；未命中时返回 `null`
     */
    query(pathOrUuid: string): Promise<unknown | null>;

    /**
     * @description 按 pattern 批量查询资源快照（含子资源）。
     * @param options 可选 pattern 与 importer 过滤。
     * @returns 资源快照列表；宿主不支持时返回空数组。
     */
    queryAssets(options?: { readonly pattern?: string; readonly importer?: string | readonly string[] }): Promise<readonly unknown[]>;

    /**
     * @description 刷新指定资源键对应的资源快照。
     * @param pathOrUuid 资源路径或 uuid
     * @returns Promise 返回刷新后的资源结果；未命中时返回 `null`
     */
    refresh(pathOrUuid: string): Promise<unknown | null>;

    /**
     * @description 将已编译的 Prefab 序列化内容写入项目资源库。
     * @param relativePath 已验证的项目相对 `.prefab` 路径
     * @param prefab Cocos Prefab 序列化数组
     * @returns 写入后的资源快照
     */
    writePrefab(relativePath: string, prefab: readonly Record<string, unknown>[]): Promise<unknown>;
    /** @description 写入受支持的图片、JSON 或字体资源并刷新资源库。 */
    writeBinary(relativePath: string, content: Uint8Array, mediaType: 'image/png' | 'image/svg+xml' | 'application/json' | 'font/ttf' | 'font/otf'): Promise<unknown>;
    /** @description 删除已验证的项目相对资源路径。 */
    deleteAsset(relativePath: string): Promise<void>;
}

/**
 * @description Scene 子域桥接接口。
 */
export interface ISceneBridge {
    /**
     * @description 返回当前版本场景脚本字段名。
     * @returns 当前版本使用的场景脚本字段名
     */
    getManifestField(): 'scene-script' | 'contributions.scene.script';

    /**
     * @description 返回当前场景根节点快照。
     * @returns 当前场景根节点快照；尚未加载场景时返回 `null`
     */
    getCurrent(): Promise<Record<string, unknown> | null>;

    /**
     * @description 返回当前场景节点快照列表。
     * @param options 可选；`includeEditorNodes` 默认由宿主脚本处理（实机默认过滤）。
     * @returns 场景树节点快照列表
     */
    getHierarchy(options?: { includeEditorNodes?: boolean }): Promise<readonly Record<string, unknown>[]>;

    /**
     * @description 执行指定插件暴露的场景脚本方法。
     * @param packageName 插件包名
     * @param method 场景脚本方法名
     * @param args 传给场景脚本方法的参数列表
     * @returns Promise 返回脚本执行结果
     */
    execute<TData = unknown>(packageName: string, method: string, args?: readonly unknown[]): Promise<TData>;

    /**
     * @description 为指定场景节点应用一个补丁对象。
     * @param nodeId 场景节点稳定标识
     * @param patch 需要写入节点的补丁字段
     * @returns Promise 返回补丁后的节点快照
     */
    patch(nodeId: string, patch: Record<string, unknown>): Promise<Record<string, unknown>>;
}

/**
 * @description Selection 子域桥接接口。
 */
export interface ISelectionBridge {
    /**
     * @description 返回当前激活的选择标识列表。
     * @returns Promise 返回当前选择标识列表
     */
    getActiveIds(): Promise<readonly string[]>;

    /**
     * @description 更新宿主当前激活的选择标识列表。
     * @param selectionIds 当前选择标识列表
     * @returns Promise 在更新完成后结束
     */
    setActiveIds(selectionIds: readonly string[]): Promise<void>;
}

/**
 * @description Project 子域桥接接口。
 */
export interface IProjectBridge {
    /**
     * @description 返回当前项目根目录。
     * @returns Promise 返回项目根目录；未知时返回 `null`
     */
    getProjectPath(): Promise<string | null>;

    /**
     * @description 返回当前项目显示名称。
     * @returns Promise 返回项目显示名称；未知时返回 `null`
     */
    getProjectName(): Promise<string | null>;

    /**
     * @description 更新当前项目基础信息。
     * @param projectPath 当前项目根目录
     * @param projectName 当前项目显示名称
     * @returns Promise 在更新完成后结束
     */
    configure(projectPath: string | null, projectName: string | null): Promise<void>;
}

/**
 * @description Panel Host 子域桥接接口。
 */
export interface IPanelHostBridge {
    /**
     * @description 打开或恢复插件面板容器。
     * @param panelId 面板稳定标识
     * @param entry 面板前端入口路径
     * @returns Promise 在宿主面板容器准备完成后结束
     */
    open(panelId: string, entry: string): Promise<void>;

    /**
     * @description 关闭指定插件面板。
     * @param panelId 面板稳定标识
     * @returns Promise 在面板关闭后结束
     */
    close(panelId: string): Promise<void>;

    /**
     * @description 聚焦指定插件面板。
     * @param panelId 面板稳定标识
     * @returns Promise 在面板聚焦完成后结束
     */
    focus(panelId: string): Promise<void>;

    /**
     * @description 为指定面板写入浏览器 bootstrap 脚本。
     * @param panelId 面板稳定标识
     * @param bootstrapScript 供宿主在页面初始化时注入的脚本文本
     * @returns Promise 在脚本挂载完成后结束
     */
    setBootstrapScript(panelId: string, bootstrapScript: string): Promise<void>;

    /**
     * @description 为指定面板绑定一个浏览器侧上下文对象。
     * @param panelId 面板稳定标识
     * @param browserWindow 宿主实际持有的浏览器侧对象
     * @returns Promise 在绑定完成后结束
     */
    attachBrowserWindow(panelId: string, browserWindow: IPanelBrowserWindowLike): Promise<void>;

    /**
     * @description 查询指定面板的宿主会话快照。
     * @param panelId 面板稳定标识
     * @returns Promise 命中时返回宿主会话快照，否则返回 `null`
     */
    getSession(panelId: string): Promise<IPanelHostSessionSnapshot | null>;

    /**
     * @description 返回当前所有面板的宿主会话快照。
     * @returns Promise 返回宿主会话快照只读列表
     */
    listSessions(): Promise<readonly IPanelHostSessionSnapshot[]>;

    /**
     * @description 启动一个面板容器并挂载 bootstrap 脚本。
     * @param panelId 面板稳定标识
     * @param entry 面板前端入口路径
     * @param bootstrapScript 供宿主在页面初始化时注入的脚本文本
     * @returns Promise 返回当前面板会话快照与宿主创建的浏览器侧上下文对象
     */
    launchContainer(panelId: string, entry: string, bootstrapScript: string): Promise<IPanelHostLaunchResult>;
}

/**
 * @description 面板浏览器侧上下文对象。
 */
export interface IPanelBrowserWindowLike extends Record<string, unknown> {}

/**
 * @description Panel Host 宿主会话快照。
 */
export interface IPanelHostSessionSnapshot {
    /**
     * @description 面板稳定标识。
     */
    readonly panelId: string;

    /**
     * @description 面板前端入口路径。
     */
    readonly entry: string;

    /**
     * @description 当前面板是否处于打开状态。
     */
    readonly isOpen: boolean;

    /**
     * @description 当前面板是否被聚焦过。
     */
    readonly hasFocus: boolean;

    /**
     * @description 当前是否已绑定浏览器侧上下文对象。
     */
    readonly hasBrowserWindow: boolean;

    /**
     * @description 当前是否已挂载 bootstrap 脚本。
     */
    readonly hasBootstrapScript: boolean;

    /**
     * @description 当前 bootstrap 脚本文本；未设置时返回 `null`。
     */
    readonly bootstrapScript: string | null;

    /**
     * @description 面板打开时间，使用 ISO 时间字符串。
     */
    readonly openedAt: string;

    /**
     * @description 上次聚焦时间，使用 ISO 时间字符串；从未聚焦时返回 `null`。
     */
    readonly focusedAt: string | null;
}

/**
 * @description Panel Host 容器启动结果。
 */
export interface IPanelHostLaunchResult {
    /**
     * @description 当前面板会话快照。
     */
    readonly session: IPanelHostSessionSnapshot;

    /**
     * @description 宿主创建出的浏览器侧上下文对象；无宿主窗口时返回 `null`。
     */
    readonly browserWindow: IPanelBrowserWindowLike | null;
}

/**
 * @description Runtime 适配器诊断快照。
 */
export interface IAdapterProfile {
    /**
     * @description 适配器稳定标识。
     */
    readonly adapterId: string;

    /**
     * @description 当前适配器对应的 Creator 版本字符串。
     */
    readonly creatorVersion: string;

    /**
     * @description 当前适配器支持级别。
     */
    readonly supportLevel: AdapterSupportLevel;

    /**
     * @description 适配器可用宿主列表。
     */
    readonly availableHosts: readonly string[];

    /**
     * @description 适配器诊断摘要。
     */
    readonly diagnostics: readonly string[];
}

/**
 * @description Runtime 版本适配器接口。
 */
export interface ICreatorAdapter {
    /**
     * @description 适配器稳定标识。
     */
    readonly id: string;

    /**
     * @description 返回该适配器是否支持指定版本。
     * @param creatorVersion Cocos Creator 版本字符串
     * @returns 支持时返回 `true`
     */
    supports(creatorVersion: string): boolean;

    /**
     * @description 返回适配器当前诊断信息。
     * @returns 适配器诊断快照
     */
    getProfile(): IAdapterProfile;

    /**
     * @description 创建 Message 子域桥接实例。
     * @returns Message 子域桥接实例
     */
    createMessageBridge(): IMessageBridge;

    /**
     * @description 创建 Asset 子域桥接实例。
     * @returns Asset 子域桥接实例
     */
    createAssetBridge(): IAssetBridge;

    /**
     * @description 创建 Scene 子域桥接实例。
     * @returns Scene 子域桥接实例
     */
    createSceneBridge(): ISceneBridge;

    /**
     * @description 创建 Selection 子域桥接实例。
     * @returns Selection 子域桥接实例
     */
    createSelectionBridge(): ISelectionBridge;

    /**
     * @description 创建 Project 子域桥接实例。
     * @returns Project 子域桥接实例
     */
    createProjectBridge(): IProjectBridge;

    /**
     * @description 创建 Panel Host 子域桥接实例。
     * @returns Panel Host 子域桥接实例
     */
    createPanelHostBridge(): IPanelHostBridge;
}
