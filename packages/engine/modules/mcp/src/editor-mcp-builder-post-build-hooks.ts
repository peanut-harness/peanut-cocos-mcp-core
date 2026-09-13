import type { IBuilderBuildMcpInput } from '@peanut/pod-protocol';

import type { IEditorMcpBuilderResult } from './editor-mcp-builder-gateway.js';

/**
 * @description 同进程 post-build 钩子（供兄弟插件注册；无网络服务）。
 */
export type EditorMcpPostBuildHook = (result: IEditorMcpBuilderResult, input: IBuilderBuildMcpInput) => void | Promise<void>;

/**
 * @description 进程内 builder.build 完成后的钩子注册表（非 IPC / 非 HTTP）。
 */
export class EditorMcpBuilderPostBuildHookRegistry {
    /**
     * @description 当前进程已注册的完成钩子。
     */
    private static readonly _hooks = new Set<EditorMcpPostBuildHook>();

    /**
     * @description 注册钩子；返回取消注册函数。
     * @param hook 钩子。
     * @returns disposer。
     */
    public static register(hook: EditorMcpPostBuildHook): () => void {
        this._hooks.add(hook);
        return () => {
            this._hooks.delete(hook);
        };
    }

    /**
     * @description 通知所有钩子（串行；单个失败不影响其余）。
     * @param result 构建结果。
     * @param input 构建输入。
     */
    public static async notify(result: IEditorMcpBuilderResult, input: IBuilderBuildMcpInput): Promise<void> {
        if (result.status !== 'completed' || result.success !== true || (result.artifacts?.length ?? 0) === 0) {
            return;
        }
        for (const hook of [...this._hooks]) {
            try {
                await hook(result, input);
            } catch {
                // sibling plugins must not break build result path
            }
        }
    }

    /**
     * @description 测试用：清空钩子。
     */
    public static clearForTests(): void {
        this._hooks.clear();
    }

    /**
     * @description 测试用：当前钩子数量。
     */
    public static sizeForTests(): number {
        return this._hooks.size;
    }
}
