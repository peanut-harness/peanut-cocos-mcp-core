import type { CreatorHostState } from '../../shared/host-state.js';
import type { ICreatorAdapter } from '../core/creator-adapter.js';
import type {
    ICreatorPhaseAdapterFactory,
    IDefaultCreatorAdapterFactoryOptions,
} from '../creator-adapter-factory.js';
import { EditorApi38Adapter } from './editor-api-38-adapter.js';
import { EditorApiHostPanelWindowProvider } from './editor-api-host-panel-window-provider.js';

/**
 * @description Creator Editor API 稳定阶段适配器工厂。
 */
export class EditorApi38AdapterFactory implements ICreatorPhaseAdapterFactory {
    /**
     * @description 工厂稳定标识。
     */
    public readonly id = 'adapter-38-factory';

    /**
     * @description 工厂负责的 Editor API 稳定阶段。
     */
    public readonly phase = 'editor_api_stable' as const;

    /**
     * @description 创建 Editor API 稳定阶段适配器。
     * @param creatorVersion 当前 Creator 版本
     * @param hostState 适配器共享的宿主状态
     * @param options 宿主装配参数
     * @returns Editor API 稳定阶段适配器
     */
    public create(
        creatorVersion: string,
        hostState: CreatorHostState,
        options?: IDefaultCreatorAdapterFactoryOptions,
    ): ICreatorAdapter {
        const panelWindowProvider = options?.editorApiPanelWindowProvider ?? new EditorApiHostPanelWindowProvider(
            undefined,
            options?.editorApiHostGlobal,
            {
                allowFallbackProvider: options?.allowMemoryPanelWindowProviderFallback === true,
            },
        );
        return new EditorApi38Adapter(
            creatorVersion,
            hostState,
            panelWindowProvider,
            options?.editorApiAssetBridgeProvider,
            options?.editorApiSceneBridgeProvider,
            options?.editorApiHostGlobal,
        );
    }
}
