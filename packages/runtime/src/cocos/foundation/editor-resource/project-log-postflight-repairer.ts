import type { IProjectLogPostflightResult } from './project-log-postflight-monitor.js';
import { ProjectLogPostflightMonitor } from './project-log-postflight-monitor.js';

/**
 * @description 一轮低风险自动修复所需的最小消息端口。
 */
export interface IProjectLogRepairMessagePort {
    /**
     * @description 向 Creator 发送请求。
     * @param target 目标。
     * @param message 消息。
     * @param args 参数。
     * @returns 结果。
     */
    request(target: string, message: string, ...args: unknown[]): Promise<unknown>;
}

/**
 * @description 单次自动修复尝试摘要。
 */
export interface IProjectLogRepairAttempt {
    /** @description 修复动作标识。 */
    readonly action: 'asset-db.refresh';
    /** @description 是否完成且未抛错。 */
    readonly ok: boolean;
    /** @description 失败时的可诊断信息。 */
    readonly error?: string;
}

/**
 * @description 含可选一轮修复的 postflight 结果。
 */
export interface IProjectLogPostflightWithRepair extends IProjectLogPostflightResult {
    /** @description 修复尝试（最多一轮）。 */
    readonly repairAttempts?: readonly IProjectLogRepairAttempt[];
    /** @description 修复后再读的验证结果。 */
    readonly verification?: IProjectLogPostflightResult;
}

/**
 * @description 写操作后若日志未 verified，尝试一轮低风险 AssetDB 刷新再复查。
 */
export class ProjectLogPostflightRepairer {
    /** @description 日志监视器。 */
    private readonly _monitor: ProjectLogPostflightMonitor;
    /** @description 可选消息端口；缺省时仅返回原 postflight。 */
    private readonly _message: IProjectLogRepairMessagePort | null;

    /**
     * @description 创建修复器。
     * @param message 可选 Creator 消息端口。
     * @param monitor 可选日志监视器。
     */
    public constructor(
        message: IProjectLogRepairMessagePort | null = null,
        monitor: ProjectLogPostflightMonitor = new ProjectLogPostflightMonitor(),
    ) {
        this._message = message;
        this._monitor = monitor;
    }

    /**
     * @description 若已 verified 则原样返回；否则执行一轮 refresh 并复查增量。
     * @param projectRoot 项目根。
     * @param postflight 首次 postflight。
     * @param options 选项。
     * @returns 可能附带 repairAttempts / verification 的结果。
     */
    public async repairOnceIfNeeded(
        projectRoot: string,
        postflight: IProjectLogPostflightResult,
        options: { readonly skipRepair?: boolean } = {},
    ): Promise<IProjectLogPostflightWithRepair> {
        if (postflight.verified === true || options.skipRepair === true || this._message == null) {
            return postflight;
        }
        const repairCheckpoint = this._monitor.checkpoint(projectRoot);
        let repairError: string | undefined;
        try {
            await this._message.request('asset-db', 'refresh-asset', 'db://assets/');
        } catch (error: unknown) {
            try {
                await this._message.request('asset-db', 'refresh', 'db://assets/');
            } catch (fallbackError: unknown) {
                repairError =
                    fallbackError instanceof Error
                        ? fallbackError.message
                        : error instanceof Error
                          ? error.message
                          : 'asset_db_refresh_failed';
            }
        }
        const attempt: IProjectLogRepairAttempt = {
            action: 'asset-db.refresh',
            ok: repairError == null,
            ...(repairError != null ? { error: repairError } : {}),
        };
        const verification = this._monitor.readDelta(repairCheckpoint);
        return {
            ...postflight,
            repairAttempts: [attempt],
            verification,
            verified: attempt.ok === true && verification.verified === true,
        };
    }
}
