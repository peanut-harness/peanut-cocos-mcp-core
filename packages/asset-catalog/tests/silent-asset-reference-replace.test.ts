import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { FileAssetDependencyIndex } from '../src/file-asset-dependency-index.ts';
import { SilentAssetReferenceReplace } from '../src/silent-asset-reference-replace.ts';

/**
 * @description 写入最小 prefab JSON 与 .meta。
 * @param root 工程根。
 * @param relativePath 相对路径。
 * @param uuid 主 uuid。
 * @param referencedUuid 引用 uuid。
 * @returns 无。
 */
function writePrefabWithRef(root: string, relativePath: string, uuid: string, referencedUuid: string): void {
    const absolute = join(root, relativePath);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, `${JSON.stringify([{ __type__: 'cc.Sprite', _spriteFrame: { __uuid__: referencedUuid } }], null, 2)}\n`);
    writeFileSync(`${absolute}.meta`, `${JSON.stringify({ uuid, importer: 'prefab', files: ['.json'], subMetas: {} }, null, 2)}\n`);
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
    writeFileSync(`${absolute}.meta`, `${JSON.stringify({ uuid, importer: 'image', files: ['.png'], subMetas: {} }, null, 2)}\n`);
}

/**
 * @description 写入材质及其贴图引用。
 * @param root 工程根。
 * @param relativePath 材质路径。
 * @param uuid 材质 uuid。
 * @param textureUuid 贴图 uuid。
 * @returns 无。
 */
function writeMaterialWithTexture(root: string, relativePath: string, uuid: string, textureUuid: string): void {
    const absolute = join(root, relativePath);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(
        absolute,
        `${JSON.stringify([{ __type__: 'cc.Material', _props: { mainTexture: { __uuid__: textureUuid } } }], null, 2)}\n`,
    );
    writeFileSync(`${absolute}.meta`, `${JSON.stringify({ uuid, importer: 'material', files: ['.json'], subMetas: {} }, null, 2)}\n`);
}

/**
 * @description 写入引用材质的 prefab。
 * @param root 工程根。
 * @param relativePath 路径。
 * @param uuid prefab uuid。
 * @param materialUuid 材质 uuid。
 * @returns 无。
 */
function writePrefabWithMaterial(root: string, relativePath: string, uuid: string, materialUuid: string): void {
    const absolute = join(root, relativePath);
    mkdirSync(join(absolute, '..'), { recursive: true });
    writeFileSync(absolute, `${JSON.stringify([{ __type__: 'cc.MeshRenderer', _materials: [{ __uuid__: materialUuid }] }], null, 2)}\n`);
    writeFileSync(`${absolute}.meta`, `${JSON.stringify({ uuid, importer: 'prefab', files: ['.json'], subMetas: {} }, null, 2)}\n`);
}

test('SilentAssetReferenceReplace dryRun reports hits without writing', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-replace-'));
    mkdirSync(join(root, 'assets'), { recursive: true });
    const oldUuid = '11111111-1111-4111-8111-111111111111';
    const newUuid = '33333333-3333-4333-8333-333333333333';
    const prefabUuid = '22222222-2222-4222-8222-222222222222';
    writeImageMeta(root, 'assets/ui/old.png', oldUuid);
    writeImageMeta(root, 'assets/ui/new.png', newUuid);
    writePrefabWithRef(root, 'assets/ui/Panel.prefab', prefabUuid, oldUuid);
    FileAssetDependencyIndex.invalidate(root);
    const result = new SilentAssetReferenceReplace().replace({
        projectRoot: root,
        fromUuid: oldUuid,
        toUuid: newUuid,
        dryRun: true,
    });
    assert.equal(result.dryRun, true);
    assert.equal(result.totalReplacements, 1);
    assert.equal(result.files[0]?.path, 'assets/ui/Panel.prefab');
    const raw = readFileSync(join(root, 'assets/ui/Panel.prefab'), 'utf8');
    assert.equal(raw.includes(oldUuid), true);
    assert.equal(raw.includes(newUuid), false);
});

