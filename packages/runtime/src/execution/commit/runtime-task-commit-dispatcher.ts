import type { IChangeSetEntry } from 'peanut-contracts';

import type { IAcceptedTask } from '../ingress/task-ingress.js';
import type { IAssetRuntimeService } from '../../cocos/foundation/asset/asset-runtime-service.js';
import type { ISceneRuntimeService } from '../../cocos/foundation/scene/scene-runtime-service.js';

/**
 * @description 单个任务提交完成后的结构化结果。
 */
export interface ITaskCommitOutcome {
    /**
     * @description 对应的任务标识。
     */
    readonly taskId: string;

    /**
     * @description 实际执行的任务种类。
     */
    readonly kind: string;

    /**
     * @description 任务执行返回数据。
     */
    readonly data?: Record<string, unknown>;

    /**
     * @description 本次提交产生的变更摘要。
     */
    readonly changes: readonly IChangeSetEntry[];
}

/**
 * @description Runtime 提交派发器，负责把标准化任务路由到 asset / scene foundation 服务。
 */
export class RuntimeTaskCommitDispatcher {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _assetRuntimeService: IAssetRuntimeService;
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _sceneRuntimeService: ISceneRuntimeService;

    /**
     * @description 创建一个新的 Runtime 提交派发器。
     * @param assetRuntimeService Asset 子域服务
     * @param sceneRuntimeService Scene 子域服务
     */
    public constructor(assetRuntimeService: IAssetRuntimeService, sceneRuntimeService: ISceneRuntimeService) {
        this._assetRuntimeService = assetRuntimeService;
        this._sceneRuntimeService = sceneRuntimeService;
    }

    /**
     * @description 执行一个标准化提交任务。
     * @param task 已标准化的任务模型
     * @returns Promise 返回该任务的提交结果
     */
    public async dispatch(task: IAcceptedTask): Promise<ITaskCommitOutcome> {
        if (task.request.kind === 'asset.query') {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const pathOrUuid = this._requireStringField(task.request.payload, 'pathOrUuid', task.request.kind);
            // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
            const assetSnapshot = await this._assetRuntimeService.query(pathOrUuid);
            return {
                taskId: task.taskId,
                kind: task.request.kind,
                data: {
                    pathOrUuid,
                    asset: this._toRecordOrValue(assetSnapshot),
                    found: assetSnapshot != null,
                },
                changes: [],
            };
        }

        if (task.request.kind === 'asset.refresh') {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const pathOrUuid = this._requireStringField(task.request.payload, 'pathOrUuid', task.request.kind);
            // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
            const refreshedAssetSnapshot = await this._assetRuntimeService.refresh(pathOrUuid);
            return {
                taskId: task.taskId,
                kind: task.request.kind,
                data: {
                    pathOrUuid,
                    asset: this._toRecordOrValue(refreshedAssetSnapshot),
                    refreshed: refreshedAssetSnapshot != null,
                },
                changes:
                    refreshedAssetSnapshot == null
                        ? []
                        : [
                              {
                                  kind: 'asset',
                                  target: pathOrUuid,
                                  operation: 'refresh',
                                  summary: `Refreshed asset "${pathOrUuid}".`,
                              },
                          ],
            };
        }

        if (task.request.kind === 'scene.patch') {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const nodeId = this._requireStringField(task.request.payload, 'nodeId', task.request.kind);
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const patch = this._requireRecordField(task.request.payload, 'patch', task.request.kind);
            // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
            const sceneNodeSnapshot = await this._sceneRuntimeService.patch(nodeId, patch);
            return {
                taskId: task.taskId,
                kind: task.request.kind,
                data: {
                    nodeId,
                    patch,
                    sceneNode: sceneNodeSnapshot,
                },
                changes: [
                    {
                        kind: 'scene',
                        target: nodeId,
                        operation: 'patch',
                        summary: `Patched scene node "${nodeId}".`,
                    },
                ],
            };
        }

        throw new Error(`unsupported_task_kind:${task.request.kind}`);
    }

    /**
     * @description 在同一个批提交窗口内刷新多条资源任务。
     * @param tasks 已标准化的资源任务列表
     * @param batchId 当前提交批次标识
     * @returns Promise 返回当前批次内各任务的提交结果
     */
    public async dispatchBatchRefresh(tasks: readonly IAcceptedTask[], batchId: string): Promise<readonly ITaskCommitOutcome[]> {
        // 维护当前作用域内的映射索引，用于按键查询并关联后续处理数据。
        const uniqueTargets = new Map<string, Record<string, unknown> | null>();
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ task of tasks) {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const pathOrUuid = this._requireStringField(task.request.payload, 'pathOrUuid', task.request.kind);
            if (uniqueTargets.has(pathOrUuid)) {
                continue;
            }

            // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
            const refreshedAssetSnapshot = await this._assetRuntimeService.refresh(pathOrUuid);
            uniqueTargets.set(pathOrUuid, this._toRecordOrValue(refreshedAssetSnapshot));
        }

        // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
        const batchTargets = [...uniqueTargets.keys()];
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const isGroupedBatch = tasks.length > 1;
        return tasks.map((task) => {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const pathOrUuid = this._requireStringField(task.request.payload, 'pathOrUuid', task.request.kind);
            // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
            const refreshedAssetSnapshot = uniqueTargets.get(pathOrUuid) ?? null;
            return {
                taskId: task.taskId,
                kind: task.request.kind,
                data: {
                    pathOrUuid,
                    asset: refreshedAssetSnapshot,
                    refreshed: refreshedAssetSnapshot != null,
                    batchId,
                    batchSize: tasks.length,
                    batchTargets,
                },
                changes:
                    refreshedAssetSnapshot == null
                        ? []
                        : [
                              {
                                  kind: 'asset',
                                  target: pathOrUuid,
                                  operation: isGroupedBatch ? 'batch_refresh' : 'refresh',
                                  summary: isGroupedBatch
                                      ? `Batch refreshed asset "${pathOrUuid}" in "${batchId}".`
                                      : `Refreshed asset "${pathOrUuid}".`,
                              },
                          ],
            };
        });
    }

    /**
     * @description 在同一个 coalesce 窗口内合并多条场景补丁任务。
     * @param tasks 已标准化的场景补丁任务列表
     * @param batchId 当前提交批次标识
     * @returns Promise 返回当前批次内各任务的提交结果
     */
    public async dispatchCoalescedScenePatch(tasks: readonly IAcceptedTask[], batchId: string): Promise<readonly ITaskCommitOutcome[]> {
        // 维护当前作用域内的映射索引，用于按键查询并关联后续处理数据。
        const coalescedPatches = new Map<string, Record<string, unknown>>();
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ task of tasks) {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const nodeId = this._requireStringField(task.request.payload, 'nodeId', task.request.kind);
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const patch = this._requireRecordField(task.request.payload, 'patch', task.request.kind);
            // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
            const currentPatch = coalescedPatches.get(nodeId) ?? {};
            coalescedPatches.set(nodeId, {
                ...currentPatch,
                ...patch,
            });
        }

        // 维护当前作用域内的映射索引，用于按键查询并关联后续处理数据。
        const sceneNodeSnapshots = new Map<string, Record<string, unknown>>();
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ [nodeId, patch] of coalescedPatches.entries()) {
            // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
            const sceneNodeSnapshot = await this._sceneRuntimeService.patch(nodeId, patch);
            sceneNodeSnapshots.set(nodeId, sceneNodeSnapshot);
        }

        // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
        const coalescedNodeIds = [...coalescedPatches.keys()];
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const isGroupedCoalesce = tasks.length > 1;
        return tasks.map((task) => {
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const nodeId = this._requireStringField(task.request.payload, 'nodeId', task.request.kind);
            // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
            const originalPatch = this._requireRecordField(task.request.payload, 'patch', task.request.kind);
            // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
            const coalescedPatch = coalescedPatches.get(nodeId) ?? {};
            // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
            const sceneNodeSnapshot = sceneNodeSnapshots.get(nodeId);
            if (sceneNodeSnapshot == null) {
                throw new Error(`coalesced_scene_patch_missing_node:${nodeId}`);
            }

            return {
                taskId: task.taskId,
                kind: task.request.kind,
                data: {
                    nodeId,
                    patch: originalPatch,
                    coalescedPatch,
                    sceneNode: sceneNodeSnapshot,
                    batchId,
                    coalescedTaskCount: tasks.length,
                    coalescedNodeIds,
                },
                changes: [
                    {
                        kind: 'scene',
                        target: nodeId,
                        operation: isGroupedCoalesce ? 'coalesced_patch' : 'patch',
                        summary: isGroupedCoalesce
                            ? `Coalesced scene patch for node "${nodeId}" in "${batchId}".`
                            : `Patched scene node "${nodeId}".`,
                    },
                ],
            };
        });
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _requireStringField(payload: unknown, fieldName: string, kind: string): string {
        if (typeof payload !== 'object' || payload == null) {
            throw new Error(`invalid_${kind}_payload:${fieldName}`);
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const payloadRecord = payload as Record<string, unknown>;
        if (typeof payloadRecord[fieldName] !== 'string') {
            throw new Error(`invalid_${kind}_payload:${fieldName}`);
        }

        return payloadRecord[fieldName];
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _requireRecordField(payload: unknown, fieldName: string, kind: string): Record<string, unknown> {
        if (typeof payload !== 'object' || payload == null) {
            throw new Error(`invalid_${kind}_payload:${fieldName}`);
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const payloadRecord = payload as Record<string, unknown>;
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const fieldValue = payloadRecord[fieldName];
        if (typeof fieldValue !== 'object' || fieldValue == null || Array.isArray(fieldValue)) {
            throw new Error(`invalid_${kind}_payload:${fieldName}`);
        }

        return {
            ...(fieldValue as Record<string, unknown>),
        };
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private _toRecordOrValue(value: unknown): Record<string, unknown> | null {
        if (value == null) {
            return null;
        }
        if (typeof value === 'object') {
            return {
                ...(value as Record<string, unknown>),
            };
        }

        return {
            value,
        };
    }
}
