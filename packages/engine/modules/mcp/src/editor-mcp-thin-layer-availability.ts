import type { EditorMcpThinLayerAvailability } from '@peanut/pod-protocol';

/**
 * @description 薄层 MCP 网关共用的 availability 输入片段。
 */
export interface IEditorMcpThinLayerAvailabilityInput {
    /** @description 操作是否可用。 */
    readonly available: boolean;
    /** @description 说明或错误码。 */
    readonly message: string;
    /** @description 可选数据来源（preview 等）。 */
    readonly source?: string;
    /** @description 可选显式 availability（hierarchy 回退等）。 */
    readonly availabilityHint?: EditorMcpThinLayerAvailability;
    /** @description 可选载荷。 */
    readonly data?: unknown;
}

/**
 * @description 将薄层网关的 available/message/source 规范化为 Agent 可观测的 availability。
 */
export class EditorMcpThinLayerAvailabilityMapper {
    /**
     * @description 依据 message、source 与 available 解析 availability。
     * @param input 网关结果片段。
     * @returns live / fallback / refused。
     */
    public static resolve(input: IEditorMcpThinLayerAvailabilityInput): EditorMcpThinLayerAvailability {
        if (input.availabilityHint != null) {
            return input.availabilityHint;
        }
        const message = input.message.toLowerCase();
        if (message.includes('_refused:') || message.includes('_blocked:')) {
            return 'refused';
        }
        const source = input.source?.toLowerCase() ?? '';
        if (
            source === 'fallback' ||
            source === 'project_log' ||
            message.includes('fallback') ||
            message.includes('query-node-tree') ||
            message.includes('live_tried=')
        ) {
            return 'fallback';
        }
        if (input.available && (message.includes('_ok:') || source === 'live' || source === 'message')) {
            return 'live';
        }
        if (!input.available) {
            return 'refused';
        }
        return 'live';
    }

    /**
     * @description 为薄层结果附加 availability 字段。
     * @param result 原始结果（不含 availability）。
     * @returns 带 availability 的完整结果。
     */
    public static attach<T extends IEditorMcpThinLayerAvailabilityInput>(
        result: T,
    ): T & { readonly availability: EditorMcpThinLayerAvailability } {
        return {
            ...result,
            availability: this.resolve(result),
        };
    }
}
