import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { Lumen24RuntimeAssetRefreshAdapter } from '../dist/lumen-24-session.js';

test('Lumen24RuntimeAssetRefreshAdapter.resolveRefreshTargets skips missing paths and refreshes parent', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-refresh-'));
    try {
        mkdirSync(join(projectRoot, 'assets/probe'), { recursive: true });
        writeFileSync(join(projectRoot, 'assets/probe/keep.png'), 'x');
        const resolved = Lumen24RuntimeAssetRefreshAdapter.resolveRefreshTargets(projectRoot, [
            'assets/probe/live-full-2026-08-31T03-38-39.878Z',
            'assets/probe/keep.png',
        ]);
        assert.deepEqual(resolved, ['assets/probe', 'assets/probe/keep.png']);
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24RuntimeAssetRefreshAdapter.refresh falls back to parent when child missing', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-refresh-'));
    try {
        mkdirSync(join(projectRoot, 'assets/probe'), { recursive: true });
        const refreshed = [];
        const adapter = new Lumen24RuntimeAssetRefreshAdapter(async (pathValue) => {
            refreshed.push(pathValue);
            return { ok: true, pathValue };
        });
        const result = await adapter.refresh(projectRoot, ['assets/probe/missing.png']);
        assert.equal(result.triggered, true);
        assert.deepEqual(refreshed, ['assets/probe']);
        assert.equal(result.detail[0].path, 'assets/probe');
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});

test('Lumen24RuntimeAssetRefreshAdapter.refresh tolerates refresh failures', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-refresh-'));
    try {
        mkdirSync(join(projectRoot, 'assets/probe'), { recursive: true });
        writeFileSync(join(projectRoot, 'assets/probe/keep.png'), 'x');
        const adapter = new Lumen24RuntimeAssetRefreshAdapter(async () => {
            throw new Error('ENOENT');
        });
        const result = await adapter.refresh(projectRoot, ['assets/probe/keep.png']);
        assert.equal(result.triggered, true);
        assert.ok(Array.isArray(result.detail));
        assert.equal(result.detail[0].skipped, true);
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});
