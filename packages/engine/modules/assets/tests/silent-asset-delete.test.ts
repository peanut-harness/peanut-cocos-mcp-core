import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { FileAssetDependencyIndex } from '../src/file-asset-dependency-index.ts';
import { SilentAssetDelete } from '../src/silent-asset-delete.ts';

/**
 * @description 写入最小图片资源 + meta。
 * @param root 工程根。
 * @param relativePath 相对路径。
 * @param uuid 主 uuid。
 * @returns 无。
 */
function writeImage(root: string, relativePath: string, uuid: string): void {
    const absolute = join(root, relativePath);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, 'bytes');
    writeFileSync(
        `${absolute}.meta`,
        `${JSON.stringify({ ver: '1.0.27', importer: 'image', imported: true, uuid, files: [], subMetas: {}, userData: {} }, null, 2)}\n`,
    );
}

/**
 * @description 写入引用某 uuid 的最小 prefab + meta。
 * @param root 工程根。
 * @param relativePath 相对路径。
 * @param uuid prefab 自身 uuid。
 * @param referencedUuid 引用的目标 uuid。
 * @returns 无。
 */
function writePrefab(root: string, relativePath: string, uuid: string, referencedUuid: string): void {
    const absolute = join(root, relativePath);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(
        absolute,
        `${JSON.stringify(
            [{ __type__: 'cc.Prefab', _name: 'Panel' }, { __type__: 'cc.Sprite', _spriteFrame: { __uuid__: referencedUuid } }],
            null,
            2,
        )}\n`,
    );
    writeFileSync(
        `${absolute}.meta`,
        `${JSON.stringify({ ver: '1.1.50', importer: 'prefab', imported: true, uuid, files: [], subMetas: {}, userData: {} }, null, 2)}\n`,
    );
}

test('SilentAssetDelete blocks deletion when an external asset still depends on it', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-silent-delete-blocked-'));
    mkdirSync(join(root, 'assets'), { recursive: true });
    const iconUuid = '11111111-1111-4111-8111-111111111111';
    writeImage(root, 'assets/ui/icon.png', iconUuid);
    writePrefab(root, 'assets/ui/Panel.prefab', '22222222-2222-4222-8222-222222222222', iconUuid);

    FileAssetDependencyIndex.invalidate(root);
    assert.throws(
        () => new SilentAssetDelete().delete({ projectRoot: root, relativePaths: ['assets/ui/icon.png'] }),
        /silent_asset_delete_blocked_by_dependents:assets\/ui\/icon\.png<-assets\/ui\/Panel\.prefab/,
    );
    assert.equal(existsSync(join(root, 'assets/ui/icon.png')), true);
});

test('SilentAssetDelete succeeds when the dependent is deleted together', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-silent-delete-together-'));
    mkdirSync(join(root, 'assets'), { recursive: true });
    const iconUuid = '33333333-3333-4333-8333-333333333333';
    writeImage(root, 'assets/ui/icon.png', iconUuid);
    writePrefab(root, 'assets/ui/Panel.prefab', '44444444-4444-4444-8444-444444444444', iconUuid);

    FileAssetDependencyIndex.invalidate(root);
    const result = new SilentAssetDelete().delete({
        projectRoot: root,
        relativePaths: ['assets/ui/icon.png', 'assets/ui/Panel.prefab'],
    });

    assert.equal(result.deleted.length, 2);
    assert.equal(existsSync(join(root, 'assets/ui/icon.png')), false);
    assert.equal(existsSync(join(root, 'assets/ui/icon.png.meta')), false);
    assert.equal(existsSync(join(root, 'assets/ui/Panel.prefab')), false);
});

test('SilentAssetDelete recursively deletes a folder and its metas without external dependents', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-silent-delete-folder-'));
    mkdirSync(join(root, 'assets'), { recursive: true });
    writeImage(root, 'assets/ui/icon.png', '55555555-5555-4555-8555-555555555555');
    writeFileSync(
        join(root, 'assets/ui.meta'),
        `${JSON.stringify({ ver: '1.2.0', importer: 'directory', imported: true, uuid: '66666666-6666-4666-8666-666666666666', files: [], subMetas: {}, userData: {} }, null, 2)}\n`,
    );

    FileAssetDependencyIndex.invalidate(root);
    const result = new SilentAssetDelete().delete({ projectRoot: root, relativePaths: ['assets/ui'] });

    assert.ok(result.deleted.some((item) => item.path === 'assets/ui' && item.isDirectory));
    assert.ok(result.deleted.some((item) => item.path === 'assets/ui/icon.png'));
    assert.equal(existsSync(join(root, 'assets/ui')), false);
    assert.equal(existsSync(join(root, 'assets/ui.meta')), false);
});

test('SilentAssetDelete rejects missing paths and empty input', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-silent-delete-guard-'));
    mkdirSync(join(root, 'assets'), { recursive: true });

    assert.throws(
        () => new SilentAssetDelete().delete({ projectRoot: root, relativePaths: [] }),
        /silent_delete_paths_required/,
    );
    assert.throws(
        () => new SilentAssetDelete().delete({ projectRoot: root, relativePaths: ['assets/missing.png'] }),
        /silent_delete_source_missing/,
    );
});
