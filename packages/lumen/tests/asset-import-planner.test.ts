import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { AssetImportBatchExecutor } from '../source/asset-import/asset-import-batch-executor.ts';
import { AssetImportPlanner } from '../source/asset-import/asset-import-planner.ts';

test('AssetImportPlanner orders Spine image then atlas then skel', (): void => {
    const planner = new AssetImportPlanner();
    const plan = planner.plan([
        'assets/spine/Hero.skel',
        'assets/spine/Hero.png',
        'assets/spine/Hero.atlas',
    ]);
    assert.deepEqual(plan.cycles, []);
    assert.deepEqual(planner.flatten(plan), [
        'assets/spine/Hero.png',
        'assets/spine/Hero.atlas',
        'assets/spine/Hero.skel',
    ]);
});

test('AssetImportPlanner orders BMFont directory then atlas png then fnt', (): void => {
    const planner = new AssetImportPlanner();
    const plan = planner.plan([
        'assets/ui/fonts/Score.fnt',
        'assets/ui/fonts',
        'assets/ui/fonts/Score.png',
    ]);
    assert.deepEqual(plan.cycles, []);
    assert.deepEqual(planner.flatten(plan), [
        'assets/ui/fonts',
        'assets/ui/fonts/Score.png',
        'assets/ui/fonts/Score.fnt',
    ]);
});

test('AssetImportPlanner expands Spine closure from skel-less atlas listing on disk', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-spine-closure-'));
    const dir = join(root, 'spine');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'Hero.png'), 'png');
    writeFileSync(join(dir, 'Hero.atlas'), 'Hero.png\nsize: 1,1\n');
    writeFileSync(join(dir, 'Hero.skel'), 'skel');
    const planner = new AssetImportPlanner();
    const plan = planner.plan([join(dir, 'Hero.skel')], { expandClosure: true });
    assert.equal(plan.expandedSources.length, 3);
    assert.deepEqual(
        plan.expandedSources.map((pathValue) => pathValue.split('/').pop()).sort(),
        ['Hero.atlas', 'Hero.png', 'Hero.skel'],
    );
    assert.deepEqual(
        planner.flatten(plan).map((pathValue) => pathValue.split('/').pop()),
        ['Hero.png', 'Hero.atlas', 'Hero.skel'],
    );
});

test('AssetImportPlanner detects DragonBones _tex.json dependency', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-db-closure-'));
    const dir = join(root, 'db');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
        join(dir, 'Hero_ske.json'),
        JSON.stringify({ armature: [], compatibleVersion: '5.5' }),
    );
    writeFileSync(join(dir, 'Hero_tex.json'), JSON.stringify({}));
    const planner = new AssetImportPlanner();
    const plan = planner.plan([join(dir, 'Hero_ske.json')], { expandClosure: true });
    assert.ok(plan.expandedSources.some((pathValue) => pathValue.endsWith('Hero_tex.json')));
});

test('AssetImportPlanner rejects basename target collisions', (): void => {
    const planner = new AssetImportPlanner();
    assert.throws(
        () =>
            planner.assertUniqueImportTargets(
                ['/a/Icon.png', '/b/Icon.png'],
                'db://assets/ui',
            ),
        /asset_import_target_collision/u,
    );
});

test('AssetImportPlanner rejects source that is already the target disk path', (): void => {
    const planner = new AssetImportPlanner();
    const root = mkdtempSync(join(tmpdir(), 'peanut-import-same-'));
    const assets = join(root, 'assets', 'ui', 'probe');
    mkdirSync(assets, { recursive: true });
    const png = join(assets, 'editbox-bg.png');
    writeFileSync(png, 'png');
    assert.throws(
        () =>
            planner.assertSourcesNotAlreadyAtTarget(
                [png],
                'db://assets/ui/probe',
                root,
            ),
        /asset_import_source_equals_target/u,
    );
    // 工程外 staging 路径允许导入到 assets。
    const staged = join(root, '.peanut-ai', 'fixtures', 'editbox-bg.png');
    mkdirSync(join(root, '.peanut-ai', 'fixtures'), { recursive: true });
    writeFileSync(staged, 'png');
    planner.assertSourcesNotAlreadyAtTarget([staged], 'db://assets/ui/probe', root);
});

