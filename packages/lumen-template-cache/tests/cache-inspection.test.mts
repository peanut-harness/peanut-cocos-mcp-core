import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, isAbsolute } from 'node:path';
import { test } from 'node:test';

import { LumenPluginImportInspector, LumenPluginRequestCodec } from '../dist/index.js';

test('template packs are identified while Creator prefabs and incomplete packs are refused', () => {
    const root = mkdtempSync(join(tmpdir(), 'pod-lite-cache-'));
    try {
        const inspector = new LumenPluginImportInspector();
        assert.equal(inspector.inspect(root).importable, false);
        const prefab = join(root, 'test.prefab');
        writeFileSync(prefab, JSON.stringify([{ __type__: 'cc.Prefab' }]));
        assert.equal(inspector.inspect(prefab).importable, false);
        mkdirSync(join(root, 'default_prefab'));
        const manifest = join(root, 'lumen-templates.manifest.json');
        writeFileSync(
            manifest,
            JSON.stringify({ packageVersion: '1.0', contentHash: 'test-hash', templateCount: 1, generatedAt: '2026-09-09' }),
        );
        assert.equal(inspector.resolvePackRoot(root), root);
        assert.equal(inspector.resolvePackRoot(manifest), root);
        assert.equal(LumenPluginRequestCodec.readSourceRoot({ sourceRoot: root }), root);
        assert.throws(() => LumenPluginRequestCodec.readSourceRoot(null));
    } finally {
        const child = relative(tmpdir(), root);
        assert.ok(child && !child.startsWith('..') && !isAbsolute(child));
        rmSync(root, { recursive: true, force: true });
    }
});
