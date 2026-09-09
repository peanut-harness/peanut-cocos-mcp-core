import { CoreCocosMcpToolDefinitionCatalog, type ICoreCocosMcpToolDefinition } from './core-cocos-mcp-tool-definition-catalog.js';
import type { CoreCocosMcpPublicOperation } from './core-cocos-mcp-tool-name-resolver.js';

/** @description 不依赖 Creator SDK 的公开 Core 执行请求。 */
export interface ICoreCocosMcpExecutionRequest {
    readonly operation: CoreCocosMcpPublicOperation;
    readonly input: Readonly<Record<string, unknown>>;
}

/** @description 由 Cocos Creator 宿主实现的实际操作适配器。 */
export interface ICoreCocosMcpExecutionAdapter {
    /** @description 此适配器实际实现的公开 operation。 */
    readonly operations: readonly CoreCocosMcpPublicOperation[];
    /** @description 在宿主上下文中执行已验证的公开 operation。 */
    execute(request: ICoreCocosMcpExecutionRequest): Promise<unknown>;
}

/**
 * @description Core 的 fail-closed 执行分发器。
 * 不直接依赖 Creator 全局对象；宿主通过适配器接入 Message、AssetDB、Scene 或 Lumen 运行时。
 */
export class CoreCocosMcpExecutionDispatcher {
    private readonly definitions = new CoreCocosMcpToolDefinitionCatalog();
    private readonly adapters = new Map<CoreCocosMcpPublicOperation, ICoreCocosMcpExecutionAdapter>();

    public constructor(adapters: readonly ICoreCocosMcpExecutionAdapter[]) {
        for (const adapter of adapters) {
            for (const operation of adapter.operations) {
                if (this.definitions.findByOperation(operation) == null) {
                    throw new Error(`core_cocos_mcp_execution_adapter_operation_not_public:${operation}`);
                }
                if (this.adapters.has(operation)) {
                    throw new Error(`core_cocos_mcp_execution_adapter_duplicate:${operation}`);
                }
                this.adapters.set(operation, adapter);
            }
        }
    }

    /** @description 执行一项公开 Core operation；未注册、无适配器或缺审批均 fail closed。 */
    public async execute(operation: unknown, input: unknown): Promise<unknown> {
        const definition = this.definitions.findByOperation(operation);
        if (definition == null) {
            throw new Error('core_cocos_mcp_execution_operation_not_public');
        }
        if (!CoreCocosMcpExecutionDispatcher.isRecord(input)) {
            throw new Error('core_cocos_mcp_execution_input_invalid');
        }
        this.requireApproval(definition, input);
        const adapter = this.adapters.get(definition.operation);
        if (adapter == null) {
            throw new Error(`core_cocos_mcp_execution_adapter_missing:${definition.operation}`);
        }
        return adapter.execute({ operation: definition.operation, input });
    }

    private requireApproval(definition: ICoreCocosMcpToolDefinition, input: Readonly<Record<string, unknown>>): void {
        if (!definition.requiresLocalApproval) {
            return;
        }
        if (typeof input.approvalId !== 'string' || input.approvalId.trim().length === 0) {
            throw new Error(`core_cocos_mcp_execution_approval_required:${definition.operation}`);
        }
    }

    private static isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
        return typeof value === 'object' && value != null && !Array.isArray(value);
    }
}
