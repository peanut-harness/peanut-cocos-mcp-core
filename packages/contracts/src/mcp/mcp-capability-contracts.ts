import type { ContractPayload } from '../shared/common-contracts.js';
import type { LocalizedText } from '../plugin/plugin-contracts.js';

/**
 * @description MCP capability 的副作用等级；用于宿主确认策略，不授予额外权限。
 */
export type McpCapabilityRisk = 'read' | 'write' | 'destructive';

/**
 * @description Editor MCP 执行车道（与 `EditorMcpExecutionLane` 对齐；可选字段，其它插件可不填）。
 */
export type McpCapabilityExecutionLane = 'lumen-offline' | 'editor-ui' | 'preview';

/**
 * @description MCP capability 在编辑器工作台中的稳定分类。
 */
export type McpCapabilityCategory = 'cocos' | 'atom' | 'workflow';

/**
 * @description 受限 JSON Schema 子集，用于向 MCP 调用方公开稳定参数边界。
 */
export interface IMcpJsonSchema extends ContractPayload {
    /** @description JSON 值类型。 */
    readonly type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean';
    /** @description 面向调用方的字段说明。 */
    readonly description?: LocalizedText;
    /** @description 对象字段定义。 */
    readonly properties?: Readonly<Record<string, IMcpJsonSchema>>;
    /** @description 必填对象字段。 */
    readonly required?: readonly string[];
    /** @description 是否拒绝未声明对象字段；默认拒绝。 */
    readonly additionalProperties?: boolean;
    /** @description 数组元素 schema。 */
    readonly items?: IMcpJsonSchema;
    /** @description 字符串枚举值。 */
    readonly enum?: readonly string[];
}

/**
 * @description 子插件向统一 MCP Hub 注册的公开能力定义。
 */
export interface IMcpCapabilityDefinition extends ContractPayload {
    /** @description 全局唯一且带插件命名空间的工具名称。 */
    readonly name: string;
    /** @description 面向 MCP Client 的能力说明。 */
    readonly description: LocalizedText;
    /** @description 提供方声明的工作台分类，不得由宿主根据名称推测。 */
    readonly category: McpCapabilityCategory;
    /** @description 参数 schema。 */
    readonly inputSchema: IMcpJsonSchema;
    /** @description 返回值 schema。 */
    readonly outputSchema?: IMcpJsonSchema;
    /** @description 是否为无副作用查询。 */
    readonly readOnly: boolean;
    /** @description 宿主执行策略使用的风险等级。 */
    readonly risk: McpCapabilityRisk;
    /**
     * @description 可选执行车道（editor-mcp 一级工具会填）；其它插件可省略。
     */
    readonly lane?: McpCapabilityExecutionLane;
}

/**
 * @description MCP capability 目录快照。
 */
export interface IMcpCapabilityCatalog extends ContractPayload {
    /** @description 目录单调递增版本。 */
    readonly revision: number;
    /** @description 当前可调用 capability。 */
    readonly capabilities: readonly IMcpCapabilityDefinition[];
}
