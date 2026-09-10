import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { LumenComponentPropertySchema } from '../source/schema/component-property';
import { LumenCocosVersion } from '../source/schema/cocos-version';
import { LumenCuratedSchemaCatalog } from '../source/schema/catalog';

/**
 * @description 在临时目录写一份最小可加载策展表。
 */
class LumenCuratedSchemaTestHarness {
    /**
     * @description 创建含 Sprite / 节点 / 空废弃表的目录。
     * @returns 根路径
     */
    public createMinimalRoot(): string {
        const root = mkdtempSync(join(tmpdir(), 'lumen-schema-'));
        mkdirSync(join(root, 'components'), { recursive: true });
        mkdirSync(join(root, 'types'), { recursive: true });
        this.writeJson(join(root, 'node.json'), {
            type: 'cc.Node',
            kind: 'node',
            fields: [{ apiName: 'active', serializedName: '_active', kind: 'boolean', example: true }],
        });
        this.writeJson(join(root, 'deprecated.json'), { kind: 'deprecated', builtins: {} });
        this.writeJson(join(root, 'conventions.json'), {
            kind: 'conventions',
            rendererExclusive: ['cc.Sprite'],
            ui2dTypes: ['cc.Sprite'],
            world3dTypes: [],
        });
        this.writeJson(join(root, 'assets.json'), { kind: 'assets', entries: [] });
        this.writeJson(join(root, 'components', 'cc.Sprite.json'), {
            type: 'cc.Sprite',
            kind: 'component',
            fields: [
                { apiName: 'spriteFrame', serializedName: '_spriteFrame', kind: 'uuid' },
                { apiName: 'atlas', serializedName: '_atlas', kind: 'uuid' },
            ],
        });
        return root;
    }

    /**
     * @description 写 JSON 文件。
     * @param absolutePath 路径
     * @param value 文档
     */
    public writeJson(absolutePath: string, value: unknown): void {
        writeFileSync(absolutePath, `${JSON.stringify(value)}\n`, 'utf8');
    }
}

test('schema JSON loads spriteFrame/atlas and particle typeRef', (): void => {
    const schema = new LumenComponentPropertySchema();
    assert.ok(schema.listSupportedComponents().includes('cc.Sprite'));
    assert.ok(schema.listSupportedComponents().includes('cc.ParticleSystem'));
    assert.ok(schema.listApiNames('cc.Sprite').includes('spriteFrame'));
    assert.ok(schema.listApiNames('cc.Sprite').includes('atlas'));
    const spriteType = schema.describeComponent('cc.Sprite').find((prop) => prop.apiName === 'type');
    assert.equal(spriteType?.kind, 'enum');
    assert.ok((spriteType?.enumHints?.length ?? 0) >= 4);
    const shape = schema.describeComponent('cc.ParticleSystem').find((prop) => prop.apiName === 'shapeModule');
    assert.equal(shape?.kind, 'objectPatch');
    assert.equal(shape?.embeddedType, 'cc.ShapeModule');
    const shapeType = shape?.nestedProps?.find((prop) => prop.apiName === 'shapeType');
    assert.equal(shapeType?.kind, 'enum');
    assert.ok((shapeType?.enumHints?.length ?? 0) >= 5);
    const label = new LumenComponentPropertySchema(LumenCocosVersion.parse('3.8.0'));
    assert.equal(label.listApiNames('cc.Label').includes('enableOutline'), false);
});

test('catalog rejects missing typeRef and filename/type mismatch', (): void => {
    const harness = new LumenCuratedSchemaTestHarness();
    const missingRefRoot = harness.createMinimalRoot();
    const mismatchRoot = harness.createMinimalRoot();
    try {
        harness.writeJson(join(missingRefRoot, 'components', 'cc.Sprite.json'), {
            type: 'cc.Sprite',
            kind: 'component',
            fields: [
                {
                    apiName: 'shapeModule',
                    serializedName: '_shapeModule',
                    kind: 'objectPatch',
                    typeRef: 'cc.ShapeModule',
                },
            ],
        });
        assert.throws(
            (): void => {
                new LumenCuratedSchemaCatalog(missingRefRoot);
            },
            /lumen_curated_schema_type_ref_missing/,
        );

        harness.writeJson(join(mismatchRoot, 'components', 'cc.Sprite.json'), {
            type: 'cc.Label',
            kind: 'component',
            fields: [],
        });
        assert.throws(
            (): void => {
                new LumenCuratedSchemaCatalog(mismatchRoot);
            },
            /lumen_curated_schema_type_mismatch/,
        );
    } finally {
        rmSync(missingRefRoot, { recursive: true, force: true });
        rmSync(mismatchRoot, { recursive: true, force: true });
    }
});

