import assert from 'node:assert/strict';
import test from 'node:test';

import type { IPluginManifest } from '@peanut/pod-protocol';

import { PluginModuleBase } from '../src/plugin-module-base.js';

/**
 * @description 最小测试插件模块，仅用于作者面基类契约冒烟。
 */
class SmokePluginModule extends PluginModuleBase {
    /**
     * @description 固定测试清单。
     */
    public readonly manifest: IPluginManifest = {
        id: 'sdk.smoke.plugin',
        version: '0.0.1',
        kind: 'panel-plugin',
        displayName: 'SDK Smoke Plugin',
        main: './index.js',
        engines: {
            host: '^0.1.0',
        },
        activation: {
            autoActivate: true,
            events: ['onStartup'],
        },
        permissions: {
            editorMessages: [],
            assetDb: {
                read: true,
                write: false,
                delete: false,
            },
        },
        contributions: {},
    };
}

test('PluginModuleBase exposes subclass manifest fields for host validation', () => {
    const module = new SmokePluginModule();
    assert.equal(module.manifest.id, 'sdk.smoke.plugin');
    assert.equal(module.manifest.version, '0.0.1');
    assert.equal(module.manifest.main, './index.js');
    assert.equal(module.manifest.permissions.assetDb.read, true);
    assert.equal(module.manifest.permissions.assetDb.write, false);
});

test('PluginModuleBase default deactivate and dispose hooks resolve', async () => {
    const module = new SmokePluginModule();
    assert.equal(typeof module.register, 'function');
    assert.equal(typeof module.activate, 'function');
    await assert.doesNotReject(async () => {
        await module.deactivate('host_shutdown');
        await module.dispose();
    });
});
