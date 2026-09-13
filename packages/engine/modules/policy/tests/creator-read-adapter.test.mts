import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CoreCocosCreatorReadAdapter } from '../dist/index.js';

test('Creator read adapter uses compatible read-only message candidates', async () => {
    const calls: string[] = [];
    const adapter = new CoreCocosCreatorReadAdapter({
        version: { getCurrentVersion: () => '3.8.7' },
        project: { getProjectName: async () => 'demo', getProjectPath: async () => 'D:/demo' },
        selection: { getActiveIds: async () => ['node-1'] },
        message: {
            request: async (target, message) => {
                calls.push(`${target}.${message}`);
                if (message === 'query-all-builder') {
                    throw new Error('unsupported');
                }
                if (message === 'query-tasks') {
                    return ['web-mobile', 'windows'];
                }
                return { target, message };
            },
        },
    });

    const hierarchy = await adapter.execute({ operation: 'scene.getHierarchy', input: {} });
    assert.deepEqual(hierarchy, {
        available: true,
        availability: 'live',
        message: 'scene_get_hierarchy_ok:scene.query-node-tree',
        data: { target: 'scene', message: 'query-node-tree' },
    });

    const platforms = await adapter.execute({ operation: 'builder.queryPlatforms', input: { filter: 'web' } });
    assert.deepEqual(platforms, {
        available: true,
        availability: 'live',
        message: 'builder_query_platforms_ok:builder.query-tasks',
        data: ['web-mobile'],
    });
    assert.deepEqual(calls.slice(1), ['builder.query-all-builder', 'builder.query-tasks']);
});

test('Creator read adapter reports unavailable message port without side effects', async () => {
    const adapter = new CoreCocosCreatorReadAdapter({
        version: { getCurrentVersion: () => '3.8.7' },
        project: { getProjectName: async () => 'demo', getProjectPath: async () => 'D:/demo' },
        selection: { getActiveIds: async () => [] },
    });

    assert.deepEqual(await adapter.execute({ operation: 'preview.query', input: {} }), {
        available: false,
        availability: 'refused',
        message: 'preview_query_unavailable:runtime_message_missing',
    });
});
