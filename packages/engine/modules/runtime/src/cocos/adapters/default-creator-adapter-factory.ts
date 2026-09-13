import type { CreatorPhase } from '@peanut/pod-protocol';

import type { CreatorHostState } from '../shared/host-state.js';
import { EditorApi24AdapterFactory } from './adapter-24/editor-api-24-adapter-factory.js';
import { EditorApi35AdapterFactory } from './adapter-35/editor-api-35-adapter-factory.js';
import { EditorApi38AdapterFactory } from './adapter-38/editor-api-38-adapter-factory.js';
import type { ICreatorAdapter } from './core/creator-adapter.js';
import type {
    ICreatorAdapterFactory,
    IDefaultCreatorAdapterFactoryOptions,
} from './creator-adapter-factory.js';
import { CreatorAdapterFactoryRegistry } from './creator-adapter-factory-registry.js';

export type {
    ICreatorAdapterFactory,
    ICreatorPhaseAdapterFactory,
    IDefaultCreatorAdapterFactoryOptions,
} from './creator-adapter-factory.js';

/**
 * @description 默认 Creator 适配器组合根，通过阶段工厂注册表完成版本实现装配。
 */
export class DefaultCreatorAdapterFactory implements ICreatorAdapterFactory {
    /**
     * @description 内置版本阶段工厂注册表。
     */
    private readonly _registry = new CreatorAdapterFactoryRegistry([
        new EditorApi24AdapterFactory(),
        new EditorApi35AdapterFactory(),
        new EditorApi38AdapterFactory(),
    ]);

    /**
     * @description 根据已解析版本阶段创建唯一适配器。
     * @param creatorVersion 当前 Creator 版本
     * @param phase 当前版本阶段
     * @param hostState 适配器共享的宿主状态
     * @param options 宿主装配参数
     * @returns 与阶段匹配的适配器
     */
    public create(
        creatorVersion: string,
        phase: CreatorPhase,
        hostState: CreatorHostState,
        options?: IDefaultCreatorAdapterFactoryOptions,
    ): ICreatorAdapter {
        return this._registry.create(creatorVersion, phase, hostState, options);
    }
}
