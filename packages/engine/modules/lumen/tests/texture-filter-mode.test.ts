import assert from 'node:assert/strict';
import test from 'node:test';

import { LumenTextureFilterModeCodec } from '../source/standalone/texture-filter-mode';

test('LumenTextureFilterModeCodec expands panel aliases to meta filter triplets', (): void => {
    assert.deepEqual(LumenTextureFilterModeCodec.expandFilterMode('point'), {
        minfilter: 'nearest',
        magfilter: 'nearest',
        mipfilter: 'none',
    });
    assert.deepEqual(LumenTextureFilterModeCodec.expandFilterMode('trilinear'), {
        minfilter: 'linear',
        magfilter: 'linear',
        mipfilter: 'linear',
    });
});

test('LumenTextureFilterModeCodec infers panel alias from meta filter triplets', (): void => {
    assert.equal(
        LumenTextureFilterModeCodec.inferFilterMode({
            minfilter: 'linear',
            magfilter: 'linear',
            mipfilter: 'none',
        }),
        'bilinear',
    );
    assert.equal(
        LumenTextureFilterModeCodec.inferFilterMode({
            minfilter: 'nearest',
            magfilter: 'linear',
            mipfilter: 'none',
        }),
        null,
    );
});

test('LumenTextureFilterModeCodec expandPatch removes filterMode after expansion', (): void => {
    const expanded = LumenTextureFilterModeCodec.expandPatch({
        filterMode: 'bilinear',
        anisotropy: 4,
    });
    assert.equal('filterMode' in expanded, false);
    assert.equal(expanded.minfilter, 'linear');
    assert.equal(expanded.magfilter, 'linear');
    assert.equal(expanded.mipfilter, 'none');
    assert.equal(expanded.anisotropy, 4);
});
