import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { Lumen24PrefabDocument, Lumen24Session, Lumen24WriteGate } from '../dist/index.js';

test('Lumen24WriteGate marks scaffold ready', () => {
    const status = Lumen24WriteGate.status();
    assert.equal(status.ready, true);
    assert.equal(status.writes, 'prefab_scene_standalone_preview_slice');
    Lumen24WriteGate.assertReady('scaffoldPrefab');
    Lumen24WriteGate.assertReady('scaffoldScene');
    Lumen24WriteGate.assertReady('addEmptyChild');
    Lumen24WriteGate.assertReady('attachBuiltinComponent');
    Lumen24WriteGate.assertReady('bindClickEvent');
    Lumen24WriteGate.assertReady('bindRef');
    Lumen24WriteGate.assertReady('structure');
    Lumen24WriteGate.assertReady('compileRecipe');
    assert.deepEqual([...status.pendingWaveC], []);
    assert.doesNotThrow(() => Lumen24WriteGate.assertReady('assetSet'));
    assert.doesNotThrow(() => Lumen24WriteGate.assertReady('bindController'));
    assert.throws(() => Lumen24WriteGate.assertReady('notARealOp'), /not_implemented/);
});

test('Lumen24PrefabDocument.createEmpty writes 2.4 shaped JSON', () => {
    const root = mkdtempSync(join(tmpdir(), 'lumen24-prefab-'));
    try {
        const doc = Lumen24PrefabDocument.createEmpty('assets/probe/Empty.prefab', 'Empty');
        doc.save(root);
        const raw = JSON.parse(readFileSync(join(root, 'assets/probe/Empty.prefab'), 'utf8'));
        assert.equal(Array.isArray(raw), true);
        assert.equal(raw[0].__type__, 'cc.Prefab');
        assert.equal(raw[0].readonly, false);
        assert.equal(raw[1].__type__, 'cc.Node');
        assert.ok(raw[1]._trs);
        assert.equal(raw[1]._components.length, 0);
        assert.equal(raw[2].__type__, 'cc.PrefabInfo');
        assert.equal(Object.prototype.hasOwnProperty.call(raw[1], '_lpos'), false);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('Lumen24Session.scaffoldPrefab creates prefab under assets/', () => {
    const root = mkdtempSync(join(tmpdir(), 'lumen24-session-'));
    try {
        const session = new Lumen24Session(root);
        const path = session.scaffoldPrefab({
            prefabRelativePath: 'assets/peanut-write-probe/Empty.prefab',
            rootName: 'Empty',
        });
        assert.equal(path, 'assets/peanut-write-probe/Empty.prefab');
        assert.equal(session.openedPrefabPath, path);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('Lumen24Session bindRef + buildFromRecipe + memory compile', async () => {
    const { Lumen24RecipeMemoryCompiler } = await import('../dist/index.js');
    const root = mkdtempSync(join(tmpdir(), 'lumen24-b3-'));
    try {
        const session = new Lumen24Session(root);
        const prefab = session.scaffoldPrefab({
            prefabRelativePath: 'assets/probe/B3.prefab',
            rootName: 'Root',
        });
        session.openPrefab(prefab);
        session.attachBuiltinComponent('Root', 'cc.Button');
        const created = session.buildFromRecipe('Root', [
            { name: 'Title', template: 'ui/Label', props: { string: 'hi' } },
            { name: 'Icon', template: 'sprite' },
        ]);
        assert.deepEqual(created, ['Root/Title', 'Root/Icon']);
        const titleIndex = session.cloneEntries().findIndex((entry) => entry.__type__ === 'cc.Node' && entry._name === 'Title');
        assert.ok(titleIndex >= 0);
        session.bindRef('Root', 'cc.Button', 'target', { kind: 'node', index: titleIndex });
        const buttonEntry = session.cloneEntries().find((entry) => entry.__type__ === 'cc.Button');
        assert.ok(buttonEntry);
        assert.equal(buttonEntry._N$target?.__id__, titleIndex);
        assert.equal(buttonEntry.target, undefined);

        const compiled = new Lumen24RecipeMemoryCompiler().compile({
            prefabRelativePath: 'assets/mem/Mem.prefab',
            rootName: 'Root',
            mode: 'appendChildren',
            recipes: [{ name: 'Child', template: 'label' }],
        });
        assert.ok(compiled.entries.length >= 4);
        assert.ok(compiled.entries.some((entry) => entry.__type__ === 'cc.Label'));

        const replaced = new Lumen24RecipeMemoryCompiler().compile({
            prefabRelativePath: 'assets/mem/Root.prefab',
            rootName: 'Root',
            mode: 'replaceRoot',
            recipe: { name: 'Root', components: ['cc.Sprite'] },
        });
        assert.ok(replaced.entries.some((entry) => entry.__type__ === 'cc.Sprite'));
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