test('SilentAssetReferenceReplace writes replacements and preserves @sub', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-replace-write-'));
    mkdirSync(join(root, 'assets'), { recursive: true });
    const oldUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const newUuid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const prefabUuid = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    writeImageMeta(root, 'assets/ui/a.png', oldUuid);
    writeImageMeta(root, 'assets/ui/b.png', newUuid);
    writePrefabWithRef(root, 'assets/ui/Panel.prefab', prefabUuid, `${oldUuid}@f9941`);
    FileAssetDependencyIndex.invalidate(root);
    const result = new SilentAssetReferenceReplace().replace({
        projectRoot: root,
        fromUuid: oldUuid,
        toUuid: newUuid,
    });
    assert.equal(result.dryRun, false);
    assert.equal(result.totalReplacements, 1);
    const parsed = JSON.parse(readFileSync(join(root, 'assets/ui/Panel.prefab'), 'utf8')) as Array<{
        _spriteFrame: { __uuid__: string };
    }>;
    assert.equal(parsed[0]?._spriteFrame.__uuid__, `${newUuid}@f9941`);
});

test('SilentAssetReferenceReplace pathContains accepts basename substring', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-replace-contains-'));
    mkdirSync(join(root, 'assets'), { recursive: true });
    const oldUuid = '11111111-1111-4111-8111-111111111111';
    const newUuid = '33333333-3333-4333-8333-333333333333';
    const matchedUuid = '22222222-2222-4222-8222-222222222222';
    const otherUuid = '44444444-4444-4444-8444-444444444444';
    writeImageMeta(root, 'assets/ui/old.png', oldUuid);
    writeImageMeta(root, 'assets/ui/new.png', newUuid);
    writePrefabWithRef(root, 'assets/mcp-verify/FeatureReplaceProbe.prefab', matchedUuid, oldUuid);
    writePrefabWithRef(root, 'assets/ui/Other.prefab', otherUuid, oldUuid);
    FileAssetDependencyIndex.invalidate(root);
    const result = new SilentAssetReferenceReplace().replace({
        projectRoot: root,
        fromUuid: oldUuid,
        toUuid: newUuid,
        pathContains: 'FeatureReplaceProbe',
        dryRun: true,
    });
    assert.equal(result.scannedFileCount, 1);
    assert.equal(result.files[0]?.path, 'assets/mcp-verify/FeatureReplaceProbe.prefab');
});

test('SilentAssetReferenceReplace rejects missing target unless allowed', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-replace-miss-'));
    mkdirSync(join(root, 'assets'), { recursive: true });
    const oldUuid = '11111111-1111-4111-8111-111111111111';
    writeImageMeta(root, 'assets/ui/old.png', oldUuid);
    assert.throws(
        () =>
            new SilentAssetReferenceReplace().replace({
                projectRoot: root,
                fromUuid: oldUuid,
                toUuid: '99999999-9999-4999-8999-999999999999',
            }),
        /silent_replace_target_not_found/,
    );
});

test('FileAssetDependencyIndex expand materialTextures adds nested texture deps', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-deps-expand-'));
    mkdirSync(join(root, 'assets'), { recursive: true });
    const textureUuid = '11111111-1111-4111-8111-111111111111';
    const materialUuid = '22222222-2222-4222-8222-222222222222';
    const prefabUuid = '33333333-3333-4333-8333-333333333333';
    writeImageMeta(root, 'assets/tex/albedo.png', textureUuid);
    writeMaterialWithTexture(root, 'assets/mat/Body.mtl', materialUuid, textureUuid);
    writePrefabWithMaterial(root, 'assets/prefabs/Hero.prefab', prefabUuid, materialUuid);
    FileAssetDependencyIndex.invalidate(root);
    const index = new FileAssetDependencyIndex();
    const shallow = index.query(root, {
        dbPath: 'db://assets/prefabs/Hero.prefab',
        direction: 'dependencies',
    });
    assert.equal(
        shallow.dependencies.some((item) => item.uuid === materialUuid),
        true,
    );
    assert.equal(
        shallow.dependencies.some((item) => item.uuid === textureUuid),
        false,
    );
    const expanded = index.query(root, {
        dbPath: 'db://assets/prefabs/Hero.prefab',
        direction: 'dependencies',
        expand: ['materialTextures'],
    });
    assert.equal(
        expanded.dependencies.some((item) => item.uuid === materialUuid),
        true,
    );
    assert.equal(
        expanded.dependencies.some((item) => item.uuid === textureUuid),
        true,
    );
});
