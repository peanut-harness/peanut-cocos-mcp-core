import {
    EditorResourceGuard,
    type EditorResourceRestoreAction,
    type IEditorResourceRef,
} from './editor-resource-guard.js';

/**
 * @description 执行编辑器资源恢复所需的最小消息端口。
 */
export interface IEditorResourceMessagePort {
    /**
     * @description 向 Creator 发送请求。
     * @param target 消息目标。
     * @param message 消息名。
     * @param args 参数。
     * @returns 宿主结果。
     */
    request(target: string, message: string, ...args: unknown[]): Promise<unknown>;
}

/**
 * @description 安全恢复编辑器资源的结果。
 */
export interface IEditorResourceRestoreResult {
    /** @description 实际采取的动作。 */
    readonly action: EditorResourceRestoreAction;
    /** @description 宿主调用结果；skip 时为 `null`。 */
    readonly restored: unknown | null;
}

/**
 * @description 在打开 Prefab 等写操作后，按守卫规则安全恢复先前编辑器资源。
 */
export class EditorResourceRestorer {
    /** @description 路径合法性守卫。 */
    private readonly _guard: EditorResourceGuard;
    /** @description Creator 消息端口。 */
    private readonly _message: IEditorResourceMessagePort;

    /**
     * @description 创建恢复器。
     * @param message 可调用 `scene` / `asset-db` 的消息端口。
     * @param guard 可选自定义守卫；默认新建。
     */
    public constructor(message: IEditorResourceMessagePort, guard?: EditorResourceGuard) {
        this._message = message;
        this._guard = guard ?? new EditorResourceGuard();
    }

    /**
     * @description 解析当前 uuid/url 为可恢复资源引用。
     * @param uuid 当前资源 uuid。
     * @param url 当前资源 url。
     * @returns 合法引用或 `undefined`。
     */
    public resolveCurrent(
        uuid: string | undefined,
        url: string | undefined,
    ): IEditorResourceRef | undefined {
        return this._guard.resolve(uuid, url);
    }

    /**
     * @description 按守卫计划恢复资源；非法目标跳过且不调用 open-scene。
     * @param resource 已解析资源；`undefined` 表示跳过。
     * @returns 恢复结果。
     */
    public async restore(
        resource: IEditorResourceRef | undefined,
    ): Promise<IEditorResourceRestoreResult> {
        const action = this._guard.planRestore(resource);
        if (action.kind === 'skip') {
            return { action, restored: null };
        }
        if (action.kind === 'open-scene') {
            if (!this._guard.canOpenAsScene(action.dbPath)) {
                return {
                    action: {
                        kind: 'skip',
                        reason: 'editor_resource_restore_skipped:blocked_scene',
                    },
                    restored: null,
                };
            }
            try {
                const uuid =
                    resource != null &&
                    typeof resource.uuid === 'string' &&
                    resource.uuid.trim().length > 0
                        ? resource.uuid.trim()
                        : await this._resolveUuid(action.dbPath);
                if (uuid == null || uuid.length === 0) {
                    return {
                        action: {
                            kind: 'skip',
                            reason: 'editor_resource_restore_failed:uuid_unresolved',
                        },
                        restored: null,
                    };
                }
                // Creator open-scene 只要 UUID；传 db:// 会拼成 import://db/db://…。
                if (uuid.includes('://') || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(uuid)) {
                    return {
                        action: {
                            kind: 'skip',
                            reason: 'editor_resource_restore_failed:open_scene_requires_uuid',
                        },
                        restored: null,
                    };
                }
                const restored = await this._message.request('scene', 'open-scene', uuid);
                return { action, restored };
            } catch {
                return {
                    action: {
                        kind: 'skip',
                        reason: 'editor_resource_restore_failed:open_scene',
                    },
                    restored: null,
                };
            }
        }
        try {
            const restored = await this._message.request(
                'asset-db',
                'open-asset',
                action.uuid,
            );
            return { action, restored };
        } catch {
            return {
                action: {
                    kind: 'skip',
                    reason: 'editor_resource_restore_failed:open_asset',
                },
                restored: null,
            };
        }
    }

    /**
     * @description 将场景 db 路径解析为 UUID（恢复兜底）。
     * @param dbPath `db://assets/...scene`。
     * @returns UUID 或 null。
     */
    private async _resolveUuid(dbPath: string): Promise<string | null> {
        try {
            const raw = await this._message.request('asset-db', 'query-uuid', dbPath);
            if (typeof raw === 'string' && raw.trim().length > 0) {
                return raw.trim();
            }
        } catch {
            // fall through
        }
        return null;
    }
}
