import assert from 'assert/strict';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import test from 'node:test';

import { ProjectPluginFileStore } from 'peanut-packaging';

import { PluginFileStorage } from '../src/shared/plugin-file-storage';

test('plugin file storage should enforce fs spaces while retaining scoped cache access', async (): Promise<void> => {
    const projectPath = mkdtempSync(join(tmpdir(), 'peanut-plugin-file-storage-'));
    try {
        const fileStore = new ProjectPluginFileStore(projectPath);
        const cacheOnlyStorage = new PluginFileStorage('sample.plugin', fileStore, ['plugin_cache']);
        await cacheOnlyStorage.mkdir('cache', 'exports');
        await cacheOnlyStorage.write('cache', 'exports/result.bin', new Uint8Array([1, 2]));
        assert.deepEqual(Array.from((await cacheOnlyStorage.read('cache', 'exports/result.bin')) ?? []), [1, 2]);
        await assert.rejects(cacheOnlyStorage.getLocalSettings(), /plugin_file_space_not_granted:sample.plugin:plugin_data/);

        const dataStorage = new PluginFileStorage('sample.plugin', fileStore, ['plugin_data']);
        await dataStorage.setLocalSettings({ mode: 'draft' });
        assert.deepEqual(await dataStorage.getLocalSettings(), { mode: 'draft' });
        await assert.rejects(dataStorage.list('cache'), /plugin_file_space_not_granted:sample.plugin:plugin_cache/);
    } finally {
        rmSync(projectPath, { recursive: true, force: true });
    }
});
