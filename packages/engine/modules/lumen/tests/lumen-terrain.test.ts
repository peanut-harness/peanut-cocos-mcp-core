import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { LumenSession } from '../source/session';
import { LumenTerrainNativeCodec } from '../source/standalone/terrain-native-codec';

/**
 * @description 创建最小 Creator 项目目录。
 * @param prefix 临时目录前缀
 * @returns 项目根
 * @oopException 测试辅助无领域对象归属。
 */
function createProject(prefix: string): string {
    const root = mkdtempSync(join(tmpdir(), prefix));
    mkdirSync(join(root, 'assets'), { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"name":"tmp","creator":{"version":"3.8.7"}}\n');
    return root;
}

/**
 * @description uuid stub for catalog resolve.
 * @param root 项目根
 * @param uuids uuid 列表
 * @oopException 测试辅助。
 */
function plantUuidStubs(root: string, uuids: readonly string[]): void {
    const dir = join(root, 'assets/_uuid-stub');
    mkdirSync(dir, { recursive: true });
    for (const raw of uuids) {
        const uuid = raw.trim();
        const at = uuid.indexOf('@');
        const base = at >= 0 ? uuid.slice(0, at) : uuid;
        const absolute = join(dir, `${base}.txt`);
        writeFileSync(absolute, 'uuid-stub\n');
        writeFileSync(
            `${absolute}.meta`,
            `${JSON.stringify(
                {
                    ver: '1.0.1',
                    importer: 'text',
                    imported: true,
                    uuid: base,
                    files: ['.json'],
                    subMetas: {},
                    userData: {},
                },
                null,
                2,
            )}\n`,
        );
    }
}

test('terrain scaffold writes VERSION8 native and round-trips height ramp', (): void => {
    const root = createProject('lumen-terrain-native-');
    try {
        const session = new LumenSession({ projectRoot: root });
        session.scaffoldPrefab({
            prefabRelativePath: 'assets/land/Field.terrain',
            rootName: 'Field',
            template: 'empty',
        });
        plantUuidStubs(root, ['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee']);
        session.setAssetProperty({
            patch: {
                tileSize: 2,
                blockCount: [1, 1],
                ramp: { axis: 'x', start: 0, end: 8 },
                layerInfos: [
                    {
                        slot: 0,
                        tileSize: 4,
                        detailMap: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
                    },
                ],
            },
        });
        session.save();
        const bytes = readFileSync(join(root, 'assets/land/Field.terrain'));
        assert.equal(bytes[0], 0x08);
        assert.equal(bytes[1], 0x00);
        assert.equal(bytes[2], 0x01);
        assert.equal(bytes[3], 0x01);
        const inspect = new LumenSession({ projectRoot: root });
        inspect.openPrefab('assets/land/Field.terrain');
        const snapshot = inspect.inspectAsset();
        assert.equal(snapshot.kind, 'terrain');
        if (snapshot.kind === 'terrain') {
            assert.equal(snapshot.tileSize, 2);
            assert.deepEqual([...snapshot.blockCount], [1, 1]);
            assert.deepEqual([...snapshot.vertexCount], [33, 33]);
            assert.deepEqual([...snapshot.size], [64, 64]);
            assert.equal(snapshot.heights[0], 0);
            assert.equal(snapshot.heights[32], 8);
            assert.equal(snapshot.heightsOmitted, false);
            assert.equal(snapshot.layout.order, 'rowMajor');
            assert.equal(snapshot.heightMin, 0);
            assert.equal(snapshot.heightMax, 8);
            assert.ok(snapshot.peaks.length > 0);
            assert.equal(snapshot.layerInfos[0]?.detailMap, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
            assert.equal(snapshot.layerInfos[0]?.tileSize, 4);
        }
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('terrain opens legacy JSON and VERSION_DEFAULT then saves native', (): void => {
    const root = createProject('lumen-terrain-legacy-');
    try {
        mkdirSync(join(root, 'assets/land'), { recursive: true });
        writeFileSync(
            join(root, 'assets/land/Legacy.terrain'),
            `${JSON.stringify({
                __type__: 'cc.TerrainAsset',
                _name: 'Legacy',
                _native: '.bin',
                _layerInfos: [
                    {
                        __type__: 'cc.TerrainLayerInfo',
                        slot: 0,
                        tileSize: 2,
                        detailMap: { __uuid__: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' },
                        normalMap: null,
                        roughness: 1,
                        metallic: 0,
                    },
                ],
            })}\n`,
        );
        const jsonSession = new LumenSession({ projectRoot: root });
        jsonSession.openPrefab('assets/land/Legacy.terrain');
        const jsonInspect = jsonSession.inspectAsset();
        assert.equal(jsonInspect.kind, 'terrain');
        if (jsonInspect.kind === 'terrain') {
            assert.equal(jsonInspect.layerInfos[0]?.detailMap, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
        }
        jsonSession.setAssetProperty({ patch: { flatHeight: 3 } });
        jsonSession.save();
        const nativeBytes = readFileSync(join(root, 'assets/land/Legacy.terrain'));
        assert.notEqual(nativeBytes[0], 0x7b);

        const defaultPath = join(root, 'assets/land/Empty.terrain');
        const placeholder = Buffer.alloc(4);
        placeholder.writeInt32LE(0x01010111, 0);
        writeFileSync(defaultPath, placeholder);
        const defaultSession = new LumenSession({ projectRoot: root });
        defaultSession.openPrefab('assets/land/Empty.terrain');
        const defaultInspect = defaultSession.inspectAsset();
        assert.equal(defaultInspect.kind, 'terrain');
        if (defaultInspect.kind === 'terrain') {
            assert.equal(defaultInspect.heights.length, 33 * 33);
            assert.equal(defaultInspect.heights[0], 0);
        }
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('terrain binds to cc.Terrain.asset on Terrain prefab', (): void => {
    const root = createProject('lumen-terrain-bind-');
    try {
        const session = new LumenSession({ projectRoot: root });
        session.scaffoldPrefab({
            prefabRelativePath: 'assets/land/Field.terrain',
            rootName: 'Field',
            template: 'empty',
        });
        session.setAssetProperty({ patch: { flatHeight: 1 } });
        session.save();
        const meta = JSON.parse(readFileSync(join(root, 'assets/land/Field.terrain.meta'), 'utf8')) as {
            uuid?: unknown;
        };
        assert.equal(typeof meta.uuid, 'string');
        const terrainUuid = meta.uuid;
        session.scaffoldPrefab({
            prefabRelativePath: 'assets/land/FieldNode.prefab',
            rootName: 'Field',
            template: 'Terrain',
        });
        session.setComponentProperty({
            nodePath: '/Field',
            componentType: 'cc.Terrain',
            patch: { asset: terrainUuid },
        });
        session.save();
        const inspected = session.inspectNode('/Field');
        const terrain = inspected.components.find((component) => component.type === 'cc.Terrain');
        assert.ok(terrain != null);
        assert.equal(terrain.props.asset, terrainUuid);
        const prefab = JSON.parse(readFileSync(join(root, 'assets/land/FieldNode.prefab'), 'utf8')) as Array<
            Record<string, unknown>
        >;
        const component = prefab.find((entry) => entry.__type__ === 'cc.Terrain');
        assert.ok(component != null);
        const asset = component.__asset;
        assert.ok(asset != null && typeof asset === 'object' && !Array.isArray(asset));
        const assetRecord = asset as { __uuid__?: unknown };
        assert.equal(assetRecord.__uuid__, terrainUuid);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('terrain rejects conflicting height sources', (): void => {
    const root = createProject('lumen-terrain-conflict-');
    try {
        const session = new LumenSession({ projectRoot: root });
        session.scaffoldPrefab({
            prefabRelativePath: 'assets/land/Field.terrain',
            rootName: 'Field',
            template: 'empty',
        });
        assert.throws(
            () =>
                session.setAssetProperty({
                    patch: { flatHeight: 1, ramp: { axis: 'x', start: 0, end: 2 } },
                }),
            /lumen_terrain_height_source_conflict/,
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('terrain region inspect and asset-set write a height window', (): void => {
    const root = createProject('lumen-terrain-region-');
    try {
        const session = new LumenSession({ projectRoot: root });
        session.scaffoldPrefab({
            prefabRelativePath: 'assets/land/Field.terrain',
            rootName: 'Field',
            template: 'empty',
        });
        session.setAssetProperty({ patch: { ramp: { axis: 'x', start: 0, end: 8 } } });
        const windowInspect = session.inspectAsset({ region: { iMin: 14, iMax: 18, jMin: 14, jMax: 18 } });
        assert.equal(windowInspect.kind, 'terrain');
        if (windowInspect.kind !== 'terrain') {
            return;
        }
        assert.equal(windowInspect.heights.length, 25);
        assert.equal(windowInspect.region.iMin, 14);
        assert.equal(windowInspect.heightsOmitted, false);
        const raised = windowInspect.heights.map((height) => height + 2);
        session.setAssetProperty({
            patch: {
                region: { iMin: 14, iMax: 18, jMin: 14, jMax: 18 },
                heights: raised,
            },
        });
        session.setAssetProperty({
            patch: { samples: [{ i: 0, j: 0, height: 1 }] },
        });
        session.save();
        const roundTrip = new LumenSession({ projectRoot: root });
        roundTrip.openPrefab('assets/land/Field.terrain');
        const full = roundTrip.inspectAsset();
        assert.equal(full.kind, 'terrain');
        if (full.kind === 'terrain') {
            assert.equal(full.heights[0], 1);
            const center = 16 * 33 + 16;
            assert.equal(full.heights[32], 8);
            assert.ok(full.heights[center] > 4);
        }
        const circle = roundTrip.inspectAsset({ region: { x: 16, z: 16, radius: 2 } });
        assert.equal(circle.kind, 'terrain');
        if (circle.kind === 'terrain') {
            assert.ok(circle.heights.length > 0);
            assert.ok(circle.heights.length <= 25);
        }
        assert.throws(
            () => session.setAssetProperty({ patch: { region: { iMin: 0, iMax: 1, jMin: 0, jMax: 1 } } }),
            /lumen_terrain_region_needs_heights/,
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('terrain native codec rejects unknown version', (): void => {
    const junk = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    assert.throws(() => LumenTerrainNativeCodec.decode(junk, 'Bad'), /lumen_terrain_corrupt/);
});
