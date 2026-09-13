import type { IsoDateTimeString, PluginId } from '../shared/common-contracts.js';

/**
 * @description 插件边界诊断来源。
 */
export type PluginDiagnosticSource =
    | 'module_load'
    | 'lifecycle'
    | 'panel_request'
    | 'panel_message'
    | 'event_listener'
    | 'plugin_command'
    | 'mcp_capability'
    | 'browser_error'
    | 'browser_unhandled_rejection'
    | 'host_unhandled_rejection'
    | 'diagnostic_export';

/**
 * @description 单次插件异常诊断事件。
 */
export interface IPluginDiagnosticEvent {
    /**
     * @description 诊断事件唯一标识。
     */
    readonly incidentId: string;
    /**
     * @description 无法归属到具体插件时为 null。
     */
    readonly pluginId: PluginId | null;
    /**
     * @description 诊断来源。
     */
    readonly source: PluginDiagnosticSource;
    /**
     * @description 可选生命周期阶段或业务阶段。
     */
    readonly phase?: string;
    /**
     * @description 发生时间。
     */
    readonly occurredAt: IsoDateTimeString;
    /**
     * @description 稳定错误消息。
     */
    readonly errorMessage: string;
    /**
     * @description 错误堆栈。
     */
    readonly errorStack?: string;
    /**
     * @description 脱敏后的上下文。
     */
    readonly context: Readonly<Record<string, unknown>>;
}

/**
 * @description 导出的插件诊断日志结果。
 */
export interface IPluginDiagnosticExport {
    /**
     * @description 插件标识。
     */
    readonly pluginId: PluginId;
    /**
     * @description 导出文件绝对路径。
     */
    readonly filePath: string;
    /**
     * @description 导出文件字节数。
     */
    readonly bytes: number;
    /**
     * @description 导出时间。
     */
    readonly exportedAt: IsoDateTimeString;
    /**
     * @description 导出的诊断事件数量。
     */
    readonly eventCount: number;
}
