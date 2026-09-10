import type { IPluginLogger } from './plugin-manager-contracts.js';

/**
 * @description Creator 主进程中查询界面语言所需的最小 API。
 */
interface ICocosEditorLanguageApi {
    readonly I18n?: {
        getLanguage?: () => unknown;
    };
}

/**
 * @description 中文界面下可直接翻译的稳定插件生命周期事件码。
 */
const PLUGIN_LOG_MESSAGES_ZH: Readonly<Record<string, string>> = {
    figma_provider_registered: 'Figma Provider 已注册',
    figma_provider_activating: 'Figma Provider 正在激活',
    psd_provider_registered: 'PSD Provider 已注册',
    editor_mcp_registered: 'Editor MCP 已注册',
    sdf_font_provider_registered: 'SDF Font Provider 已注册',
    ui_prefab_registered: 'UI Prefab Provider 已注册',
};

/**
 * @description 英文界面下可直接翻译的稳定插件生命周期事件码。
 */
const PLUGIN_LOG_MESSAGES_EN: Readonly<Record<string, string>> = {
    figma_provider_registered: 'Figma provider registered',
    figma_provider_activating: 'Figma provider activating',
    psd_provider_registered: 'PSD provider registered',
    editor_mcp_registered: 'Editor MCP registered',
    sdf_font_provider_registered: 'SDF Font provider registered',
    ui_prefab_registered: 'UI Prefab provider registered',
};

/**
 * @description 判断给定语言标识是否应使用中文日志。
 * @param locale Creator 或系统提供的语言标识。
 * @returns 语言标识为任意中文变体时返回 `true`。
 */
function isChineseLocale(locale: unknown): boolean {
    return typeof locale === 'string' && locale.trim().toLowerCase().startsWith('zh');
}

/**
 * @description 获取当前日志显示语言，优先与 Creator 界面语言保持一致。
 * @returns Creator 界面语言；不可用时返回系统区域语言。
 */
function getCurrentLogLocale(): unknown {
    const editor = (globalThis as { readonly Editor?: ICocosEditorLanguageApi }).Editor;
    const editorLocale = editor?.I18n?.getLanguage?.();
    return typeof editorLocale === 'string' && editorLocale.trim().length > 0
        ? editorLocale
        : Intl.DateTimeFormat().resolvedOptions().locale;
}

/**
 * @description 将已知插件生命周期事件码转换为当前语言的可读日志。
 * @param message 插件写入日志的稳定事件码。
 * @param locale Creator 或系统提供的语言标识。
 * @returns 已知事件的本地化文本；未知事件码保持原样。
 */
function formatLifecycleMessage(message: string, locale: unknown): string {
    const messages = isChineseLocale(locale) ? PLUGIN_LOG_MESSAGES_ZH : PLUGIN_LOG_MESSAGES_EN;
    const staticMessage = messages[message];
    if (staticMessage != null) {
        return staticMessage;
    }
    const activation = /^(figma|editor_mcp|ui_prefab)_activated:(.+)$/u.exec(message);
    if (activation == null) {
        return message;
    }
    const labels: Readonly<Record<string, string>> = isChineseLocale(locale)
        ? { figma: 'Figma Provider 已激活', editor_mcp: 'Editor MCP 已激活', ui_prefab: 'UI Prefab Provider 已激活' }
        : { figma: 'Figma provider activated', editor_mcp: 'Editor MCP activated', ui_prefab: 'UI Prefab provider activated' };
    const activationLabel = labels[activation[1]];
    if (activationLabel == null) {
        return message;
    }
    return `${activationLabel}: ${activation[2]}`;
}

/**
 * @description 格式化插件日志消息，使已知生命周期事件与当前界面语言一致。
 * @param message 插件提供的日志消息或稳定事件码。
 * @param locale 用于格式化日志的语言标识。
 * @returns 已本地化或保持原样的日志消息。
 */
export function formatPluginLogMessage(message: string, locale: unknown = getCurrentLogLocale()): string {
    return formatLifecycleMessage(message, locale);
}

/**
 * @description 默认插件日志实现，当前阶段使用宿主控制台输出结构化日志。
 */
export class DefaultPluginLogger implements IPluginLogger {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _pluginId: string;

    /**
     * @description 创建一个新的默认插件日志器。
     * @param pluginId 当前插件标识
     */
    public constructor(pluginId: string) {
        this._pluginId = pluginId;
    }

    /**
     * @description 记录普通日志。
     * @param message 日志消息
     * @param extra 附加上下文
     * @returns 无返回值
     */
    public info(message: string, extra?: Record<string, unknown>): void {
        console.info(`[plugin:${this._pluginId}] ${formatPluginLogMessage(message)}`, extra ?? {});
    }

    /**
     * @description 记录告警日志。
     * @param message 告警消息
     * @param extra 附加上下文
     * @returns 无返回值
     */
    public warn(message: string, extra?: Record<string, unknown>): void {
        console.warn(`[plugin:${this._pluginId}] ${formatPluginLogMessage(message)}`, extra ?? {});
    }

    /**
     * @description 记录错误日志。
     * @param message 错误消息
     * @param extra 附加上下文
     * @returns 无返回值
     */
    public error(message: string, extra?: Record<string, unknown>): void {
        console.error(`[plugin:${this._pluginId}] ${formatPluginLogMessage(message)}`, extra ?? {});
    }
}
