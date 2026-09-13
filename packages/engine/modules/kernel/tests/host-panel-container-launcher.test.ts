import assert from 'assert/strict';
import test from 'node:test';

import { HostPanelContainerLauncherHarness } from '../src/integration/host-panel-container-launcher-harness';

test('host panel container launcher should open a runtime panel session and attach a live browser bridge', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ hostPanelContainerLauncherHarness = new HostPanelContainerLauncherHarness('3.8.7');
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ hostPanelContainerLauncherResult = await hostPanelContainerLauncherHarness.run();

    assert.equal(hostPanelContainerLauncherResult.sessionHasBrowserWindow, true);
    assert.equal(hostPanelContainerLauncherResult.sessionHasBootstrapScript, true);
    assert.equal(hostPanelContainerLauncherResult.bootstrapScript.includes('__PEANUT_PANEL_BRIDGE_CONTEXT__'), true);
    assert.equal(hostPanelContainerLauncherResult.acquireBridgeMatches, true);
    assert.equal(hostPanelContainerLauncherResult.bridgeResponse?.ok, true);
    assert.equal(hostPanelContainerLauncherResult.bridgeResponse?.payload?.pluginId, 'builtin.panel');
    assert.equal(hostPanelContainerLauncherResult.bridgeResponse?.payload?.panelId, 'builtin.panel.main');
    assert.equal(hostPanelContainerLauncherResult.runtimeProvidedBridgeResponse?.ok, true);
    assert.equal(hostPanelContainerLauncherResult.runtimeProvidedBridgeResponse?.payload?.pluginId, 'builtin.panel');
});
