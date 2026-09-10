import type { CoreCocosMcpPublicOperation } from './core-cocos-mcp-tool-name-resolver.js';
import type { ICoreCocosMcpExecutionAdapter, ICoreCocosMcpExecutionRequest } from './core-cocos-mcp-execution-dispatcher.js';

/** @description Creator 版本读取端口；由实际 Creator 宿主在激活期注入。 */
export interface ICoreCocosCreatorVersionPort {
    /** @description 返回已由 Creator 宿主确认的版本快照。 @returns 版本快照。 */
    getCurrentVersion(): Promise<unknown> | unknown;
}

/** @description Creator 工程读取端口。 */
export interface ICoreCocosCreatorProjectPort {
    /** @description 读取工程展示名称。 @returns 工程名称。 */
    getProjectName(): Promise<string>;
    /** @description 读取工程绝对路径。 @returns 工程路径。 */
    getProjectPath(): Promise<string>;
}

/** @description Creator 选区读取端口。 */
export interface ICoreCocosCreatorSelectionPort {
    /** @description 读取当前激活选区的稳定标识。 @returns 选区标识列表。 */
    getActiveIds(): Promise<readonly string[]>;
}

/**
 * @description Creator 消息读取端口；仅允许适配器调用已列入公开目录的只读消息。
 */
export interface ICoreCocosCreatorMessageReadPort {
    /**
     * @description 向 Creator 内置模块发送只读查询。
     * @param target Creator 消息目标。
     * @param message Creator 消息名称。
     * @param args 查询参数。
     * @returns Creator 返回的未解释载荷。
     */
    request(target: string, message: string, ...args: readonly unknown[]): Promise<unknown>;
}

/** @description Core 首批 Creator 只读宿主端口集合。 */
export interface ICoreCocosCreatorReadRuntime {
    /** @description Creator 版本端口。 */
    readonly version: ICoreCocosCreatorVersionPort;
    /** @description 工程元数据端口。 */
    readonly project: ICoreCocosCreatorProjectPort;
    /** @description 选区端口。 */
    readonly selection: ICoreCocosCreatorSelectionPort;
    /**
     * @description 可选 Creator 消息读取端口；缺失时只注册基础三项读取。
     */
    readonly message?: ICoreCocosCreatorMessageReadPort;
}

/**
 * @description Core 的第一批真实 Creator 读取适配器。
 * 它不读取全局 Editor，也不依赖 Pro；实际宿主在激活期把受限 runtime port 注入。
 */
export class CoreCocosCreatorReadAdapter implements ICoreCocosMcpExecutionAdapter {
    /** @description 此适配器已经实际实现的 Core operation。 */
    public readonly operations: readonly CoreCocosMcpPublicOperation[] = Object.freeze([
        'editor.queryVersion',
        'editor.queryProject',
        'editor.querySelection',
        'scene.getCurrent',
        'scene.getHierarchy',
        'builder.queryPlatforms',
        'builder.querySchema',
        'builder.queryDefaultConfig',
        'preview.query',
    ]);
    /** @description 受限 Creator 读取端口。 */
    private readonly runtime: ICoreCocosCreatorReadRuntime;

    /**
     * @description 创建 Creator 读取适配器。
     * @param runtime 宿主在激活期提供的已授权读取端口。
     */
    public constructor(runtime: ICoreCocosCreatorReadRuntime) {
        this.runtime = runtime;
    }

