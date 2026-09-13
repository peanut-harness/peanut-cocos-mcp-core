#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, rm, utimes, symlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { EditorMcpPreviewGateway } from '../dist/editor-mcp-preview-gateway.js';
import { EditorMcpBuilderGateway, extractArtifactHints } from '../dist/editor-mcp-builder-gateway.js';
import { EditorMcpBuilderPostBuildHookRegistry } from '../dist/editor-mcp-builder-post-build-hooks.js';
import { EditorMcpReferenceGateway } from '../dist/editor-mcp-reference-gateway.js';
import { EditorMcpLumenGateway } from '../dist/editor-mcp-lumen-gateway.js';
import { executeLodRecalcBounds } from '../dist/editor-mcp-lod-recalc.js';
import { buildSceneSaveRefusePayload, resolveSceneHostRoute, SCENE_SAVE_REFUSED_REASON } from '../dist/editor-mcp-scene-host-routes.js';
import { EditorMcpSceneGateway } from '../dist/editor-mcp-scene-gateway.js';

test('P0 readCaptureInput accepts scenePath / assetRelativePath', () => {
    const gateway = new EditorMcpPreviewGateway({});
    const a = gateway.readCaptureInput({
        scenePath: 'assets/demo/Main.scene',
        waitMs: 100,
    });
    assert.equal(a.scenePath, 'assets/demo/Main.scene');
    assert.equal(a.waitMs, 100);
    const b = gateway.readCaptureInput({
        assetRelativePath: 'assets/demo/Other.scene',
    });
    assert.equal(b.assetRelativePath, 'assets/demo/Other.scene');
});

test('P0 capture with scenePath refuses without runtime message / missing file', async () => {
    const gateway = new EditorMcpPreviewGateway({}, async () => process.cwd());
    const missing = await gateway.capture({
        scenePath: 'assets/__no_such__/Missing.scene',
        outputRelativePath: '.peanut-ai/artifacts/_pink_p0_missing.png',
    });
    assert.equal(missing.available, false);
    assert.equal(missing.availability, 'refused');
    assert.match(String(missing.message), /preview_capture_refused:/);
});

test('P3 builder enrich + post-build hook registry (no Creator)', async () => {
    EditorMcpBuilderPostBuildHookRegistry.clearForTests();
    const seen = [];
    const dispose = EditorMcpBuilderPostBuildHookRegistry.register((result, input) => {
        seen.push({ success: result.success, platform: input.platform, message: result.message });
    });
    const gateway = new EditorMcpBuilderGateway({});
    const result = await gateway.build({ platform: 'web-desktop', confirmDestructive: true });
    assert.equal(result.available, false);
    assert.equal(result.success, false);
    assert.ok(Array.isArray(result.logHints) && result.logHints.length > 0);
    assert.equal(result.recommendedNext?.operation, 'preview.queryErrors');
    assert.equal(seen.length, 0);
    dispose();
    assert.equal(EditorMcpBuilderPostBuildHookRegistry.sizeForTests(), 0);
});

test('P3 extractArtifactHints parses nested builder payloads', () => {
    const paths = extractArtifactHints({
        ok: true,
        task: {
            options: { buildPath: 'D:/proj/build/web-desktop' },
            result: { dest: 'build/web-desktop/index.html', artifacts: ['build/web-desktop/app.zip'] },
        },
    });
    assert.ok(paths.some((p) => p.includes('web-desktop')));
    assert.ok(paths.some((p) => p.includes('app.zip')));
});

test('P2 lumen.lodRecalcBounds refuses without message / nodePath', async () => {
    const lumen = new EditorMcpLumenGateway(async () => process.cwd());
    const noPath = await lumen.execute('lumen.lodRecalcBounds', {});
    assert.equal(noPath.available, false);
    assert.equal(noPath.availability, 'refused');
    assert.match(String(noPath.message), /lumen_lod_recalc_bounds_refused/);
    const withPath = await lumen.execute('lumen.lodRecalcBounds', { nodePath: '/Root/LOD' });
    assert.equal(withPath.available, false);
    assert.equal(withPath.availability, 'refused');
    assert.match(String(withPath.message), /lumen_lod_recalc_bounds_refused/);
});

