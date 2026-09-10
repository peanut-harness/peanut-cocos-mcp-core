import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { LumenEngineDefaultUuidCatalog } from '../source/hierarchy/lumen-engine-default-uuid-catalog.ts';
import { LumenHierarchyRefValidator } from '../source/hierarchy/lumen-hierarchy-ref-validator.ts';

test('LumenHierarchyRefValidator reports unbound sprite and missing uuid', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-validate-refs-'));
    mkdirSync(join(root, 'assets/ui'), { recursive: true });
    const relativePath = 'assets/ui/Broken.prefab';
    writeFileSync(
        join(root, relativePath),
        `${JSON.stringify(
            [
                { __type__: 'cc.Prefab', _name: 'Broken', data: { __id__: 1 } },
                {
                    __type__: 'cc.Node',
                    _name: 'Broken',
                    _children: [],
                    _components: [{ __id__: 2 }, { __id__: 3 }],
                },
                {
                    __type__: 'cc.Sprite',
                    _spriteFrame: null,
                },
                {
                    __type__: 'cc.Button',
                    clickEvents: [{ __id__: 4 }],
                },
                {
                    __type__: 'cc.ClickEvent',
                    target: null,
                    handler: '',
                    component: '',
                },
            ],
            null,
            2,
        )}\n`,
    );
    writeFileSync(
        join(root, `${relativePath}.meta`),
        `${JSON.stringify(
            {
                uuid: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
                importer: 'prefab',
                files: ['.json'],
                subMetas: {},
            },
            null,
            2,
        )}\n`,
    );
    const result = new LumenHierarchyRefValidator().validate(root, {
        prefabRelativePath: relativePath,
    });
    assert.equal(result.ok, false);
    assert.equal(result.summary.unboundSprite >= 1, true);
    assert.equal(result.summary.emptyClickEvent >= 1, true);
});

test('LumenHierarchyRefValidator ignores default_prefab engine uuids', (): void => {
    LumenEngineDefaultUuidCatalog.clearCacheForTests();
    const engineUuid = 'afc47931-f066-46b0-90be-9fe61f213428@f9941';
    assert.equal(LumenEngineDefaultUuidCatalog.isEngineDefault(engineUuid), true);

    const root = mkdtempSync(join(tmpdir(), 'peanut-validate-engine-'));
    mkdirSync(join(root, 'assets/ui'), { recursive: true });
    const relativePath = 'assets/ui/ScrollLike.prefab';
    writeFileSync(
        join(root, relativePath),
        `${JSON.stringify(
            [
                { __type__: 'cc.Prefab', _name: 'ScrollLike', data: { __id__: 1 } },
                {
                    __type__: 'cc.Node',
                    _name: 'ScrollLike',
                    _children: [],
                    _components: [{ __id__: 2 }],
                },
                {
                    __type__: 'cc.Sprite',
                    _spriteFrame: { __uuid__: engineUuid },
                },
            ],
            null,
            2,
        )}\n`,
    );
    writeFileSync(
        join(root, `${relativePath}.meta`),
        `${JSON.stringify(
            {
                uuid: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
                importer: 'prefab',
                files: ['.json'],
                subMetas: {},
            },
            null,
            2,
        )}\n`,
    );
    const result = new LumenHierarchyRefValidator().validate(root, {
        prefabRelativePath: relativePath,
    });
    assert.equal(result.ok, true);
    assert.equal(result.summary.missingUuid, 0);
    assert.ok(result.summary.ignoredEngineDefaultUuid >= 1);
    assert.ok((result.ignoredEngineDefaults?.length ?? 0) >= 1);
});

test('LumenHierarchyRefValidator still reports unknown project uuids', (): void => {
    LumenEngineDefaultUuidCatalog.clearCacheForTests();
    const root = mkdtempSync(join(tmpdir(), 'peanut-validate-missing-'));
    mkdirSync(join(root, 'assets/ui'), { recursive: true });
    const relativePath = 'assets/ui/Missing.prefab';
    const missingUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    writeFileSync(
        join(root, relativePath),
        `${JSON.stringify(
            [
                { __type__: 'cc.Prefab', _name: 'Missing', data: { __id__: 1 } },
                {
                    __type__: 'cc.Node',
                    _name: 'Missing',
                    _children: [],
                    _components: [{ __id__: 2 }],
                },
                {
                    __type__: 'cc.Sprite',
                    _spriteFrame: { __uuid__: missingUuid },
                },
            ],
            null,
            2,
        )}\n`,
    );
    writeFileSync(
        join(root, `${relativePath}.meta`),
        `${JSON.stringify(
            {
                uuid: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
                importer: 'prefab',
                files: ['.json'],
                subMetas: {},
            },
            null,
            2,
        )}\n`,
    );
    const result = new LumenHierarchyRefValidator().validate(root, {
        prefabRelativePath: relativePath,
    });
    assert.equal(result.ok, false);
    assert.equal(result.summary.missingUuid, 1);
    assert.equal(result.summary.ignoredEngineDefaultUuid, 0);
});

test('LumenHierarchyRefValidator reports badAnimPath when clip path missing under host', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-validate-anim-'));
    mkdirSync(join(root, 'assets/ui'), { recursive: true });
    mkdirSync(join(root, 'assets/anim'), { recursive: true });
    const clipUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const clipPath = 'assets/anim/Idle.anim';
    writeFileSync(
        join(root, clipPath),
        `${JSON.stringify(
            {
                __type__: 'cc.AnimationClip',
                _name: 'Idle',
                curveDatas: {
                    'MissingBone/Child': {},
                },
                _tracks: [],
            },
            null,
            2,
        )}\n`,
    );
    writeFileSync(
        join(root, `${clipPath}.meta`),
        `${JSON.stringify(
            {
                uuid: clipUuid,
                importer: 'animation-clip',
                files: ['.json'],
                subMetas: {},
            },
            null,
            2,
        )}\n`,
    );
    const relativePath = 'assets/ui/AnimHost.prefab';
    writeFileSync(
        join(root, relativePath),
        `${JSON.stringify(
            [
                { __type__: 'cc.Prefab', _name: 'AnimHost', data: { __id__: 1 } },
                {
                    __type__: 'cc.Node',
                    _name: 'AnimHost',
                    _children: [{ __id__: 2 }],
                    _components: [{ __id__: 3 }],
                },
                {
                    __type__: 'cc.Node',
                    _name: 'Arm',
                    _children: [],
                    _components: [],
                },
                {
                    __type__: 'cc.Animation',
                    _defaultClip: { __uuid__: clipUuid },
                    _clips: [{ __uuid__: clipUuid }],
                },
            ],
            null,
            2,
        )}\n`,
    );
    writeFileSync(
        join(root, `${relativePath}.meta`),
        `${JSON.stringify(
            {
                uuid: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                importer: 'prefab',
                files: ['.json'],
                subMetas: {},
            },
            null,
            2,
        )}\n`,
    );
    const result = new LumenHierarchyRefValidator().validate(root, {
        prefabRelativePath: relativePath,
    });
    assert.equal(result.ok, false);
    assert.equal(result.summary.badAnimPath >= 1, true);
    assert.equal(
        result.issues.some((issue) => issue.kind === 'badAnimPath' && issue.message.includes('MissingBone')),
        true,
    );
});
