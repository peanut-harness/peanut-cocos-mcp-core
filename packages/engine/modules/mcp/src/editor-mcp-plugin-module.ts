import type { EditorMcpActionId, IEditorMcpActionPlan, IEditorMcpActionResult, IEditorMcpCapabilityDescriptor } from '@peanut/pod-protocol';
import { AssetCatalogFastLookupApi, type IAssetCatalogFastLookup } from '@peanut/pod-engine/assets';
import { PluginModuleBase } from '@peanut/pod-sdk';
import type { IMcpCapabilityInvocation, IPluginActivateContext, IPluginRegisterContext, IPluginServiceApi, PluginDeactivateReason } from '@peanut/pod-sdk';

import { EditorMcpActionRouter } from './editor-mcp-action-router.js';
import { EditorMcpLumenGateway } from './editor-mcp-lumen-gateway.js';
import { EditorMcpToolCatalog } from './editor-mcp-tool-catalog.js';

/**
 * @description Editor MCP 插件模块，负责保存受宿主生命周期约束的 action router。
 */
export class EditorMcpPluginModule extends PluginModuleBase {
    /** @description 当前激活的 action router；停用后清空，避免使用失效 grant。 */
    private _router: EditorMcpActionRouter | null = null;
    /** @description 当前激活期向统一 registry 注册的 capability 清理函数。 */
    private readonly _mcpCapabilityDisposers: Array<() => void> = [];
    /** @description 资产目录快查接口；可在测试中替换。 */
    private readonly _catalogLookup: IAssetCatalogFastLookup;
    /** @description 可选 lumen 网关；可在测试中替换。 */
    private readonly _lumenGateway: EditorMcpLumenGateway | null;
    /** @description operation 与一级工具名、schema 的目录。 */
    private readonly _toolCatalog = new EditorMcpToolCatalog();
    /** @description 激活期 Pro 本地授权服务端口；停用后清空。 */
    private _services: IPluginServiceApi | null = null;

    /** @description 供插件治理与打包校验使用的运行时清单。 */
    public readonly manifest = {
        id: 'peanut.editor-mcp',
        version: '0.1.115',
        kind: 'tooling-plugin',
        displayName: 'Peanut Editor MCP',
        description: {
            'en-US': 'Cocos Creator MCP capability router with lumen asset editing and SnowB BMFont export.',
            'zh-CN': '包含 lumen 资产源文件编辑与 SnowB BMFont 导出的 Cocos Creator MCP capability 路由器。',
        },
        icon: './assets/icon.png' as const,
        main: './peanut.editor-mcp.bundle.js',
        engines: { host: '^0.1.0' },
        activation: { autoActivate: true, events: ['onStartup'] },
        permissions: {
            assetDb: { read: true, write: true, delete: false },
            editorMessages: ['asset-db', 'scene', 'builder', 'preview', 'console'],
            sceneScripts: ['peanut.editor-mcp.read'],
        },
    } as const;

    /**
     * @description 创建 Editor MCP 插件模块。
     * @param catalogLookup 资产目录快查接口。
     * @param lumenGateway 可选 lumen 网关。
     */
    public constructor(
        catalogLookup: IAssetCatalogFastLookup = new AssetCatalogFastLookupApi(),
        lumenGateway: EditorMcpLumenGateway | null = null,
    ) {
        super();
        this._catalogLookup = catalogLookup;
        this._lumenGateway = lumenGateway;
    }

    /**
     * @description 在注册期记录插件已就绪，不注册 UI 或直接写入型 contribution。
     * @param context 插件注册期上下文
     * @returns Promise 在日志记录完成后结束
     */
    public override async register(context: IPluginRegisterContext): Promise<void> {
        context.logger.info('editor_mcp_registered');
    }

    /**
     * @description 在激活期创建只使用授权 runtime client 与受管服务的 MCP router。
     * @param context 插件激活期上下文
     * @returns Promise 在 router 建立后结束
     */
    public override async activate(context: IPluginActivateContext): Promise<void> {
        this._router = new EditorMcpActionRouter(context.runtime, context.services, this._catalogLookup, this._lumenGateway ?? undefined);
        this._services = context.services;
        if (context.mcp != null) {
            const definitions = this._toolCatalog.buildDefinitions(this._router.listCapabilities());
            for (const definition of definitions) {
                this._mcpCapabilityDisposers.push(
                    context.mcp.register(definition, async (input, invocation): Promise<unknown> => {
                        return this._invokeMcpCapability(definition.name, definition.risk, input, invocation);
                    }),
                );
            }
        }
        context.logger.info(`editor_mcp_activated:${context.plugin.id}`);
    }

    /**
     * @description 路由来自 MCP 宿主的已命名 action。
     * @param action 稳定 MCP action 标识
     * @param payload 未信任的外部请求负载
     * @returns 能力列表、执行计划或操作结果
     */
    public async dispatchMcpAction(
        action: EditorMcpActionId,
        payload?: unknown,
    ): Promise<readonly IEditorMcpCapabilityDescriptor[] | IEditorMcpActionPlan | IEditorMcpActionResult> {
        return this._requireRouter().dispatch(action, payload);
    }

    /**
     * @description 停用插件并清理 router，阻止后续 MCP 调用。
     * @param _reason 插件停用原因
     * @returns Promise 在运行态引用清理后结束
     */
    public override async deactivate(_reason: PluginDeactivateReason): Promise<void> {
        this._disposeMcpCapabilities();
        this._router = null;
        this._services = null;
    }