test('P2 lodRecalcBounds live via mocked execute-component-method', async () => {
    const message = {
        async request(target, name, ...args) {
            if (name === 'query-node-tree') {
                return {
                    name: 'Root',
                    uuid: '11111111-1111-1111-1111-111111111111',
                    children: [{ name: 'LOD', uuid: '22222222-2222-2222-2222-222222222222', children: [] }],
                };
            }
            if (name === 'query-node') {
                return {
                    __comps__: [
                        {
                            type: 'cc.LODGroup',
                            uuid: '33333333-3333-3333-3333-333333333333',
                            value: { name: 'cc.LODGroup', uuid: '33333333-3333-3333-3333-333333333333' },
                        },
                    ],
                };
            }
            if (name === 'execute-component-method') return true;
            if (name === 'query-component') {
                return { value: { localBoundaryCenter: { value: { x: 1, y: 2, z: 3 } }, objectSize: { value: 4 } } };
            }
            throw new Error(target + ':' + name);
        },
    };
    const result = await executeLodRecalcBounds(message, {
        nodePath: '/Root/LOD',
        prefabRelativePath: 'assets/a.prefab',
    });
    assert.equal(result.available, true);
    assert.equal(result.availability, 'live');
    assert.equal(result.componentUuid, '33333333-3333-3333-3333-333333333333');
    assert.equal(result.recommendedNext?.operation, 'lumen.compSet');
});

test('P1 reference refuses without runtime message', async () => {
    const ref = new EditorMcpReferenceGateway();
    const q = await ref.queryImage({});
    assert.equal(q.availability, 'refused');
    assert.match(String(q.message), /reference_query_image_refused/);
    const s = await ref.setImage({ imagePath: 'assets/ref.png' });
    assert.equal(s.availability, 'refused');
    assert.match(String(s.message), /reference_set_image_refused/);
});

test('P1 reference live via mocked reference-image messages', async () => {
    const calls = [];
    const runtime = {
        message: {
            async request(target, name, ...args) {
                calls.push([target, name, ...args]);
                if (name === 'query-current') return { path: 'C:/img.png', x: 0, y: 0, sx: 1, sy: 1, opacity: 50 };
                if (name === 'query-config') return { images: [], sceneUUID: {}, scene: '' };
                if (name === 'add-image' || name === 'switch-image' || name === 'set-image-data' || name === 'refresh') {
                    return true;
                }
                throw new Error('unexpected:' + name);
            },
        },
    };
    const ref = new EditorMcpReferenceGateway(runtime, async () => 'D:/proj');
    const q = await ref.queryImage({});
    assert.equal(q.available, true);
    assert.equal(q.availability, 'live');
    const s = await ref.setImage({ imagePath: 'assets/ref.png', opacity: 0.5, x: 10 });
    assert.equal(s.available, true);
    assert.equal(s.availability, 'live');
    assert.ok(calls.some((c) => c[0] === 'reference-image' && c[1] === 'switch-image'));
    assert.ok(calls.some((c) => c[0] === 'reference-image' && c[1] === 'set-image-data' && c[2] === 'opacity'));
});

test('P1 visible:false uses profile show when Editor.Profile available', async () => {
    const calls = [];
    const runtime = {
        message: {
            async request(target, name, ...args) {
                calls.push([target, name, ...args]);
                if (name === 'add-image' || name === 'switch-image' || name === 'set-image-data' || name === 'refresh') {
                    return true;
                }
                if (name === 'query-current') return { path: 'C:/img.png', opacity: 50 };
                throw new Error('unexpected:' + name);
            },
        },
    };
    globalThis.Editor = {
        Profile: {
            async setConfig(pkg, key, value) {
                calls.push(['Profile.setConfig', pkg, key, value]);
                return true;
            },
        },
    };
    try {
        const ref = new EditorMcpReferenceGateway(runtime, async () => 'D:/proj');
        const s = await ref.setImage({ imagePath: 'assets/ref.png', visible: false });
        assert.equal(s.available, true);
        assert.equal(s.data.visibilityMode, 'profile_show');
        assert.ok(calls.some((c) => c[0] === 'Profile.setConfig' && c[1] === 'reference-image' && c[2] === 'show' && c[3] === false));
        assert.ok(!calls.some((c) => c[0] === 'reference-image' && c[1] === 'remove-image'));
    } finally {
        delete globalThis.Editor;
    }
});

test('P2 lodRecalcBounds dump-shape diagnostics when LODGroup missing', async () => {
    const message = {
        async request(_target, name) {
            if (name === 'query-node-tree') {
                return {
                    name: 'Root',
                    uuid: '11111111-1111-1111-1111-111111111111',
                    children: [{ name: 'Empty', uuid: '22222222-2222-2222-2222-222222222222', children: [] }],
                };
            }
            if (name === 'query-node') {
                return { __comps__: [{ type: 'cc.UITransform', uuid: '44444444-4444-4444-4444-444444444444' }] };
            }
            throw new Error(name);
        },
    };
    const result = await executeLodRecalcBounds(message, { nodePath: '/Root/Empty' });
    assert.equal(result.available, false);
    assert.match(String(result.message), /lodgroup_component_missing/);
    assert.ok(result.data?.dumpShape?.compTypes?.includes('cc.UITransform'));
});

