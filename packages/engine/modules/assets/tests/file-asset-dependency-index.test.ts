import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { FileAssetDependencyIndex } from '../src/file-asset-dependency-index.ts';

/**
 * @description 写入最小 prefab JSON 与 .meta。
 * @param root 工程根。
 * @param relativePath 相对 assets 路径。
 * @param uuid 主 uuid。
 * @param referencedUuid 引用 uuid。
 * @returns 无。
 */
function writePrefabWithRef(root: string, relativePath: string, uuid: string, referencedUuid: string): void {
    const absolute = join(root, relativePath);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(
        absolute,
        `${JSON.stringify([{ __type__: 'cc.Sprite', _spriteFrame: { __uuid__: referencedUuid } }], null, 2)}\n`,
    );
    writeFileSync(
        `${absolute}.meta`,
        `${JSON.stringify({ uuid, importer: 'prefab', files: ['.json'], subMetas: {} }, null, 2)}\n`,
    );
}

/**
 * @description 写入被引用的素材 meta。
 * @param root 工程根。
 * @param relativePath 相对路径。
 * @param uuid uuid。
 * @returns 无。
 */
function writeImageMeta(root: string, relativePath: string, uuid: string): void {
    const absolute = join(root, relativePath);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, 'png-bytes');
    writeFileSync(
        `${absolute}.meta`,
        `${JSON.stringify({ uuid, importer: 'image', files: ['.png'], subMetas: {} }, null, 2)}\n`,
    );
}

test('FileAssetDependencyIndex resolves dependencies and dependents from disk', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-deps-'));
    mkdirSync(join(root, 'assets'), { recursive: true });
    const imageUuid = '11111111-1111-4111-8111-111111111111';
    const prefabUuid = '22222222-2222-4222-8222-222222222222';
    writeImageMeta(root, 'assets/ui/icon.png', imageUuid);
    writePrefabWithRef(root, 'assets/ui/Panel.prefab', prefabUuid, imageUuid);
    FileAssetDependencyIndex.invalidate(root);
    const index = new FileAssetDependencyIndex();
    const forward = index.query(root, { dbPath: 'db://assets/ui/Panel.prefab', direction: 'dependencies' });
    assert.equal(forward.target.uuid, prefabUuid);
    assert.equal(forward.dependencies.some((item) => item.uuid === imageUuid), true);
    const reverse = index.query(root, { uuid: imageUuid, direction: 'dependents' });
    assert.equal(reverse.dependents.some((item) => item.uuid === prefabUuid), true);
});