test('AssetImportBatchExecutor rejects cycles and missing deps with clear codes', async (): Promise<void> => {
    const executor = new AssetImportBatchExecutor({
        request: async () => ({ ok: true }),
    });
    await assert.rejects(
        () =>
            executor.importBatch({
                sources: ['a.png', 'b.png'],
                target: 'db://assets/ui',
                expandClosure: false,
                dependencyMap: {
                    'a.png': ['b.png'],
                    'b.png': ['a.png'],
                },
            }),
        /asset_import_dependency_cycle/,
    );
    await assert.rejects(
        () =>
            executor.importBatch({
                sources: ['Hero.skel'],
                target: 'db://assets/ui',
                expandClosure: false,
                dependencyMap: {
                    'Hero.skel': ['Hero.atlas'],
                },
            }),
        /asset_import_missing_dependencies/,
    );
});

test('AssetImportBatchExecutor keeps stable result order under layer concurrency', async (): Promise<void> => {
    const executor = new AssetImportBatchExecutor({
        request: async (_target, message, ...args) => {
            if (message === 'query-ready') {
                return true;
            }
            await new Promise((resolve) => {
                setTimeout(resolve, message.includes('import') ? 5 + Math.random() * 10 : 0);
            });
            return { path: args[0] };
        },
    });
    const result = await executor.importBatch({
        sources: ['a.png', 'b.png', 'c.png', 'd.png'],
        target: 'db://assets/ui',
        expandClosure: false,
        concurrency: 4,
        dependencyMap: {},
    });
    assert.deepEqual(
        result.imported.map((item) => item.source),
        ['a.png', 'b.png', 'c.png', 'd.png'],
    );
});

test('AssetImportBatchExecutor imports layers in order and waits between layers', async (): Promise<void> => {
    const calls: string[] = [];
    const executor = new AssetImportBatchExecutor({
        request: async (target, message, ...args) => {
            calls.push(`${target}:${message}:${String(args[0] ?? '')}`);
            if (message === 'query-ready') {
                return true;
            }
            return { ok: true };
        },
    });
    const result = await executor.importBatch({
        sources: [
            'assets/spine/Hero.skel',
            'assets/spine/Hero.png',
            'assets/spine/Hero.atlas',
        ],
        target: 'db://assets/imported',
        expandClosure: false,
        refreshAfter: true,
    });
    assert.deepEqual(
        result.imported.map((item) => item.source),
        [
            'assets/spine/Hero.png',
            'assets/spine/Hero.atlas',
            'assets/spine/Hero.skel',
        ],
    );
    assert.equal(result.imported[0]?.layer, 0);
    assert.ok(calls.some((entry) => entry.includes('import-asset') || entry.includes(':import:')));
    assert.ok(calls.some((entry) => entry.includes('query-ready')));
});

test('AssetImportPlanner orders glTF sidecars before gltf file', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-gltf-closure-'));
    const dir = join(root, 'models');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'Hero.bin'), 'bin');
    writeFileSync(join(dir, 'Hero.png'), 'png');
    writeFileSync(
        join(dir, 'Hero.gltf'),
        JSON.stringify({
            asset: { version: '2.0' },
            buffers: [{ uri: 'Hero.bin' }],
            images: [{ uri: 'Hero.png' }],
        }),
    );
    const planner = new AssetImportPlanner();
    const plan = planner.plan([join(dir, 'Hero.gltf')], { expandClosure: true });
    assert.equal(plan.expandedSources.length, 3);
    assert.deepEqual(
        planner.flatten(plan).map((pathValue) => pathValue.split(/[/\\]/u).pop()),
        ['Hero.bin', 'Hero.png', 'Hero.gltf'],
    );
});