test('catalog expands typeRef nested fields from types/', (): void => {
    const harness = new LumenCuratedSchemaTestHarness();
    const root = harness.createMinimalRoot();
    try {
        harness.writeJson(join(root, 'types', 'cc.Burst.json'), {
            type: 'cc.Burst',
            kind: 'embedded',
            fields: [
                { apiName: 'time', serializedName: '_time', kind: 'number' },
                { apiName: 'repeatCount', serializedName: '_repeatCount', kind: 'number' },
            ],
        });
        harness.writeJson(join(root, 'components', 'cc.ParticleSystem.json'), {
            type: 'cc.ParticleSystem',
            kind: 'component',
            fields: [
                {
                    apiName: 'bursts',
                    serializedName: 'bursts',
                    kind: 'objectList',
                    embeddedType: 'cc.Burst',
                    typeRef: 'cc.Burst',
                },
            ],
        });
        const catalog = new LumenCuratedSchemaCatalog(root);
        const bursts = catalog.componentFields('cc.ParticleSystem')?.[0];
        assert.equal(bursts?.kind, 'objectList');
        assert.equal(bursts?.typeRef, undefined);
        assert.equal(bursts?.nestedFields?.length, 2);
        assert.equal(bursts?.nestedFields?.[0]?.apiName, 'time');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('catalog loads conventions and script aliases from JSON', (): void => {
    const catalog = LumenCuratedSchemaCatalog.shared();
    assert.equal(catalog.isRendererExclusive('cc.Label'), true);
    assert.equal(catalog.isRendererExclusive('cc.Button'), false);
    assert.equal(catalog.layerRoleForComponent('cc.Label'), 'ui2d');
    assert.equal(catalog.layerRoleForComponent('cc.ParticleSystem'), 'world3d');
    assert.equal(catalog.scriptComponentType('Label'), 'cc.Label');
    assert.equal(catalog.scriptComponentType('ScrollBar'), 'cc.ScrollBar');
    assert.equal(catalog.scriptComponentType('ArmatureDisplay'), 'dragonBones.ArmatureDisplay');
    assert.equal(catalog.scriptComponentType('AnimationController'), 'cc.animation.AnimationController');
});

test('catalog rejects unknown convention types and layer overlap', (): void => {
    const harness = new LumenCuratedSchemaTestHarness();
    const unknownRoot = harness.createMinimalRoot();
    const overlapRoot = harness.createMinimalRoot();
    try {
        harness.writeJson(join(unknownRoot, 'conventions.json'), {
            kind: 'conventions',
            rendererExclusive: ['cc.Missing'],
            ui2dTypes: [],
            world3dTypes: [],
        });
        assert.throws(
            (): void => {
                new LumenCuratedSchemaCatalog(unknownRoot);
            },
            /lumen_curated_schema_conventions_unknown:rendererExclusive:cc\.Missing/,
        );

        harness.writeJson(join(overlapRoot, 'conventions.json'), {
            kind: 'conventions',
            rendererExclusive: ['cc.Sprite'],
            ui2dTypes: ['cc.Sprite'],
            world3dTypes: ['cc.Sprite'],
        });
        assert.throws(
            (): void => {
                new LumenCuratedSchemaCatalog(overlapRoot);
            },
            /lumen_curated_schema_layer_overlap/,
        );
    } finally {
        rmSync(unknownRoot, { recursive: true, force: true });
        rmSync(overlapRoot, { recursive: true, force: true });
    }
});

test('component JSON lifecycle gates list and attach by Creator version', (): void => {
    const harness = new LumenCuratedSchemaTestHarness();
    const root = harness.createMinimalRoot();
    try {
        harness.writeJson(join(root, 'components', 'cc.Future.json'), {
            type: 'cc.Future',
            kind: 'component',
            since: '3.9.0',
            deprecatedSince: '4.0.0',
            removedSince: '4.1.0',
            useInstead: 'cc.Sprite',
            fields: [{ apiName: 'ready', serializedName: '_ready', kind: 'boolean' }],
        });
        const catalog = new LumenCuratedSchemaCatalog(root);
        assert.deepEqual(catalog.componentLifecycle('cc.Future'), {
            since: '3.9.0',
            deprecatedSince: '4.0.0',
            removedSince: '4.1.0',
            useInstead: 'cc.Sprite',
        });

        const before = new LumenComponentPropertySchema(LumenCocosVersion.parse('3.8.3'), catalog);
        assert.equal(before.listSupportedComponents().includes('cc.Future'), false);
        assert.equal(before.listSupportedComponents().includes('cc.Sprite'), true);
        assert.throws(
            (): void => {
                before.assertBuiltinAttachAllowed('cc.Future');
            },
            /lumen_component_not_supported:cc\.Future:since=3\.9\.0/,
        );

        const current = new LumenComponentPropertySchema(LumenCocosVersion.parse('3.9.1'), catalog);
        assert.equal(current.listSupportedComponents().includes('cc.Future'), true);
        current.assertBuiltinAttachAllowed('cc.Future');

        const deprecated = new LumenComponentPropertySchema(LumenCocosVersion.parse('4.0.0'), catalog);
        assert.equal(deprecated.listSupportedComponents().includes('cc.Future'), false);
        assert.throws(
            (): void => {
                deprecated.assertBuiltinAttachAllowed('cc.Future');
            },
            /lumen_component_deprecated:cc\.Future:since=4\.0\.0/,
        );

        const removed = new LumenComponentPropertySchema(LumenCocosVersion.parse('4.1.0'), catalog);
        assert.equal(removed.listSupportedComponents().includes('cc.Future'), false);
        assert.throws(
            (): void => {
                removed.assertBuiltinAttachAllowed('cc.Future');
            },
            /lumen_component_removed:cc\.Future:since=4\.1\.0/,
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('component lifecycle rejects invalid version order and missing useInstead', (): void => {
    const harness = new LumenCuratedSchemaTestHarness();
    const orderRoot = harness.createMinimalRoot();
    const hintRoot = harness.createMinimalRoot();
    try {
        harness.writeJson(join(orderRoot, 'components', 'cc.Sprite.json'), {
            type: 'cc.Sprite',
            kind: 'component',
            since: '3.9.0',
            removedSince: '3.8.0',
            useInstead: 'gone',
            fields: [],
        });
        assert.throws(
            (): void => {
                new LumenCuratedSchemaCatalog(orderRoot);
            },
            /lumen_curated_schema_lifecycle_order/,
        );

        harness.writeJson(join(hintRoot, 'components', 'cc.Sprite.json'), {
            type: 'cc.Sprite',
            kind: 'component',
            deprecatedSince: '3.9.0',
            fields: [],
        });
        assert.throws(
            (): void => {
                new LumenCuratedSchemaCatalog(hintRoot);
            },
            /lumen_curated_schema_lifecycle_hint/,
        );
    } finally {
        rmSync(orderRoot, { recursive: true, force: true });
        rmSync(hintRoot, { recursive: true, force: true });
    }
});

test('assets.json registers sidecar kinds and exclusive extensions', (): void => {
    const catalog = LumenCuratedSchemaCatalog.shared();
    assert.equal(catalog.kindFromExclusiveExtension('assets/fx/boom.wav'), 'audio');
    assert.equal(catalog.kindFromExclusiveExtension('assets/ui/Hero.animgraphvari'), 'animationGraphVariant');
    assert.equal(catalog.kindFromExclusiveExtension('assets/ui/Hero.animgraph'), 'animationGraph');
    assert.equal(catalog.kindFromExclusiveExtension('assets/cfg/note.json'), undefined);
    assert.equal(catalog.kindFromExclusiveExtension('assets/data/Table.bin'), 'buffer');
    assert.equal(catalog.kindFromExclusiveExtension('assets/scripts/Probe.ts'), 'script');
    assert.equal(catalog.kindFromExclusiveExtension('assets/scripts/plugin.js'), 'javascript');
    assert.equal(catalog.kindFromExclusiveExtension('assets/mesh/Cube.mesh'), 'mesh');
    assert.equal(catalog.kindFromExclusiveExtension('assets/mesh/Skin.skeleton'), 'skeleton');
    assert.equal(catalog.kindFromExclusiveExtension('assets/anim/Walk.animation'), 'instantiationAnimation');
    assert.equal(catalog.kindFromExclusiveExtension('assets/anim/Idle.anim'), 'animationClip');
    assert.equal(catalog.kindFromExclusiveExtension('assets/fx/Body.material'), 'instantiationMaterial');
    assert.equal(catalog.kindFromExclusiveExtension('assets/fx/Lit.mtl'), 'material');
    assert.equal(catalog.kindFromExclusiveExtension('assets/fx/Main.flow'), 'renderFlow');
    assert.equal(catalog.kindFromExclusiveExtension('assets/fx/Opaque.stg'), 'renderStage');
    assert.equal(catalog.kindFromExclusiveExtension('assets/fx/Smoke.plist'), undefined);
    assert.equal(catalog.kindFromImporter('particle'), 'particle');
    assert.equal(catalog.kindFromImporter('spine-data'), 'spine');
    assert.equal(catalog.kindFromImporter('directory'), 'directory');
    assert.equal(catalog.kindFromImporter('typescript'), 'script');
    assert.equal(catalog.kindFromImporter('javascript'), 'javascript');
    assert.equal(catalog.kindFromImporter('instantiation-mesh'), 'mesh');
    assert.equal(catalog.kindFromImporter('instantiation-skeleton'), 'skeleton');
    assert.equal(catalog.kindFromImporter('instantiation-animation'), 'instantiationAnimation');
    assert.equal(catalog.kindFromImporter('instantiation-material'), 'instantiationMaterial');
    const particle = catalog.sidecarEntry('particle');
    assert.equal(particle?.document, 'sidecar-meta');
    assert.equal(particle?.errorPrefix, 'lumen_particle');
    assert.equal(particle?.fields[0]?.apiName, 'spriteFrameUuid');
    assert.equal(particle?.fields[0]?.writable, false);
    const cube = catalog.sidecarEntry('cubeMap');
    assert.equal(cube?.fields.some((field) => field.apiName === 'faces'), true);
    const autoAtlas = catalog.sidecarEntry('autoAtlas');
    assert.equal(autoAtlas?.scaffold, true);
    assert.equal(autoAtlas?.writeSource, true);
    assert.equal(catalog.sidecarEntry('labelAtlas')?.errorPrefix, 'lumen_label_atlas');
    assert.equal(catalog.sidecarEntry('script')?.scaffold, false);
    assert.equal(catalog.sidecarEntry('script')?.writeSource, true);
    assert.equal(catalog.sidecarEntry('javascript')?.fields.some((field) => field.apiName === 'isPlugin'), true);
    assert.equal(catalog.sidecarEntry('mesh')?.importers[0], 'instantiation-mesh');
    assert.equal(catalog.sidecarEntry('skeleton')?.scaffold, false);
    assert.equal(catalog.sidecarEntry('instantiationAnimation')?.importers[0], 'instantiation-animation');
    assert.equal(catalog.sidecarEntry('instantiationMaterial')?.extensions[0], '.material');
    assert.equal(catalog.assetEntry('physicsMaterial')?.document, 'json-asset');
    assert.equal(catalog.jsonAssetEntry('physicsMaterial')?.allowedTypes?.includes('cc.PhysicMaterial'), true);
    assert.equal(catalog.sidecarEntry('physicsMaterial'), undefined);
    assert.equal(catalog.assetEntry('renderFlow')?.document, 'json-asset');
    assert.equal(catalog.jsonAssetEntry('renderFlow')?.importers[0], 'render-flow');
    assert.equal(catalog.assetEntry('renderStage')?.document, 'json-asset');
    assert.equal(catalog.jsonAssetEntry('renderStage')?.extensions[0], '.stg');
    assert.equal(catalog.assetEntry('material')?.document, 'custom');
    assert.equal(catalog.isStandaloneKind('prefab'), false);
    assert.equal(catalog.isStandaloneKind('audio'), true);
});

test('catalog rejects duplicate asset extensions', (): void => {
    const harness = new LumenCuratedSchemaTestHarness();
    const root = harness.createMinimalRoot();
    try {
        harness.writeJson(join(root, 'assets.json'), {
            kind: 'assets',
            entries: [
                {
                    assetKind: 'audio',
                    document: 'sidecar-meta',
                    scaffold: false,
                    errorPrefix: 'lumen_audio',
                    extensions: ['.wav'],
                    importers: ['audio-clip'],
                    fields: [],
                },
                {
                    assetKind: 'video',
                    document: 'sidecar-meta',
                    scaffold: false,
                    errorPrefix: 'lumen_video',
                    extensions: ['.wav'],
                    importers: ['video-clip'],
                    fields: [],
                },
            ],
        });
        assert.throws(
            (): void => {
                new LumenCuratedSchemaCatalog(root);
            },
            /lumen_curated_schema_duplicate:assets.json:extension:\.wav/,
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
