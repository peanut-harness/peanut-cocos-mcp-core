import assert from 'node:assert/strict';
import test from 'node:test';

import { Lumen24WriteGate } from '../dist/lumen-24-write-gate.js';

test('Lumen24WriteGate exposes scaffold readiness and still refuses unknown ops', () => {
    assert.equal(Lumen24WriteGate.status().ready, true);
    Lumen24WriteGate.assertReady('scaffoldPrefab');
    assert.throws(() => Lumen24WriteGate.refuse('prefab.save'), /lumen_24_write_not_implemented/);
});
