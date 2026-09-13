import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { Lumen24EditorAssetDb } from '../dist/lumen-24-editor-assetdb.js';
import { Lumen24Session } from '../dist/lumen-24-session.js';
import { Lumen24UuidCodec } from '../dist/lumen-24-uuid-codec.js';
import { Lumen24WriteFacade } from '../dist/lumen-24-write-facade.js';

/**
 * @description 离线测试用空 AssetDB。
 * @returns AssetDB
 */
function mockAssetDb() {
    return new Lumen24EditorAssetDb({
        exists: () => false,
        createOrSave: (_url, _data, cb) => cb?.(null),
        refresh: (_url, cb) => cb?.(null),
    });
}

test('Lumen24UuidCodec compresses like engine', () => {
    const codec = new Lumen24UuidCodec();
    assert.equal(codec.compress('79507851-d12b-4e25-adc1-31f29ea29cc6'), '79507hR0StOJa3BMfKeopzG');
});

test('Lumen24 script attach + bindClick use _componentId', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-script-'));
    try {
        mkdirSync(join(projectRoot, 'assets/scripts'), { recursive: true });
        const uuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
        writeFileSync(join(projectRoot, 'assets/scripts/WaveHandler.js'), 'cc.Class({ extends: cc.Component, onClick() {} });\n');
        writeFileSync(
            join(projectRoot, 'assets/scripts/WaveHandler.js.meta'),
            JSON.stringify({ ver: '1.0.0', uuid, importer: 'javascript', imported: true }),
            'utf8',
        );
        const facade = new Lumen24WriteFacade(projectRoot, mockAssetDb());
        await facade.scaffoldPrefab({
            prefabRelativePath: 'assets/scripts/Root.prefab',
            rootName: 'Root',
            template: 'button',
        });
        const add = await facade.compAdd('assets/scripts/Root.prefab', 'Root', undefined, 'assets/scripts/WaveHandler.js');
        assert.equal(add.componentType, new Lumen24UuidCodec().compress(uuid));
        const bind = await facade.bindClick(
            'assets/scripts/Root.prefab',
            'Root',
            'Root',
            'WaveHandler',
            'onClick',
            'x',
        );
        assert.equal(bind.componentId, add.componentType);
        const raw = JSON.parse(readFileSync(join(projectRoot, 'assets/scripts/Root.prefab'), 'utf8'));
        const click = raw.find((e) => e && e.__type__ === 'cc.ClickEvent');
        assert.equal(click._componentId, add.componentType);
        assert.equal(click.handler, 'onClick');
        assert.equal(click.customEventData, 'x');
        const button = raw.find((e) => e && e.__type__ === 'cc.Button');
        assert.equal(button.clickEvents[0].__id__, bind.clickEventIndex);
        const inspect = new Lumen24Session(projectRoot).openPrefab('assets/scripts/Root.prefab').inspectNode('Root');
        assert.ok(inspect.components.includes('cc.Button'));
        assert.ok(inspect.components.includes(add.componentType));
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24 nodeAdd template sprite attaches cc.Sprite', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-tpl-'));
    try {
        const facade = new Lumen24WriteFacade(projectRoot, mockAssetDb());
        await facade.scaffoldPrefab({ prefabRelativePath: 'assets/t/Root.prefab', rootName: 'Root' });
        await facade.nodeAdd('assets/t/Root.prefab', 'Root', 'Icon', 'sprite');
        const node = new Lumen24Session(projectRoot).openPrefab('assets/t/Root.prefab').inspectNode('Root/Icon');
        assert.deepEqual(node.components, ['cc.Sprite']);
        const listed = facade.listTemplates();
        assert.ok(listed.count >= 20);
        assert.ok(listed.templates.some((entry) => entry.id === 'empty'));
        assert.ok(listed.templates.some((entry) => entry.id === 'button' || entry.id === 'ui/button'));
        assert.ok(listed.templates.some((entry) => entry.id === 'editbox' || entry.id === 'ui/editbox'));
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24 bindSprite refuses uuid missing from assets meta', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-sf-'));
    try {
        const facade = new Lumen24WriteFacade(projectRoot, mockAssetDb());
        await facade.scaffoldPrefab({ prefabRelativePath: 'assets/t/Root.prefab', rootName: 'Root', template: 'sprite' });
        await assert.rejects(
            () =>
                facade.bindSprite(
                    'assets/t/Root.prefab',
                    'Root',
                    'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
                ),
            /lumen_24_sprite_frame_uuid_missing_in_meta/,
        );
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});
