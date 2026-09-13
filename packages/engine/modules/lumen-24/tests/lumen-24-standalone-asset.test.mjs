import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { Lumen24StandaloneAsset } from '../dist/lumen-24-standalone-asset.js';

test('Lumen24StandaloneAsset patches 2.4 texture meta', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-standalone-'));
    try {
        mkdirSync(join(projectRoot, 'assets'), { recursive: true });
        const png = 'assets/Probe.png';
        writeFileSync(join(projectRoot, png), 'x');
        writeFileSync(
            join(projectRoot, `${png}.meta`),
            `${JSON.stringify(
                {
                    ver: '2.3.7',
                    uuid: '11111111-1111-1111-1111-111111111111',
                    importer: 'texture',
                    type: 'sprite',
                    wrapMode: 'clamp',
                    filterMode: 'bilinear',
                    premultiplyAlpha: false,
                    genMipmaps: false,
                    packable: true,
                    subMetas: {
                        Probe: {
                            uuid: '22222222-2222-2222-2222-222222222222',
                            importer: 'sprite-frame',
                            trimType: 'auto',
                            width: 10,
                            height: 10,
                        },
                    },
                },
                null,
                2,
            )}\n`,
        );
        const patched = Lumen24StandaloneAsset.assetSet(projectRoot, png, {
            wrapMode: 'repeat',
            spriteFrame: { trimType: 'custom', width: 8 },
        });
        assert.equal(patched.kind, 'texture');
        assert.ok(patched.patched.includes('wrapMode'));
        const meta = JSON.parse(readFileSync(join(projectRoot, `${png}.meta`), 'utf8'));
        assert.equal(meta.wrapMode, 'repeat');
        assert.equal(meta.subMetas.Probe.trimType, 'custom');
        assert.equal(meta.subMetas.Probe.width, 8);
        const inspected = Lumen24StandaloneAsset.inspect(projectRoot, png);
        assert.equal(inspected.kind, 'texture');
        assert.equal(inspected.wrapMode, 'repeat');
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24StandaloneAsset covers 2.4 docs kinds', () => {
    assert.equal(Lumen24StandaloneAsset.detectKind('assets/a.pac'), 'autoAtlas');
    assert.equal(Lumen24StandaloneAsset.detectKind('assets/a.labelatlas'), 'labelAtlas');
    assert.equal(Lumen24StandaloneAsset.detectKind('assets/a.anim'), 'animationClip');
    assert.equal(Lumen24StandaloneAsset.detectKind('assets/a.mtl'), 'material');
    assert.equal(Lumen24StandaloneAsset.detectKind('assets/a.effect'), 'effect');
    assert.equal(Lumen24StandaloneAsset.detectKind('assets/a.pmtl'), 'physicsMaterial');
    assert.equal(Lumen24StandaloneAsset.detectKind('assets/a.mp3'), 'audio');
    assert.equal(Lumen24StandaloneAsset.detectKind('assets/a.mp4'), 'video');
    assert.equal(Lumen24StandaloneAsset.detectKind('assets/a.ttf'), 'ttfFont');
    assert.equal(Lumen24StandaloneAsset.detectKind('assets/a.fnt'), 'bitmapFont');
    assert.equal(Lumen24StandaloneAsset.detectKind('assets/a.plist'), 'particle');
    assert.equal(Lumen24StandaloneAsset.detectKind('assets/a.tmx'), 'tiledMap');
    assert.equal(Lumen24StandaloneAsset.detectKind('assets/a.fbx'), 'model');
    assert.equal(Lumen24StandaloneAsset.detectKind('assets/a.ts'), 'typescript');
});

test('Lumen24StandaloneAsset patches autoAtlas meta and animationClip json', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-standalone2-'));
    try {
        mkdirSync(join(projectRoot, 'assets'), { recursive: true });
        const pac = 'assets/Auto.pac';
        writeFileSync(join(projectRoot, pac), `${JSON.stringify({ __type__: 'cc.SpriteAtlas' }, null, 2)}\n`);
        writeFileSync(
            join(projectRoot, `${pac}.meta`),
            `${JSON.stringify({ ver: '1.2.0', uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', maxWidth: 1024 }, null, 2)}\n`,
        );
        const pacResult = Lumen24StandaloneAsset.assetSet(projectRoot, pac, { maxWidth: 512, padding: 4 });
        assert.equal(pacResult.kind, 'autoAtlas');
        const pacMeta = JSON.parse(readFileSync(join(projectRoot, `${pac}.meta`), 'utf8'));
        assert.equal(pacMeta.maxWidth, 512);
        assert.equal(pacMeta.padding, 4);

        const anim = 'assets/Clip.anim';
        writeFileSync(
            join(projectRoot, anim),
            `${JSON.stringify(
                {
                    __type__: 'cc.AnimationClip',
                    _name: '',
                    _duration: 0,
                    sample: 60,
                    curveData: {},
                    events: [],
                },
                null,
                2,
            )}\n`,
        );
        const animResult = Lumen24StandaloneAsset.assetSet(projectRoot, anim, { sample: 30, _duration: 1 });
        assert.equal(animResult.kind, 'animationClip');
        const animJson = JSON.parse(readFileSync(join(projectRoot, anim), 'utf8'));
        assert.equal(animJson.sample, 30);
        assert.equal(animJson._duration, 1);
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24StandaloneAsset creates missing body assets on assetSet', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-create-'));
    try {
        const jsonPath = 'assets/kinds/new-config.json';
        const created = Lumen24StandaloneAsset.assetSet(projectRoot, jsonPath, {
            json: { wave: 'C', created: true },
        });
        assert.equal(created.kind, 'json');
        assert.ok(existsSync(join(projectRoot, jsonPath)));
        const body = JSON.parse(readFileSync(join(projectRoot, jsonPath), 'utf8'));
        assert.equal(body.wave, 'C');
        assert.throws(
            () => Lumen24StandaloneAsset.assetSet(projectRoot, 'assets/kinds/nope.png', { packable: true }),
            /lumen_24_asset_missing/,
        );
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});
