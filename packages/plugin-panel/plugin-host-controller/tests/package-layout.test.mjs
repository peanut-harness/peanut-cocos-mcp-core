import assert from 'assert/strict';
import { createHash } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import test from 'node:test';
import { fileURLToPath } from 'url';

const pluginDirectory = resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageDirectory = resolve(pluginDirectory, 'release/peanut.plugin-host-controller-0.1.0');
const manifestPath = resolve(packageDirectory, 'peanut.plugin-host-controller.manifest.json');

test('Plugin Host Controller release package should expose its host bridge and integrity manifest', () => {
    assert.equal(existsSync(packageDirectory), true, 'run npm run pack:plugin-host-controller before package verification');
    assert.equal(existsSync(resolve(packageDirectory, 'peanut.plugin-host-controller.bundle.js')), true);
    assert.equal(existsSync(resolve(packageDirectory, 'peanut.plugin-host-controller.panel-bridge.cjs')), true);
    assert.equal(existsSync(resolve(packageDirectory, 'panels/embedded/index.html')), true);
    assert.equal(existsSync(resolve(packageDirectory, 'package.json')), true);
    assert.equal(existsSync(manifestPath), true);

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.equal(manifest.id, 'peanut.plugin-host-controller');
    assert.equal(manifest.main, './peanut.plugin-host-controller.bundle.js');
    assert.equal(manifest.panelBridge, './peanut.plugin-host-controller.panel-bridge.cjs');
    assert.equal(manifest.package.files.some((file) => file.path === 'peanut.plugin-host-controller.bundle.js'), true);
    assert.equal(manifest.package.files.some((file) => file.path === 'peanut.plugin-host-controller.panel-bridge.cjs'), true);
    assert.equal(manifest.package.files.some((file) => file.path === 'panels/embedded/index.html'), true);
    assert.equal(manifest.package.files.some((file) => file.path === 'panels/embedded/index.js'), true);
    assert.equal(manifest.package.files.some((file) => file.path === 'panels/embedded/index.css'), true);
    assert.equal(manifest.package.files.some((file) => file.path === 'panels/standalone/index.html'), true);
    assert.equal(manifest.package.files.some((file) => file.path === 'panels/standalone/index.js'), true);
    assert.equal(manifest.package.files.some((file) => file.path === 'panels/standalone/index.css'), true);
    assert.equal(manifest.package.files.some((file) => file.path === 'package.json'), true);

    const expectedDigest = createHash('sha256')
        .update(manifest.package.files.map((file) => `${file.path}:${file.digest}`).join('\n'))
        .digest('hex');
    assert.equal(manifest.package.digest, expectedDigest);
});
