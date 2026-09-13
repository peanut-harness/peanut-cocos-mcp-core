import { BaseCreatorAdapter } from '../core/base-creator-adapter.js';
import type { IAdapterProfile, IMessageBridge } from '../core/creator-adapter.js';
import { CreatorHostState } from '../../shared/host-state.js';
import {
    EditorApiHostMessageBridgeProvider,
    type IEditorApiMessageHostGlobal,
} from '../shared/editor-api-host-message-bridge-provider.js';

/**
 * @description 面向 Cocos Creator 3.0.x–3.5.x 的早期 Editor API 适配器（compatible；写盘需实机重测）。
 */
export class EditorApi35Adapter extends BaseCreatorAdapter {
    /** @description Creator Message 转发 provider。 */
    private readonly _messageBridgeProvider: EditorApiHostMessageBridgeProvider;

    /**
     * @description 创建 Creator 3.0–3.5 适配器。
     * @param creatorVersion 当前 Runtime 绑定的 Creator 版本字符串
     * @param hostState Creator 宿主内存状态
     * @param hostGlobal 可选 Creator 主进程全局；默认 `globalThis`
     */
    public constructor(creatorVersion: string, hostState: CreatorHostState, hostGlobal?: IEditorApiMessageHostGlobal) {
        super('adapter-35', creatorVersion, hostState, ['editor-api-early-3x']);
        this._messageBridgeProvider = new EditorApiHostMessageBridgeProvider(hostGlobal);
    }

    /**
     * @description 返回该适配器是否支持指定版本。
     * @param creatorVersion Cocos Creator 版本字符串
     * @returns 版本属于 3.0–3.5 时返回 `true`
     */
    public supports(creatorVersion: string): boolean {
        const [majorPart, minorPart] = creatorVersion.trim().split('.');
        const major = Number(majorPart ?? '0');
        const minor = Number(minorPart ?? '0');
        return major === 3 && minor >= 0 && minor <= 5;
    }

    /**
     * @description 返回当前版本对应的场景脚本字段名。
     * @returns 3.x 使用的 `contributions.scene.script`
     */
    protected getSceneManifestField(): 'contributions.scene.script' {
        return 'contributions.scene.script';
    }

    /**
     * @description 返回适配器当前诊断信息（compatible，待 host-verified）。
     * @returns 适配器诊断快照
     */
    public getProfile(): IAdapterProfile {
        const base = super.getProfile();
        const liveMessage = this._messageBridgeProvider.isAvailable();
        return {
            ...base,
            supportLevel: 'compatible',
            diagnostics: [
                'early_3x_mvp',
                liveMessage ? 'message_live' : 'message_memory',
                'silent_asset_retest_required',
                'lumen_meta_provisional',
            ],
        };
    }

    /**
     * @description 创建 Message 子域桥接；有 live API 时转发。
     * @returns Message 子域桥接实例
     */
    public createMessageBridge(): IMessageBridge {
        const memory = super.createMessageBridge();
        if (!this._messageBridgeProvider.isAvailable()) {
            return memory;
        }
        return {
            send: async (target: string, message: string, ...args: unknown[]): Promise<void> => {
                await this._messageBridgeProvider.send(target, message, ...args);
            },
            request: async <TData = unknown>(target: string, message: string, ...args: unknown[]): Promise<TData> => {
                return this._messageBridgeProvider.request<TData>(target, message, ...args);
            },
            broadcast: async (message: string, ...args: unknown[]): Promise<void> => {
                await this._messageBridgeProvider.broadcast(message, ...args);
            },
        };
    }
}
