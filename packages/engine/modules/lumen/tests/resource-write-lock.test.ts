import assert from 'node:assert/strict';
import test from 'node:test';

import { LumenResourceWriteLock, normalizeResourceDirectoryLockKey, normalizeResourceLockKey } from '../source/concurrency/resource-write-lock';

test('normalizeResourceLockKey strips db prefix and normalizes case', (): void => {
    assert.equal(normalizeResourceLockKey('db://assets/UI/Foo.prefab'), 'assets/ui/foo.prefab');
});

test('normalizeResourceDirectoryLockKey maps files and import targets', (): void => {
    assert.equal(normalizeResourceDirectoryLockKey('assets/UI/Foo.prefab'), 'dir:assets/ui');
    assert.equal(normalizeResourceDirectoryLockKey('db://assets/mcp-verify'), 'dir:assets/mcp-verify');
});

test('LumenResourceWriteLock serializes concurrent writers on same key', async (): Promise<void> => {
    LumenResourceWriteLock.resetSharedForTests();
    const lock = LumenResourceWriteLock.shared();
    const order: number[] = [];
    const delay = (ms: number): Promise<void> =>
        new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    await Promise.all([
        lock.runExclusive('assets/ui/A.prefab', async () => {
            order.push(1);
            await delay(30);
            order.push(2);
        }),
        lock.runExclusive('assets/ui/A.prefab', async () => {
            order.push(3);
            await delay(5);
            order.push(4);
        }),
    ]);
    assert.deepEqual(order, [1, 2, 3, 4]);
});

test('LumenResourceWriteLock allows parallel writers on different keys', async (): Promise<void> => {
    LumenResourceWriteLock.resetSharedForTests();
    const lock = LumenResourceWriteLock.shared();
    let inFlight = 0;
    let maxInFlight = 0;
    const bump = async (): Promise<void> => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => {
            setTimeout(resolve, 20);
        });
        inFlight -= 1;
    };
    await Promise.all([
        lock.runExclusive('assets/ui/A.prefab', bump),
        lock.runExclusive('assets/ui/B.prefab', bump),
        lock.runExclusive('assets/ui/C.prefab', bump),
    ]);
    assert.equal(maxInFlight, 3);
});

test('LumenResourceWriteLock runExclusiveMany acquires in sorted order', async (): Promise<void> => {
    LumenResourceWriteLock.resetSharedForTests();
    const lock = LumenResourceWriteLock.shared();
    const acquired: string[] = [];
    await lock.runExclusiveMany(['assets/z.prefab', 'assets/a.prefab'], async () => {
        acquired.push('inner');
    });
    assert.deepEqual(acquired, ['inner']);
});
