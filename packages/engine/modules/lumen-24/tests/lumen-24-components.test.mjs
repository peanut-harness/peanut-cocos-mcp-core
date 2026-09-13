import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { Lumen24Session } from '../dist/lumen-24-session.js';

test('Lumen24 component slice: Sprite/Label/Button + bindSprite + compSet/Rm', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-comp-'));
    try {
        const session = new Lumen24Session(projectRoot);
        session.scaffoldPrefab({
            prefabRelativePath: 'assets/comp/Root.prefab',
            rootName: 'Root',
        });
        session.attachBuiltinComponent('Root', 'cc.Sprite');
        session.attachBuiltinComponent('Root', 'Label');
        session.setComponentProps('Root', 'cc.Label', { string: 'Hello24', fontSize: 28 });
        session.bindSpriteFrame('Root', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
        const inspect = session.inspectNode('Root');
        assert.deepEqual(inspect.components.sort(), ['cc.Label', 'cc.Sprite']);
        const raw = JSON.parse(readFileSync(join(projectRoot, 'assets/comp/Root.prefab'), 'utf8'));
        const sprite = raw.find((e) => e && e.__type__ === 'cc.Sprite');
        const label = raw.find((e) => e && e.__type__ === 'cc.Label');
        assert.equal(sprite._srcBlendFactor, 770);
        // document-level may write raw uuid; facade guard refuses unknown meta
        assert.equal(sprite._spriteFrame.__uuid__, 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
        assert.equal(label._N$string, 'Hello24');
        assert.equal(label._fontSize, 28);
        assert.equal(Object.prototype.hasOwnProperty.call(sprite, '__prefab'), false);
        session.attachBuiltinComponent('Root', 'cc.Button');
        const withButton = JSON.parse(readFileSync(join(projectRoot, 'assets/comp/Root.prefab'), 'utf8'));
        const button = withButton.find((e) => e && e.__type__ === 'cc.Button');
        const rootNodeIndex = withButton.findIndex((e) => e && e.__type__ === 'cc.Node' && e._name === 'Root');
        const prefabInfoIndex = withButton.findIndex((e) => e && e.__type__ === 'cc.PrefabInfo');
        assert.ok(rootNodeIndex >= 0);
        assert.equal(button.node.__id__, rootNodeIndex);
        assert.equal(button._N$target.__id__, rootNodeIndex);
        assert.notEqual(button._N$target.__id__, prefabInfoIndex);
        session.removeComponent('Root', 'cc.Button');
        assert.equal(session.inspectNode('Root').components.includes('cc.Button'), false);
        assert.throws(() => session.attachBuiltinComponent('Root', 'cc.UITransform'), /uitransform/);
        session.attachBuiltinComponent('Root', 'cc.Widget');
        assert.ok(session.inspectNode('Root').components.includes('cc.Widget'));
        session.attachBuiltinComponent('Root', 'cc.RichText');
        session.attachBuiltinComponent('Root', 'cc.ProgressBar');
        session.attachBuiltinComponent('Root', 'cc.EditBox');
        session.attachBuiltinComponent('Root', 'cc.ScrollView');
        session.attachBuiltinComponent('Root', 'cc.Graphics');
        session.attachBuiltinComponent('Root', 'cc.LabelOutline');
        session.attachBuiltinComponent('Root', 'cc.BlockInputEvents');
        session.setComponentProps('Root', 'cc.RichText', { string: '<b>WaveE</b>', fontSize: 22 });
        session.setComponentProps('Root', 'cc.LabelOutline', { width: 2 });
        session.setComponentProps('Root', 'cc.Graphics', { lineWidth: 3 });
        session.setComponentProps('Root', 'cc.ProgressBar', { progress: 0.42 });
        session.setComponentProps('Root', 'cc.Widget', {
            isAlignTop: true,
            isAlignBottom: true,
            isAlignLeft: true,
            isAlignRight: true,
            top: 8,
        });
        const after = JSON.parse(readFileSync(join(projectRoot, 'assets/comp/Root.prefab'), 'utf8'));
        const rich = after.find((e) => e && e.__type__ === 'cc.RichText');
        const progress = after.find((e) => e && e.__type__ === 'cc.ProgressBar');
        const widget = after.find((e) => e && e.__type__ === 'cc.Widget');
        const editBox = after.find((e) => e && e.__type__ === 'cc.EditBox');
        const scroll = after.find((e) => e && e.__type__ === 'cc.ScrollView');
        const graphics = after.find((e) => e && e.__type__ === 'cc.Graphics');
        const outline = after.find((e) => e && e.__type__ === 'cc.LabelOutline');
        const block = after.find((e) => e && e.__type__ === 'cc.BlockInputEvents');
        assert.equal(rich._N$string, '<b>WaveE</b>');
        assert.equal(rich._N$fontSize, 22);
        assert.equal(progress._N$progress, 0.42);
        assert.equal(progress._N$barSprite, null);
        assert.equal(widget._alignFlags, 45);
        assert.equal(widget._top, 8);
        assert.equal(editBox._N$textLabel, null);
        assert.equal(editBox._N$placeholderLabel, null);
        assert.equal(editBox._N$background, null);
        assert.equal(scroll._N$content, null);
        assert.equal(scroll.content, null);
        assert.equal(graphics._lineWidth, 3);
        assert.equal(outline._width, 2);
        assert.equal(block._enabled, true);
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});
