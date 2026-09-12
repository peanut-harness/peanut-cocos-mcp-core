#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';

import { EditorMcpBuilderGateway } from '../dist/editor-mcp-builder-gateway.js';

test('builder fills warning-free web defaults on the first build', async () => {
    let submitted;
    const runtime = {
        message: {
            async request(_target, name, ...args) {
                if (name === 'add-task') {
                    submitted = args[0];
                    return 0;
                }
                if (name === 'query-task') {
                    throw new Error('query unavailable');
                }
                if (name === 'query-tasks-info') {
                    return { queue: {}, list: [], free: true };
                }
                throw new Error(`unsupported:${name}`);
            },
        },
    };
    await new EditorMcpBuilderGateway(runtime).build({ platform: 'web-desktop' });
    assert.equal(submitted.platform, 'web-desktop');
    assert.equal(submitted.outputName, 'web-desktop');
    assert.equal(submitted.taskName, 'web-desktop');
    assert.equal(submitted.mainBundleCompressionType, 'merge_dep');
    assert.equal(submitted.debug, false);
});

test('builder prefers Creator default options and keeps caller overrides', async () => {
    let submitted;
    const calls = [];
    const runtime = {
        message: {
            async request(_target, name, ...args) {
                calls.push(name);
                if (name === 'query-default-config') {
                    return {
                        options: {
                            platform: 'web-desktop',
                            outputName: 'creator-default',
                            taskName: 'creator-default',
                            mainBundleCompressionType: 'merge_dep',
                            debug: false,
                        },
                    };
                }
                if (name === 'add-task') {
                    submitted = args[0];
                    return 0;
                }
                if (name === 'query-task') {
                    throw new Error('query unavailable');
                }
                return {};
            },
        },
    };
    await new EditorMcpBuilderGateway(runtime).build({
        platform: 'web-desktop',
        options: { outputName: 'caller-name' },
    });
    assert.equal(submitted.outputName, 'caller-name');
    assert.equal(submitted.taskName, 'creator-default');
    assert.equal(submitted.debug, false);
    assert.equal(calls.includes('query-default-config'), true);
    assert.equal(calls.includes('query-tasks-info'), false);
});

test('builder.queryDefaultConfig asks Creator for defaults before task history', async () => {
    const calls = [];
    const gateway = new EditorMcpBuilderGateway({
        message: {
            async request(_target, name) {
                calls.push(name);
                if (name === 'query-default-config') {
                    return { platform: 'web-desktop', outputName: 'web-desktop' };
                }
                return { queue: {}, list: [] };
            },
        },
    });
    const result = await gateway.queryDefaultConfig({ platform: 'web-desktop' });
    assert.equal(result.message, 'builder_query_default_config_ok:query-default-config');
    assert.equal(result.data.outputName, 'web-desktop');
    assert.deepEqual(calls, ['query-default-config']);
});

test('builder.queryDefaultConfig does not report an empty task queue as defaults', async () => {
    const gateway = new EditorMcpBuilderGateway({
        message: {
            async request(_target, name) {
                if (name === 'query-tasks-info') {
                    return { queue: {}, list: [], free: true };
                }
                throw new Error(`unsupported:${name}`);
            },
        },
    });
    const result = await gateway.queryDefaultConfig({ platform: 'web-desktop' });
    assert.equal(result.available, false);
    assert.equal(result.message, 'builder_query_default_config_unavailable:no_executable_default_options');
});
