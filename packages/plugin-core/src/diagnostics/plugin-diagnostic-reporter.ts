import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

import type { IPluginDiagnosticEvent, IPluginDiagnosticExport, PluginDiagnosticSource } from 'peanut-contracts';

import { isMcpControlFlowRefusalCode } from '../mcp/mcp-control-flow-refusal.js';

/**
 * @description 插件边界诊断服务；负责归一化、脱敏、内存查询及项目日志导出。
 */
export class PluginDiagnosticReporter {
    /**
     * @description 当前进程保存的最近诊断事件。
     */
    private readonly _events: IPluginDiagnosticEvent[] = [];
    /**
     * @description 已验证项目中的日志根目录；无项目上下文时为 null。
     */
    private readonly _logDirectory: string | null;
    /**
     * @description 当前项目根目录；用于验证日志路径。
     */
    private readonly _projectPath: string | null;
    /**
     * @description 内存中最多保留的事件数量。
     */
    private readonly _maxEvents: number;

    /**
     * @description 创建插件边界诊断记录器。
     * @param projectPath 当前 Cocos 项目根目录；缺失时只保留内存事件。
     * @param maxEvents 内存中最多保留的事件数量。
     */
    public constructor(projectPath?: string, maxEvents = 500) {
        this._projectPath = projectPath == null ? null : resolve(projectPath);
        this._logDirectory = this._projectPath == null ? null : join(this._projectPath, 'peanut-plugins', 'logs');
        this._maxEvents = Math.max(50, maxEvents);
    }

