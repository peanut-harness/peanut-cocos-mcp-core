import assert from 'assert/strict';
import test from 'node:test';

import { BuiltinAssetPluginHarness } from '../src/integration/builtin-asset-plugin-harness';
import { BuiltinScenePluginHarness } from '../src/integration/builtin-scene-plugin-harness';

test('builtin asset plugin should activate through plugin-manager and query the seeded asset snapshot', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ builtinAssetPluginHarness = new BuiltinAssetPluginHarness('3.8.7');
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ builtinAssetPluginResult = await builtinAssetPluginHarness.run();

    assert.equal(builtinAssetPluginResult.runtimeRecord?.pluginId, 'builtin.asset');
    assert.equal(builtinAssetPluginResult.runtimeRecord?.state, 'active');
    assert.equal(builtinAssetPluginResult.runtimeRecord?.trustLevel, 'builtin');
    assert.equal(builtinAssetPluginResult.activationSnapshot?.queriedPath, 'assets/example.prefab');
    assert.equal(builtinAssetPluginResult.activationSnapshot?.assetFound, true);
    assert.equal(builtinAssetPluginResult.activationSnapshot?.assetType, 'prefab');
    assert.equal(builtinAssetPluginResult.activationSnapshot?.taskKind, 'asset.query');
    assert.equal(builtinAssetPluginResult.activationSnapshot?.taskAssetFound, true);
    assert.equal(builtinAssetPluginResult.activationSnapshot?.taskAssetType, 'prefab');
    assert.equal(
        builtinAssetPluginResult.activationSnapshot?.canonicalTaskId,
        builtinAssetPluginResult.activationSnapshot?.taskId,
    );
});

test('builtin scene plugin should activate through plugin-manager and execute the scene bridge path', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ builtinScenePluginHarness = new BuiltinScenePluginHarness('3.8.7');
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ builtinScenePluginResult = await builtinScenePluginHarness.run();

    assert.equal(builtinScenePluginResult.runtimeRecord?.pluginId, 'builtin.scene');
    assert.equal(builtinScenePluginResult.runtimeRecord?.state, 'active');
    assert.equal(builtinScenePluginResult.runtimeRecord?.trustLevel, 'builtin');
    assert.equal(builtinScenePluginResult.activationSnapshot?.manifestField, 'contributions.scene.script');
    assert.equal(builtinScenePluginResult.activationSnapshot?.executeAdapterId, 'adapter-38');
    assert.equal(builtinScenePluginResult.activationSnapshot?.executeMethod, 'inspectScene');
    assert.equal(builtinScenePluginResult.activationSnapshot?.taskKind, 'scene.patch');
    assert.equal(builtinScenePluginResult.activationSnapshot?.patchedNodeId, 'root-node');
    assert.equal(builtinScenePluginResult.activationSnapshot?.patchedEnabled, true);
    assert.equal(
        builtinScenePluginResult.activationSnapshot?.canonicalTaskId,
        builtinScenePluginResult.activationSnapshot?.taskId,
    );
});
