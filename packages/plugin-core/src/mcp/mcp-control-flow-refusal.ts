/**
 * @description MCP/tool 预期控制流拒批：租约闸门、破坏确认、产品线 refuse 等。
 * 这不是未处理异常；调用方应得到结构化失败（Hub ok:false / MCP isError），
 * 宿主不得经 PluginDiagnosticReporter 以 console.error 刷成 [plugin:...] Error:。
 */
export class McpControlFlowRefusal extends Error {
    /**
     * @description 跨包 duck-type 标记（policy 包可不依赖 plugin-core 也能打同款标记）。
     */
    public readonly isMcpControlFlowRefusal = true as const;
    /**
     * @description 稳定失败码（通常与 message 相同，含可选 :suffix）。
     */
    public readonly code: string;

    /**
     * @description 构造控制流拒批。
     * @param code 稳定失败码（如 core_cocos_mcp_execution_approval_required:scene.save）。
     */
    public constructor(code: string) {
        super(code);
        this.name = 'McpControlFlowRefusal';
        this.code = code;
    }

    /**
     * @description 抛出控制流拒批（never）。
     * @param code 稳定失败码。
     * @returns never
     */
    public static reject(code: string): never {
        throw new McpControlFlowRefusal(code);
    }
}

/**
 * @description 判断未知异常是否为 MCP 预期控制流拒批（duck-type + 稳定码前缀）。
 * @param error 未知异常。
 * @returns 是否为预期闸门/策略拒批。
 */
export function isMcpControlFlowRefusal(error: unknown): boolean {
    if (error instanceof McpControlFlowRefusal) {
        return true;
    }
    if (typeof error === 'object' && error != null) {
        const record = error as { isMcpControlFlowRefusal?: unknown; name?: unknown; message?: unknown };
        if (record.isMcpControlFlowRefusal === true || record.name === 'McpControlFlowRefusal') {
            return true;
        }
        if (typeof record.message === 'string' && isMcpControlFlowRefusalCode(record.message)) {
            return true;
        }
    }
    if (typeof error === 'string' && isMcpControlFlowRefusalCode(error)) {
        return true;
    }
    return false;
}

/**
 * @description 判断错误码/消息是否为预期策略/闸门拒批（非 bug）。
 * @param message 错误消息或码。
 * @returns 是否为控制流拒批码。
 */
export function isMcpControlFlowRefusalCode(message: string): boolean {
    const code = message.split(':')[0] ?? message;
    if (
        code === 'core_cocos_mcp_execution_approval_required' ||
        code === 'editor_mcp_destructive_confirmation_required' ||
        code === 'cocos_mcp_destructive_confirmation_required' ||
        code === 'cocos_mcp_plan_confirmation_required' ||
        code === 'editor_mcp_pro_admission_rejected' ||
        code.startsWith('product_line_mcp_refused')
    ) {
        return true;
    }
    // 兼容既有 policy 分类（破坏确认、能力不支持、lumen 客户端拒批等）
    return (
        message === 'editor_mcp_destructive_confirmation_required' ||
        message.startsWith('editor_mcp_operation_unsupported:') ||
        message.startsWith('editor_mcp_action_unsupported:') ||
        message.startsWith('editor_mcp_capability_unsupported:') ||
        message.startsWith('editor_mcp_lumen_operation_unsupported:') ||
        message.startsWith('product_line_mcp_refused:') ||
        code === 'UNMANAGED_ASSET' ||
        code === 'RESOURCE_CHANGED_OUTSIDE_MCP' ||
        code === 'IMPORT_NOT_VERIFIED' ||
        code.startsWith('silent_asset_') ||
        ((code.startsWith('lumen_') || code.startsWith('editor_mcp_lumen_') || code.startsWith('editor_mcp_bind_')) &&
            !/^(lumen_internal_|lumen_assert_|lumen_invariant_)/u.test(code)) ||
        code === 'mcp_capability_input_invalid' ||
        code === 'silent_create_folder_target_exists'
    );
}

/**
 * @description 从未知错误提取稳定失败码（供 Hub ok:false.error 使用）。
 * @param error 未知异常。
 * @returns 稳定失败码字符串。
 */
export function mcpControlFlowRefusalCode(error: unknown): string {
    if (error instanceof McpControlFlowRefusal) {
        return error.code;
    }
    if (typeof error === 'object' && error != null) {
        const record = error as { code?: unknown; message?: unknown };
        if (typeof record.code === 'string' && record.code.length > 0) {
            return record.code;
        }
        if (typeof record.message === 'string' && record.message.length > 0) {
            return record.message;
        }
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'mcp_control_flow_refusal';
}
