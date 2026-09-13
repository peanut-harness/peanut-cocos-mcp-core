import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { SilentAssetMoveRename } from '../src/silent-asset-move-rename.ts';

/**
 * @description 写入最小图片资源 + meta。
 * @param root 工程根。
 * @param relativePath 相对路径。
 * @param uuid 主 uuid。
 * @returns 无。
 */
function writeAsset(root: string, relativePath: string, uuid: string): void {
    const absolute = join(root, relativePath);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, 'bytes');
    writeFileSync(
        `${absolute}.meta`,
        `${JSON.stringify({ ver: '1.0.27', importer: 'image', imported: true, uuid, files: [], subMetas: {}, userData: {} }, null, 2)}\n`,
    );
}

test('SilentAssetMoveRename moves file+meta while keeping uuid', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-silent-move-'));
    mkdirSync(join(root, 'assets'), { recursive: true });
    writeAsset(root, 'assets/ui/icon.png', '11111111-1111-4111-8111-111111111111');

    const result = new SilentAssetMoveRename().moveOrRename({
        projectRoot: root,
        fromRelativePath: 'assets/ui/icon.png',
        toRelativePath: 'assets/ui2/icon-renamed.png',
    });

    assert.equal(result.fromPath, 'assets/ui/icon.png');
    assert.equal(result.toPath, 'assets/ui2/icon-renamed.png');
    assert.equal(result.isDirectory, false);
    assert.equal(result.movedMeta, true);
    assert.equal(existsSync(join(root, 'assets/ui/icon.png')), false);
    assert.equal(existsSync(join(root, 'assets/ui/icon.png.meta')), false);
    assert.equal(existsSync(join(root, 'assets/ui2/icon-renamed.png')), true);

    const meta = JSON.parse(readFileSync(join(root, 'assets/ui2/icon-renamed.png.meta'), 'utf8')) as {
        uuid: string;
        imported?: boolean;
    };
    assert.equal(meta.uuid, '11111111-1111-4111-8111-111111111111');
    // 保持 imported=true：禁止搬迁时打 false，否则 3.8 Assets 面板会 Window 竞态。
    assert.equal(meta.imported, true);
});

test('SilentAssetMoveRename moves whole directory tree preserving nested uuids', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-silent-move-dir-'));
    mkdirSync(join(root, 'assets'), { recursive: true });
    writeAsset(root, 'assets/ui/icon.png', '22222222-2222-4222-8222-222222222222');
    writeFileSync(
        join(root, 'assets/ui.meta'),
        `${JSON.stringify({ ver: '1.2.0', importer: 'directory', imported: true, uuid: '33333333-3333-4333-8333-333333333333', files: [], subMetas: {}, userData: {} }, null, 2)}\n`,
    );

    const result = new SilentAssetMoveRename().moveOrRename({
        projectRoot: root,
        fromRelativePath: 'assets/ui',
        toRelativePath: 'assets/ui-renamed',
    });

    assert.equal(result.isDirectory, true);
    assert.equal(result.movedMeta, true);
    assert.equal(existsSync(join(root, 'assets/ui')), false);
    assert.equal(existsSync(join(root, 'assets/ui-renamed/icon.png')), true);

    const nestedMeta = JSON.parse(readFileSync(join(root, 'assets/ui-renamed/icon.png.meta'), 'utf8')) as {
        uuid: string;
    };
    assert.equal(nestedMeta.uuid, '22222222-2222-4222-8222-222222222222');
    const dirMeta = JSON.parse(readFileSync(join(root, 'assets/ui-renamed.meta'), 'utf8')) as { uuid: string };
    assert.equal(dirMeta.uuid, '33333333-3333-4333-8333-333333333333');
});

test('SilentAssetMoveRename rejects existing target and missing source', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-silent-move-guard-'));
    mkdirSync(join(root, 'assets'), { recursive: true });
    writeAsset(root, 'assets/a.png', '44444444-4444-4444-8444-444444444444');
    writeAsset(root, 'assets/b.png', '55555555-5555-4555-8555-555555555555');

    assert.throws(
        () =>
            new SilentAssetMoveRename().moveOrRename({
                projectRoot: root,
                fromRelativePath: 'assets/a.png',
                toRelativePath: 'assets/b.png',
            }),
        /silent_move_rename_target_exists/,
    );
    assert.throws(
        () =>
            new SilentAssetMoveRename().moveOrRename({
                projectRoot: root,
                fromRelativePath: 'assets/missing.png',
                toRelativePath: 'assets/other.png',
            }),
        /silent_move_rename_source_missing/,
    );
});
