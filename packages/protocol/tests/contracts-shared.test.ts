import assert from 'assert/strict';
import test from 'node:test';

import type {
    ContractPayload,
    IGrantedPermissionSet,
    IPluginManifest,
    IPluginPackageMeta,
    IsoDateTimeString,
    PanelId,
    PluginId,
    PluginVersion,
} from '../src/index';

test('shared semantic aliases should compose with plugin manifest, package meta, and granted permissions', (): void => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginId: PluginId = 'contracts.shared.plugin';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelId: PanelId = 'contracts.shared.panel';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginVersion: PluginVersion = '0.2.0';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ packedAt: IsoDateTimeString = '2026-07-11T00:00:00.000Z';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ payload: ContractPayload = {
        panelId,
        capability: 'shared-contract',
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ manifest: IPluginManifest = {
        id: pluginId,
        version: pluginVersion,
        kind: 'panel-plugin',
        displayName: 'Shared Contracts Plugin',
        main: './dist/index.js',
        engines: {
            host: '^0.1.0',
        },
        activation: {
            autoActivate: true,
            events: ['onStartup'],
        },
        permissions: {
            panel: {
                open: true,
                embed: true,
            },
        },
        contributions: {
            panels: [
                {
                    id: panelId,
                    title: 'Shared Panel',
                    entry: 'panels/shared/index.html',
                    placement: 'utility',
                    singleton: true,
                },
            ],
        },
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ packageMeta: IPluginPackageMeta = {
        digest: 'sha256:contracts-shared',
        packedAt,
        sdkVersion: '0.1.0',
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ grantedPermissions: IGrantedPermissionSet = {
        pluginId,
        grantedAt: packedAt,
        permissions: manifest.permissions,
    };

    assert.equal(manifest.id, pluginId);
    assert.equal(manifest.contributions?.panels?.[0]?.id, panelId);
    assert.equal(packageMeta.packedAt, packedAt);
    assert.equal(grantedPermissions.pluginId, pluginId);
    assert.equal(payload.panelId, panelId);
});
