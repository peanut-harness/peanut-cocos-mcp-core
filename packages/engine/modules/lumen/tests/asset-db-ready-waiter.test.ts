import assert from 'node:assert/strict';
import test from 'node:test';

import { LumenAssetDbReadyWaiter } from '../source/io/asset-db-ready-waiter.ts';

test('LumenAssetDbReadyWaiter returns ready when query-ready is true', async (): Promise<void> => {
    const waiter = new LumenAssetDbReadyWaiter({
        request: async () => true,
    });
    const result = await waiter.wait({ timeoutMs: 200, intervalMs: 10 });
    assert.equal(result.status, 'ready');
    assert.equal(result.ready, true);
});

test('LumenAssetDbReadyWaiter treats non-boolean as unsupported', async (): Promise<void> => {
    const waiter = new LumenAssetDbReadyWaiter({
        request: async () => null,
    });
    const result = await waiter.wait({ timeoutMs: 200, intervalMs: 10 });
    assert.equal(result.status, 'unsupported');
    assert.equal(result.ready, true);
});

test('LumenAssetDbReadyWaiter times out when ready stays false', async (): Promise<void> => {
    const waiter = new LumenAssetDbReadyWaiter({
        request: async () => false,
    });
    const result = await waiter.wait({ timeoutMs: 80, intervalMs: 20 });
    assert.equal(result.status, 'timeout');
    assert.equal(result.ready, false);
    assert.ok(result.polls >= 1);
});
