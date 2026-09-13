import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { Lumen24EditorAssetDb } from '../dist/lumen-24-editor-assetdb.js';
import { Lumen24WriteFacade } from '../dist/lumen-24-write-facade.js';

test('Lumen24WriteFacade.isCreator2x isolates phase detection', () => {
    assert.equal(Lumen24WriteFacade.isCreator2x('2.4.11'), true);
    assert.equal(Lumen24WriteFacade.isCreator2x('3.8.7'), false);
    assert.equal(
        Lumen24WriteFacade.isCreator2x(undefined, {
            Editor: { versions: { CocosCreator: '2.4.11' } },
        }),
        true,
    );
});

test('Lumen24WriteFacade.scaffoldPrefab uses injected AssetDB only', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-facade-'));
    try {
        const created = [];
        const refreshed = [];
        const assetDb = new Lumen24EditorAssetDb({
            exists: () => false,
            createOrSave: (url, _data, cb) => {
                created.push(url);
                cb?.(null);
            },
            refresh: (url, cb) => {
                refreshed.push(url);
                cb?.(null);
            },
        });
        const facade = new Lumen24WriteFacade(projectRoot, assetDb);
        const result = await facade.scaffoldPrefab({
            prefabRelativePath: 'assets/peel-probe/Empty.prefab',
            rootName: 'PeelRoot',
            template: 'empty',
        });
        assert.equal(result.phase, 'creator_2x');
        assert.equal(result.prefab, 'assets/peel-probe/Empty.prefab');
        assert.equal(result.refresh.triggered, true);
        // 未跟踪资源走 refresh（盘上已有 prefab+meta），避免 createOrSave。
        assert.equal(created.length, 0);
        assert.ok(refreshed.some((url) => String(url).includes('Empty.prefab')));
        assert.ok(existsSync(join(projectRoot, 'assets/peel-probe/Empty.prefab.meta')));
        const meta = JSON.parse(readFileSync(join(projectRoot, 'assets/peel-probe/Empty.prefab.meta'), 'utf8'));
        assert.equal(meta.importer, 'prefab');
        assert.deepEqual(meta.subMetas, {});
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24EditorAssetDb.createRefreshAdapter uses saveExists when tracked', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-saveexists-'));
    try {
        const modes = [];
        const assetDb = new Lumen24EditorAssetDb({
            exists: () => true,
            saveExists: (_url, _data, cb) => {
                modes.push('saveExists');
                cb?.(null);
            },
            createOrSave: (_url, _data, cb) => {
                modes.push('createOrSave');
                cb?.(null);
            },
            refresh: (_url, cb) => {
                modes.push('refresh');
                cb?.(null);
            },
        });
        const adapter = assetDb.createRefreshAdapter(projectRoot);
        const prefabPath = join(projectRoot, 'assets/ui/Tracked.prefab');
        const { mkdirSync, writeFileSync } = await import('node:fs');
        mkdirSync(join(projectRoot, 'assets/ui'), { recursive: true });
        writeFileSync(prefabPath, '[{"__type__":"cc.Prefab"}]\n');
        const result = await adapter.refresh(projectRoot, ['assets/ui/Tracked.prefab']);
        assert.equal(result.triggered, true);
        assert.deepEqual(modes, ['saveExists']);
        assert.ok(existsSync(`${prefabPath}.meta`));
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24EditorAssetDb.createFolder refuses outside assets/', async () => {
    const assetDb = new Lumen24EditorAssetDb({
        create: (_url, _data, cb) => cb?.(null),
        exists: () => false,
    });
    await assert.rejects(
        () => assetDb.createFolder('/tmp/lumen24-probe', 'packages/nope'),
        /lumen_24_createFolder_outside_assets/,
    );
});

test('Lumen24EditorAssetDb.createFolder writes folder meta on disk', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-folder-'));
    try {
        const assetDb = new Lumen24EditorAssetDb({});
        const result = await assetDb.createFolder(projectRoot, 'assets/peel-probe/nested');
        assert.equal(result.path, 'assets/peel-probe/nested');
        assert.equal(result.existed, false);
        assert.ok(existsSync(join(projectRoot, 'assets/peel-probe/nested')));
        const meta = JSON.parse(readFileSync(join(projectRoot, 'assets/peel-probe/nested.meta'), 'utf8'));
        assert.equal(meta.importer, 'folder');
        assert.equal(typeof meta.uuid, 'string');
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24WriteFacade.deleteAssets uses disk rm for untracked paths', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-delete-'));
    try {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const relativePath = 'assets/peel-probe/ghost.txt';
        const absolutePath = join(projectRoot, relativePath);
        mkdirSync(join(projectRoot, 'assets/peel-probe'), { recursive: true });
        writeFileSync(absolutePath, 'ghost\n');
        writeFileSync(`${absolutePath}.meta`, '{"uuid":"aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"}\n');
        const deletedUrls = [];
        const assetDb = new Lumen24EditorAssetDb({
            exists: () => false,
            delete: (urls, cb) => {
                deletedUrls.push(...urls);
                cb?.(null);
            },
        });
        const facade = new Lumen24WriteFacade(projectRoot, assetDb);
        const result = await facade.deleteAssets([relativePath]);
        assert.deepEqual(result.deleted, [relativePath]);
        assert.deepEqual(result.deletedViaDisk, [relativePath]);
        assert.deepEqual(result.deletedViaAssetDb, []);
        assert.deepEqual(deletedUrls, []);
        assert.equal(existsSync(absolutePath), false);
        assert.equal(existsSync(`${absolutePath}.meta`), false);
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24WriteFacade.deleteAssets uses AssetDB for tracked paths', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-delete-tracked-'));
    try {
        const { mkdirSync, writeFileSync } = await import('node:fs');
        const relativePath = 'assets/peel-probe/tracked.txt';
        const absolutePath = join(projectRoot, relativePath);
        mkdirSync(join(projectRoot, 'assets/peel-probe'), { recursive: true });
        writeFileSync(absolutePath, 'tracked\n');
        const deletedUrls = [];
        const assetDb = new Lumen24EditorAssetDb({
            exists: () => true,
            delete: (urls, cb) => {
                deletedUrls.push(...urls);
                cb?.(null);
            },
        });
        const facade = new Lumen24WriteFacade(projectRoot, assetDb);
        const result = await facade.deleteAssets([relativePath]);
        assert.deepEqual(result.deletedViaAssetDb, [relativePath]);
        assert.deepEqual(result.deletedViaDisk, []);
        assert.deepEqual(deletedUrls, [`db://${relativePath}`]);
        assert.ok(existsSync(absolutePath));
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24EditorAssetDb.deleteDbUrls skips untracked and empty urls', async () => {
    const deleted = [];
    const assetDb = new Lumen24EditorAssetDb({
        exists: (url) => url === 'db://assets/keep.txt',
        delete: (urls, cb) => {
            deleted.push(...urls);
            cb?.(null);
        },
    });
    await assetDb.deleteDbUrls(['db://assets/keep.txt', 'db://assets/ghost.txt', '']);
    assert.deepEqual(deleted, ['db://assets/keep.txt']);
});

test('Lumen24EditorAssetDb.toDbUrl rejects empty path', () => {
    const assetDb = new Lumen24EditorAssetDb({});
    assert.throws(() => assetDb.toDbUrl(''), /lumen_24_toDbUrl_path_required/);
});
