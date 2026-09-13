import assert from 'assert/strict';
import test from 'node:test';

import { BuiltinMessagePluginHarness } from '../src/integration/builtin-message-plugin-harness';

test('builtin message plugin should activate through plugin-manager and receive message request echoes', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ builtinMessagePluginHarness = new BuiltinMessagePluginHarness('3.8.7');
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ builtinMessagePluginResult = await builtinMessagePluginHarness.run();

    assert.equal(builtinMessagePluginResult.runtimeRecord?.pluginId, 'builtin.message');
    assert.equal(builtinMessagePluginResult.runtimeRecord?.state, 'active');
    assert.equal(builtinMessagePluginResult.runtimeRecord?.trustLevel, 'builtin');
    assert.equal(builtinMessagePluginResult.requestEcho?.target, 'builtin-host');
    assert.equal(builtinMessagePluginResult.requestEcho?.message, 'builtin.message.request');
    assert.equal(builtinMessagePluginResult.requestEcho?.adapterId, 'adapter-38');
    assert.equal(builtinMessagePluginResult.activationSummary?.broadcastEvent, 'builtin.message.activated');
});

test('builtin message plugin should clear its runtime cache after deactivate and dispose', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ builtinMessagePluginHarness = new BuiltinMessagePluginHarness('3.8.7');
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ builtinMessageCleanupResult = await builtinMessagePluginHarness.runDeactivateFlow();

    assert.equal(builtinMessageCleanupResult.inactiveState, 'inactive');
    assert.equal(builtinMessageCleanupResult.disposedState, 'disposed');
    assert.equal(builtinMessageCleanupResult.requestEchoCleared, true);
});
