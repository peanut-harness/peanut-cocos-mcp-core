import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { CocosUuidCodec } from 'peanut-asset-catalog';

import { LumenEngineDefaultUuidCatalog } from '../source/hierarchy/lumen-engine-default-uuid-catalog.ts';
import { LumenHierarchyRefValidator } from '../source/hierarchy/lumen-hierarchy-ref-validator.ts';

test('LumenHierarchyRefValidator verifies exact sprite, script field, and click bindings', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-validate-bindings-'));
    try {
        const scriptUuid = '6f47ca3a-2da5-418c-86c1-c0840928c6ba';
        const compressedScriptUuid = new CocosUuidCodec().compress(scriptUuid);
        const imageUuid = '1ae1bf24-3cd6-4663-a07c-dcc2ec8f94c5';
        const spriteFrameUuid = `${imageUuid}@f9941`;
        mkdirSync(join(root, 'assets/ui'), { recursive: true });
        mkdirSync(join(root, 'assets/scripts'), { recursive: true });
        mkdirSync(join(root, 'assets/textures'), { recursive: true });
        writeFileSync(
            join(root, 'assets/scripts/CapabilityController.ts'),
            "import { _decorator, Component, Label } from 'cc';\nconst { ccclass, property } = _decorator;\n@ccclass('CapabilityController')\nexport class CapabilityController extends Component {\n    @property(Label)\n    public statusLabel: Label | null = null;\n    public onAction(): void {}\n}\n",
        );
        writeFileSync(
            join(root, 'assets/scripts/CapabilityController.ts.meta'),
            `${JSON.stringify({ uuid: scriptUuid, importer: 'typescript', files: [], subMetas: {}, userData: {} }, null, 2)}\n`,
        );
        writeFileSync(join(root, 'assets/textures/CapabilitySprite.png'), 'fixture');
        writeFileSync(
            join(root, 'assets/textures/CapabilitySprite.png.meta'),
            `${JSON.stringify(
                {
                    uuid: imageUuid,
                    importer: 'image',
                    files: ['.png'],
                    subMetas: {
                        f9941: {
                            importer: 'sprite-frame',
                            uuid: spriteFrameUuid,
                            displayName: 'CapabilitySprite',
                        },
                    },
                    userData: {},
                },
                null,
                2,
            )}\n`,
        );
        const relativePath = 'assets/ui/Binding.prefab';
        const entries = [
            { __type__: 'cc.Prefab', _name: 'Binding', data: { __id__: 1 } },
            {
                __type__: 'cc.Node',
                _name: 'Binding',
                _parent: null,
                _children: [{ __id__: 2 }],
                _components: [{ __id__: 4 }, { __id__: 5 }, { __id__: 7 }],
            },
            {
                __type__: 'cc.Node',
                _name: 'StatusLabel',
                _parent: { __id__: 1 },
                _children: [],
                _components: [{ __id__: 3 }],
            },
            { __type__: 'cc.Label', node: { __id__: 2 }, _string: 'READY' },
            { __type__: compressedScriptUuid, node: { __id__: 1 }, statusLabel: { __id__: 3 } },
            { __type__: 'cc.Button', node: { __id__: 1 }, clickEvents: [{ __id__: 6 }] },
            {
                __type__: 'cc.ClickEvent',
                target: { __id__: 1 },
                component: 'CapabilityController',
                _componentId: compressedScriptUuid,
                handler: 'onAction',
                customEventData: 'binding-proof',
            },
            {
                __type__: 'cc.Sprite',
                node: { __id__: 1 },
                _spriteFrame: { __uuid__: spriteFrameUuid, __expectedType__: 'cc.SpriteFrame' },
            },
        ];
        writeFileSync(join(root, relativePath), `${JSON.stringify(entries, null, 2)}\n`);
        writeFileSync(
            join(root, `${relativePath}.meta`),
            `${JSON.stringify({ uuid: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', importer: 'prefab', files: ['.json'], subMetas: {} }, null, 2)}\n`,
        );

        const validator = new LumenHierarchyRefValidator();
        const valid = validator.validate(root, { prefabRelativePath: relativePath });
        assert.equal(valid.ok, true);
        assert.deepEqual(valid.issues, []);

        const broken = JSON.parse(readFileSync(join(root, relativePath), 'utf8')) as Array<Record<string, unknown>>;
        broken[0]!.data = { __id__: '1' };
        (broken[1]?._children as Array<{ __id__: number }>).push({ __id__: 99 });
        broken[4]!.statusLabel = { __id__: 2 };
        (broken[6] as Record<string, unknown>)._componentId = 'missing-script-component';
        (broken[7]!._spriteFrame as Record<string, unknown>).__uuid__ = imageUuid;
        writeFileSync(join(root, relativePath), `${JSON.stringify(broken, null, 2)}\n`);

        const invalid = validator.validate(root, { prefabRelativePath: relativePath });
        assert.equal(invalid.ok, false);
        assert.equal(invalid.issues.some((issue) => issue.kind === 'danglingId'), true);
        assert.equal(invalid.issues.some((issue) => issue.kind === 'wrongReferenceType' && issue.fieldHint === 'statusLabel'), true);
        assert.equal(invalid.issues.some((issue) => issue.kind === 'invalidClickEvent'), true);
        assert.equal(invalid.issues.some((issue) => issue.kind === 'wrongAssetType'), true);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

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
                    node: { __id__: 1 },
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

test('LumenHierarchyRefValidator ignores Creator scene scaffold skybox uuids', (): void => {
    LumenEngineDefaultUuidCatalog.clearCacheForTests();
    assert.equal(LumenEngineDefaultUuidCatalog.isEngineDefault('d032ac98-05e1-4090-88bb-eb640dcb5fc1@b47c0'), true);
    assert.equal(LumenEngineDefaultUuidCatalog.isEngineDefault('6f01cf7f-81bf-4a7e-bd5d-0afc19696480@b47c0'), true);
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
