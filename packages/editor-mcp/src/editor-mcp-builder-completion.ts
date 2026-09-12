import { realpath, stat } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import type { IGrantedRuntimeClientSet } from 'peanut-plugin-sdk';
import type { IEditorMcpBuilderResult } from './editor-mcp-builder-gateway.js';

/**
 * @description 依据 Creator 3.8 的 query-task 契约验证当前任务及真实制品。
 */
export class EditorMcpBuilderCompletion {
    /**
     * @description 受授权的宿主客户端。
     */
    private readonly _runtime: IGrantedRuntimeClientSet;

    /**
     * @description 创建构建完成检查器。
     * @param runtime 受授权客户端。
     */
    public constructor(runtime: IGrantedRuntimeClientSet) {
        this._runtime = runtime;
    }

    /**
     * @description 限时查询唯一任务，仅实际完成并有新鲜制品时报告成功。
     * @param raw 提交响应。
     * @param taskId 本次唯一任务编号。
     * @param platform 本次平台。
     * @param startedAt 提交开始时间。
     * @returns 带明确状态的构建结果。
     */
    public async resolve(
        raw: IEditorMcpBuilderResult,
        taskId: string,
        platform: string,
        startedAt: number,
    ): Promise<IEditorMcpBuilderResult> {
        const base = { ...raw, taskId, success: false };
        if (!raw.available) {
            return {
                ...base,
                status: 'blocked',
                logHints: ['builder_message_unavailable'],
                recommendedNext: { operation: 'preview.queryErrors', input: { limit: 50 } },
            };
        }
        if (raw.data === 0) {
            return { ...base, status: 'busy', logHints: ['builder_busy: no task accepted'] };
        }
        if (raw.data === 2) {
            return { ...base, status: 'failed', logHints: ['builder_parameter_error'] };
        }
        if (raw.data !== 1) {
            return { ...base, status: 'blocked', logHints: ['builder_submission_response_unrecognized'] };
        }
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline) {
            let task: unknown;
            try {
                task = await this._queryTask(taskId, Math.max(1, deadline - Date.now()));
            } catch {
                return { ...base, status: 'accepted', logHints: ['builder_completion_unavailable: inspect Builder task before retrying'] };
            }
            if (EditorMcpBuilderCompletion._record(task) && task.id === taskId) {
                if (task.state === 'failure' || task.state === 'cancel') {
                    return { ...base, data: task, status: 'failed', logHints: ['builder_task_failed_or_cancelled'] };
                }
                if (task.state === 'success' && task.stage === 'build') {
                    const artifacts = await this._artifacts(task.options, platform, startedAt);
                    return {
                        ...base,
                        data: task,
                        artifacts,
                        status: artifacts.length > 0 ? 'completed' : 'blocked',
                        success: artifacts.length > 0,
                        logHints:
                            artifacts.length > 0
                                ? ['builder_task_and_fresh_artifacts_verified']
                                : ['builder_artifacts_missing_stale_or_unsupported'],
                    };
                }
            }
            await new Promise<void>((done) => setTimeout(done, Math.min(500, Math.max(1, deadline - Date.now()))));
        }
        return { ...base, status: 'accepted', logHints: ['builder_completion_timeout: task may still be running; do not resubmit'] };
    }

    /**
     * @description 为不可取消的 IPC 设置等待上界并释放计时器。
     * @param taskId 任务编号。
     * @param timeoutMs 剩余等待时间。
     * @returns 未受信任务数据。
     */
    private async _queryTask(taskId: string, timeoutMs: number): Promise<unknown> {
        const message = this._runtime.message;
        if (message === undefined) {
            throw new Error('builder_message_missing');
        }
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
            return await Promise.race([
                message.request('builder', 'query-task', taskId),
                new Promise<never>((_resolve, reject) => {
                    timer = setTimeout(() => reject(new Error('builder_query_timeout')), timeoutMs);
                }),
            ]);
        } finally {
            if (timer !== undefined) {
                clearTimeout(timer);
            }
        }
    }

    /**
     * @description 仅接受工程内当前构建产生的非空文件，拒绝路径提示与旧产物。
     * @param options Creator 返回的实际任务选项。
     * @param platform 预期平台。
     * @param startedAt 提交时间。
     * @returns 经验证的实际文件路径。
     */
    private async _artifacts(options: unknown, platform: string, startedAt: number): Promise<string[]> {
        if (!EditorMcpBuilderCompletion._record(options) || options.platform !== platform) {
            return [];
        }
        try {
            const project = await this._runtime.projectRead?.getProjectPath();
            if (project === null || project === undefined) {
                return [];
            }
            const root = await realpath(project);
            const destination = EditorMcpBuilderCompletion._readDestination(options);
            if (destination === null) {
                return [];
            }
            const dest = await realpath(resolve(root, destination));
            const rel = relative(root, dest);
            if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
                return [];
            }
            // Web 必须有入口页面；其它平台尚无平台级制品规则，明确阻塞。
            if (platform !== 'web-desktop' && platform !== 'web-mobile') {
                return [];
            }
            const entry = await realpath(resolve(dest, 'index.html'));
            if (relative(dest, entry) !== 'index.html') {
                return [];
            }
            const info = await stat(entry);
            return info.isFile() && info.size > 0 && info.mtimeMs >= startedAt ? [entry] : [];
        } catch {
            return [];
        }
    }

    /** @description 兼容 Creator 返回的 dest 或 buildPath + outputName 任务选项。 */
    private static _readDestination(options: Record<string, unknown>): string | null {
        if (typeof options.dest === 'string' && options.dest.trim().length > 0) {
            return options.dest.trim();
        }
        if (
            typeof options.buildPath !== 'string' ||
            options.buildPath.trim().length === 0 ||
            typeof options.outputName !== 'string' ||
            options.outputName.trim().length === 0
        ) {
            return null;
        }
        const rawBuildPath = options.buildPath.trim();
        const buildPath = rawBuildPath.startsWith('project://') ? rawBuildPath.slice('project://'.length) : rawBuildPath;
        if (/^[a-z][a-z0-9+.-]*:\/\//iu.test(buildPath)) {
            return null;
        }
        return join(buildPath, options.outputName.trim());
    }

    /**
     * @description 缩窄未受信对象，拒绝数组与空值。
     * @param value 输入值。
     * @returns 是否为键值记录。
     */
    private static _record(value: unknown): value is Record<string, unknown> {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
}
