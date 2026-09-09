import {
    CoreCocosCreatorReadAdapter,
    CoreCocosMcpExecutionDispatcher,
    type ICoreCocosCreatorReadRuntime,
} from '../../mcp-capability-policy/dist/index.js';

/** @description Core MCP 工具的宿主注册定义。 */
export interface ICoreCocosMcpToolDefinition {
    /** @description MCP 工具稳定名称。 */
    readonly name: string;
    /** @description 此首批工具是否只读。 */
    readonly readOnly: true;
    /** @description 宿主计算的工具风险。 */
    readonly risk: 'read';
    /** @description MCP JSON Schema 输入定义。 */
    readonly inputSchema: Readonly<Record<string, unknown>>;
}

/** @description Core Creator 宿主提供的最小 MCP 注册端口。 */
export interface ICoreCocosMcpRegistry {
    /** @description 注册一个 Core MCP 工具并返回注销函数。 @param definition 工具定义。 @param handler 工具处理器。 @returns 注销函数。 */
    register(definition: ICoreCocosMcpToolDefinition, handler: (input: Readonly<Record<string, unknown>>) => Promise<unknown>): () => void;
}

/** @description Core Creator 宿主激活上下文。 */
export interface ICoreCocosCreatorHostActivateContext {
    /** @description 已受宿主校验的运行时读取端口。 */
    readonly runtime: ICoreCocosCreatorReadRuntime;
    /** @description 可选 MCP 注册中心。 */
    readonly mcp?: ICoreCocosMcpRegistry;
    /** @description 非敏感生命周期日志端口。 */
    readonly logger: { info(message: string): void };
}

/** @description Core 目录包供 Creator 加载的最小生命周期模块。 */
export class CoreCocosCreatorHostPluginModule {
    /** @description 目录包运行时清单。 */
    public readonly manifest = Object.freeze({
        id: 'peanut.cocos-mcp-core',
        version: '0.1.0',
        kind: 'tooling-plugin',
        displayName: 'Peanut Cocos MCP Core',
        main: './peanut.cocos-mcp-core.bundle.js',
        engines: { host: '^0.1.0' },
        activation: { autoActivate: true, events: ['onStartup'] },
        permissions: {},
    });
    /** @description 已注册工具的注销函数。 */
    private readonly disposers: Array<() => void> = [];

    /** @description 激活 Core 宿主并注册已经迁入的读取工具。 @param context Creator 宿主上下文。 @returns 激活完成后结束。 */
    public async activate(context: ICoreCocosCreatorHostActivateContext): Promise<void> {
        this.dispose();
        const dispatcher = new CoreCocosMcpExecutionDispatcher([new CoreCocosCreatorReadAdapter(context.runtime)]);
        if (context.mcp != null) {
            for (const definition of CoreCocosCreatorHostPluginModule.readDefinitions) {
                this.disposers.push(context.mcp.register(definition, async (input): Promise<unknown> => dispatcher.execute(definition.name, input)));
            }
        }
        context.logger.info('core_cocos_creator_host_ready:3_read_operations');
    }

    /** @description 停用 Core 宿主并注销所有工具。 @returns 停用完成后结束。 */
    public async deactivate(): Promise<void> { this.dispose(); }

    /** @description 释放已注册的 MCP 工具。 @returns 无返回值。 */
    public dispose(): void {
        for (const dispose of this.disposers.splice(0)) dispose();
    }

    /** @description 首批真实 Creator 读取工具定义。 */
    private static readonly readDefinitions: readonly ICoreCocosMcpToolDefinition[] = Object.freeze([
        Object.freeze({ name: 'editor.queryVersion', readOnly: true, risk: 'read', inputSchema: Object.freeze({ type: 'object', additionalProperties: false }) }),
        Object.freeze({ name: 'editor.queryProject', readOnly: true, risk: 'read', inputSchema: Object.freeze({ type: 'object', additionalProperties: false }) }),
        Object.freeze({ name: 'editor.querySelection', readOnly: true, risk: 'read', inputSchema: Object.freeze({ type: 'object', additionalProperties: false }) }),
    ]);
}

/** @description 创建供 Peanut Creator 宿主动态加载的 Core 模块。 @returns Core 宿主模块实例。 */
export function createPluginModule(): CoreCocosCreatorHostPluginModule { return new CoreCocosCreatorHostPluginModule(); }
