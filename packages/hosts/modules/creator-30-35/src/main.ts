import { RuntimeFacade } from '@peanut/pod-engine/runtime';
import { resolveCreatorContext } from '@peanut/pod-hosts';

/**
 * @description Creator 3.x 主进程最小 Editor 面。
 */
interface ICreator35EditorGlobal {
    /**
     * @description Editor API。
     */
    readonly Editor?: {
        /**
         * @description 应用版本信息。
         */
        readonly App?: {
            /**
             * @description Creator 版本。
             */
            readonly version?: string;
        };
        /**
         * @description 日志。
         * @param message 文本
         * @returns void
         */
        log?(message: string): void;
        /**
         * @description 面板服务。
         */
        readonly Panel?: {
            /**
             * @description 打开面板。
             * @param panelId 面板 id
             * @returns Promise 或 void
             */
            open?(panelId: string): void | Promise<void>;
        };
    };
}

/**
 * @description 解析 Creator 版本；未知时拒绝启动，禁止伪装成已知版本。
 * @param hostGlobal 宿主全局
 * @returns 版本字符串
 */
function resolveCreatorVersion(hostGlobal: ICreator35EditorGlobal): string {
    const version = hostGlobal.Editor?.App?.version;
    if (typeof version === 'string' && version.trim().length > 0) {
        return version.trim();
    }
    throw new Error('creator_version_unavailable');
}

/** @description 当前 Runtime 门面。 */
let runtimeFacade: RuntimeFacade | null = null;

/**
 * @description 扩展加载。
 * @returns Promise
 */
export async function load(): Promise<void> {
    const hostGlobal = globalThis as ICreator35EditorGlobal;
    const creatorVersion = resolveCreatorVersion(hostGlobal);
    const creatorContext = resolveCreatorContext(creatorVersion);
    runtimeFacade = new RuntimeFacade(creatorVersion, {
        editorApiHostGlobal: hostGlobal as never,
        allowMemoryPanelWindowProviderFallback: false,
    });
    const profile = runtimeFacade.getActiveAdapterProfile();
    hostGlobal.Editor?.log?.(
        `[peanut-pod-35] loaded profile=${creatorContext.profileId} adapter=${profile?.adapterId ?? 'none'} version=${creatorVersion} level=${creatorContext.support} writes=${creatorContext.writesAllowed}`,
    );
}

/**
 * @description 扩展卸载。
 * @returns Promise
 */
export async function unload(): Promise<void> {
    runtimeFacade = null;
}

/**
 * @description 组装诊断快照。
 * @returns 诊断对象
 */
function buildDiagnoseSnapshot(): Record<string, unknown> {
    if (runtimeFacade == null) {
        return { ok: false, error: 'peanut_pod_35_not_loaded' };
    }
    const profile = runtimeFacade.getActiveAdapterProfile();
    const version = runtimeFacade.version.getCurrentVersion();
    return {
        ok: true,
        lineId: 'early3x',
        phase: version.phase,
        creatorVersion: version.raw,
        adapterId: profile?.adapterId ?? null,
        supportLevel: profile?.supportLevel ?? null,
        diagnostics: profile?.diagnostics ?? [],
        mvp: 'compatible-host',
        note: 'silent_asset_and_lumen_require_host_retest',
    };
}

/**
 * @description Creator 3.x methods 表。
 */
export const methods = {
    /**
     * @description 打开诊断面板并打日志。
     * @returns Promise
     */
    async diagnose(): Promise<void> {
        const hostGlobal = globalThis as ICreator35EditorGlobal;
        const snapshot = buildDiagnoseSnapshot();
        hostGlobal.Editor?.log?.(`[peanut-pod-35] diagnose ${JSON.stringify(snapshot)}`);
        await hostGlobal.Editor?.Panel?.open?.('peanut-pod-35.diagnose');
    },
    /**
     * @description 返回诊断快照。
     * @returns 诊断对象
     */
    queryDiagnose(): Record<string, unknown> {
        return buildDiagnoseSnapshot();
    },
    /**
     * @description 返回工程路径/名称。
     * @returns 工程快照
     */
    async queryProject(): Promise<Record<string, unknown>> {
        if (runtimeFacade == null) {
            return { ok: false, error: 'peanut_pod_35_not_loaded' };
        }
        return {
            ok: true,
            path: await runtimeFacade.project.getProjectPath(),
            name: await runtimeFacade.project.getProjectName(),
            version: runtimeFacade.version.getCurrentVersion(),
        };
    },
};
