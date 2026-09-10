/**
 * @description 面板会话快照。
 */
export interface IPanelSession {
    /**
     * @description 面板稳定标识。
     */
    readonly panelId: string;

    /**
     * @description 面板所属插件标识。
     */
    readonly pluginId: string;

    /**
     * @description 当前是否处于打开状态。
     */
    readonly isOpen: boolean;

    /**
     * @description 当前会话是否应在下次激活时自动恢复。
     */
    readonly restoreOnActivate: boolean;

    /**
     * @description 上次更新时间，使用 ISO 时间字符串。
     */
    readonly updatedAt: string;
}

/**
 * @description 面板会话存储，用于保存打开状态和热插拔恢复信息。
 */
export class PanelSessionStore {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _sessions = new Map<string, IPanelSession>();

    /**
     * @description 更新指定面板的会话快照。
     * @param pluginId 面板所属插件标识
     * @param panelId 面板稳定标识
     * @param isOpen 当前是否处于打开状态
     * @returns 更新后的面板会话快照
     */
    public update(pluginId: string, panelId: string, isOpen: boolean, restoreOnActivate = false): IPanelSession {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelSession: IPanelSession = {
            panelId,
            pluginId,
            isOpen,
            restoreOnActivate,
            updatedAt: new Date().toISOString(),
        };
        this._sessions.set(this._buildKey(pluginId, panelId), panelSession);
        return panelSession;
    }

    /**
     * @description 将指定面板会话标记为待恢复。
     * @param pluginId 面板所属插件标识
     * @param panelId 面板稳定标识
     * @returns 更新后的面板会话快照；不存在时返回 `null`
     */
    public markForRestore(pluginId: string, panelId: string): IPanelSession | null {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ panelSession = this.get(pluginId, panelId);
        if (panelSession == null) {
            return null;
        }

        return this.update(pluginId, panelId, false, true);
    }

    /**
     * @description 查询指定面板的会话快照。
     * @param pluginId 面板所属插件标识
     * @param panelId 面板稳定标识
     * @returns 命中时返回面板会话快照，否则返回 `null`
     */
    public get(pluginId: string, panelId: string): IPanelSession | null {
        return this._sessions.get(this._buildKey(pluginId, panelId)) ?? null;
    }

    /**
     * @description 删除指定面板的会话快照。
     * @param pluginId 面板所属插件标识
     * @param panelId 面板稳定标识
     * @returns 是否确实删除了一条会话记录
     */
    public delete(pluginId: string, panelId: string): boolean {
        return this._sessions.delete(this._buildKey(pluginId, panelId));
    }

    /**
     * @description 返回指定插件的所有面板会话快照。
     * @param pluginId 插件标识
     * @returns 插件面板会话快照的只读列表
     */
    public listPluginSessions(pluginId: string): readonly IPanelSession[] {
        // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
        const /* 累积当前流程产生的有序结果，供后续步骤统一返回或消费。 */ panelSessions: IPanelSession[] = [];
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ [, panelSession] of this._sessions) {
            if (panelSession.pluginId === pluginId) {
                panelSessions.push(panelSession);
            }
        }
        return panelSessions;
    }

    /**
     * @description 返回指定插件当前所有待恢复的面板会话快照。
     * @param pluginId 插件标识
     * @returns 待恢复的面板会话快照只读列表
     */
    public listRestorableSessions(pluginId: string): readonly IPanelSession[] {
        return this.listPluginSessions(pluginId).filter((panelSession) => {
            return panelSession.restoreOnActivate;
        });
    }

    /**
     * @description 删除指定插件对应的所有面板会话。
     * @param pluginId 插件标识
     * @returns 无返回值
     */
    public clearPlugin(pluginId: string): void {
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ [sessionKey, session] of this._sessions) {
            if (session.pluginId === pluginId) {
                this._sessions.delete(sessionKey);
            }
        }
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _buildKey(pluginId: string, panelId: string): string {
        return `${pluginId}:${panelId}`;
    }
}
