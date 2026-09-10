import assert from 'assert/strict';
import test from 'node:test';

import type { ITaskRequest } from 'peanut-contracts';

import { EditorApi38Adapter, RuntimeFacade } from '../src/index';
import { AdapterRegistry } from '../src/cocos/adapters/core/adapter-registry';
import { AssetRuntimeService } from '../src/cocos/foundation/asset/asset-runtime-service';
import { SceneRuntimeService } from '../src/cocos/foundation/scene/scene-runtime-service';
import { CreatorHostState } from '../src/cocos/shared/host-state';
import { VersionResolver } from '../src/cocos/version/version-resolver';
import { BatchCommitCoordinator } from '../src/execution/commit/batch-commit-coordinator';
import { RuntimeTaskCommitDispatcher } from '../src/execution/commit/runtime-task-commit-dispatcher';
import { ExecutionRuntimeService } from '../src/execution/execution-runtime-service';
import { TaskIngress } from '../src/execution/ingress/task-ingress';
import { TaskLedger } from '../src/execution/ledger/task-ledger';
import { ResourceLockManager } from '../src/execution/locks/resource-lock-manager';
import { TaskMerger } from '../src/execution/merge/task-merger';
import { TaskScheduler } from '../src/execution/scheduler/task-scheduler';
import { TaskSnapshotInspector } from '../src/execution/snapshot/task-snapshot-inspector';
import { TimeoutAndCancelController } from '../src/execution/timeout/timeout-and-cancel-controller';
import { TracePipeline } from '../src/execution/trace/trace-pipeline';
import { WorkerPool } from '../src/execution/workers/worker-pool';

class InstrumentedWorkerPool extends WorkerPool {
    /** @description 保存实例生命周期内需要复用的状态或协作依赖。 */
    public maxConcurrentPlans: number = 0;

    /** @description 保存实例生命周期内需要复用的状态或协作依赖。 */
    private _currentPlans: number = 0;
    /** @description 保存实例生命周期内需要复用的状态或协作依赖。 */
    private readonly _delayMs: number;

    /** @description 初始化实例所需的状态与协作依赖。 */
    public constructor(delayMs: number) {
        super();
        this._delayMs = delayMs;
    }

    /** @description 执行当前模块对外提供的处理流程。
 * @param groupId 当前调用所需的输入参数，决定本次处理的目标或行为。
 * @param tasks 当前调用所需的输入参数，决定本次处理的目标或行为。
 * @param mergePolicy 当前调用所需的输入参数，决定本次处理的目标或行为。
 * @returns 当前操作完成后产生的处理结果。
 */
    public override async plan(groupId: string, tasks: readonly import('../src/execution/ingress/task-ingress').IAcceptedTask[], mergePolicy: import('peanut-contracts').TaskMergePolicy | 'none') {
        this._currentPlans += 1;
        this.maxConcurrentPlans = Math.max(this.maxConcurrentPlans, this._currentPlans);
        try {
            await new Promise((resolve) => {
                setTimeout(resolve, this._delayMs);
            });
            return await super.plan(groupId, tasks, mergePolicy);
        } finally {
            this._currentPlans -= 1;
        }
    }
}

class InstrumentedBatchCommitCoordinator extends BatchCommitCoordinator {
    /** @description 保存实例生命周期内需要复用的状态或协作依赖。 */
    public maxConcurrentCommits: number = 0;
    /** @description 保存实例生命周期内需要复用的状态或协作依赖。 */
    public readonly committedGroupIds: string[] = [];

    /** @description 保存实例生命周期内需要复用的状态或协作依赖。 */
    private _currentCommits: number = 0;
    /** @description 保存实例生命周期内需要复用的状态或协作依赖。 */
    private readonly _delayMs: number;

    /** @description 初始化实例所需的状态与协作依赖。 */
    public constructor(delayMs: number) {
        super();
        this._delayMs = delayMs;
    }

    /** @description 执行当前模块对外提供的处理流程。
 * @param taskGroup 当前调用所需的输入参数，决定本次处理的目标或行为。
 * @param tasks 当前调用所需的输入参数，决定本次处理的目标或行为。
 * @param planSummary 当前调用所需的输入参数，决定本次处理的目标或行为。
 * @returns 当前操作完成后产生的处理结果。
 */
    public override async commit(
        taskGroup: import('../src/execution/merge/task-merger').ITaskMergeGroup,
        tasks: readonly import('../src/execution/ingress/task-ingress').IAcceptedTask[],
        planSummary: import('../src/execution/workers/worker-pool').IWorkerPlanSummary,
    ) {
        this._currentCommits += 1;
        this.maxConcurrentCommits = Math.max(this.maxConcurrentCommits, this._currentCommits);
        this.committedGroupIds.push(taskGroup.groupId);
        try {
            await new Promise((resolve) => {
                setTimeout(resolve, this._delayMs);
            });
            return await super.commit(taskGroup, tasks, planSummary);
        } finally {
            this._currentCommits -= 1;
        }
    }
}

