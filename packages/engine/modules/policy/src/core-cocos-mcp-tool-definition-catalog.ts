import { CoreCocosMcpCapabilityCatalog, type CoreCocosMcpOperation } from './core-cocos-mcp-capability-catalog.js';
import { CoreCocosNativeWriteCapabilityCatalog, type CoreCocosNativeWriteOperation } from './core-cocos-native-write-capability-catalog.js';
import { CoreCocosNativeWriteToolSchemaCatalog } from './core-cocos-native-write-tool-schema-catalog.js';
import { CoreCocosMcpReadToolSchemaCatalog, type ICoreMcpJsonSchema } from './core-cocos-mcp-read-tool-schema-catalog.js';
import { CoreCocosMcpToolNameResolver, type CoreCocosMcpPublicOperation } from './core-cocos-mcp-tool-name-resolver.js';
import type { McpExecutionRisk } from './mcp-approval-lease-store.js';

/**
 * @description 可直接注册到 MCP Hub 的 Core 工具定义。
 */
export interface ICoreCocosMcpToolDefinition {
    /** @description 保持旧客户端兼容的一级工具名。 */
    readonly name: string;
    /** @description 稳定 Cocos MCP operation 标识。 */
    readonly operation: CoreCocosMcpPublicOperation;
    /** @description 简明工具说明；详细输入说明位于 inputSchema。 */
    readonly description: string;
    /** @description MCP 参数 schema。 */
    readonly inputSchema: ICoreMcpJsonSchema;
    readonly readOnly: boolean;
    readonly risk: McpExecutionRisk;
    /** @description 写操作执行前必须消费本地审批租约。 */
    readonly requiresLocalApproval: boolean;
}

/**
 * @description 将 Core capability、工具命名和 schema 汇合为可直接注册的 fail-closed MCP 工具目录。
 */
export class CoreCocosMcpToolDefinitionCatalog {
    /** @description Core operation 到公开工具定义的不可变映射。 */
    private readonly definitions: ReadonlyMap<CoreCocosMcpPublicOperation, ICoreCocosMcpToolDefinition>;
    /** @description 兼容工具名解析器。 */
    private readonly toolNameResolver: CoreCocosMcpToolNameResolver;

    /**
     * @description 建立完整的 Core 工具定义目录；缺少任何公开 schema 都视为发布时错误。
     */
    public constructor() {
        this.toolNameResolver = new CoreCocosMcpToolNameResolver();
        const readSchemas = new CoreCocosMcpReadToolSchemaCatalog();
        const writeSchemas = new CoreCocosNativeWriteToolSchemaCatalog();
        const definitions = new Map<CoreCocosMcpPublicOperation, ICoreCocosMcpToolDefinition>();
        for (const capability of CoreCocosMcpCapabilityCatalog.list()) {
            const name = this.toolNameResolver.toolName(capability.operation);
            const inputSchema = readSchemas.find(capability.operation);
            if (name == null || inputSchema == null) {
                throw new Error(`core_cocos_mcp_tool_definition_incomplete:${capability.operation}`);
            }
            definitions.set(
                capability.operation,
                Object.freeze({
                    name,
                    operation: capability.operation,
                    description: `Read-only Cocos MCP capability: ${capability.operation}.`,
                    inputSchema,
                    readOnly: true,
                    risk: 'read',
                    requiresLocalApproval: false,
                }),
            );
        }
        for (const capability of CoreCocosNativeWriteCapabilityCatalog.list()) {
            const name = this.toolNameResolver.toolName(capability.operation);
            const inputSchema = writeSchemas.find(capability.operation);
            if (name == null || inputSchema == null) {
                throw new Error(`core_cocos_mcp_tool_definition_incomplete:${capability.operation}`);
            }
            definitions.set(capability.operation, Object.freeze({
                name,
                operation: capability.operation,
                description: `Locally-approved Cocos MCP capability: ${capability.operation}.`,
                inputSchema,
                readOnly: false,
                risk: capability.risk,
                requiresLocalApproval: true,
            }));
        }
        this.definitions = definitions;
    }

    /**
     * @description 返回可直接注册到 MCP Hub 的完整 Core 工具定义快照。
     * @returns 不可变工具定义列表。
     */
    public list(): readonly ICoreCocosMcpToolDefinition[] {
        return Object.freeze([...this.definitions.values()]);
    }

    /**
     * @description 按兼容 MCP 工具名查询 Core 定义。
     * @param toolName 未信任工具名。
     * @returns 命中的 Core 定义；未知或 Pro 工具名返回 null。
     */
    public findByToolName(toolName: unknown): ICoreCocosMcpToolDefinition | null {
        const operation = this.toolNameResolver.operationForToolName(toolName);
        return operation == null ? null : (this.definitions.get(operation) ?? null);
    }

    /**
     * @description 按 operation 查询 Core 定义。
     * @param operation 未信任 operation 标识。
     * @returns 命中的 Core 定义；未知或 Pro operation 返回 null。
     */
    public findByOperation(operation: unknown): ICoreCocosMcpToolDefinition | null {
        const capability = CoreCocosMcpCapabilityCatalog.find(operation) ?? CoreCocosNativeWriteCapabilityCatalog.find(operation);
        return capability == null ? null : (this.definitions.get(capability.operation) ?? null);
    }
}
