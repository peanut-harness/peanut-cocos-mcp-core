import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { SilentAssetCreateFolder } from '../src/silent-asset-create-folder.ts';

test('SilentAssetCreateFolder creates nested directories with minimal metas', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-silent-mkdir-'));
    mkdirSync(join(root, 'assets'), { recursive: true });

    const result = new SilentAssetCreateFolder().create({ projectRoot: root, relativePath: 'assets/x/y/z' });

    assert.equal(result.path, 'assets/x/y/z');
    assert.deepEqual(result.createdDirectories, ['assets/x', 'assets/x/y', 'assets/x/y/z']);
    assert.equal(existsSync(join(root, 'assets/x/y/z')), true);
    for (const relativeDir of ['assets/x', 'assets/x/y', 'assets/x/y/z']) {
        const meta = JSON.parse(readFileSync(join(root, `${relativeDir}.meta`), 'utf8')) as {
            importer: string;
            imported: boolean;
            uuid: string;
        };
        assert.equal(meta.importer, 'directory');
        assert.equal(meta.imported, false);
        assert.equal(typeof meta.uuid, 'string');
        assert.ok(meta.uuid.length > 0);
    }
});

test('SilentAssetCreateFolder reuses existing ancestor meta and skips rewriting it', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-silent-mkdir-existing-'));
    mkdirSync(join(root, 'assets/x'), { recursive: true });
    writeFileSync(
        join(root, 'assets/x.meta'),
        `${JSON.stringify({ ver: '1.2.0', importer: 'directory', imported: true, uuid: 'preexisting-uuid', files: [], subMetas: {}, userData: {} }, null, 2)}\n`,
    );

    const result = new SilentAssetCreateFolder().create({ projectRoot: root, relativePath: 'assets/x/y' });

    assert.deepEqual(result.createdDirectories, ['assets/x/y']);
    const existingMeta = JSON.parse(readFileSync(join(root, 'assets/x.meta'), 'utf8')) as { uuid: string };
    assert.equal(existingMeta.uuid, 'preexisting-uuid');
});

test('SilentAssetCreateFolder rejects when target already exists', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-silent-mkdir-exists-'));
    mkdirSync(join(root, 'assets/x'), { recursive: true });

    assert.throws(
        () => new SilentAssetCreateFolder().create({ projectRoot: root, relativePath: 'assets/x' }),
        /silent_create_folder_target_exists/,
    );
});
