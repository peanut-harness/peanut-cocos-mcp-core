import assert from 'assert/strict';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import test from 'node:test';
import { pathToFileURL } from 'url';

import type { IPluginManifest } from 'peanut-contracts';

import { NodePluginPackageModuleResolver } from '../src/loader/node-plugin-package-module-resolver';

test('node package module resolver should load an installed absolute-path ESM entry', async (): Promise<void> => {
    const packageDirectory = await mkdtemp(join(tmpdir(), 'peanut-plugin-module-resolver-'));
    const pluginId = 'resolver.absolute-path.plugin';
    const manifest = {
        id: pluginId,
        version: '0.1.0',
        main: './plugin.mjs',
    } as IPluginManifest;
    try {
        await writeFile(
            join(packageDirectory, 'plugin.mjs'),
            `export function createPluginModule() {
                return {
                    manifest: { id: ${JSON.stringify(pluginId)}, version: '0.1.0' },
                    async register() {},
                    async activate() {},
                    async deactivate() {},
                    async dispose() {},
                };
            }
            `,
            'utf8',
        );

        const resolver = new NodePluginPackageModuleResolver();
        const pluginModule = await resolver.resolve(packageDirectory, manifest);

        assert.equal(pluginModule.manifest.id, pluginId);
        assert.equal(pluginModule.manifest.version, '0.1.0');
    } finally {
        await rm(packageDirectory, { recursive: true, force: true });
    }
});

test('node package module resolver should load an installed CommonJS entry without a file URL reload query', async (): Promise<void> => {
    const packageDirectory = await mkdtemp(join(tmpdir(), 'peanut-plugin-module-resolver-cjs-'));
    const pluginId = 'resolver.commonjs.plugin';
    const manifest = {
        id: pluginId,
        version: '0.1.0',
        main: './plugin.cjs',
    } as IPluginManifest;
    try {
        await writeFile(
            join(packageDirectory, 'plugin.cjs'),
            `module.exports.createPluginModule = () => ({
                manifest: { id: ${JSON.stringify(pluginId)}, version: '0.1.0' },
                async register() {},
                async activate() {},
                async deactivate() {},
                async dispose() {},
            });
            `,
            'utf8',
        );

        const resolver = new NodePluginPackageModuleResolver();
        const pluginModule = await resolver.resolve(packageDirectory, manifest);

        assert.equal(pluginModule.manifest.id, pluginId);
        assert.equal(pluginModule.manifest.version, '0.1.0');
    } finally {
        await rm(packageDirectory, { recursive: true, force: true });
    }
});

test('node package module resolver should use filesystem paths inside Electron and file URLs in Node ESM', (): void => {
    const entryPath = join(tmpdir(), 'peanut.ui-prefab.bundle.js');
    assert.equal(NodePluginPackageModuleResolver.toImportSpecifier(entryPath, '22.3.0'), entryPath);
    assert.equal(NodePluginPackageModuleResolver.toImportSpecifier(entryPath), pathToFileURL(entryPath).href);
});

test('node package module resolver should reload an installed CommonJS bundle after its content changes on disk', async (): Promise<void> => {
    const packageDirectory = await mkdtemp(join(tmpdir(), 'peanut-plugin-module-resolver-reload-'));
    const pluginId = 'resolver.reload.plugin';
    const manifest = {
        id: pluginId,
        version: '0.1.0',
        main: './plugin.cjs',
    } as IPluginManifest;
    const pluginPath = join(packageDirectory, 'plugin.cjs');
    const writePlugin = async (marker: string): Promise<void> => {
        await writeFile(
            pluginPath,
            `module.exports.createPluginModule = () => ({
                manifest: { id: ${JSON.stringify(pluginId)}, version: '0.1.0' },
                async register() {},
                async activate() {},
                async deactivate() {},
                async dispose() {},
                marker: ${JSON.stringify(marker)},
            });
            `,
            'utf8',
        );
    };
    try {
        const resolver = new NodePluginPackageModuleResolver();
        await writePlugin('first');
        const firstModule = (await resolver.resolve(packageDirectory, manifest)) as { marker?: string };
        assert.equal(firstModule.marker, 'first');

        await writePlugin('second');
        const reloadedModule = (await resolver.resolve(packageDirectory, manifest)) as { marker?: string };
        assert.equal(reloadedModule.marker, 'second', 'reload must read the updated bundle from disk instead of the stale require cache');
    } finally {
        await rm(packageDirectory, { recursive: true, force: true });
    }
});
