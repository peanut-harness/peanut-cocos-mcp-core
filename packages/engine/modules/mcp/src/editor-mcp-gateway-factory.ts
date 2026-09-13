import type { IGrantedRuntimeClientSet } from '@peanut/pod-sdk';

import { EditorMcpActionRouter } from './editor-mcp-action-router.js';

/**
 * @description Lite 宿主注入的网关执行函数。
 */
export type EditorMcpExecuteOperation = (operation: string, input: Readonly<Record<string, unknown>>) => Promise<unknown>;

/**
 * @description 用授权 runtime 构造 Editor MCP action router。
 * @param runtime 宿主裁剪后的 runtime client 集合。
 * @returns Editor MCP action router。
 */
export function createEditorMcpActionRouter(runtime: IGrantedRuntimeClientSet): EditorMcpActionRouter {
    return new EditorMcpActionRouter(runtime);
}

/**
 * @description 把 EditorMcpActionRouter 收成 `(operation, input) => Promise<unknown>`，供 Lite host 网关适配器注入。
 * @param runtime 宿主裁剪后的 runtime client 集合。
 * @returns 稳定 operation 执行函数。
 */
export function createEditorMcpExecuteOperation(runtime: IGrantedRuntimeClientSet): EditorMcpExecuteOperation {
    const router = createEditorMcpActionRouter(runtime);
    return async (operation, input) => {
        const result = await router.dispatch('cocos.call', { operation, input });
        if (typeof result === 'object' && result != null && !Array.isArray(result) && 'data' in result) {
            return result.data;
        }
        return result;
    };
}
