import { CoreCocosMcpCapabilityCatalog } from './core-cocos-mcp-capability-catalog.js';

/**
 * @description 面向 MCP Hub 的 Core 只读 operation 查询器；仅暴露公开目录中的明确项。
 */
export class CoreCocosMcpOperationResolver {
    /**
     * @description 判断 operation 是否可在不经过 Pro 签名计划的条件下走 Core 本地只读通道。
     * @param operation 未信任的 operation 标识。
     * @returns 是否为明确公开的 Core 只读 operation。
     */
    public isPublicReadOperation(operation: unknown): boolean {
        return CoreCocosMcpCapabilityCatalog.find(operation) != null;
    }
}
