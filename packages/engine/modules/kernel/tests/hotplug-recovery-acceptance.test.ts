import assert from 'assert/strict';
import test from 'node:test';

import { HotplugRecoveryAcceptanceHarness } from '../src/integration/hotplug-recovery-acceptance-harness';

test('hotplug recovery acceptance harness should recover a third-party plugin after cleanup retry and complete uninstall', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ hotplugRecoveryAcceptanceHarness = new HotplugRecoveryAcceptanceHarness('3.8.7');
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ hotplugRecoveryAcceptanceResult = await hotplugRecoveryAcceptanceHarness.run();

    assert.equal(hotplugRecoveryAcceptanceResult.packResult.packagePath, 'packages/hotplug.acceptance.plugin-0.1.0.pcp');
    assert.equal(hotplugRecoveryAcceptanceResult.installPlan.pluginId, 'hotplug.acceptance.plugin');
    assert.equal(hotplugRecoveryAcceptanceResult.installResult.installed, true);
    assert.equal(hotplugRecoveryAcceptanceResult.installResult.installPath, 'installed/hotplug.acceptance.plugin/0.1.0');
    assert.equal(hotplugRecoveryAcceptanceResult.deactivateFailureMessage, 'hotplug_failure_disposer_failed');
    assert.equal(hotplugRecoveryAcceptanceResult.failedRuntimeRecord?.state, 'failed');
    assert.equal(hotplugRecoveryAcceptanceResult.failedRuntimeRecord?.health?.status, 'failed');
    assert.equal(hotplugRecoveryAcceptanceResult.failureExport?.incident.phase, 'deactivate');
    assert.equal(hotplugRecoveryAcceptanceResult.failureExport?.incident.installPreserved, true);
    assert.equal(hotplugRecoveryAcceptanceResult.failureExport?.serializedIncident.includes('hotplug.acceptance.plugin'), true);
    assert.equal(hotplugRecoveryAcceptanceResult.retryCleanupStepResults.every((cleanupStepResult) => cleanupStepResult.ok), true);
    assert.equal(hotplugRecoveryAcceptanceResult.reactivatedRuntimeRecord?.state, 'active');
    assert.equal(hotplugRecoveryAcceptanceResult.reactivatedRuntimeRecord?.failureIncident, undefined);
    assert.equal(hotplugRecoveryAcceptanceResult.recoveredPanelStateResponse.ok, true);
    assert.equal(hotplugRecoveryAcceptanceResult.recoveredPanelStateResponse.payload?.pluginId, 'hotplug.acceptance.plugin');
    assert.equal(hotplugRecoveryAcceptanceResult.recoveredPanelStateResponse.payload?.panelId, 'hotplug.acceptance.plugin.panel');
    assert.equal(hotplugRecoveryAcceptanceResult.finalInactiveState, 'inactive');
    assert.equal(hotplugRecoveryAcceptanceResult.finalDisposedState, 'disposed');
    assert.equal(hotplugRecoveryAcceptanceResult.uninstallResult.removed, true);
    assert.equal(hotplugRecoveryAcceptanceResult.uninstallResult.installPath, 'installed/hotplug.acceptance.plugin/0.1.0');
});
