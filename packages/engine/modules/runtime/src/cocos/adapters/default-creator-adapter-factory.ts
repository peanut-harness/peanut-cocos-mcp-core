import type { CreatorPhase } from '@peanut/pod-protocol';

import { EditorApi24Adapter } from './adapter-24/editor-api-24-adapter.js';
import { EditorApi35Adapter } from './adapter-35/editor-api-35-adapter.js';
import { EditorApi38Adapter } from './adapter-38/editor-api-38-adapter.js';
import type { IEditorApiAssetBridgeProvider } from './adapter-38/editor-api-host-asset-bridge-provider.js';
import type { IEditorApiPanelHostGlobal } from './adapter-38/editor-api-host-panel-window-provider.js';
import { EditorApiHostPanelWindowProvider } from './adapter-38/editor-api-host-panel-window-provider.js';
import type { EditorApiHostSceneBridgeProvider } from './adapter-38/editor-api-host-scene-bridge-provider.js';
import type { IEditorApiPanelWindowProvider } from './adapter-38/editor-api-panel-window-launcher.js';
import type { ICreatorAdapter } from './core/creator-adapter.js';
import type { CreatorHostState } from '../shared/host-state.js';

/**
 * @description 默认 Creator 适配器工厂的宿主装配参数。
 */
export interface IDefaultCreatorAdapterFactoryOptions {
    /**
     * @description 可选 Editor API 面板宿主 provider。
     */
    readonly editorApiPanelWindowProvider?: IEditorApiPanelWindowProvider;

    /**
     * @description 可选真实 Editor API 面板宿主全局对象；省略时使用 `globalThis`。
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
    readonly editorApiSceneBridgeProvider?: EditorApiHostSceneBridgeProvider;
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
 * @description 默认 Creator 适配器组合根，集中管理版本实现的选择与依赖装配。
 */
export class DefaultCreatorAdapterFactory implements ICreatorAdapterFactory {
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
        if (phase === 'editor_api_stable') {
            return new EditorApi38Adapter(
                creatorVersion,
                hostState,
                options?.editorApiPanelWindowProvider ??
                    new EditorApiHostPanelWindowProvider(undefined, options?.editorApiHostGlobal, {
                        allowFallbackProvider: options?.allowMemoryPanelWindowProviderFallback === true,
                    }),
                options?.editorApiAssetBridgeProvider,
                options?.editorApiSceneBridgeProvider,
                options?.editorApiHostGlobal,
            );
        }
        if (phase === 'creator_3x_early') {
            return new EditorApi35Adapter(creatorVersion, hostState, options?.editorApiHostGlobal);
        }
        if (phase === 'creator_2x') {
            return new EditorApi24Adapter(creatorVersion, hostState, options?.editorApiHostGlobal);
        }
        throw new Error(`adapter_factory_phase_unsupported:${phase}:${creatorVersion}`);
    }
}
