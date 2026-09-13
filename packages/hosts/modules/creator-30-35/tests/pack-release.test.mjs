import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('peanut-pod-35 release package exists with early-3x manifest', async () => {
    const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
    const outRoot = resolve(root, 'release', `${packageJson.name}-${packageJson.version}`);
    assert.equal(existsSync(resolve(outRoot, 'package.json')), true);
    assert.equal(existsSync(resolve(outRoot, 'dist/main.js')), true);
    assert.equal(existsSync(resolve(outRoot, 'dist/scene.js')), true);

    const release = JSON.parse(await readFile(resolve(outRoot, 'package.json'), 'utf8'));
    assert.equal(release.name, 'peanut-pod-35');
    assert.equal(release.package_version, 2);
    assert.match(String(release.editor), /3\.0\.0/);
    assert.equal(release.peanut?.productLine, 'early3x');
});