    /**
     * @description 释放插件持有的运行态资源。
     * @returns Promise 在运行态引用清理后结束
     */
    public override async dispose(): Promise<void> {
        this._disposeMcpCapabilities();
        this._router = null;
        this._services = null;
    }

    /**
     * @description 把一级工具调用直接路由到对应 operation 的 cocos.call。
     * 工具名即 operation（经确定性 kebab 变换），输入即该 operation 的原始入参；写/删审批由 Hub 依定义的 readOnly/risk 处理。
     * @param name 一级工具名。
     * @param input 未校验输入。
     * @returns 工具结果数据。
     */
    private async _invokeMcpCapability(
        name: string,
        definitionRisk: 'read' | 'write' | 'destructive',
        input: unknown,
        invocation?: IMcpCapabilityInvocation,
    ): Promise<unknown> {
        const router = this._requireRouter();
        const operation = this._toolCatalog.operationForToolName(name);
        if (operation == null) {
            throw new Error(`editor_mcp_capability_unsupported:${name}`);
        }
        const request = this._splitProPlan(input);
        const admission = await this._requireServices().request<unknown>('peanut.cocos-mcp-pro', 'mcp.admit', {
            toolName: name,
            input: request.input,
            resourceIds: invocation?.resourceIds ?? [],
            risk: invocation?.risk ?? definitionRisk,
            hasLocalApproval: invocation?.hasLocalApproval === true,
            signedPlan: request.signedPlan,
        });
        if (!this._isAdmitted(admission, operation)) {
            throw new Error('editor_mcp_pro_admission_rejected');
        }
        try {
            const result = await router.dispatch('cocos.call', {
                operation,
                input: request.input ?? undefined,
            });
            if (!this._isActionResult(result)) {
                throw new Error('editor_mcp_capability_result_invalid');
            }
            return result.data;
        } catch (error: unknown) {
            throw this._asHostCompatibleClientRejection(error);
        }
    }

    /**
     * @description 将 lumen/客户端契约拒绝映射为宿主已识别的 warn 前缀，避免未热更新宿主把预期拒绝刷成 project.log error。
     * @param error 原始异常。
     * @returns 兼容后的异常。
     */
    private _asHostCompatibleClientRejection(error: unknown): Error {
        const message = error instanceof Error ? error.message : String(error);
        if (message.startsWith('editor_mcp_lumen_operation_unsupported:')) {
            return error instanceof Error ? error : new Error(message);
        }
        const code = message.split(':')[0] ?? message;
        const isClientRejection =
            code.startsWith('lumen_') ||
            code.startsWith('editor_mcp_lumen_') ||
            code.startsWith('editor_mcp_bind_') ||
            code === 'mcp_capability_input_invalid';
        if (!isClientRejection) {
            return error instanceof Error ? error : new Error(message);
        }
        return new Error(`editor_mcp_lumen_operation_unsupported:${message}`);
    }

    /** @description 判断 router 返回值是否为单项操作结果。 */
    private _isActionResult(
        value: readonly IEditorMcpCapabilityDescriptor[] | IEditorMcpActionPlan | IEditorMcpActionResult,
    ): value is IEditorMcpActionResult {
        return typeof value === 'object' && value != null && !Array.isArray(value) && 'data' in value;
    }

    /** @description 撤销本次激活期注册的 capability，保证停用幂等。 */
    private _disposeMcpCapabilities(): void {
        while (this._mcpCapabilityDisposers.length > 0) {
            this._mcpCapabilityDisposers.pop()?.();
        }
    }

    /** @description 返回激活期 router；未激活时拒绝请求。 */
    private _requireRouter(): EditorMcpActionRouter {
        if (this._router == null) {
            throw new Error('editor_mcp_not_active');
        }
        return this._router;
    }

    /** @description 返回激活期服务端口；未激活时拒绝请求。 */
    private _requireServices(): IPluginServiceApi {
        if (this._services == null) {
            throw new Error('editor_mcp_not_active');
        }
        return this._services;
    }

    /** @description 校验 Pro 服务返回的成功准入结果与当前 operation 精确匹配。 */
    private _isAdmitted(value: unknown, operation: string): boolean {
        if (typeof value !== 'object' || value == null || Array.isArray(value)) {
            return false;
        }
        return (
            Object.getOwnPropertyDescriptor(value, 'granted')?.value === true &&
            Object.getOwnPropertyDescriptor(value, 'operation')?.value === operation
        );
    }

    /** @description 从已校验输入分离仅供 Pro 授权的签名计划，避免它进入 Cocos action router。 */
    private _splitProPlan(value: unknown): { readonly input: unknown; readonly signedPlan: unknown } {
        if (typeof value !== 'object' || value == null || Array.isArray(value)) {
            return Object.freeze({ input: value, signedPlan: null });
        }
        const descriptors = Object.getOwnPropertyDescriptors(value);
        const plan = descriptors.proPlan;
        if (plan == null) {
            return Object.freeze({ input: value, signedPlan: null });
        }
        if (!('value' in plan)) {
            throw new Error('editor_mcp_pro_plan_invalid');
        }
        const input: Record<string, unknown> = {};
        for (const [key, descriptor] of Object.entries(descriptors)) {
            if (key === 'proPlan') {
                continue;
            }
            if (!('value' in descriptor)) {
                throw new Error('editor_mcp_pro_plan_invalid');
            }
            input[key] = descriptor.value;
        }
        return Object.freeze({ input: Object.freeze(input), signedPlan: plan.value });
    }
}
