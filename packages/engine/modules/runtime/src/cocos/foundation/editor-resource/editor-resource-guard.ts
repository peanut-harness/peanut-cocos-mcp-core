/**
 * @description 编辑器当前打开资源的种类。
 */
export type EditorResourceKind = 'scene' | 'asset';

/**
 * @description 经守卫校验后的编辑器资源引用。
 */
export interface IEditorResourceRef {
    /** @description 资源种类；仅 scene 允许走 open-scene。 */
    readonly kind: EditorResourceKind;
    /** @description 资源 uuid；资产恢复时优先使用。 */
    readonly uuid: string;
    /** @description 合法的 `db://assets/...` 路径；场景恢复时必须使用。 */
    readonly dbPath?: string;
}

/**
 * @description 编辑器资源恢复动作。
 */
export type EditorResourceRestoreAction =
    | { readonly kind: 'open-scene'; readonly dbPath: string }
    | { readonly kind: 'open-asset'; readonly uuid: string }
    | { readonly kind: 'skip'; readonly reason: string };

/**
 * @description 禁止将非法路径（如 project.log）当作场景打开的资源守卫。
 */
export class EditorResourceGuard {
    /** @description 禁止出现在可恢复路径中的片段。 */
    private static readonly _blockedPathFragments: readonly string[] = ['/temp/', '\\temp\\'];

    /** @description 禁止当作场景或恢复目标的扩展名。 */
    private static readonly _blockedExtensions: readonly string[] = [
        '.log',
        '.json',
        '.meta',
        '.ts',
        '.js',
        '.mjs',
        '.cjs',
    ];

    /**
     * @description 从 uuid 与 url 解析可恢复的编辑器资源；非法目标返回 `undefined`。
     * @param uuid 当前资源 uuid；可缺省。
     * @param url 当前资源 url / 路径；可缺省。
     * @returns 合法资源引用；无法确认或命中黑名单时返回 `undefined`。
     */
    public resolve(uuid: string | undefined, url: string | undefined): IEditorResourceRef | undefined {
        const normalizedUuid = this._readNonEmpty(uuid);
        const rawUrl = this._readNonEmpty(url);
        if (rawUrl != null && this._isBlockedPath(rawUrl)) {
            return undefined;
        }
        const dbPath = this._readDbAssetsPath(url);
        if (normalizedUuid == null && dbPath == null) {
            return undefined;
        }
        const candidate = dbPath ?? '';
        if (this._isBlockedPath(candidate)) {
            return undefined;
        }
        if (/\.scene$/iu.test(candidate)) {
            return {
                kind: 'scene',
                uuid: normalizedUuid ?? candidate,
                dbPath: candidate,
            };
        }
        if (normalizedUuid == null) {
            return undefined;
        }
        return {
            kind: 'asset',
            uuid: normalizedUuid,
            ...(dbPath == null ? {} : { dbPath }),
        };
    }

    /**
     * @description 根据已解析资源决定恢复动作；无法确认时跳过，绝不调用 open-scene。
     * @param resource 守卫解析结果；`undefined` 表示跳过。
     * @returns 恢复动作。
     */
    public planRestore(resource: IEditorResourceRef | undefined): EditorResourceRestoreAction {
        if (resource == null) {
            return { kind: 'skip', reason: 'editor_resource_restore_skipped:unresolved' };
        }
        if (resource.kind === 'scene') {
            const dbPath = resource.dbPath;
            if (dbPath == null || !dbPath.startsWith('db://assets/') || !/\.scene$/iu.test(dbPath)) {
                return { kind: 'skip', reason: 'editor_resource_restore_skipped:invalid_scene' };
            }
            if (this._isBlockedPath(dbPath)) {
                return { kind: 'skip', reason: 'editor_resource_restore_skipped:blocked_scene' };
            }
            return { kind: 'open-scene', dbPath };
        }
        if (resource.uuid.length === 0) {
            return { kind: 'skip', reason: 'editor_resource_restore_skipped:missing_uuid' };
        }
        return { kind: 'open-asset', uuid: resource.uuid };
    }

    /**
     * @description 判断路径是否允许作为「可打开场景」目标（用于守卫/校验）。
     * 注意：Creator 消息 `open-scene` 的实参必须是 **UUID**，不能把本方法返回的 `db://` 直接传入，
     * 否则会拼成 `import://db/db://…` 并失败。
     * @param pathOrUrl 待检查路径或 db URL。
     * @returns 仅当路径为 assets 下的 `.scene` 且未命中黑名单时为 `true`。
     */
    public canOpenAsScene(pathOrUrl: string): boolean {
        const dbPath = this._readDbAssetsPath(pathOrUrl);
        if (dbPath == null || !/\.scene$/iu.test(dbPath)) {
            return false;
        }
        return !this._isBlockedPath(dbPath);
    }

    /**
     * @description 规范化非空字符串。
     * @param value 未校验输入。
     * @returns 非空字符串或 `undefined`。
     */
    private _readNonEmpty(value: string | undefined): string | undefined {
        if (value == null) {
            return undefined;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    /**
     * @description 将输入收窄为 `db://assets/` 路径。
     * @param value 未校验 url / 路径。
     * @returns 合法 db 路径或 `undefined`。
     */
    private _readDbAssetsPath(value: string | undefined): string | undefined {
        const trimmed = this._readNonEmpty(value);
        if (trimmed == null) {
            return undefined;
        }
        const normalized = trimmed.replace(/\\/gu, '/');
        if (normalized.startsWith('db://assets/')) {
            return normalized;
        }
        if (normalized.startsWith('assets/')) {
            return `db://${normalized}`;
        }
        return undefined;
    }

    /**
     * @description 判断路径是否命中 temp / 日志 / 脚本等禁止恢复名单。
     * @param pathValue 已规范化路径。
     * @returns 命中黑名单时为 `true`。
     */
    private _isBlockedPath(pathValue: string): boolean {
        if (pathValue.length === 0) {
            return false;
        }
        const lower = pathValue.toLowerCase();
        for (const fragment of EditorResourceGuard._blockedPathFragments) {
            if (lower.includes(fragment.toLowerCase())) {
                return true;
            }
        }
        for (const extension of EditorResourceGuard._blockedExtensions) {
            if (lower.endsWith(extension)) {
                return true;
            }
        }
        return false;
    }
}