function createExecutionRuntimeService(resourceLockManager?: ResourceLockManager): {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    executionRuntimeService: ExecutionRuntimeService;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    resourceLockManager: ResourceLockManager;
} {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskLedger = new TaskLedger();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const nextResourceLockManager = resourceLockManager ?? new ResourceLockManager();
    return {
        executionRuntimeService: new ExecutionRuntimeService(
            new TaskIngress(),
            new TaskScheduler(taskLedger),
            taskLedger,
            new WorkerPool(),
            new TaskMerger(),
            nextResourceLockManager,
            new BatchCommitCoordinator(),
            new TracePipeline(),
        ),
        resourceLockManager: nextResourceLockManager,
    };
}

function createHostBackedExecutionRuntimeService(options?: {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly planDelayMs?: number;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly commitDelayMs?: number;
}): {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    executionRuntimeService: ExecutionRuntimeService;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    hostState: CreatorHostState;
} {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const hostState = new CreatorHostState();
    hostState.setAsset('assets/example.prefab', {
        path: 'assets/example.prefab',
        uuid: 'example-prefab-uuid',
        type: 'prefab',
    });
    hostState.setSceneNode('root-node', {
        nodeId: 'root-node',
        enabled: false,
        x: 0,
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const creatorVersion = '3.8.7';
    // 保存当前流程需要复用的索引或缓存状态，归当前作用域或实例管理。
    const adapterRegistry = new AdapterRegistry();
    adapterRegistry.register(new EditorApi38Adapter(creatorVersion, hostState));

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const versionResolver = new VersionResolver(creatorVersion);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const assetRuntimeService = new AssetRuntimeService(adapterRegistry, versionResolver);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const sceneRuntimeService = new SceneRuntimeService(adapterRegistry, versionResolver);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskSnapshotInspector = new TaskSnapshotInspector(hostState);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskLedger = new TaskLedger();

    return {
        executionRuntimeService: new ExecutionRuntimeService(
            new TaskIngress(),
            new TaskScheduler(taskLedger),
            taskLedger,
            new WorkerPool(taskSnapshotInspector, options?.planDelayMs ?? 0),
            new TaskMerger(),
            new ResourceLockManager(),
            new BatchCommitCoordinator(
                new RuntimeTaskCommitDispatcher(assetRuntimeService, sceneRuntimeService),
                taskSnapshotInspector,
                options?.commitDelayMs ?? 0,
            ),
            new TracePipeline(),
            new TimeoutAndCancelController(),
        ),
        hostState,
    };
}

function createAssetQueryTaskRequest(pluginId: string, requestId: string, pathOrUuid: string): ITaskRequest {
    return {
        requestId,
        pluginId,
        scope: 'asset',
        priority: 'normal',
        kind: 'asset.query',
        payload: {
            pathOrUuid,
        },
        mergePolicy: 'dedupe',
        idempotencyKey: `asset.query:${pathOrUuid}`,
    };
}

test('execution runtime service should fail grouped tasks when the resource lock is unavailable', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const resourceLockManager = new ResourceLockManager();
    resourceLockManager.acquire('asset:asset.query');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const { executionRuntimeService } = createExecutionRuntimeService(resourceLockManager);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskReceipt = await executionRuntimeService.submit(createAssetQueryTaskRequest('plugin-lock', 'request-lock', 'assets/locked.prefab'));
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskResult = await executionRuntimeService.getResult(taskReceipt.taskId);

    assert.equal(taskReceipt.status, 'failed');
    assert.notEqual(taskResult, null);
    assert.equal(taskResult?.ok, false);
    assert.equal(taskResult?.status, 'failed');
    assert.equal(taskResult?.error?.code, 'resource_lock_unavailable');
    assert.equal(taskResult?.trace.steps[0]?.status, 'failed');
});

test('execution runtime service should keep distinct task ids while deduping a batch to one canonical commit', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const { executionRuntimeService } = createExecutionRuntimeService();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskBatchReceipt = await executionRuntimeService.submitBatch([
        createAssetQueryTaskRequest('plugin-a', 'request-a', 'assets/shared.prefab'),
        createAssetQueryTaskRequest('plugin-b', 'request-b', 'assets/shared.prefab'),
    ]);

    assert.equal(taskBatchReceipt.receipts.length, 2);
    assert.equal(taskBatchReceipt.receipts[0]?.status, 'succeeded');
    assert.equal(taskBatchReceipt.receipts[1]?.status, 'succeeded');

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const firstTaskId = taskBatchReceipt.receipts[0]?.taskId ?? '';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const secondTaskId = taskBatchReceipt.receipts[1]?.taskId ?? '';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const firstTaskResult = await executionRuntimeService.getResult(firstTaskId);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const secondTaskResult = await executionRuntimeService.getResult(secondTaskId);

    assert.notEqual(firstTaskResult, null);
    assert.notEqual(secondTaskResult, null);
    assert.equal(firstTaskResult?.data?.canonicalTaskId, firstTaskId);
    assert.equal(secondTaskResult?.data?.canonicalTaskId, firstTaskId);
    assert.notEqual(firstTaskResult?.trace.traceId, secondTaskResult?.trace.traceId);
    assert.deepEqual(secondTaskResult?.data?.taskIds, [firstTaskId, secondTaskId]);
});

