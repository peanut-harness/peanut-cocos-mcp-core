/**
 * @description MCP capability 的公开访问等级；高级等级不应由普通客户端输入解锁。
 */
export type McpCapabilityAccess = 'local' | 'licensed' | 'signed-plan';

/**
 * @description 单项 MCP capability 的公开访问策略。
 */
export interface IMcpCapabilityPolicy {
    /** @description capability 的稳定名称。 */
    readonly name: string;
    /** @description 调用该 capability 所需的最小访问等级。 */
    readonly access: McpCapabilityAccess;
    /** @description 是否需要经过本地用户确认的写入操作。 */
    readonly requiresLocalApproval: boolean;
}

/**
 * @description 校验并判断 MCP capability 的公开访问策略；不处理 license 或计划签名本身。
 */
export class McpCapabilityPolicy {
    /**
     * @description 建立经过完整输入校验的 immutable capability policy。
     * @param input 未信任的 policy 输入。
     * @returns 可供 Hub 与插件共同使用的公开 policy。
     */
    public static create(input: unknown): IMcpCapabilityPolicy {
        if (!McpCapabilityPolicy.isRecord(input)) {
            throw new Error('mcp_capability_policy_invalid');
        }
        const name = input.name;
        const access = input.access;
        const requiresLocalApproval = input.requiresLocalApproval;
        if (typeof name !== 'string' || name.trim().length === 0 || name.length > 160) {
            throw new Error('mcp_capability_policy_name_invalid');
        }
        if (access !== 'local' && access !== 'licensed' && access !== 'signed-plan') {
            throw new Error('mcp_capability_policy_access_invalid');
        }
        if (typeof requiresLocalApproval !== 'boolean') {
            throw new Error('mcp_capability_policy_approval_invalid');
        }
        return { name: name.trim(), access, requiresLocalApproval };
    }

    /**
     * @description 判断给定访问等级是否满足 policy；更高等级自动覆盖低等级。
     * @param policy 已校验的 capability policy。
     * @param grantedAccess 当前调用方已通过 Hub 验证的等级。
     * @returns 当前调用方是否可进入后续审批和执行流程。
     */
    public static permits(policy: IMcpCapabilityPolicy, grantedAccess: McpCapabilityAccess): boolean {
        return McpCapabilityPolicy.rank(grantedAccess) >= McpCapabilityPolicy.rank(policy.access);
    }

    /**
     * @description 将访问等级转换为单调比较值。
     * @param access MCP capability 访问等级。
     * @returns 用于访问比较的整数等级。
     */
    private static rank(access: McpCapabilityAccess): number {
        switch (access) {
            case 'local':
                return 0;
            case 'licensed':
                return 1;
            case 'signed-plan':
                return 2;
            default: {
                const exhaustive: never = access;
                return exhaustive;
            }
        }
    }

    /**
     * @description 判断输入是否为可安全读取字段的普通对象。
     * @param value 未信任输入。
     * @returns 输入是否为普通记录对象。
     */
    private static isRecord(value: unknown): value is Record<string, unknown> {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
}
