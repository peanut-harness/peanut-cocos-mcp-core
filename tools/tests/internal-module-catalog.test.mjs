import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import { InternalModuleCatalog } from '../internal-module-catalog.mjs';

test('discovers every repository module and orders declared dependencies first', () => {
    const repositoryRoot = resolve(import.meta.dirname, '../..');
    const catalog = new InternalModuleCatalog(repositoryRoot);
    const engineModules = catalog.list('engine');
    const names = engineModules.map((moduleRecord) => moduleRecord.name);

    assert.equal(engineModules.length, 10);
    assert.ok(names.indexOf('@peanut/pod-engine/assets') < names.indexOf('@peanut/pod-engine/lumen'));
    assert.ok(names.indexOf('@peanut/pod-engine/kernel') < names.indexOf('@peanut/pod-engine/mcp'));
    assert.ok(names.indexOf('@peanut/pod-engine/mcp') < names.indexOf('@peanut/pod-engine/creator-plugin'));
    assert.equal(catalog.list('hosts').length, 3);
});

test('rejects missing dependencies and dependency cycles', () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), 'peanut-internal-modules-'));
    try {
        createModule(repositoryRoot, 'first', '@test/first', ['@test/second']);
        assert.throws(() => new InternalModuleCatalog(repositoryRoot).list('engine'), /internal_module_dependency_missing/);

        createModule(repositoryRoot, 'second', '@test/second', ['@test/first']);
        assert.throws(() => new InternalModuleCatalog(repositoryRoot).list('engine'), /internal_module_dependency_cycle/);
    } finally {
        rmSync(repositoryRoot, { recursive: true, force: true });
    }
});

function createModule(repositoryRoot, directoryName, name, internalDependencies) {
    const directory = join(repositoryRoot, 'packages/engine/modules', directoryName);
    mkdirSync(directory, { recursive: true });
    writeFileSync(
        join(directory, 'package.json'),
        `${JSON.stringify({ name, peanut: { internalDependencies } }, null, 4)}\n`,
        'utf8',
    );
}