    /**
     * @description 执行已由 Core dispatcher 校验过的读取 operation。
     * @param request 已校验执行请求。
     * @returns 对应的 Creator 快照。
     */
    public async execute(request: ICoreCocosMcpExecutionRequest): Promise<unknown> {
        switch (request.operation) {
            case 'editor.queryVersion':
                return this.runtime.version.getCurrentVersion();
            case 'editor.queryProject':
                return Object.freeze({
                    name: await this.runtime.project.getProjectName(),
                    path: await this.runtime.project.getProjectPath(),
                });
            case 'editor.querySelection':
                return Object.freeze({ ids: Object.freeze([...(await this.runtime.selection.getActiveIds())]) });
            case 'scene.getCurrent':
                return this.requestFirst('scene_get_current', [
                    ['scene', 'query-current-scene', []],
                    ['scene', 'query-scene', []],
                ]);
            case 'scene.getHierarchy':
                return this.requestFirst('scene_get_hierarchy', [
                    ['scene', 'query-node-tree', []],
                ]);
            case 'builder.queryPlatforms':
                return this.requestBuilder(request.input, 'builder_query_platforms', [
                    ['query-all-builder', []],
                    ['query-tasks', []],
                    ['get-builder-list', []],
                    ['query-build-options', []],
                ]);
            case 'builder.querySchema':
                return this.requestBuilderWithPlatform(request.input, 'builder_query_schema', [
                    'query-build-options',
                    'query-options',
                    'query-build-config',
                ]);
            case 'builder.queryDefaultConfig':
                return this.requestBuilderWithPlatform(request.input, 'builder_query_default_config', [
                    'query-default-config',
                    'get-default-build-options',
                    'query-build-options',
                ]);
            case 'preview.query':
                return this.requestFirst('preview_query', [
                    ['preview', 'query-preview-url', []],
                    ['preview', 'query-port', []],
                    ['preview', 'query-info', []],
                    ['preview', 'query-settings', []],
                    ['server', 'query-preview-url', []],
                    ['builder', 'query-preview-url', []],
                ]);
            default:
                throw new Error(`core_cocos_creator_read_operation_unsupported:${request.operation}`);
        }
    }

    /**
     * @description 使用可选平台参数查询 Builder，并保持旧实现的候选消息顺序。
     * @param input 已验证输入。
     * @param label 可诊断操作标签。
     * @param messages Builder 消息候选。
     * @returns 首个成功查询的结果。
     */
    private async requestBuilderWithPlatform(
        input: Readonly<Record<string, unknown>>,
        label: string,
        messages: readonly string[],
    ): Promise<unknown> {
        const platform = typeof input.platform === 'string' ? input.platform.trim() : '';
        const args: readonly unknown[] = platform.length === 0 ? [] : [platform];
        return this.requestFirst(label, messages.map((message) => ['builder', message, args] as const));
    }

    /**
     * @description 查询 Builder 并应用平台名称过滤。
     * @param input 已验证输入。
     * @param label 可诊断操作标签。
     * @param candidates Creator 消息候选。
     * @returns Builder 查询结果。
     */
    private async requestBuilder(
        input: Readonly<Record<string, unknown>>,
        label: string,
        candidates: readonly (readonly [string, readonly unknown[]])[],
    ): Promise<unknown> {
        const result = await this.requestFirst(
            label,
            candidates.map(([message, args]) => ['builder', message, args] as const),
        );
        const filter = typeof input.filter === 'string' ? input.filter.trim().toLowerCase() : '';
        if (filter.length === 0 || !Array.isArray(result.data)) {
            return result;
        }
        return Object.freeze({
            ...result,
            data: Object.freeze(result.data.filter((item) => typeof item === 'string' && item.toLowerCase().includes(filter))),
        });
    }

    /**
     * @description 依次执行只读 Creator 消息；全部不可用时返回明确的软失败结果。
     * @param label 可诊断操作标签。
     * @param candidates 目标、消息及参数候选。
     * @returns 带可用性与来源的查询结果。
     */
    private async requestFirst(
        label: string,
        candidates: readonly (readonly [string, string, readonly unknown[]])[],
    ): Promise<{ readonly available: boolean; readonly availability: 'live' | 'refused'; readonly message: string; readonly data?: unknown }> {
        if (this.runtime.message == null) {
            return Object.freeze({ available: false, availability: 'refused', message: `${label}_unavailable:runtime_message_missing` });
        }
        for (const [target, message, args] of candidates) {
            try {
                const data = await this.runtime.message.request(target, message, ...args);
                return Object.freeze({ available: true, availability: 'live', message: `${label}_ok:${target}.${message}`, data });
            } catch {
                // 尝试同一只读操作的下一个 Creator 版本兼容消息。
            }
        }
        return Object.freeze({ available: false, availability: 'refused', message: `${label}_unavailable:no_supported_message` });
    }
}