    /**
     * @description 记录一个插件边界异常。
     * @param input 已归属的插件错误输入。
     * @returns 已记录的规范化诊断事件。
     */
    public record(input: {
        readonly pluginId?: string | null;
        readonly source: PluginDiagnosticSource;
        readonly phase?: string;
        readonly error: unknown;
        readonly context?: Readonly<Record<string, unknown>>;
    }): IPluginDiagnosticEvent {
        const normalized = normalizeError(input.error);
        const event: IPluginDiagnosticEvent = {
            incidentId: `plugin-diagnostic-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            pluginId: input.pluginId ?? null,
            source: input.source,
            phase: input.phase,
            occurredAt: new Date().toISOString(),
            errorMessage: normalized.message,
            errorStack: normalized.stack,
            context: sanitizeContext(input.context ?? {}),
        };
        this._events.push(event);
        while (this._events.length > this._maxEvents) this._events.shift();
        // 契约/护栏拒绝（缺确认、未解析等）属预期业务结果，不得刷 Creator project.log 的 error；
        // 只用单行字符串 warn，避免第二参被 Creator 打成 `Error: ...` 噪音。
        if (isMcpControlFlowRefusalCode(event.errorMessage) || isExpectedMcpPolicyRejection(event.errorMessage)) {
            // Expected control-flow: info only — never console.error / Error object.
            console.info(
                `[plugin:${event.pluginId ?? 'host'}] policy:${event.errorMessage} incident=${event.incidentId}`,
            );
        } else {
            console.error(
                `[plugin:${event.pluginId ?? 'host'}] ${event.errorMessage}`,
                event.errorStack ?? '[no stack available]',
                {
                    source: event.source,
                    phase: event.phase,
                    incidentId: event.incidentId,
                    context: event.context,
                },
            );
        }
        this._writeEvent(event);
        return event;
    }

    /**
     * @description 返回当前内存中的诊断事件。
     * @param pluginId 可选插件标识。
     * @returns 当前内存中的诊断事件快照。
     */
    public list(pluginId?: string): readonly IPluginDiagnosticEvent[] {
        return pluginId == null ? [...this._events] : this._events.filter((event) => event.pluginId === pluginId);
    }

    /**
     * @description 将指定插件诊断事件写入项目 peanut-plugins/logs/<pluginId>。
     * @param pluginId 需要导出诊断事件的插件标识。
     * @returns 导出结果；无事件或未配置项目路径时返回 null。
     */
    public export(pluginId: string): IPluginDiagnosticExport | null {
        const events = this.list(pluginId);
        if (events.length === 0 || this._logDirectory == null) return null;
        const pluginLogDirectory = this._getPluginLogDirectory(pluginId);
        mkdirSync(pluginLogDirectory, { recursive: true });
        const exportedAt = new Date().toISOString();
        const lastEvent = events.length > 0 ? events[events.length - 1] : undefined;
        const fileName = `${exportedAt.replace(/:/gu, '-')}-${safeFilePart(pluginId)}-${lastEvent?.incidentId ?? 'diagnostic'}.json`;
        const filePath = join(pluginLogDirectory, fileName);
        const content = JSON.stringify({ pluginId, exportedAt, events }, null, 4);
        writeFileSync(filePath, content, 'utf8');
        this._rotateLogs(pluginLogDirectory);
        return { pluginId, filePath, bytes: content.length, exportedAt, eventCount: events.length };
    }

    /**
     * @description 按数量和总大小轮转一个插件的日志文件。
     * @param directory 已验证的插件日志目录。
     * @returns 无返回值。
     */
    private _rotateLogs(directory: string): void {
        const entries = readdirSync(directory).map((name) => {
            const filePath = join(directory, name);
            return { filePath, mtime: statSync(filePath).mtimeMs, size: statSync(filePath).size };
        }).sort((left, right) => left.mtime - right.mtime);
        let total = entries.reduce((sum, entry) => sum + entry.size, 0);
        while (entries.length > 100 || total > 10 * 1024 * 1024) {
            const oldest = entries.shift();
            if (oldest == null) break;
            rmSync(oldest.filePath, { force: true });
            total -= oldest.size;
        }
    }

    /**
     * @description 将单次异常持久化为按插件隔离的日志文件；写入失败不得遮蔽原始插件异常。
     * @param event 已归一化的诊断事件。
     * @returns 无返回值。
     */
    private _writeEvent(event: IPluginDiagnosticEvent): void {
        if (this._logDirectory == null) return;
        try {
            const pluginDirectory = this._getPluginLogDirectory(event.pluginId ?? 'host');
            mkdirSync(pluginDirectory, { recursive: true });
            const fileName = `incident-${event.occurredAt.replace(/:/gu, '-')}-${event.incidentId}.json`;
            writeFileSync(join(pluginDirectory, fileName), JSON.stringify(event, null, 4), 'utf8');
            this._rotateLogs(pluginDirectory);
        } catch {
            // 日志落盘是诊断增强能力，不能替代或覆盖被捕获的原始异常。
        }
    }

    /**
     * @description 解析并验证指定插件的日志目录，拒绝项目目录外或符号链接目录。
     * @param pluginId 插件或宿主诊断标识。
     * @returns 已验证的插件日志目录。
     */
    private _getPluginLogDirectory(pluginId: string): string {
        if (this._logDirectory == null || this._projectPath == null) {
            throw new Error('plugin_diagnostic_project_path_unavailable');
        }
        const pluginDirectory = join(this._logDirectory, safeFilePart(pluginId));
        const relativePath = pluginDirectory.slice(this._projectPath.length + 1);
        if (relativePath.startsWith('..') || relativePath.length === 0) {
            throw new Error('plugin_diagnostic_log_path_invalid');
        }
        for (const candidate of [this._projectPath, join(this._projectPath, 'peanut-plugins'), this._logDirectory, pluginDirectory]) {
            if (existsSync(candidate) && lstatSync(candidate).isSymbolicLink()) {
                throw new Error('plugin_diagnostic_log_symbolic_link_rejected');
            }
        }
        return pluginDirectory;
    }
}

/**
 * @description 判断是否为 MCP 契约/护栏类预期拒绝（应记 warn，不记 Creator error）。
 * @param message 错误消息。
 * @returns 是否预期策略拒绝。
 * @oopException 纯消息分类，无对象归属。
 */
function isExpectedMcpPolicyRejection(message: string): boolean {
    const code = message.split(':')[0] ?? message;
    return (
        message.startsWith('core_cocos_mcp_execution_approval_required:') ||
        code === 'core_cocos_mcp_execution_approval_required' ||
        message === 'editor_mcp_destructive_confirmation_required' ||
        message === 'cocos_mcp_destructive_confirmation_required' ||
        message.startsWith('editor_mcp_prefab_root_uuid_unresolved:') ||
        message === 'cocos_editor_scene_hierarchy_invalid' ||
        message.startsWith('editor_mcp_operation_unsupported:') ||
        message.startsWith('editor_mcp_action_unsupported:') ||
        message.startsWith('editor_mcp_capability_unsupported:') ||
        message.startsWith('editor_mcp_lumen_operation_unsupported:') ||
        message.startsWith('product_line_mcp_refused:') ||
        code === 'UNMANAGED_ASSET' ||
        code === 'RESOURCE_CHANGED_OUTSIDE_MCP' ||
        code === 'IMPORT_NOT_VERIFIED' ||
        code.startsWith('silent_asset_') ||
        /^editor_mcp_lumen_[A-Za-z0-9]+_field_unsupported:confirmDestructive$/.test(message) ||
        /^editor_mcp_lumen_[A-Za-z0-9]+_field_unsupported:approvalToken$/.test(message) ||
        /^editor_mcp_lumen_[A-Za-z0-9]+_field_unsupported:resources$/.test(message) ||
        isExpectedLumenClientRejection(message)
    );
}

/**
 * @description 判断是否为 lumen 客户端输入/契约类拒绝（不得刷 project.log error）。
 * @param message 错误消息。
 * @returns 是否预期客户端拒绝。
 * @oopException 纯消息分类，无对象归属。
 */
function isExpectedLumenClientRejection(message: string): boolean {
    const code = message.split(':')[0] ?? message;
    if (
        code.startsWith('editor_mcp_lumen_') ||
        code.startsWith('editor_mcp_bind_') ||
        code === 'mcp_capability_input_invalid'
    ) {
        return true;
    }
    return (
        code.startsWith('lumen_') &&
        !/^(lumen_internal_|lumen_assert_|lumen_invariant_)/u.test(code)
    ) || code === 'silent_create_folder_target_exists';
}

/**
 * @description 将未知异常转换为可安全记录的稳定消息与堆栈。
 * @param error 未知异常。
 * @returns 规范化错误摘要。
 */
function normalizeError(error: unknown): { message: string; stack?: string } {
    if (error instanceof Error) return { message: error.message, stack: error.stack };
    if (typeof error === 'string') return { message: error };
    if (isErrorLike(error)) {
        if (typeof error.message === 'string') {
            return { message: error.message, stack: typeof error.stack === 'string' ? error.stack : undefined };
        }
    }
    try { return { message: JSON.stringify(error) }; } catch { return { message: 'unknown_plugin_error' }; }
}

/**
 * @description 判断未知对象是否具有可读取的错误消息或堆栈字段。
 * @param value 未知错误值。
 * @returns 可作为错误样式对象读取时返回 true。
 */
function isErrorLike(value: unknown): value is { readonly message?: unknown; readonly stack?: unknown } {
    return typeof value === 'object' && value != null && !Array.isArray(value);
}

/**
 * @description 对诊断上下文中的潜在敏感字段进行脱敏。
 * @param context 未脱敏上下文。
 * @returns 脱敏后的上下文。
 */
function sanitizeContext(context: Readonly<Record<string, unknown>>): Readonly<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(context)) {
        if (/token|authorization|password|secret|api[-_]?key|access[-_]?key/i.test(key)) {
            result[key] = '[REDACTED]';
        } else if (typeof value === 'string' && /^(\/|[A-Za-z]:\\)/u.test(value)) {
            result[key] = '[PATH_REDACTED]';
        } else {
            result[key] = value;
        }
    }
    return result;
}

/**
 * @description 将插件标识转换为单个安全文件名片段。
 * @param value 原始标识。
 * @returns 安全文件名片段。
 */
function safeFilePart(value: string): string {
    return value.replace(/[^A-Za-z0-9._-]/gu, '_').slice(0, 120) || 'plugin';
}
