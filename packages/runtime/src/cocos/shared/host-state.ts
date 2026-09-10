/**
 * @description Creator 宿主内存状态，用于在骨架阶段模拟消息、资源、场景脚本和面板行为。
 */
export interface IPanelHostSessionRecord {
    /**
     * @description 面板稳定标识。
     */
    readonly panelId: string;

    /**
     * @description 面板前端入口路径。
     */
    entry: string;

    /**
     * @description 当前面板是否处于打开状态。
     */
    isOpen: boolean;

    /**
     * @description 当前面板是否存在浏览器侧上下文对象。
     */
    browserWindow: Record<string, unknown> | null;

    /**
     * @description 当前 bootstrap 脚本文本。
     */
    bootstrapScript: string | null;

    /**
     * @description 面板打开时间，使用 ISO 时间字符串。
     */
    openedAt: string;

    /**
     * @description 上次聚焦时间，使用 ISO 时间字符串；从未聚焦时返回 `null`。
     */
    focusedAt: string | null;
}

/**
 * @description 面板宿主快照。
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
 * @description 资源刷新后的宿主快照。
 */
export interface IAssetRefreshSnapshot extends Record<string, unknown> {
    /**
     * @description 资源路径或 uuid。
     */
    readonly pathOrUuid: string;

    /**
     * @description 最近一次刷新时间，使用 ISO 时间字符串。
     */
    readonly refreshedAt: string;
}

/**
 * @description 场景节点宿主记录。
 */
export interface ISceneNodeRecord {
    /**
     * @description 场景节点稳定标识。
     */
    readonly nodeId: string;

    /**
     * @description 当前节点快照。
     */
    state: Record<string, unknown>;

    /**
     * @description 最近一次更新时间，使用 ISO 时间字符串。
     */
    updatedAt: string;
}

/** @description 当前模块的业务实现类，用于承载相关流程与协作状态。 */
export class CreatorHostState {
    /** @description 保存实例生命周期内需要复用的状态或协作依赖。 */
    private readonly _assetEntries = new Map<string, unknown>();
    /** @description 保存实例生命周期内需要复用的状态或协作依赖。 */
    private readonly _sceneNodeEntries = new Map<string, ISceneNodeRecord>();
    /** @description 保存实例生命周期内需要复用的状态或协作依赖。 */
    private readonly _panelHostSessionEntries = new Map<string, IPanelHostSessionRecord>();
    /** @description 保存实例生命周期内需要复用的状态或协作依赖。 */
    private _selectionIds: readonly string[] = [];
    /** @description 保存实例生命周期内需要复用的状态或协作依赖。 */
    private _projectPath: string | null = null;
    /** @description 保存实例生命周期内需要复用的状态或协作依赖。 */
    private _projectName: string | null = null;
    /** @description 保存实例生命周期内需要复用的状态或协作依赖。 */
    private readonly _messageLogEntries: Array<{
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        target: string;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        message: string;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        args: readonly unknown[];
    }> = [];

