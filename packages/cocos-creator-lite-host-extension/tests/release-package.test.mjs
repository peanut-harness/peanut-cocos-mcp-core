import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

test('release contains a Creator extension entry', () => {
    const root = resolve(import.meta.dirname, '..', 'release', 'peanut-pod-lite-host-0.1.0');
    assert.equal(existsSync(resolve(root, 'dist/main.js')), true);
    assert.equal(existsSync(resolve(root, 'dist/scene.js')), true);
    assert.equal(JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).package_version, 2);
});
