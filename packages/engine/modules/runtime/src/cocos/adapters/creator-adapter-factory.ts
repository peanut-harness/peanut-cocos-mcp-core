import type { CreatorPhase } from '@peanut/pod-protocol';

import type { CreatorHostState } from '../shared/host-state.js';
import type { ICreatorAdapter } from './core/creator-adapter.js';
import type { IEditorApiAssetBridgeProvider } from './core/editor-api-asset-bridge-provider.js';
import type {
    IEditorApiPanelHostGlobal,
    IEditorApiPanelWindowProvider,
} from './core/editor-api-panel-window.js';
import type { IEditorApiSceneBridgeProvider } from './core/editor-api-scene-bridge-provider.js';

/**
 * @description 默认 Creator 适配器工厂的宿主装配参数。
 */
export interface IDefaultCreatorAdapterFactoryOptions {
    /**
     * @description 可选 Editor API 面板宿主 provider。
     */
    readonly editorApiPanelWindowProvider?: IEditorApiPanelWindowProvider;

    /**
     * @description 可选真实 Editor API 宿主全局对象；省略时使用 `globalThis`。
     */
    readonly editorApiHostGlobal?: IEditorApiPanelHostGlobal;

    /**
     * @description 测试场景下是否允许面板宿主退回内存 provider；默认 `false`。
     */
    readonly allowMemoryPanelWindowProviderFallback?: boolean;

    /**
     * @description 可选真实 Editor API AssetDB 写入 provider。
     */
    readonly editorApiAssetBridgeProvider?: IEditorApiAssetBridgeProvider;

    /**
     * @description 可选真实 Editor API 场景脚本 provider。
     */
    readonly editorApiSceneBridgeProvider?: IEditorApiSceneBridgeProvider;
}

/**
 * @description Creator 适配器工厂契约，隔离 Runtime 门面与各版本具体实现。
 */
export interface ICreatorAdapterFactory {
    /**
     * @description 根据已解析版本阶段创建唯一适配器。
     * @param creatorVersion 当前 Creator 版本
     * @param phase 当前版本阶段
     * @param hostState 适配器共享的宿主状态
     * @param options 宿主装配参数
     * @returns 与阶段匹配的适配器
     */
    create(
        creatorVersion: string,
        phase: CreatorPhase,
        hostState: CreatorHostState,
        options?: IDefaultCreatorAdapterFactoryOptions,
    ): ICreatorAdapter;
}

/**
 * @description 单一 Creator 阶段的适配器工厂描述符。
 */
export interface ICreatorPhaseAdapterFactory {
    /**
     * @description 工厂稳定标识。
     */
    readonly id: string;

    /**
     * @description 工厂负责的唯一 Creator 阶段。
     */
    readonly phase: CreatorPhase;

    /**
     * @description 创建当前阶段的适配器。
     * @param creatorVersion 当前 Creator 版本
     * @param hostState 适配器共享的宿主状态
     * @param options 宿主装配参数
     * @returns 当前阶段适配器
     */
    create(
        creatorVersion: string,
        hostState: CreatorHostState,
        options?: IDefaultCreatorAdapterFactoryOptions,
    ): ICreatorAdapter;
}