test('Scene host routing enforces scene.save refuse grammar + recommendedNext', async () => {
    const route = resolveSceneHostRoute('scene.save');
    assert.equal(route?.refusedReason, SCENE_SAVE_REFUSED_REASON);
    const payload = buildSceneSaveRefusePayload('assets/demo/Main.scene');
    assert.equal(payload.message, SCENE_SAVE_REFUSED_REASON);
    assert.equal(payload.recommendedNext.operation, 'lumen.commit');
    assert.deepEqual(payload.recommendedNext.input.paths, ['assets/demo/Main.scene']);
    const gateway = new EditorMcpSceneGateway({});
    const saved = await gateway.save({ path: 'assets/demo/Main.scene' });
    assert.equal(saved.available, false);
    assert.equal(saved.message, SCENE_SAVE_REFUSED_REASON);
    assert.equal(saved.recommendedNext?.operation, 'lumen.commit');
});

test('P3 extractArtifactHints preserves explicit task paths without platform synthesis', () => {
    const paths = extractArtifactHints({
        success: true,
        tasks: [{ platform: 'web-mobile', options: { buildPath: 'D:/demo/build/web-mobile', outputName: 'demo' } }],
    });
    assert.ok(paths.some((p) => p.includes('build/web-mobile') || p.endsWith('web-mobile')));
    assert.deepEqual(extractArtifactHints({ platform: 'web-mobile' }), []);
});

for (const scenario of [
    'busy',
    'accepted',
    'parameter-error',
    'failure',
    'cancel',
    'completed',
    'missing',
    'stale',
    'empty',
    'escape',
    'submit-error',
    'unknown',
]) {
    test(`Builder completion evidence: ${scenario}`, async () => {
        const root = await mkdtemp(join(tmpdir(), 'peanut-builder-'));
        const dest = join(root, 'build', 'web-desktop');
        await mkdir(dest, { recursive: true });
        let submits = 0;
        let hooks = 0;
        let currentTaskId;
        const dispose = EditorMcpBuilderPostBuildHookRegistry.register(() => {
            hooks += 1;
        });
        try {
            if (scenario === 'stale') {
                await writeFile(join(dest, 'index.html'), '<html>old</html>');
                await utimes(join(dest, 'index.html'), 1, 1);
            }
            const runtime = {
                projectRead: { getProjectPath: async () => root },
                message: {
                    async request(_target, name, ...args) {
                        if (name === 'add-task') {
                            submits += 1;
                            currentTaskId = args[0].taskId;
                            assert.equal(args[1], false);
                            if (scenario === 'submit-error') throw new Error('transport lost');
                            return scenario === 'busy'
                                ? 0
                                : scenario === 'parameter-error'
                                  ? 2
                                  : scenario === 'unknown'
                                    ? { success: true, artifacts: [dest] }
                                    : 1;
                        }
                        if (name === 'query-task') {
                            assert.equal(args[0], currentTaskId);
                            if (scenario === 'accepted') throw new Error('query unavailable');
                            if (scenario === 'completed') await writeFile(join(dest, 'index.html'), '<html>new build</html>');
                            if (scenario === 'empty') await writeFile(join(dest, 'index.html'), '');
                            if (scenario === 'escape') await symlink('/etc/hosts', join(dest, 'index.html'));
                            return {
                                id: currentTaskId,
                                stage: 'build',
                                state: scenario === 'failure' ? 'failure' : scenario === 'cancel' ? 'cancel' : 'success',
                                options: { platform: 'web-desktop', dest },
                            };
                        }
                        return {};
                    },
                },
            };
            const result = await new EditorMcpBuilderGateway(runtime).build({ platform: 'web-desktop' });
            const expected =
                scenario === 'parameter-error' || scenario === 'failure' || scenario === 'cancel'
                    ? 'failed'
                    : ['busy', 'accepted', 'completed'].includes(scenario)
                      ? scenario
                      : 'blocked';
            assert.equal(result.status, expected);
            assert.equal(result.success, scenario === 'completed');
            assert.equal(hooks, scenario === 'completed' ? 1 : 0);
            assert.equal(submits, 1);
            if (scenario === 'completed') assert.deepEqual(result.artifacts, [await realpath(join(dest, 'index.html'))]);
        } finally {
            dispose();
            await rm(root, { recursive: true, force: true });
        }
    });
}
