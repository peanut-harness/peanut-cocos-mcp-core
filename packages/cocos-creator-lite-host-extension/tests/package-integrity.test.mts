import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const { CpmPackageStore } = require('../src/cpm-package-store.js');
const { PluginServiceRegistry } = require('../src/plugin-service-registry.js');
const { SystemProtectedKeyStore } = require('../src/system-protected-key-store.js');

test('CPM store resolves the indexed package and rejects tampering, extra payloads, and invalid paths', () => {
    const temporaryRoot = resolve(import.meta.dirname, '..', '.test-temp');
    mkdirSync(temporaryRoot, { recursive: true });
    const projectRoot = mkdtempSync(join(temporaryRoot, 'pod-lite-integrity-'));
    try {
        const pluginId = 'peanut.pod-lite';
        const version = '0.1.0';
        const relativeInstallPath = join('peanut-plugins', 'plugins', pluginId, version);
        const packageRoot = resolve(projectRoot, relativeInstallPath);
        mkdirSync(join(packageRoot, 'libs'), { recursive: true });
        const bundle = 'module.exports = {};';
        const packageJson = JSON.stringify({ type: 'commonjs' });
        writeFileSync(join(packageRoot, `${pluginId}.bundle.js`), bundle);
        writeFileSync(join(packageRoot, 'package.json'), packageJson);
        writeFileSync(join(packageRoot, 'libs', '.keep'), '');
        const files = [
            { path: `${pluginId}.bundle.js`, digest: createHash('sha256').update(bundle).digest('hex') },
            { path: 'package.json', digest: createHash('sha256').update(packageJson).digest('hex') },
            { path: 'libs/.keep', digest: createHash('sha256').update('').digest('hex') },
        ];
        const manifest = {
            id: pluginId,
            version,
            kind: 'tooling-plugin',
            main: `./${pluginId}.bundle.js`,
            package: {
                schemaVersion: 1,
                files,
                digest: createHash('sha256')
                    .update([...files].sort((left, right) => left.path.localeCompare(right.path)).map((file) => `${file.path}:${file.digest}`).join('\n'))
                    .digest('hex'),
            },
        };
        const manifestPath = join(packageRoot, `${pluginId}.manifest.json`);
        writeFileSync(manifestPath, JSON.stringify(manifest));
        mkdirSync(join(projectRoot, 'peanut-plugins'), { recursive: true });
        writeFileSync(
            join(projectRoot, 'peanut-plugins', 'installed.json'),
            JSON.stringify({
                schemaVersion: 2,
                plugins: [{ pluginId, activeVersion: version, versions: [{ version, installPath: relativeInstallPath }] }],
            }),
        );
        const store = new CpmPackageStore(projectRoot);
        assert.equal(store.resolveActivePackage(pluginId, true).manifest.version, version);
        writeFileSync(join(packageRoot, `${pluginId}.bundle.js`), 'tampered');
        assert.throws(() => store.resolveActivePackage(pluginId, true), /integrity_file_mismatch/u);
        writeFileSync(join(packageRoot, `${pluginId}.bundle.js`), bundle);
        writeFileSync(join(packageRoot, 'unchecked.js'), bundle);
        assert.throws(() => store.resolveActivePackage(pluginId, true), /payload_set_mismatch/u);
        rmSync(join(packageRoot, 'unchecked.js'));
        writeFileSync(manifestPath, JSON.stringify({ ...manifest, main: `./nested/../${pluginId}.bundle.js` }));
        assert.throws(() => store.resolveActivePackage(pluginId, true), /manifest_invalid/u);
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('plugin services inject caller identity and revoke only the owning provider', async () => {
    const registry = new PluginServiceRegistry();
    const provider = registry.createApi('provider.plugin');
    const consumer = registry.createApi('consumer.plugin');
    const dispose = provider.register('echo', async (callerPluginId: string, request: unknown) => ({ callerPluginId, request }));
    assert.deepEqual(await consumer.request('provider.plugin', 'echo', { value: 1 }), {
        callerPluginId: 'consumer.plugin',
        request: { value: 1 },
    });
    assert.deepEqual(registry.list('provider.plugin'), ['echo']);
    dispose();
    await assert.rejects(consumer.request('provider.plugin', 'echo', {}), /service_unavailable/u);
});

test('system key store persists encrypted material and exposes only a non-extractable HMAC key', async () => {
    const temporaryRoot = resolve(import.meta.dirname, '..', '.test-temp');
    mkdirSync(temporaryRoot, { recursive: true });
    const projectRoot = mkdtempSync(join(temporaryRoot, 'protected-key-'));
    const safeStorage = {
        isEncryptionAvailable: () => true,
        getSelectedStorageBackend: () => 'dpapi',
        encryptString: (value: string) => Buffer.from(`encrypted:${value}`, 'utf8'),
        decryptString: (value: Buffer) => value.toString('utf8').slice('encrypted:'.length),
    };
    try {
        const firstStore = new SystemProtectedKeyStore(projectRoot, 'peanut.cocos-mcp-pro', () => safeStorage);
        const first = await firstStore.getOrCreateHmacSha256Key('mcp-plan-digest-v1');
        assert.equal(first, await firstStore.getOrCreateHmacSha256Key('mcp-plan-digest-v1'));
        assert.equal(first.extractable, false);
        assert.equal(first.algorithm.name, 'HMAC');
        assert.deepEqual(first.usages, ['sign']);
        firstStore.clear();
        const secondStore = new SystemProtectedKeyStore(projectRoot, 'peanut.cocos-mcp-pro', () => safeStorage);
        const second = await secondStore.getOrCreateHmacSha256Key('mcp-plan-digest-v1');
        const payload = new TextEncoder().encode('stable');
        assert.deepEqual(
            Buffer.from(await webcrypto.subtle.sign('HMAC', first, payload)),
            Buffer.from(await webcrypto.subtle.sign('HMAC', second, payload)),
        );
        await assert.rejects(secondStore.getOrCreateHmacSha256Key('../escape'), /purpose_invalid/u);
        const insecureStore = new SystemProtectedKeyStore(projectRoot, 'other.plugin', () => ({
            ...safeStorage,
            getSelectedStorageBackend: () => 'basic_text',
        }));
        await assert.rejects(insecureStore.getOrCreateHmacSha256Key('mcp-plan-digest-v1'), /storage_insecure/u);
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});