test('runtime facade execution should dispatch asset queries through the asset runtime service', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskReceipt = await runtimeFacade.execution.submit({
        requestId: 'asset-query-dispatch',
        pluginId: 'runtime-dispatch-plugin',
        scope: 'asset',
        priority: 'normal',
        kind: 'asset.query',
        payload: {
            pathOrUuid: 'assets/example.prefab',
        },
        mergePolicy: 'dedupe',
        idempotencyKey: 'asset.query:assets/example.prefab',
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskResult = await runtimeFacade.execution.getResult(taskReceipt.taskId);

    assert.notEqual(taskResult, null);
    assert.equal(taskResult?.ok, true);
    assert.equal(taskResult?.data?.pathOrUuid, 'assets/example.prefab');
    assert.equal(taskResult?.data?.found, true);
    assert.equal(typeof taskResult?.data?.asset === 'object' && taskResult?.data?.asset != null, true);
    assert.equal(taskResult?.data?.asset?.type, 'prefab');
    assert.deepEqual(taskResult?.changes, []);
});

test('runtime facade execution should dispatch asset refresh tasks through the asset runtime service', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskReceipt = await runtimeFacade.execution.submit({
        requestId: 'asset-refresh-dispatch',
        pluginId: 'runtime-dispatch-plugin',
        scope: 'asset',
        priority: 'normal',
        kind: 'asset.refresh',
        payload: {
            pathOrUuid: 'assets/example.prefab',
        },
        mergePolicy: 'batch_commit',
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskResult = await runtimeFacade.execution.getResult(taskReceipt.taskId);

    assert.notEqual(taskResult, null);
    assert.equal(taskResult?.ok, true);
    assert.equal(taskResult?.data?.pathOrUuid, 'assets/example.prefab');
    assert.equal(taskResult?.data?.refreshed, true);
    assert.equal(taskResult?.changes.length, 1);
    assert.equal(taskResult?.changes[0]?.kind, 'asset');
    assert.equal(taskResult?.changes[0]?.operation, 'refresh');
});

test('runtime facade execution should batch asset refresh tasks into one commit window', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskBatchReceipt = await runtimeFacade.execution.submitBatch([
        {
            requestId: 'asset-refresh-batch-a',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'asset',
            priority: 'normal',
            kind: 'asset.refresh',
            payload: {
                pathOrUuid: 'assets/example.prefab',
            },
            mergePolicy: 'batch_commit',
        },
        {
            requestId: 'asset-refresh-batch-b',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'asset',
            priority: 'normal',
            kind: 'asset.refresh',
            payload: {
                pathOrUuid: 'assets/example-2.prefab',
            },
            mergePolicy: 'batch_commit',
        },
    ]);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const firstTaskId = taskBatchReceipt.receipts[0]?.taskId ?? '';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const secondTaskId = taskBatchReceipt.receipts[1]?.taskId ?? '';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const firstTaskResult = await runtimeFacade.execution.getResult(firstTaskId);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const secondTaskResult = await runtimeFacade.execution.getResult(secondTaskId);

    assert.notEqual(firstTaskResult, null);
    assert.notEqual(secondTaskResult, null);
    assert.equal(firstTaskResult?.data?.batchSize, 2);
    assert.equal(secondTaskResult?.data?.batchSize, 2);
    assert.equal(firstTaskResult?.data?.batchId, secondTaskResult?.data?.batchId);
    assert.deepEqual(firstTaskResult?.data?.batchTargets, ['assets/example.prefab', 'assets/example-2.prefab']);
    assert.deepEqual(secondTaskResult?.data?.batchTargets, ['assets/example.prefab', 'assets/example-2.prefab']);
    assert.equal(firstTaskResult?.changes[0]?.operation, 'batch_refresh');
    assert.equal(secondTaskResult?.changes[0]?.operation, 'batch_refresh');
});

test('runtime facade execution should dispatch scene patch tasks through the scene runtime service', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskReceipt = await runtimeFacade.execution.submit({
        requestId: 'scene-patch-dispatch',
        pluginId: 'runtime-dispatch-plugin',
        scope: 'scene',
        priority: 'normal',
        kind: 'scene.patch',
        payload: {
            nodeId: 'root-node',
            patch: {
                enabled: true,
                x: 32,
            },
        },
        mergePolicy: 'coalesce',
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskResult = await runtimeFacade.execution.getResult(taskReceipt.taskId);

    assert.notEqual(taskResult, null);
    assert.equal(taskResult?.ok, true);
    assert.equal(taskResult?.data?.nodeId, 'root-node');
    assert.equal(taskResult?.data?.sceneNode?.enabled, true);
    assert.equal(taskResult?.data?.sceneNode?.x, 32);
    assert.equal(taskResult?.changes.length, 1);
    assert.equal(taskResult?.changes[0]?.kind, 'scene');
    assert.equal(taskResult?.changes[0]?.operation, 'patch');
});

test('runtime facade execution should coalesce compatible scene patch tasks into a merged node state', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskBatchReceipt = await runtimeFacade.execution.submitBatch([
        {
            requestId: 'scene-patch-coalesce-a',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'scene',
            priority: 'normal',
            kind: 'scene.patch',
            payload: {
                nodeId: 'root-node',
                patch: {
                    enabled: true,
                    x: 16,
                },
            },
            mergePolicy: 'coalesce',
        },
        {
            requestId: 'scene-patch-coalesce-b',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'scene',
            priority: 'normal',
            kind: 'scene.patch',
            payload: {
                nodeId: 'root-node',
                patch: {
                    enabled: false,
                    x: 48,
                },
            },
            mergePolicy: 'coalesce',
        },
    ]);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const firstTaskId = taskBatchReceipt.receipts[0]?.taskId ?? '';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const secondTaskId = taskBatchReceipt.receipts[1]?.taskId ?? '';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const firstTaskResult = await runtimeFacade.execution.getResult(firstTaskId);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const secondTaskResult = await runtimeFacade.execution.getResult(secondTaskId);

    assert.notEqual(firstTaskResult, null);
    assert.notEqual(secondTaskResult, null);
    assert.equal(firstTaskResult?.data?.coalescedTaskCount, 2);
    assert.equal(secondTaskResult?.data?.coalescedTaskCount, 2);
    assert.deepEqual(firstTaskResult?.data?.coalescedNodeIds, ['root-node']);
    assert.deepEqual(secondTaskResult?.data?.coalescedNodeIds, ['root-node']);
    assert.equal(firstTaskResult?.data?.sceneNode?.enabled, false);
    assert.equal(secondTaskResult?.data?.sceneNode?.enabled, false);
    assert.equal(firstTaskResult?.data?.sceneNode?.x, 48);
    assert.equal(secondTaskResult?.data?.sceneNode?.x, 48);
    assert.equal(firstTaskResult?.changes[0]?.operation, 'coalesced_patch');
    assert.equal(secondTaskResult?.changes[0]?.operation, 'coalesced_patch');
});

test('runtime facade execution should fail unsupported task kinds with a structured error', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskReceipt = await runtimeFacade.execution.submit({
        requestId: 'unsupported-task-kind',
        pluginId: 'runtime-dispatch-plugin',
        scope: 'asset',
        priority: 'normal',
        kind: 'asset.remove',
        payload: {
            pathOrUuid: 'assets/example.prefab',
        },
        mergePolicy: 'none',
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskResult = await runtimeFacade.execution.getResult(taskReceipt.taskId);

    assert.notEqual(taskResult, null);
    assert.equal(taskResult?.ok, false);
    assert.equal(taskResult?.status, 'failed');
    assert.equal(taskResult?.error?.code, 'unsupported_task_kind:asset.remove');
});

test('execution runtime service should fail a task that times out during planning', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const { executionRuntimeService } = createHostBackedExecutionRuntimeService({
        planDelayMs: 20,
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskReceipt = await executionRuntimeService.submit({
        requestId: 'task-timeout-during-planning',
        pluginId: 'runtime-dispatch-plugin',
        scope: 'asset',
        priority: 'normal',
        kind: 'asset.query',
        payload: {
            pathOrUuid: 'assets/example.prefab',
        },
        mergePolicy: 'dedupe',
        timeoutMs: 1,
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskResult = await executionRuntimeService.getResult(taskReceipt.taskId);

    assert.notEqual(taskResult, null);
    assert.equal(taskResult?.ok, false);
    assert.equal(taskResult?.status, 'failed');
    assert.equal(taskResult?.error?.code, 'task_timeout');
});

test('execution runtime service should record timeout diagnostics in recent group history', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const { executionRuntimeService } = createHostBackedExecutionRuntimeService({
        planDelayMs: 20,
    });

    await executionRuntimeService.submit({
        requestId: 'task-timeout-diagnostics',
        pluginId: 'runtime-dispatch-plugin',
        scope: 'asset',
        priority: 'high',
        kind: 'asset.query',
        payload: {
            pathOrUuid: 'assets/example.prefab',
        },
        mergePolicy: 'dedupe',
        timeoutMs: 1,
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const diagnosticsSnapshot = await executionRuntimeService.inspectDiagnostics();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const timeoutGroup = diagnosticsSnapshot.recentGroups[0];

    assert.notEqual(timeoutGroup, null);
    assert.equal(timeoutGroup?.hasTimeout, true);
    assert.equal(timeoutGroup?.status, 'failed');
    assert.equal(timeoutGroup?.taskSummaries[0]?.isTimedOut, true);
    assert.equal(timeoutGroup?.taskSummaries[0]?.errorCode, 'task_timeout');
});

test('execution runtime service should record cancelled diagnostics in recent group history', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const { executionRuntimeService } = createHostBackedExecutionRuntimeService({
        planDelayMs: 40,
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const submitPromise = executionRuntimeService.submit({
        requestId: 'task-cancel-diagnostics',
        pluginId: 'runtime-dispatch-plugin',
        scope: 'asset',
        priority: 'normal',
        kind: 'asset.query',
        payload: {
            pathOrUuid: 'assets/example.prefab',
        },
        mergePolicy: 'dedupe',
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const queuedSnapshot = await waitForQueueSnapshot(executionRuntimeService, (queueSnapshot) => {
        return queueSnapshot.queuedTaskIds.length === 1;
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskId = queuedSnapshot.queuedTaskIds[0];
    assert.notEqual(taskId, null);
    if (taskId == null) {
        throw new Error('Expected queued task id for cancellation diagnostics test.');
    }

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const cancelResult = await executionRuntimeService.cancel(taskId);
    assert.equal(cancelResult.cancelled, true);

    await submitPromise;

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const diagnosticsSnapshot = await executionRuntimeService.inspectDiagnostics();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const cancelledGroup = diagnosticsSnapshot.recentGroups[0];

    assert.notEqual(cancelledGroup, null);
    assert.equal(cancelledGroup?.hasCancellation, true);
    assert.equal(cancelledGroup?.status, 'cancelled');
    assert.equal(cancelledGroup?.taskSummaries[0]?.isCancelled, true);
    assert.equal(cancelledGroup?.taskSummaries[0]?.errorCode, 'task_cancelled');
});

test('timeout and cancel controller should reject cancellation after entering the commit window', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const timeoutAndCancelController = new TimeoutAndCancelController();
    timeoutAndCancelController.register('task-1', 1000);

    assert.equal(timeoutAndCancelController.cancel('task-1').cancelled, true);
    timeoutAndCancelController.register('task-2', 1000);
    assert.equal(timeoutAndCancelController.enterCommitWindow('task-2'), true);
    assert.deepEqual(timeoutAndCancelController.cancel('task-2'), {
        cancelled: false,
        reason: 'task_in_commit_window',
    });
});

test('execution runtime service should replan a stale scene patch snapshot before commit', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const { executionRuntimeService, hostState } = createHostBackedExecutionRuntimeService({
        commitDelayMs: 20,
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const submitPromise = executionRuntimeService.submit({
        requestId: 'scene-patch-replan',
        pluginId: 'runtime-dispatch-plugin',
        scope: 'scene',
        priority: 'normal',
        kind: 'scene.patch',
        payload: {
            nodeId: 'root-node',
            patch: {
                enabled: true,
                x: 10,
            },
        },
        mergePolicy: 'coalesce',
    });

    setTimeout(() => {
        hostState.patchSceneNode('root-node', {
            enabled: false,
            externalRevision: 1,
        });
    }, 0);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskReceipt = await submitPromise;
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskResult = await executionRuntimeService.getResult(taskReceipt.taskId);

    assert.notEqual(taskResult, null);
    assert.equal(taskResult?.ok, true);
    assert.equal(taskResult?.data?.replanned, true);
    assert.equal(taskResult?.data?.sceneNode?.externalRevision, 1);
    assert.equal(taskResult?.data?.sceneNode?.x, 10);
});

test('execution runtime service should record replanned diagnostics in recent group history', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const { executionRuntimeService, hostState } = createHostBackedExecutionRuntimeService({
        commitDelayMs: 20,
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const submitPromise = executionRuntimeService.submit({
        requestId: 'scene-patch-replan-diagnostics',
        pluginId: 'runtime-dispatch-plugin',
        scope: 'scene',
        priority: 'critical',
        kind: 'scene.patch',
        payload: {
            nodeId: 'root-node',
            patch: {
                enabled: true,
                x: 24,
            },
        },
        mergePolicy: 'coalesce',
    });

    setTimeout(() => {
        hostState.patchSceneNode('root-node', {
            enabled: false,
            externalRevision: 2,
        });
    }, 0);

    await submitPromise;

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const diagnosticsSnapshot = await executionRuntimeService.inspectDiagnostics();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const replannedGroup = diagnosticsSnapshot.recentGroups[0];

    assert.notEqual(replannedGroup, null);
    assert.equal(replannedGroup?.hasReplan, true);
    assert.equal(replannedGroup?.priority, 'critical');
    assert.equal(replannedGroup?.taskSummaries[0]?.isReplanned, true);
    assert.notEqual(replannedGroup?.taskSummaries[0]?.trace, null);
});

test('execution runtime service should plan independent task groups in parallel and commit them serially', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskLedger = new TaskLedger();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const instrumentedWorkerPool = new InstrumentedWorkerPool(20);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const instrumentedBatchCommitCoordinator = new InstrumentedBatchCommitCoordinator(20);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const executionRuntimeService = new ExecutionRuntimeService(
        new TaskIngress(),
        new TaskScheduler(taskLedger),
        taskLedger,
        instrumentedWorkerPool,
        new TaskMerger(),
        new ResourceLockManager(),
        instrumentedBatchCommitCoordinator,
        new TracePipeline(),
        new TimeoutAndCancelController(),
    );

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskBatchReceipt = await executionRuntimeService.submitBatch([
        {
            requestId: 'parallel-plan-a',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'asset',
            priority: 'normal',
            kind: 'asset.query',
            payload: {
                pathOrUuid: 'assets/parallel-a.prefab',
            },
            mergePolicy: 'none',
        },
        {
            requestId: 'parallel-plan-b',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'scene',
            priority: 'normal',
            kind: 'scene.patch',
            payload: {
                nodeId: 'parallel-node-b',
                patch: {
                    enabled: true,
                },
            },
            mergePolicy: 'none',
        },
    ]);

    assert.equal(taskBatchReceipt.receipts.length, 2);
    assert.equal(instrumentedWorkerPool.maxConcurrentPlans >= 2, true);
    assert.equal(instrumentedBatchCommitCoordinator.maxConcurrentCommits, 1);
});

test('execution runtime service should commit higher-priority groups before lower-priority groups', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskLedger = new TaskLedger();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const instrumentedWorkerPool = new InstrumentedWorkerPool(20);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const instrumentedBatchCommitCoordinator = new InstrumentedBatchCommitCoordinator(20);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const executionRuntimeService = new ExecutionRuntimeService(
        new TaskIngress(),
        new TaskScheduler(taskLedger),
        taskLedger,
        instrumentedWorkerPool,
        new TaskMerger(),
        new ResourceLockManager(),
        instrumentedBatchCommitCoordinator,
        new TracePipeline(),
        new TimeoutAndCancelController(),
    );

    await executionRuntimeService.submitBatch([
        {
            requestId: 'priority-low',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'asset',
            priority: 'low',
            kind: 'asset.query',
            payload: {
                pathOrUuid: 'assets/priority-low.prefab',
            },
            mergePolicy: 'none',
        },
        {
            requestId: 'priority-high',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'scene',
            priority: 'high',
            kind: 'scene.patch',
            payload: {
                nodeId: 'priority-high-node',
                patch: {
                    enabled: true,
                },
            },
            mergePolicy: 'none',
        },
    ]);

    assert.equal(instrumentedWorkerPool.maxConcurrentPlans >= 2, true);
    assert.equal(instrumentedBatchCommitCoordinator.maxConcurrentCommits, 1);
    assert.equal(instrumentedBatchCommitCoordinator.committedGroupIds.length, 2);
    assert.equal(instrumentedBatchCommitCoordinator.committedGroupIds[0]?.startsWith('none:'), true);
    assert.equal(instrumentedBatchCommitCoordinator.committedGroupIds[1]?.startsWith('none:'), true);
    assert.equal(instrumentedBatchCommitCoordinator.committedGroupIds[0]?.includes('priority-high'), true);
    assert.equal(instrumentedBatchCommitCoordinator.committedGroupIds[1]?.includes('priority-low'), true);
});

test('execution runtime service should prevent lower-priority starvation within the same batch', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskLedger = new TaskLedger();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const instrumentedWorkerPool = new InstrumentedWorkerPool(20);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const instrumentedBatchCommitCoordinator = new InstrumentedBatchCommitCoordinator(20);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const executionRuntimeService = new ExecutionRuntimeService(
        new TaskIngress(),
        new TaskScheduler(taskLedger),
        taskLedger,
        instrumentedWorkerPool,
        new TaskMerger(),
        new ResourceLockManager(),
        instrumentedBatchCommitCoordinator,
        new TracePipeline(),
        new TimeoutAndCancelController(),
    );

    await executionRuntimeService.submitBatch([
        {
            requestId: 'fair-high-a',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'asset',
            priority: 'high',
            kind: 'asset.query',
            payload: {
                pathOrUuid: 'assets/fair-high-a.prefab',
            },
            mergePolicy: 'none',
        },
        {
            requestId: 'fair-high-b',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'asset',
            priority: 'high',
            kind: 'asset.query',
            payload: {
                pathOrUuid: 'assets/fair-high-b.prefab',
            },
            mergePolicy: 'none',
        },
        {
            requestId: 'fair-high-c',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'asset',
            priority: 'high',
            kind: 'asset.query',
            payload: {
                pathOrUuid: 'assets/fair-high-c.prefab',
            },
            mergePolicy: 'none',
        },
        {
            requestId: 'fair-low',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'scene',
            priority: 'low',
            kind: 'scene.patch',
            payload: {
                nodeId: 'fair-low-node',
                patch: {
                    enabled: true,
                },
            },
            mergePolicy: 'none',
        },
    ]);

    assert.equal(instrumentedBatchCommitCoordinator.committedGroupIds.length, 4);
    assert.equal(instrumentedBatchCommitCoordinator.committedGroupIds[0]?.includes('fair-high-a'), true);
    assert.equal(instrumentedBatchCommitCoordinator.committedGroupIds[1]?.includes('fair-high-b'), true);
    assert.equal(instrumentedBatchCommitCoordinator.committedGroupIds[2]?.includes('fair-low'), true);
    assert.equal(instrumentedBatchCommitCoordinator.committedGroupIds[3]?.includes('fair-high-c'), true);
});

test('execution runtime service should apply fair priority scheduling across concurrent batches', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskLedger = new TaskLedger();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const instrumentedWorkerPool = new InstrumentedWorkerPool(10);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const instrumentedBatchCommitCoordinator = new InstrumentedBatchCommitCoordinator(40);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const executionRuntimeService = new ExecutionRuntimeService(
        new TaskIngress(),
        new TaskScheduler(taskLedger),
        taskLedger,
        instrumentedWorkerPool,
        new TaskMerger(),
        new ResourceLockManager(),
        instrumentedBatchCommitCoordinator,
        new TracePipeline(),
        new TimeoutAndCancelController(),
    );

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const firstBatchPromise = executionRuntimeService.submitBatch([
        {
            requestId: 'cross-batch-low-a',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'asset',
            priority: 'low',
            kind: 'asset.query',
            payload: {
                pathOrUuid: 'assets/cross-batch-low-a.prefab',
            },
            mergePolicy: 'none',
        },
        {
            requestId: 'cross-batch-low-b',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'asset',
            priority: 'low',
            kind: 'asset.query',
            payload: {
                pathOrUuid: 'assets/cross-batch-low-b.prefab',
            },
            mergePolicy: 'none',
        },
    ]);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const secondBatchPromise = executionRuntimeService.submitBatch([
        {
            requestId: 'cross-batch-high',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'scene',
            priority: 'high',
            kind: 'scene.patch',
            payload: {
                nodeId: 'cross-batch-high-node',
                patch: {
                    enabled: true,
                },
            },
            mergePolicy: 'none',
        },
    ]);

    await Promise.all([firstBatchPromise, secondBatchPromise]);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const lowAIndex = instrumentedBatchCommitCoordinator.committedGroupIds.findIndex((groupId) => {
        return groupId.includes('cross-batch-low-a');
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const lowBIndex = instrumentedBatchCommitCoordinator.committedGroupIds.findIndex((groupId) => {
        return groupId.includes('cross-batch-low-b');
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const highIndex = instrumentedBatchCommitCoordinator.committedGroupIds.findIndex((groupId) => {
        return groupId.includes('cross-batch-high');
    });

    assert.equal(lowAIndex >= 0, true);
    assert.equal(lowBIndex >= 0, true);
    assert.equal(highIndex >= 0, true);
    assert.equal(highIndex < lowBIndex, true);
});

test('execution runtime service should expose planning, pending, and active commit queue snapshots', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskLedger = new TaskLedger();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const instrumentedWorkerPool = new InstrumentedWorkerPool(40);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const instrumentedBatchCommitCoordinator = new InstrumentedBatchCommitCoordinator(40);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const executionRuntimeService = new ExecutionRuntimeService(
        new TaskIngress(),
        new TaskScheduler(taskLedger),
        taskLedger,
        instrumentedWorkerPool,
        new TaskMerger(),
        new ResourceLockManager(),
        instrumentedBatchCommitCoordinator,
        new TracePipeline(),
        new TimeoutAndCancelController(),
    );

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const submitPromise = executionRuntimeService.submitBatch([
        {
            requestId: 'inspect-queue-a',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'asset',
            priority: 'normal',
            kind: 'asset.query',
            payload: {
                pathOrUuid: 'assets/inspect-queue-a.prefab',
            },
            mergePolicy: 'none',
        },
        {
            requestId: 'inspect-queue-b',
            pluginId: 'runtime-dispatch-plugin',
            scope: 'scene',
            priority: 'normal',
            kind: 'scene.patch',
            payload: {
                nodeId: 'inspect-queue-b-node',
                patch: {
                    enabled: true,
                },
            },
            mergePolicy: 'none',
        },
    ]);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const planningSnapshot = await waitForQueueSnapshot(executionRuntimeService, (queueSnapshot) => {
        return queueSnapshot.planningGroups.length >= 1;
    });
    assert.equal(planningSnapshot.planningGroups.length >= 1, true);
    assert.equal(planningSnapshot.queuedTaskIds.length, 2);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const commitSnapshot = await waitForQueueSnapshot(executionRuntimeService, (queueSnapshot) => {
        return queueSnapshot.activeCommitGroup != null || queueSnapshot.pendingCommitGroups.length >= 1;
    });
    assert.equal(commitSnapshot.activeCommitGroup != null || commitSnapshot.pendingCommitGroups.length >= 1, true);
    assert.equal(commitSnapshot.isDrainingCommitQueue, true);

    await submitPromise;

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const settledSnapshot = await executionRuntimeService.inspectQueue();
    assert.equal(settledSnapshot.planningGroups.length, 0);
    assert.equal(settledSnapshot.pendingCommitGroups.length, 0);
    assert.equal(settledSnapshot.activeCommitGroup, null);
});

async function waitForQueueSnapshot(
    executionRuntimeService: ExecutionRuntimeService,
    predicate: (queueSnapshot: Awaited<ReturnType<ExecutionRuntimeService['inspectQueue']>>) => boolean,
): Promise<Awaited<ReturnType<ExecutionRuntimeService['inspectQueue']>>> {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    for (let attempt = 0; attempt < 20; attempt += 1) {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const queueSnapshot = await executionRuntimeService.inspectQueue();
        if (predicate(queueSnapshot)) {
            return queueSnapshot;
        }
        await new Promise((resolve) => {
            setTimeout(resolve, 10);
        });
    }

    return executionRuntimeService.inspectQueue();
}
