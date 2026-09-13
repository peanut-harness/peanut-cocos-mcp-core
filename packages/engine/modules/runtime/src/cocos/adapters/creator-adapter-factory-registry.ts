import type { CreatorPhase } from '@peanut/pod-protocol';

import type { CreatorHostState } from '../shared/host-state.js';
import type { ICreatorAdapter } from './core/creator-adapter.js';
import type {
    ICreatorPhaseAdapterFactory,
    IDefaultCreatorAdapterFactoryOptions,
} from './creator-adapter-factory.js';

/**
 * @description Creator 阶段适配器工厂注册表，确保工厂标识与阶段映射唯一。
 */
export class CreatorAdapterFactoryRegistry {
    /**
     * @description 按稳定标识保存的阶段工厂。
     */
    private readonly _factoriesById = new Map<string, ICreatorPhaseAdapterFactory>();

    /**
     * @description 按 Creator 阶段保存的唯一工厂。
     */
    private readonly _factoriesByPhase = new Map<CreatorPhase, ICreatorPhaseAdapterFactory>();

    /**
     * @description 创建注册表并注册初始工厂。
     * @param factories 初始阶段工厂列表
     */
    public constructor(factories: readonly ICreatorPhaseAdapterFactory[] = []) {
        for (const factory of factories) {
            this.register(factory);
        }
    }

    /**
     * @description 注册一个阶段工厂，并拒绝重复标识或重复阶段。
     * @param factory 阶段工厂
     * @returns 无返回值
     */
    public register(factory: ICreatorPhaseAdapterFactory): void {
        if (this._factoriesById.has(factory.id)) {
            throw new Error(`adapter_factory_id_duplicate:${factory.id}`);
        }
        if (this._factoriesByPhase.has(factory.phase)) {
            throw new Error(`adapter_factory_phase_duplicate:${factory.phase}`);
        }
        this._factoriesById.set(factory.id, factory);
        this._factoriesByPhase.set(factory.phase, factory);
    }

    /**
     * @description 使用与阶段精确匹配的工厂创建适配器。
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
        const factory = this._factoriesByPhase.get(phase);
        if (factory == null) {
            throw new Error(`adapter_factory_phase_unsupported:${phase}:${creatorVersion}`);
        }
        return factory.create(creatorVersion, hostState, options);
    }
}
