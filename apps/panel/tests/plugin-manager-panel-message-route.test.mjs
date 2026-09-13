import assert from 'assert/strict';
import { readFileSync } from 'fs';
import path from 'path';
import test from 'node:test';
import { fileURLToPath } from 'url';

const testsDirectory = path.dirname(fileURLToPath(import.meta.url));
const panelEntryPath = path.resolve(testsDirectory, '../panels/plugin-manager/embedded/index.js');

test('plugin manager panel opens generated plugin panels through the stable host message', () => {
    const source = readFileSync(panelEntryPath, 'utf8');

    assert.match(source, /Message\.request\(extensionName, 'open-generated-plugin-panel', pluginId\)/);
    assert.doesNotMatch(source, /createGeneratedPluginPanelMessageName/);
    assert.doesNotMatch(source, /open-generated-plugin-\$\{encodedPluginId\}/);
});
