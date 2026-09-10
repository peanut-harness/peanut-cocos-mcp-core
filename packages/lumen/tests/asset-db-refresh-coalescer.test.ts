import assert from 'node:assert/strict';
import test from 'node:test';

import { LumenAssetDbRefreshCoalescer } from '../source/io/asset-db-refresh-coalescer.js';

test('LumenAssetDbRefreshCoalescer merges paths in one flush', async (): Promise<void> => {
    /** @type {string[][]} */
    const flushes: string[][] = [];
    const coalescer = new LumenAssetDbRefreshCoalescer(async (_projectRoot, paths) => {
        flushes.push([...paths]);
        return { triggered: true, message: `n=${paths.length}` };
    }, 80);

    const a = coalescer.schedule('/proj', ['assets/a.scene']);
    const b = coalescer.schedule('/proj', ['assets/b.scene']);
    const c = coalescer.schedule('/proj', ['assets/a.scene', 'assets/c.prefab']);
    const results = await Promise.all([a, b, c]);
    assert.equal(flushes.length, 1);
    assert.deepEqual(flushes[0], ['assets/a.scene', 'assets/b.scene', 'assets/c.prefab']);
    assert.equal(results.every((item) => (item as { message: string }).message === 'n=3'), true);
});

test('LumenAssetDbRefreshCoalescer flushNow drains pending immediately', async (): Promise<void> => {
    /** @type {string[][]} */
    const flushes: string[][] = [];
    const coalescer = new LumenAssetDbRefreshCoalescer(async (_projectRoot, paths) => {
        flushes.push([...paths]);
        return { triggered: true, message: `n=${paths.length}` };
    }, 5_000);

    const pending = coalescer.schedule('/proj', ['assets/a.scene']);
    const started = Date.now();
    await coalescer.flushNow('/proj');
    const elapsed = Date.now() - started;
    await pending;
    assert.ok(elapsed < 500, `flushNow must not wait full debounce, elapsed=${elapsed}`);
    assert.equal(flushes.length, 1);
    assert.deepEqual(flushes[0], ['assets/a.scene']);
});
