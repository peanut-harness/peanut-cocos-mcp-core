import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('peanut-pod-24 release package exists with Creator 2.x manifest', async () => {
    const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
    const outRoot = resolve(root, 'release', `${packageJson.name}-${packageJson.version}`);
    assert.equal(existsSync(resolve(outRoot, 'package.json')), true);
    assert.equal(existsSync(resolve(outRoot, 'main.js')), true);
    assert.equal(existsSync(resolve(outRoot, 'dist/main.js')), true);
    assert.equal(existsSync(resolve(outRoot, 'panel/index.js')), true);
    assert.equal(existsSync(resolve(outRoot, 'scene-walker.js')), true);

    const release = JSON.parse(await readFile(resolve(outRoot, 'package.json'), 'utf8'));
    assert.equal(release.name, 'peanut-pod-24');
    assert.equal(release.main, 'main.js');
    assert.equal(release['scene-script'], 'scene-walker.js');
    assert.match(String(release.editor), /2\.4/);
    assert.equal(release.peanut?.productLine, 'creator2x');
});
