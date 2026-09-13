import type { IExecutionRuntimeService } from '../execution/execution-runtime-service.js';
import type { IAssetRuntimeService } from './foundation/asset/asset-runtime-service.js';
import type { IMessageRuntimeService } from './foundation/message/message-runtime-service.js';
import type { IPanelHostRuntimeService } from './foundation/panel-host/panel-host-runtime-service.js';
import type { IProjectRuntimeService } from './foundation/project/project-runtime-service.js';
import type { ISceneRuntimeService } from './foundation/scene/scene-runtime-service.js';
import type { ISelectionRuntimeService } from './foundation/selection/selection-runtime-service.js';
import type { IVersionResolver } from './version/version-resolver.js';

/**
 * @description Runtime 对外统一门面接口。
 */
export interface ICocosRuntime {
    /**
     * @description Creator 版本解析器。
     */
    readonly version: IVersionResolver;

    /**
     * @description Message 子域服务。
     */
    readonly message: IMessageRuntimeService;

    /**
     * @description Asset 子域服务。
     */
    readonly asset: IAssetRuntimeService;

    /**
     * @description Scene 子域服务。
     */
    readonly scene: ISceneRuntimeService;

    /**
     * @description Panel Host 子域服务。
     */
    readonly panelHost: IPanelHostRuntimeService;

    /**
     * @description Selection 子域服务。
     */
    readonly selection: ISelectionRuntimeService;

    /**
     * @description Project 子域服务。
     */
    readonly project: IProjectRuntimeService;

    /**
     * @description 统一执行管线服务。
     */
    readonly execution: IExecutionRuntimeService;
}
