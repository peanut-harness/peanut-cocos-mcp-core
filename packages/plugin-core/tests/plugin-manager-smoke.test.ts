import assert from 'assert/strict';
import test from 'node:test';

import { PluginManagerSmokeHarness } from '../src/integration/plugin-manager-smoke-harness';

test('plugin manager smoke harness should activate the sample plugin', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginManagerSmokeHarness = new PluginManagerSmokeHarness('3.8.7');
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ pluginManagerSmokeResult = await pluginManagerSmokeHarness.run();

    assert.equal(pluginManagerSmokeResult.runtimeRecords.length, 1);
    assert.equal(pluginManagerSmokeResult.runtimeRecords[0]?.pluginId, 'sample.plugin');
    assert.equal(pluginManagerSmokeResult.runtimeRecords[0]?.state, 'active');
    assert.equal(pluginManagerSmokeResult.runtimeRecords[0]?.trustLevel, 'builtin');
    assert.equal(pluginManagerSmokeResult.panelResponse.ok, true);
    assert.equal(pluginManagerSmokeResult.panelResponse.payload?.pluginId, 'sample.plugin');
    assert.deepEqual(pluginManagerSmokeResult.panelResponse.payload?.activeIds, ['smoke-selection-node']);
    assert.equal(pluginManagerSmokeResult.taskResultResponse.ok, true);
    assert.notEqual(pluginManagerSmokeResult.taskResultResponse.payload?.taskId, null);
    assert.equal(pluginManagerSmokeResult.taskResultResponse.payload?.status, 'succeeded');
    assert.equal(pluginManagerSmokeResult.taskResultResponse.payload?.kind, 'asset.query');
    assert.equal(pluginManagerSmokeResult.taskResultResponse.payload?.mergePolicy, 'dedupe');
    assert.equal(pluginManagerSmokeResult.taskTraceResponse.ok, true);
    assert.equal(pluginManagerSmokeResult.taskTraceResponse.payload?.taskId, pluginManagerSmokeResult.taskResultResponse.payload?.taskId);
    assert.notEqual(pluginManagerSmokeResult.taskTraceResponse.payload?.traceId, null);
    assert.equal(pluginManagerSmokeResult.taskTraceResponse.payload?.firstStepStatus, 'planned');
    assert.equal((pluginManagerSmokeResult.taskTraceResponse.payload?.stepCount ?? 0) >= 2, true);
});

test('plugin manager smoke harness should release panel bridge access after deactivate and preserve lifecycle states', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginManagerSmokeHarness = new PluginManagerSmokeHarness('3.8.7');
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ lifecycleCleanupResult = await pluginManagerSmokeHarness.runLifecycleCleanup();

    assert.equal(lifecycleCleanupResult.inactiveState, 'inactive');
    assert.equal(lifecycleCleanupResult.disposedState, 'disposed');
    assert.equal(lifecycleCleanupResult.panelBridgeReleased, true);
});
