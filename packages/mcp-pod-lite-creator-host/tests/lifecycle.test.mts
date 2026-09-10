import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createPluginModule } from '../dist/index.js';

test('directory module satisfies all host lifecycle phases and releases tool registrations', async () => {
    const plugin = createPluginModule();
    const logger = { info: (_message: string) => {} };
    const registered = new Set<string>();
    await plugin.register({ logger });
    const context = {
        logger,
        runtime: {
            version: { getCurrentVersion: () => '3.8.7' },
            project: { getProjectName: async () => 'test', getProjectPath: async () => 'D:/test' },
            selection: { getActiveIds: async () => [] },
            message: { request: async () => ({}) },
        },
        mcp: {
            register: (definition: { name: string }) => {
                assert.equal(registered.has(definition.name), false);
                registered.add(definition.name);
                return () => {
                    registered.delete(definition.name);
                };
            },
        },
    };
    await plugin.activate(context);
    assert.equal(registered.size, 9);
    await plugin.activate(context);
    assert.equal(registered.size, 9);
    await plugin.deactivate();
    assert.equal(registered.size, 0);
    plugin.dispose();
});
