import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { Lumen24EditorAssetDb } from '../dist/lumen-24-editor-assetdb.js';
import { Lumen24PrefabDocument, Lumen24Session, Lumen24WriteFacade } from '../dist/index.js';

test('Lumen24PrefabDocument.createEmptyScene matches 2.4 new-scene shape', () => {
    const root = mkdtempSync(join(tmpdir(), 'lumen24-fire-'));
    try {
        const doc = Lumen24PrefabDocument.createEmptyScene('assets/probe/Main.fire', 'Main');
        doc.save(root);
        const raw = JSON.parse(readFileSync(join(root, 'assets/probe/Main.fire'), 'utf8'));
        assert.equal(raw[0].__type__, 'cc.SceneAsset');
        assert.equal(raw[1].__type__, 'cc.Scene');
        assert.equal(raw[1]._name, 'Main');
        assert.equal(raw[2].__type__, 'cc.Node');
        assert.equal(raw[2]._name, 'Canvas');
        assert.equal(raw[2]._prefab, null);
        assert.ok(raw.some((entry) => entry.__type__ === 'cc.Camera'));
        assert.ok(raw.some((entry) => entry.__type__ === 'cc.Canvas'));
        assert.ok(raw.some((entry) => entry.__type__ === 'cc.Widget'));
        assert.equal(Object.prototype.hasOwnProperty.call(raw[1], '_globals'), false);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('Lumen24Session .fire scaffold + tree/nodeAdd under Canvas', async () => {
    const root = mkdtempSync(join(tmpdir(), 'lumen24-fire-session-'));
    try {
        const session = new Lumen24Session(root);
        const path = session.scaffoldPrefab({
            prefabRelativePath: 'assets/scenes/Lobby.fire',
            rootName: 'Lobby',
        });
        assert.equal(path, 'assets/scenes/Lobby.fire');
        const tree = session.inspectTree();
        assert.equal(tree.name, 'Lobby');
        assert.equal(tree.children[0]?.name, 'Canvas');
        assert.equal(tree.children[0]?.children[0]?.name, 'Main Camera');

        const child = session.addEmptyChild('Lobby/Canvas', 'Panel');
        assert.equal(child, 'Lobby/Canvas/Panel');
        const entries = session.cloneEntries();
        const panel = entries.find((entry) => entry.__type__ === 'cc.Node' && entry._name === 'Panel');
        assert.ok(panel);
        assert.equal(panel._prefab, null);
        assert.ok(!entries.some((entry) => entry.__type__ === 'cc.PrefabInfo'));

        assert.throws(() => session.attachBuiltinComponent('Lobby', 'cc.Sprite'), /lumen_24_cannot_attach_on_scene/);
        session.attachBuiltinComponent('Lobby/Canvas/Panel', 'cc.Sprite');
        assert.ok(session.cloneEntries().some((entry) => entry.__type__ === 'cc.Sprite'));
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('Lumen24Session .fire nodeAdd sprite template wires parent._children', () => {
    const root = mkdtempSync(join(tmpdir(), 'lumen24-fire-sprite-embed-'));
    try {
        const session = new Lumen24Session(root);
        session.scaffoldPrefab({
            prefabRelativePath: 'assets/scenes/C1.fire',
            rootName: 'C1Scene',
        });
        const path = session.addChild('C1Scene/Canvas', 'Panel', 'sprite');
        assert.equal(path, 'C1Scene/Canvas/Panel');
        // 回归：unpackEmbeddedForScene compact 后不得丢挂接（否则 findNodeIndex 报 child_missing）。
        assert.equal(session.inspectNode('C1Scene/Canvas/Panel').name, 'Panel');
        const tree = session.inspectTree();
        const canvas = tree.children.find((child) => child.name === 'Canvas');
        assert.ok(canvas?.children.some((child) => child.name === 'Panel'));
        assert.ok(session.cloneEntries().some((entry) => entry.__type__ === 'cc.Sprite'));
        assert.ok(!session.cloneEntries().some((entry) => entry.__type__ === 'cc.PrefabInfo'));
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('Lumen24WriteFacade.scaffoldPrefab .fire returns kind scene', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-fire-facade-'));
    try {
        const assetDb = new Lumen24EditorAssetDb({
            exists: () => false,
            createOrSave: (_url, _data, cb) => {
                cb?.(null);
            },
            refresh: (_url, cb) => {
                cb?.(null);
            },
        });
        const facade = new Lumen24WriteFacade(projectRoot, assetDb);
        const result = await facade.scaffoldPrefab({
            prefabRelativePath: 'assets/scenes/Empty.fire',
            rootName: 'Empty',
        });
        assert.equal(result.kind, 'scene');
        assert.equal(result.template, 'scene/new-scene');
        const tree = facade.tree(result.prefab);
        assert.equal(tree.kind, 'scene');
        assert.equal(tree.tree.name, 'Empty');
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('open official-shaped .fire without Scene._name synthesizes New Node', () => {
    const root = mkdtempSync(join(tmpdir(), 'lumen24-fire-open-'));
    try {
        const entries = Lumen24PrefabDocument.createEmptyScene('assets/a.fire', 'Temp').entries.map((entry) => ({ ...entry }));
        delete entries[1]._name;
        mkdirSync(join(root, 'assets'), { recursive: true });
        writeFileSync(join(root, 'assets/a.fire'), `${JSON.stringify(entries, null, 2)}\n`);
        const opened = Lumen24PrefabDocument.open(root, 'assets/a.fire');
        assert.equal(opened.kind, 'scene');
        assert.equal(opened.inspectTree().name, 'New Node');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
