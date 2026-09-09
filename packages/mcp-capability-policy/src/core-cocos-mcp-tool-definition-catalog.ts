import { CoreCocosMcpCapabilityCatalog, type CoreCocosMcpOperation } from './core-cocos-mcp-capability-catalog.js';
import { CoreCocosMcpReadToolSchemaCatalog, type ICoreMcpJsonSchema } from './core-cocos-mcp-read-tool-schema-catalog.js';
import { CoreCocosMcpToolNameResolver } from './core-cocos-mcp-tool-name-resolver.js';

/**
 * @description 可直接注册到 MCP Hub 的 Core 只读工具定义。
 */
export interface ICoreCocosMcpToolDefinition {
    /** @description 保持旧客户端兼容的一级工具名。 */
    readonly name: string;
    /** @description 稳定 Cocos MCP operation 标识。 */
    readonly operation: CoreCocosMcpOperation;
    /** @description 简明工具说明；详细输入说明位于 inputSchema。 */
    readonly description: string;
    /** @description MCP 参数 schema。 */
    readonly inputSchema: ICoreMcpJsonSchema;
    /** @description Core 工具始终无副作用。 */
    readonly readOnly: true;
    /** @description Core 工具风险始终为 read。 */
    readonly risk: 'read';
}

/**
 * @description 将 Core capability、工具命名和 schema 汇合为可直接注册的 fail-closed MCP 工具目录。
 */
export class CoreCocosMcpToolDefinitionCatalog {
    /** @description Core operation 到公开工具定义的不可变映射。 */
    private readonly definitions: ReadonlyMap<CoreCocosMcpOperation, ICoreCocosMcpToolDefinition>;
    /** @description 兼容工具名解析器。 */
    private readonly toolNameResolver: CoreCocosMcpToolNameResolver;

    /**
     * @description 建立完整的 Core 工具定义目录；缺少任何公开 schema 都视为发布时错误。
     */
    public constructor() {
        this.toolNameResolver = new CoreCocosMcpToolNameResolver();
        const schemaCatalog = new CoreCocosMcpReadToolSchemaCatalog();
        const definitions = new Map<CoreCocosMcpOperation, ICoreCocosMcpToolDefinition>();
        for (const capability of CoreCocosMcpCapabilityCatalog.list()) {
            const name = this.toolNameResolver.toolName(capability.operation);
            const inputSchema = schemaCatalog.find(capability.operation);
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
                }),
            );
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
        const capability = CoreCocosMcpCapabilityCatalog.find(operation);
        return capability == null ? null : (this.definitions.get(capability.operation) ?? null);
    }
}
