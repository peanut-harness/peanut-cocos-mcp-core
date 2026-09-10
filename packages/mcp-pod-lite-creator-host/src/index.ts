import {
    CoreCocosCreatorReadAdapter,
    CoreCocosMcpToolDefinitionCatalog,
    CoreCocosMcpExecutionDispatcher,
    type ICoreCocosMcpToolDefinition,
    type ICoreCocosCreatorReadRuntime,
} from '../../pod-lite-capability-policy/dist/index.js';

/**
 * @description Core Creator 宿主提供的最小 MCP 注册端口。
 */
export interface ICoreCocosMcpRegistry {
    /**
     * @description 注册一个 Core MCP 工具并返回注销函数。
     * @param definition 工具定义。
     * @param handler 工具处理器。
     * @returns 注销函数。
     */
    register(definition: ICoreCocosMcpToolDefinition, handler: (input: Readonly<Record<string, unknown>>) => Promise<unknown>): () => void;
}

/**
 * @description Core Creator 宿主激活上下文。
 */
export interface ICoreCocosCreatorHostActivateContext {
    /**
     * @description 已受宿主校验的运行时读取端口。
     */
    readonly runtime: ICoreCocosCreatorReadRuntime;
    /**
     * @description 可选 MCP 注册中心。
     */
    readonly mcp?: ICoreCocosMcpRegistry;
    /**
     * @description 非敏感生命周期日志端口。
     */
    readonly logger: { info(message: string): void };
}

/**
 * @description Core 目录包供 Creator 加载的最小生命周期模块。
 */
export class CoreCocosCreatorHostPluginModule {
    /**
     * @description 目录包运行时清单。
     */
    public readonly manifest = Object.freeze({
        id: 'peanut.pod-lite',
        version: '0.1.0',
        kind: 'tooling-plugin',
        displayName: 'Peanut Pod Lite',
        main: './peanut.pod-lite.bundle.js',
        engines: { host: '^0.1.0' },
        activation: { autoActivate: true, events: ['onStartup'] },
        permissions: {},
    });
    /**
     * @description 已注册工具的注销函数。
     */
    private readonly disposers: Array<() => void> = [];

    /**
     * @description 满足 Creator 插件宿主注册阶段协议；工具仅在激活时注册。
     * @param context 宿主提供的非敏感日志端口。
     * @returns 注册阶段完成后结束。
     */
    public async register(context: Pick<ICoreCocosCreatorHostActivateContext, 'logger'>): Promise<void> {
        context.logger.info('pod_lite_registered');
    }

    /**
     * @description 激活 Core 宿主并注册已经迁入的读取工具。
     * @param context Creator 宿主上下文。
     * @returns 激活完成后结束。
     */
    public async activate(context: ICoreCocosCreatorHostActivateContext): Promise<void> {
        this.dispose();
        const adapter = new CoreCocosCreatorReadAdapter(context.runtime);
        const dispatcher = new CoreCocosMcpExecutionDispatcher([adapter]);
        const definitionCatalog = new CoreCocosMcpToolDefinitionCatalog();
        if (context.mcp != null) {
            for (const definition of definitionCatalog.list().filter(
                (item): item is ICoreCocosMcpToolDefinition =>
                    item.readOnly && item.risk === 'read' && adapter.operations.includes(item.operation),
            )) {
                this.disposers.push(
                    context.mcp.register(definition, async (input): Promise<unknown> => dispatcher.execute(definition.name, input)),
                );
            }
        }
        context.logger.info(`pod_lite_creator_host_ready:${adapter.operations.length}_read_operations`);
    }

    /**
     * @description 停用 Core 宿主并注销所有工具。
     * @returns 停用完成后结束。
     */
    public async deactivate(): Promise<void> {
        this.dispose();
    }

    /**
     * @description 释放已注册的 MCP 工具。
     * @returns 无返回值。
     */
    public dispose(): void {
        for (const dispose of this.disposers.splice(0)) {
            dispose();
        }
    }

}

/**
 * @description 创建供 Peanut Creator 宿主动态加载的 Core 模块。
 * @returns Core 宿主模块实例。
 */
export function createPluginModule(): CoreCocosCreatorHostPluginModule {
    return new CoreCocosCreatorHostPluginModule();
}
