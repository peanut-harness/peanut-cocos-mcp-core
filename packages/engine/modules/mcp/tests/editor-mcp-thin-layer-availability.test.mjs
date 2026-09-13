import assert from 'assert/strict';
import test from 'node:test';

import { EditorMcpThinLayerAvailabilityMapper } from '../dist/editor-mcp-thin-layer-availability.js';

test('availability: live on message ok', () => {
    const result = EditorMcpThinLayerAvailabilityMapper.attach({
        available: true,
        message: 'scene_open_ok:open-scene',
    });
    assert.equal(result.availability, 'live');
});

test('availability: fallback on preview source and live_tried', () => {
    assert.equal(
        EditorMcpThinLayerAvailabilityMapper.resolve({
            available: true,
            message: 'preview_query_ok:fallback;live_tried=preview.query-port',
            source: 'fallback',
        }),
        'fallback',
    );
});

test('availability: refused on scene_save_refused and no_supported_message', () => {
    assert.equal(
        EditorMcpThinLayerAvailabilityMapper.resolve({
            available: false,
            message: 'scene_save_refused:use_lumen_offline_write',
        }),
        'refused',
    );
    assert.equal(
        EditorMcpThinLayerAvailabilityMapper.resolve({
            available: false,
            message: 'scene_open_unavailable:no_supported_message',
        }),
        'refused',
    );
});

test('availability: hint overrides message heuristics', () => {
    assert.equal(
        EditorMcpThinLayerAvailabilityMapper.resolve({
            available: true,
            message: 'scene_query_node_ok',
            availabilityHint: 'fallback',
        }),
        'fallback',
    );
});
