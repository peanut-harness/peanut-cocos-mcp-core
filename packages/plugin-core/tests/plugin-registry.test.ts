import assert from 'assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import test from 'node:test';

import { SamplePluginModule } from '../src/integration/sample-plugin-module';
import { PluginRegistry } from '../src/registry/plugin-registry';

const PNG_ICON_CONTENT = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1zQAAAABJRU5ErkJggg==', 'base64');

test('plugin registry should expose a verified plugin icon as an inline PNG data URL', (): void => {
    const pluginInstallPath = mkdtempSync(join(tmpdir(), 'peanut-plugin-registry-icon-'));
    const pluginRegistry = new PluginRegistry();
    const samplePluginModule = new SamplePluginModule();
    const manifest = { ...samplePluginModule.manifest, icon: './assets/icon.png' as const };
    const iconPath = join(pluginInstallPath, 'assets', 'icon.png');
    mkdirSync(join(pluginInstallPath, 'assets'), { recursive: true });
    writeFileSync(iconPath, PNG_ICON_CONTENT);

    try {
        pluginRegistry.registerManifest({
            manifest,
            installPath: pluginInstallPath,
        });

        const iconUrl = pluginRegistry.getRuntimeRecord(manifest.id)?.iconUrl;
        assert.equal(iconUrl?.startsWith('data:image/png;base64,'), true);
        assert.deepEqual(Buffer.from(iconUrl?.slice('data:image/png;base64,'.length) ?? '', 'base64'), PNG_ICON_CONTENT);
    } finally {
        rmSync(pluginInstallPath, { recursive: true, force: true });
    }
});

test('plugin registry should reject an icon that does not contain a PNG signature', (): void => {
    const pluginInstallPath = mkdtempSync(join(tmpdir(), 'peanut-plugin-registry-invalid-icon-'));
    const pluginRegistry = new PluginRegistry();
    const samplePluginModule = new SamplePluginModule();
    const manifest = { ...samplePluginModule.manifest, icon: './assets/icon.png' as const };
    const iconPath = join(pluginInstallPath, 'assets', 'icon.png');
    mkdirSync(join(pluginInstallPath, 'assets'), { recursive: true });
    writeFileSync(iconPath, 'not-a-png', 'utf8');

    try {
        pluginRegistry.registerManifest({
            manifest,
            installPath: pluginInstallPath,
        });

        assert.equal(pluginRegistry.getRuntimeRecord(manifest.id)?.iconUrl, undefined);
    } finally {
        rmSync(pluginInstallPath, { recursive: true, force: true });
    }
});
