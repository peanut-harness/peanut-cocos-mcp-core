import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { Lumen24EditorAssetDb } from '../dist/lumen-24-editor-assetdb.js';
import { Lumen24Session } from '../dist/lumen-24-session.js';
import { Lumen24Templates } from '../dist/lumen-24-templates.js';
import { Lumen24WriteFacade } from '../dist/lumen-24-write-facade.js';

/**
 * @description 离线 AssetDB。
 * @returns AssetDB
 */
function mockAssetDb() {
    return new Lumen24EditorAssetDb({
        exists: () => false,
        createOrSave: (_url, _data, cb) => cb?.(null),
        refresh: (_url, cb) => cb?.(null),
    });
}

test('Lumen24 scaffold button clones official multi-node tree', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-btn-tree-'));
    try {
        const facade = new Lumen24WriteFacade(projectRoot, mockAssetDb());
        await facade.scaffoldPrefab({
            prefabRelativePath: 'assets/ui/ScaffoldButton.prefab',
            rootName: 'ScaffoldButton',
            template: 'button',
        });
        const session = new Lumen24Session(projectRoot);
        session.openPrefab('assets/ui/ScaffoldButton.prefab');
        const root = session.inspectNode('ScaffoldButton');
        assert.ok(root.components.includes('cc.Button'));
        assert.ok(root.childNames.includes('Background'));
        assert.ok(root.childNames.includes('Label') || root.childNames.length >= 1);
        const raw = JSON.parse(readFileSync(join(projectRoot, 'assets/ui/ScaffoldButton.prefab'), 'utf8'));
        const button = raw.find((entry) => entry && entry.__type__ === 'cc.Button');
        const targetId = button._N$target.__id__;
        assert.equal(raw[targetId].__type__, 'cc.Node');
        assert.notEqual(raw[targetId].__type__, 'cc.PrefabInfo');
        const fileIds = raw.filter((entry) => entry && entry.__type__ === 'cc.PrefabInfo').map((entry) => entry.fileId);
        assert.equal(new Set(fileIds).size, fileIds.length);
        for (const info of raw.filter((entry) => entry && entry.__type__ === 'cc.PrefabInfo')) {
            assert.equal(info.asset, null);
        }
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24 scaffold editbox wires Label/Sprite refs inside tree', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-edit-tree-'));
    try {
        const facade = new Lumen24WriteFacade(projectRoot, mockAssetDb());
        await facade.scaffoldPrefab({
            prefabRelativePath: 'assets/ui/Edit.prefab',
            rootName: 'Edit',
            template: 'ui/editbox',
        });
        const raw = JSON.parse(readFileSync(join(projectRoot, 'assets/ui/Edit.prefab'), 'utf8'));
        const editBox = raw.find((entry) => entry && entry.__type__ === 'cc.EditBox');
        assert.ok(editBox);
        for (const field of ['_N$textLabel', '_N$placeholderLabel', '_N$background']) {
            const ref = editBox[field];
            assert.equal(typeof ref.__id__, 'number');
            const target = raw[ref.__id__];
            assert.ok(target);
            assert.notEqual(target.__type__, 'cc.PrefabInfo');
            assert.notEqual(target.__type__, 'cc.Node');
        }
        assert.equal(raw[editBox._N$textLabel.__id__].__type__, 'cc.Label');
        assert.equal(raw[editBox._N$placeholderLabel.__id__].__type__, 'cc.Label');
        assert.equal(raw[editBox._N$background.__id__].__type__, 'cc.Sprite');
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24 nodeAdd editbox under empty root embeds full tree', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-embed-edit-'));
    try {
        const facade = new Lumen24WriteFacade(projectRoot, mockAssetDb());
        await facade.scaffoldPrefab({ prefabRelativePath: 'assets/ui/Root.prefab', rootName: 'Root' });
        await facade.nodeAdd('assets/ui/Root.prefab', 'Root', 'Input', 'editbox');
        const session = new Lumen24Session(projectRoot);
        session.openPrefab('assets/ui/Root.prefab');
        const input = session.inspectNode('Root/Input');
        assert.ok(input.components.includes('cc.EditBox'));
        assert.ok(input.childNames.length >= 2);
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24Templates resolves Creator 2.4 bundle root', () => {
    const root = Lumen24Templates.templateRoot();
    assert.ok(root.includes('default_prefab_24'));
    assert.equal(Lumen24Templates.normalize('ui/Button'), 'ui/button');
    assert.equal(Lumen24Templates.normalize('EditBox'), 'editbox');
});
