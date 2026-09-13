import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { Lumen24Session } from '../dist/lumen-24-session.js';
import { Lumen24ValidateRefs } from '../dist/lumen-24-validate-refs.js';

test('Lumen24ValidateRefs ok when no external uuids', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-vrefs-'));
    try {
        const session = new Lumen24Session(projectRoot);
        session.scaffoldPrefab({
            prefabRelativePath: 'assets/v/Root.prefab',
            rootName: 'Root',
        });
        const result = new Lumen24ValidateRefs().validate(projectRoot, 'assets/v/Root.prefab');
        assert.equal(result.ok, true);
        assert.equal(result.phase, 'creator_2x');
        assert.equal(result.missing.length, 0);
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24ValidateRefs reports missing uuid', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-vrefs-miss-'));
    try {
        mkdirSync(join(projectRoot, 'assets/v'), { recursive: true });
        const bogus = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
        writeFileSync(
            join(projectRoot, 'assets/v/Broken.prefab'),
            JSON.stringify([
                {
                    __type__: 'cc.Prefab',
                    _name: 'Broken',
                    data: { __id__: 1 },
                },
                {
                    __type__: 'cc.Node',
                    _name: 'Root',
                    _components: [],
                    _children: [],
                    _prefab: { __id__: 2 },
                    _trs: { array: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1] },
                    _contentSize: { __type__: 'cc.Size', width: 0, height: 0 },
                    _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 },
                    _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
                    _opacity: 255,
                    _objFlags: 0,
                    _parent: null,
                    _id: '',
                },
                {
                    __type__: 'cc.PrefabInfo',
                    root: { __id__: 1 },
                    asset: { __id__: 0 },
                    fileId: 'root',
                    sync: false,
                },
                {
                    __type__: 'cc.Sprite',
                    node: { __id__: 1 },
                    _spriteFrame: { __uuid__: bogus },
                },
            ]),
            'utf8',
        );
        writeFileSync(
            join(projectRoot, 'assets/v/Broken.prefab.meta'),
            JSON.stringify({ uuid: '11111111-2222-3333-4444-555555555555', importer: 'prefab' }),
            'utf8',
        );
        const result = new Lumen24ValidateRefs().validate(projectRoot, 'assets/v/Broken.prefab');
        assert.equal(result.ok, false);
        assert.equal(result.missing.some((m) => m.uuid === bogus), true);
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});
