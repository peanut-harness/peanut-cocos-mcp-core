/**
 * @description Lite 策略侧控制流拒批（与 peanut-plugin-core 的 McpControlFlowRefusal 同形 duck-type）。
 * 预期闸门拒批禁止用裸 Error 冒泡成宿主 [plugin:...] Error:。
 */
export class McpControlFlowRefusal extends Error {
    /** @description 跨包 duck-type 标记。 */
    public readonly isMcpControlFlowRefusal = true as const;
    /** @description 稳定失败码。 */
    public readonly code: string;

    /**
     * @description 构造控制流拒批。
     * @param code 稳定失败码。
     */
    public constructor(code: string) {
        super(code);
        this.name = 'McpControlFlowRefusal';
        this.code = code;
    }

    /**
     * @description 抛出控制流拒批。
     * @param code 稳定失败码。
     * @returns never
     */
    public static reject(code: string): never {
        throw new McpControlFlowRefusal(code);
    }
}

/**
 * @description 判断是否为控制流拒批。
 * @param error 未知异常。
 * @returns 是否拒批。
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
        if (typeof record.message === 'string') {
            const code = record.message.split(':')[0] ?? record.message;
            return code === 'core_cocos_mcp_execution_approval_required';
        }
    }
    return false;
}
