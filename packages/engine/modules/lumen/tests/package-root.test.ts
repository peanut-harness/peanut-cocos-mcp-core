import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { LumenPackageRoot } from '../source/package-root';

test('resolveFromDirectory prefers a sibling bundled/schema (fat plugin bundle)', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'lumen-pkg-root-'));
    try {
        mkdirSync(join(root, 'bundled', 'schema'), { recursive: true });
        assert.equal(LumenPackageRoot.resolveFromDirectory(root), root);
        assert.equal(LumenPackageRoot.hasBundledSchema(root), true);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('resolveFromDirectory uses parent when module lives in dist/', (): void => {
    const root = mkdtempSync(join(tmpdir(), 'lumen-pkg-dist-'));
    try {
        mkdirSync(join(root, 'bundled', 'schema'), { recursive: true });
        mkdirSync(join(root, 'dist'), { recursive: true });
        assert.equal(LumenPackageRoot.resolveFromDirectory(join(root, 'dist')), root);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('resolve() locates this package bundled/schema', (): void => {
    assert.equal(LumenPackageRoot.hasBundledSchema(LumenPackageRoot.resolve()), true);
});
