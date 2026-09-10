import type { IAcceptedTask } from '../ingress/task-ingress.js';
import { CreatorHostState } from '../../cocos/shared/host-state.js';

/**
 * @description 单任务规划快照。
 */
export interface ITaskPlanningSnapshot {
    /**
     * @description 任务标识。
     */
    readonly taskId: string;

    /**
     * @description 任务种类。
     */
    readonly kind: string;

    /**
     * @description 当前任务目标标识。
     */
    readonly target: string;

    /**
     * @description 当前任务的状态指纹。
     */
    readonly fingerprint: string;
}

/**
 * @description 任务快照检查器，负责在规划和提交之间捕获并校验目标状态指纹。
 */
export class TaskSnapshotInspector {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _hostState: CreatorHostState;

    /**
     * @description 创建一个新的任务快照检查器。
     * @param hostState Creator 宿主内存状态
     */
    public constructor(hostState: CreatorHostState) {
        this._hostState = hostState;
    }

    /**
     * @description 为指定任务捕获规划快照。
     * @param task 已标准化的任务模型
     * @returns 当前任务规划快照
     */
    public capture(task: IAcceptedTask): ITaskPlanningSnapshot {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ target = this._resolveTarget(task);
        return {
            taskId: task.taskId,
            kind: task.request.kind,
            target,
            fingerprint: this._buildFingerprint(task),
        };
    }

    /**
     * @description 校验当前任务是否仍然命中原规划快照。
     * @param task 已标准化的任务模型
     * @param snapshot 原规划快照
     * @returns 未发生漂移时返回 `true`
     */
    public validate(task: IAcceptedTask, snapshot: ITaskPlanningSnapshot): boolean {
        return this._buildFingerprint(task) === snapshot.fingerprint;
    }

    /**
     * @description 返回当前任务是否允许在快照失效后自动重规划。
     * @param task 已标准化的任务模型
     * @returns 可自动重规划时返回 `true`
     */
    public canReplan(task: IAcceptedTask): boolean {
        return task.request.kind === 'asset.query' || task.request.kind === 'asset.refresh' || task.request.kind === 'scene.patch';
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _buildFingerprint(task: IAcceptedTask): string {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ statePayload = this._readTargetState(task);
        return this._stableStringify(statePayload);
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _readTargetState(task: IAcceptedTask): unknown {
        if (task.request.kind === 'asset.query' || task.request.kind === 'asset.refresh') {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pathOrUuid = this._resolveTarget(task);
            return this._hostState.getAsset(pathOrUuid);
        }
        if (task.request.kind === 'scene.patch') {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ nodeId = this._resolveTarget(task);
            return this._hostState.getSceneNode(nodeId);
        }
        return null;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _resolveTarget(task: IAcceptedTask): string {
        if (typeof task.request.payload !== 'object' || task.request.payload == null) {
            return `${task.request.scope}:${task.request.kind}`;
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ payloadRecord = task.request.payload as Record<string, unknown>;
        if (typeof payloadRecord.pathOrUuid === 'string') {
            return payloadRecord.pathOrUuid;
        }
        if (typeof payloadRecord.nodeId === 'string') {
            return payloadRecord.nodeId;
        }
        return `${task.request.scope}:${task.request.kind}`;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _stableStringify(input: unknown): string {
        if (input == null || typeof input !== 'object') {
            return JSON.stringify(input);
        }
        if (Array.isArray(input)) {
            return `[${input.map((item) => {
                return this._stableStringify(item);
            }).join(',')}]`;
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ objectRecord = input as Record<string, unknown>;
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ keys = Object.keys(objectRecord).sort();
        return `{${keys.map((key) => {
            return `${JSON.stringify(key)}:${this._stableStringify(objectRecord[key])}`;
        }).join(',')}}`;
    }
}