    /**
     * @description 查询指定资源键对应的资源数据。
     * @param pathOrUuid 资源路径或 uuid
     * @returns 命中时返回资源数据，否则返回 `null`
     */
    public getAsset(pathOrUuid: string): unknown | null {
        // 保存当前流程需要复用的索引或缓存状态，归当前作用域或实例管理。
        const directAsset = this._assetEntries.get(pathOrUuid);
        if (directAsset != null) {
            return directAsset;
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。

        for (const assetValue of this._assetEntries.values()) {
            if (
                typeof assetValue === 'object' &&
                assetValue != null &&
                'uuid' in assetValue &&
                typeof assetValue.uuid === 'string' &&
                assetValue.uuid === pathOrUuid
            ) {
                return assetValue;
            }
        }

        return null;
    }

    /**
     * @description 写入一个资源数据快照。
     * @param pathOrUuid 资源路径或 uuid
     * @param assetValue 要保存的资源数据
     * @returns 无返回值
     */
    public setAsset(pathOrUuid: string, assetValue: unknown): void {
        this._assetEntries.set(pathOrUuid, assetValue);
    }

    /** @description 删除指定资源数据快照。 @param pathOrUuid 已验证的资源路径或 uuid。 */
    public deleteAsset(pathOrUuid: string): void {
        this._assetEntries.delete(pathOrUuid);
    }

    /**
     * @description 刷新一个资源数据快照，并记录最近刷新时间。
     * @param pathOrUuid 资源路径或 uuid
     * @returns 刷新后的资源快照；未命中时返回 `null`
     */
    public refreshAsset(pathOrUuid: string): IAssetRefreshSnapshot | null {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const assetValue = this.getAsset(pathOrUuid);
        if (assetValue == null) {
            return null;
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const refreshedAt = new Date().toISOString();
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const assetRecord =
            typeof assetValue === 'object' && assetValue != null
                ? {
                      ...(assetValue as Record<string, unknown>),
                  }
                : {
                      value: assetValue,
                  };
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const assetSnapshot: IAssetRefreshSnapshot = {
            ...assetRecord,
            pathOrUuid,
            refreshedAt,
        };
        this._assetEntries.set(pathOrUuid, assetSnapshot);
        return assetSnapshot;
    }

    /**
     * @description 查询指定场景节点快照。
     * @param nodeId 场景节点稳定标识
     * @returns 命中时返回节点快照，否则返回 `null`
     */
    public getSceneNode(nodeId: string): Record<string, unknown> | null {
        return this._sceneNodeEntries.get(nodeId)?.state ?? null;
    }

    /**
     * @description 返回当前场景的所有节点快照。
     * @returns 场景节点快照列表
     */
    public listSceneNodes(): readonly Record<string, unknown>[] {
        return [...this._sceneNodeEntries.values()].map((entry) => {
            return {
                ...entry.state,
            };
        });
    }

    /**
     * @description 写入一个场景节点快照。
     * @param nodeId 场景节点稳定标识
     * @param nodeState 节点状态快照
     * @returns 无返回值
     */
    public setSceneNode(nodeId: string, nodeState: Record<string, unknown>): void {
        this._sceneNodeEntries.set(nodeId, {
            nodeId,
            state: {
                ...nodeState,
            },
            updatedAt: new Date().toISOString(),
        });
    }

    /**
     * @description 为指定场景节点应用一个补丁对象。
     * @param nodeId 场景节点稳定标识
     * @param patch 需要写入节点的补丁字段
     * @returns 返回补丁后的节点快照
     */
    public patchSceneNode(nodeId: string, patch: Record<string, unknown>): Record<string, unknown> {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const currentNodeState = this.getSceneNode(nodeId) ?? {
            nodeId,
        };
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const nextNodeState = {
            ...currentNodeState,
            ...patch,
            nodeId,
            updatedAt: new Date().toISOString(),
        };
        this.setSceneNode(nodeId, nextNodeState);
        return nextNodeState;
    }

    /**
     * @description 记录一条消息发送日志。
     * @param target 消息目标标识
     * @param message 消息名称
     * @param args 消息参数列表
     * @returns 无返回值
     */
    public appendMessage(target: string, message: string, args: readonly unknown[]): void {
        this._messageLogEntries.push({
            target,
            message,
            args,
        });
    }

    /**
     * @description 返回当前宿主选择集标识列表。
     * @returns 当前选择标识列表
     */
    public getSelectionIds(): readonly string[] {
        return [...this._selectionIds];
    }

    /**
     * @description 更新当前宿主选择集标识列表。
     * @param selectionIds 当前选择标识列表
     * @returns 无返回值
     */
    public setSelectionIds(selectionIds: readonly string[]): void {
        this._selectionIds = [...selectionIds];
    }

    /**
     * @description 返回当前项目根目录。
     * @returns 当前项目根目录；未知时返回 `null`
     */
    public getProjectPath(): string | null {
        return this._projectPath;
    }

    /**
     * @description 返回当前项目显示名称。
     * @returns 当前项目显示名称；未知时返回 `null`
     */
    public getProjectName(): string | null {
        return this._projectName;
    }

    /**
     * @description 更新当前项目基础信息。
     * @param projectPath 当前项目根目录
     * @param projectName 当前项目显示名称
     * @returns 无返回值
     */
    public configureProject(projectPath: string | null, projectName: string | null): void {
        this._projectPath = projectPath;
        this._projectName = projectName;
    }

    /**
     * @description 返回当前消息发送日志快照。
     * @returns 消息发送日志的只读快照
     */
    public listMessages(): readonly {
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        target: string;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        message: string;
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        args: readonly unknown[];
    }[] {
        return this._messageLogEntries;
    }

    /**
     * @description 打开或恢复一个面板。
     * @param panelId 面板稳定标识
     * @param entry 面板前端入口路径
     * @returns 无返回值
     */
    public openPanel(panelId: string, entry: string): void {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelHostSessionRecord = this._panelHostSessionEntries.get(panelId);
        if (panelHostSessionRecord != null) {
            panelHostSessionRecord.entry = entry;
            panelHostSessionRecord.isOpen = true;
            return;
        }

        this._panelHostSessionEntries.set(panelId, {
            panelId,
            entry,
            isOpen: true,
            browserWindow: null,
            bootstrapScript: null,
            openedAt: new Date().toISOString(),
            focusedAt: null,
        });
    }

    /**
     * @description 关闭一个面板。
     * @param panelId 面板稳定标识
     * @returns 无返回值
     */
    public closePanel(panelId: string): void {
        this._panelHostSessionEntries.delete(panelId);
    }

    /**
     * @description 判断一个面板当前是否处于打开状态。
     * @param panelId 面板稳定标识
     * @returns 当前打开时返回 `true`
     */
    public isPanelOpen(panelId: string): boolean {
        return this._panelHostSessionEntries.get(panelId)?.isOpen ?? false;
    }

    /**
     * @description 为指定面板写入 bootstrap 脚本文本。
     * @param panelId 面板稳定标识
     * @param bootstrapScript 供宿主在页面初始化时注入的脚本文本
     * @returns 无返回值
     */
    public setPanelBootstrapScript(panelId: string, bootstrapScript: string): void {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelHostSessionRecord = this._requirePanelHostSessionRecord(panelId);
        panelHostSessionRecord.bootstrapScript = bootstrapScript;
    }

    /**
     * @description 为指定面板绑定浏览器侧上下文对象。
     * @param panelId 面板稳定标识
     * @param browserWindow 宿主实际持有的浏览器侧对象
     * @returns 无返回值
     */
    public attachPanelBrowserWindow(panelId: string, browserWindow: Record<string, unknown>): void {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelHostSessionRecord = this._requirePanelHostSessionRecord(panelId);
        panelHostSessionRecord.browserWindow = browserWindow;
    }

    /**
     * @description 为指定面板记录一次聚焦。
     * @param panelId 面板稳定标识
     * @returns 无返回值
     */
    public focusPanel(panelId: string): void {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelHostSessionRecord = this._requirePanelHostSessionRecord(panelId);
        panelHostSessionRecord.focusedAt = new Date().toISOString();
    }

    /**
     * @description 查询指定面板的宿主会话快照。
     * @param panelId 面板稳定标识
     * @returns 命中时返回宿主会话快照，否则返回 `null`
     */
    public getPanelSession(panelId: string): IPanelHostSessionSnapshot | null {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelHostSessionRecord = this._panelHostSessionEntries.get(panelId);
        if (panelHostSessionRecord == null) {
            return null;
        }
        return this._toPanelHostSessionSnapshot(panelHostSessionRecord);
    }

    /**
     * @description 返回当前所有面板的宿主会话快照。
     * @returns 宿主会话快照只读列表
     */
    public listPanelSessions(): readonly IPanelHostSessionSnapshot[] {
        return [...this._panelHostSessionEntries.values()].map((panelHostSessionRecord) => {
            return this._toPanelHostSessionSnapshot(panelHostSessionRecord);
        });
    }

    /**
     * @description 查询指定面板当前绑定的浏览器侧上下文对象。
     * @param panelId 面板稳定标识
     * @returns 命中时返回浏览器侧上下文对象，否则返回 `null`
     */
    public getPanelBrowserWindow(panelId: string): Record<string, unknown> | null {
        return this._panelHostSessionEntries.get(panelId)?.browserWindow ?? null;
    }

    /** @description 封装当前内部处理步骤，供本类流程复用并维持状态一致性。 */
    private _requirePanelHostSessionRecord(panelId: string): IPanelHostSessionRecord {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const panelHostSessionRecord = this._panelHostSessionEntries.get(panelId);
        if (panelHostSessionRecord == null) {
            throw new Error(`Panel "${panelId}" is not currently open.`);
        }
        return panelHostSessionRecord;
    }

    /** @description 封装当前内部处理步骤，供本类流程复用并维持状态一致性。 */
    private _toPanelHostSessionSnapshot(panelHostSessionRecord: IPanelHostSessionRecord): IPanelHostSessionSnapshot {
        return {
            panelId: panelHostSessionRecord.panelId,
            entry: panelHostSessionRecord.entry,
            isOpen: panelHostSessionRecord.isOpen,
            hasFocus: panelHostSessionRecord.focusedAt != null,
            hasBrowserWindow: panelHostSessionRecord.browserWindow != null,
            hasBootstrapScript: panelHostSessionRecord.bootstrapScript != null,
            bootstrapScript: panelHostSessionRecord.bootstrapScript,
            openedAt: panelHostSessionRecord.openedAt,
            focusedAt: panelHostSessionRecord.focusedAt,
        };
    }
}


