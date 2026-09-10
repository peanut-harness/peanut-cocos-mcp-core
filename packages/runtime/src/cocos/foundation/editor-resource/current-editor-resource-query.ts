import {
    EditorResourceGuard,
    type EditorResourceRestoreAction,
    type IEditorResourceRef,
} from './editor-resource-guard.js';

/**
 * @description 查询当前编辑器资源所需的消息端口。
 */
export interface ICurrentEditorResourceMessagePort {
    /**
     * @description 向 Creator 发送请求。
     * @param target 目标。
     * @param message 消息。
     * @param args 参数。
     * @returns 结果。
     */
    request(target: string, message: string, ...args: unknown[]): Promise<unknown>;
}

/**
 * @description `scene.queryCurrentEditorResource` 的结构化结果。
 */
export interface ICurrentEditorResourceSnapshot {
    /** @description 原始 uuid（可能非法）。 */
    readonly uuid: string | null;
    /** @description 原始 url。 */
    readonly url: string | null;
    /** @description 守卫解析后的资源；非法时为 `null`。 */
    readonly resource: IEditorResourceRef | null;
    /** @description 若立即恢复将采取的动作。 */
    readonly restorePlan: EditorResourceRestoreAction;
    /** @description 是否允许对该 url 调用 open-scene。 */
    readonly canOpenAsScene: boolean;
}

/**
 * @description 查询当前编辑器打开资源，并给出安全恢复计划（不执行打开）。
 */
export class CurrentEditorResourceQuery {
    /** @description 守卫。 */
    private readonly _guard: EditorResourceGuard;
    /** @description 消息端口。 */
    private readonly _message: ICurrentEditorResourceMessagePort;

    /**
     * @description 创建查询器。
     * @param message 消息端口。
     * @param guard 可选守卫。
     */
    public constructor(message: ICurrentEditorResourceMessagePort, guard?: EditorResourceGuard) {
        this._message = message;
        this._guard = guard ?? new EditorResourceGuard();
    }

    /**
     * @description 查询当前场景/资源并解析守卫结果。
     * @returns 快照。
     */
    public async query(): Promise<ICurrentEditorResourceSnapshot> {
        const raw = await this._message.request('scene', 'query-current-scene');
        const record =
            raw != null && typeof raw === 'object' && !Array.isArray(raw)
                ? (raw as Record<string, unknown>)
                : {};
        const uuid = this._readString(record.uuid);
        const url =
            this._readString(record.url) ??
            this._readString(record.sceneUrl) ??
            this._readString(record.path);
        const resource = this._guard.resolve(uuid ?? undefined, url ?? undefined);
        const restorePlan = this._guard.planRestore(resource);
        return {
            uuid,
            url,
            resource: resource ?? null,
            restorePlan,
            canOpenAsScene: url != null ? this._guard.canOpenAsScene(url) : false,
        };
    }

    /**
     * @description 读取可选字符串。
     * @param value 输入。
     * @returns 字符串或 null。
     */
    private _readString(value: unknown): string | null {
        if (typeof value !== 'string') {
            return null;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }
}
