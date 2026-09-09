import { CoreCocosMcpCapabilityCatalog, type CoreCocosMcpOperation } from './core-cocos-mcp-capability-catalog.js';

/**
 * @description 在 Core 公开 operation 与兼容 MCP 工具名之间进行 fail-closed 映射。
 */
export class CoreCocosMcpToolNameResolver {
    /** @description Core MCP 工具名兼容前缀；迁移期间保持原有客户端可发现的一级工具命名。 */
    private static readonly toolNamePrefix = 'peanut.editor-mcp.';

    /**
     * @description 将明确公开的 Core operation 转为稳定一级 MCP 工具名。
     * @param operation 未信任的 operation 标识。
     * @returns 兼容工具名；未知或非 Core operation 返回 null。
     */
    public toolName(operation: unknown): string | null {
        const capability = CoreCocosMcpCapabilityCatalog.find(operation);
        if (capability == null) {
            return null;
        }
        return `${CoreCocosMcpToolNameResolver.toolNamePrefix}${CoreCocosMcpToolNameResolver.toKebab(capability.operation)}`;
    }

    /**
     * @description 从客户端提供的一级工具名解析回明确公开的 Core operation。
     * @param toolName 未信任的 MCP 工具名。
     * @returns 命中的 Core operation；任何未知或 Pro 工具名返回 null。
     */
    public operationForToolName(toolName: unknown): CoreCocosMcpOperation | null {
        if (typeof toolName !== 'string' || !toolName.startsWith(CoreCocosMcpToolNameResolver.toolNamePrefix)) {
            return null;
        }
        for (const capability of CoreCocosMcpCapabilityCatalog.list()) {
            if (this.toolName(capability.operation) === toolName) {
                return capability.operation;
            }
        }
        return null;
    }

    /**
     * @description 将 operation 的点分与 camelCase 名称转换为兼容 kebab 后缀。
     * @param operation 已验证的 Core operation。
     * @returns 工具名后缀。
     */
    private static toKebab(operation: CoreCocosMcpOperation): string {
        return operation
            .replace(/([a-z0-9])([A-Z])/gu, '$1-$2')
            .replace(/\./gu, '-')
            .toLowerCase();
    }
}
