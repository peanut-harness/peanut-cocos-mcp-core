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

/** @description Core 首批 Creator 只读宿主端口集合。 */
export interface ICoreCocosCreatorReadRuntime {
    /** @description Creator 版本端口。 */
    readonly version: ICoreCocosCreatorVersionPort;
    /** @description 工程元数据端口。 */
    readonly project: ICoreCocosCreatorProjectPort;
    /** @description 选区端口。 */
    readonly selection: ICoreCocosCreatorSelectionPort;
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
            default:
                throw new Error(`core_cocos_creator_read_operation_unsupported:${request.operation}`);
        }
    }
}
