import type { CreatorHostState } from '../../shared/host-state.js';
import type { ICreatorAdapter } from '../core/creator-adapter.js';
import type {
    ICreatorPhaseAdapterFactory,
    IDefaultCreatorAdapterFactoryOptions,
} from '../creator-adapter-factory.js';
import { EditorApi35Adapter } from './editor-api-35-adapter.js';

/**
 * @description Creator 3.0 至 3.5 阶段适配器工厂。
 */
export class EditorApi35AdapterFactory implements ICreatorPhaseAdapterFactory {
    /**
     * @description 工厂稳定标识。
     */
    public readonly id = 'adapter-35-factory';

    /**
     * @description 工厂负责的 Creator 早期 3.x 阶段。
     */
    public readonly phase = 'creator_3x_early' as const;

    /**
     * @description 创建 Creator 早期 3.x 阶段适配器。
     * @param creatorVersion 当前 Creator 版本
     * @param hostState 适配器共享的宿主状态
     * @param options 宿主装配参数
     * @returns Creator 3.0 至 3.5 适配器
     */
    public create(
        creatorVersion: string,
        hostState: CreatorHostState,
        options?: IDefaultCreatorAdapterFactoryOptions,
    ): ICreatorAdapter {
        return new EditorApi35Adapter(creatorVersion, hostState, options?.editorApiHostGlobal);
    }
}
