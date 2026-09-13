import assert from 'assert/strict';
import test from 'node:test';

import type {
    IPluginError,
    ITaskCancelResult,
    ITaskReceipt,
    ITaskRequest,
    ITaskResult,
    ITaskSnapshot,
    ITaskTrace,
    TaskId,
} from '../src/index';

test('task contracts should preserve task identity across request, snapshot, trace, result, and cancel DTOs', (): void => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ taskId: TaskId = 'contracts-task-identity';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ request: ITaskRequest = {
        requestId: 'contracts-task-request',
        pluginId: 'contracts.task.plugin',
        scope: 'project',
        priority: 'high',
        kind: 'project.scan',
        payload: {
            includeMeta: true,
        },
        mergePolicy: 'coalesce',
        timeoutMs: 10_000,
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ receipt: ITaskReceipt = {
        taskId,
        status: 'queued',
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ snapshot: ITaskSnapshot = {
        taskId,
        pluginId: request.pluginId,
        status: 'running',
        scope: request.scope,
        kind: request.kind,
        createdAt: '2026-07-11T00:00:00.000Z',
        updatedAt: '2026-07-11T00:00:02.000Z',
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ trace: ITaskTrace = {
        traceId: 'contracts-task-identity:trace',
        taskId,
        kind: request.kind,
        startedAt: snapshot.createdAt,
        finishedAt: snapshot.updatedAt,
        steps: [
            {
                id: 'enqueue',
                title: 'Enqueue request',
                status: 'completed',
            },
            {
                id: 'scan',
                title: 'Scan project',
                status: 'completed',
                detail: 'Project scan finished.',
            },
        ],
    };
    // 捕获当前操作失败的异常信息，用于生成失败结果或保留诊断上下文。
    const /* 捕获当前操作失败的异常信息，用于生成失败结果或保留诊断上下文。 */ error: IPluginError = {
        code: 'contracts_task_soft_warning',
        message: 'Task finished with a recoverable warning.',
        recoverable: true,
        hints: ['Check optional project metadata.'],
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ result: ITaskResult<{ scannedNodes: number }> = {
        taskId,
        ok: true,
        status: 'succeeded',
        data: {
            scannedNodes: 12,
        },
        changes: [
            {
                kind: 'unknown',
                target: 'project://contracts',
                operation: 'scan',
                summary: 'Scanned project metadata.',
            },
        ],
        trace,
        error,
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ cancelResult: ITaskCancelResult = {
        taskId,
        cancelled: false,
        reason: 'already_completed',
    };

    assert.equal(receipt.taskId, taskId);
    assert.equal(snapshot.pluginId, request.pluginId);
    assert.equal(trace.taskId, taskId);
    assert.equal(result.data?.scannedNodes, 12);
    assert.equal(result.error?.recoverable, true);
    assert.equal(cancelResult.reason, 'already_completed');
});
