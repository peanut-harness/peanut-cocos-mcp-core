import type { CreatorHostState } from '../../shared/host-state.js';
import type { ICreatorAdapter } from '../core/creator-adapter.js';
import type {
    ICreatorPhaseAdapterFactory,
    IDefaultCreatorAdapterFactoryOptions,
} from '../creator-adapter-factory.js';
import { EditorApi24Adapter } from './editor-api-24-adapter.js';

/**
 * @description Creator 2.4 阶段适配器工厂。
 */
export class EditorApi24AdapterFactory implements ICreatorPhaseAdapterFactory {
    /**
     * @description 工厂稳定标识。
     */
    public readonly id = 'adapter-24-factory';

    /**
     * @description 工厂负责的 Creator 2.x 阶段。
     */
    public readonly phase = 'creator_2x' as const;

    /**
     * @description 创建 Creator 2.4 阶段适配器。
     * @param creatorVersion 当前 Creator 版本
     * @param hostState 适配器共享的宿主状态
     * @param options 宿主装配参数
     * @returns Creator 2.4 适配器
     */
    public create(
        creatorVersion: string,
        hostState: CreatorHostState,
        options?: IDefaultCreatorAdapterFactoryOptions,
    ): ICreatorAdapter {
        return new EditorApi24Adapter(creatorVersion, hostState, options?.editorApiHostGlobal);
    }
}
