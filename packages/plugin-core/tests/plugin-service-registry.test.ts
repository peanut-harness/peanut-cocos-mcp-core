import assert from 'assert/strict';
import test from 'node:test';

import { PluginServiceRegistry } from '../src/shared/plugin-service-registry.js';

test('plugin service registry should forward caller identity and revoke providers', async (): Promise<void> => {
    const pluginServiceRegistry = new PluginServiceRegistry();
    pluginServiceRegistry.register('snowb.bmfont', 'bmfont.export', async (callerPluginId: string, request: unknown): Promise<unknown> => {
        return { callerPluginId, request };
    });

    assert.deepEqual(await pluginServiceRegistry.request('figma.importer', 'snowb.bmfont', 'bmfont.export', { name: 'label' }), {
        callerPluginId: 'figma.importer',
        request: { name: 'label' },
    });

    pluginServiceRegistry.revokeProvider('snowb.bmfont');
    await assert.rejects(pluginServiceRegistry.request('figma.importer', 'snowb.bmfont', 'bmfont.export', {}), /unavailable/);
});
