import assert from 'assert/strict';
import test from 'node:test';

import { EditorApiHostInstallationHarness } from '../src/integration/editor-api-host-installation-harness';

test('editor-api host installation harness should launch a panel through an installed host window factory', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ editorApiHostInstallationHarness = new EditorApiHostInstallationHarness('3.8.7');
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ editorApiHostInstallationResult = await editorApiHostInstallationHarness.run();

    assert.equal(editorApiHostInstallationResult.bridgeResponse?.ok, true);
    assert.equal(editorApiHostInstallationResult.bridgeResponse?.payload?.pluginId, 'builtin.panel');
    assert.equal(editorApiHostInstallationResult.bridgeResponse?.payload?.panelId, 'builtin.panel.main');
    assert.equal(editorApiHostInstallationResult.hostWindowId, 'editor-api-installed-window');
    assert.deepEqual(editorApiHostInstallationResult.loadedEntries, ['panels/builtin-panel/index.html']);
    assert.equal(editorApiHostInstallationResult.injectedScripts.length, 1);
    assert.equal(editorApiHostInstallationResult.injectedScripts[0]?.includes('__PEANUT_PANEL_BRIDGE_CONTEXT__'), true);
});
