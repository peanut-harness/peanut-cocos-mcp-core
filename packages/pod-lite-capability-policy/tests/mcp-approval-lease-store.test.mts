import assert from 'node:assert/strict';
import test from 'node:test';

import { McpApprovalLeaseStore } from '../dist/mcp-approval-lease-store.js';

test('preferredToken reuses Hub token when well-formed hex', () => {
    const store = new McpApprovalLeaseStore();
    const preferred = 'a'.repeat(64);
    const issued = store.issue({
        connectionId: 'conn-1',
        resources: ['db://assets/ui'],
        operations: ['lumen.nodeRm'],
        maxRisk: 'destructive',
        preferredToken: preferred,
    });
    assert.equal(issued.token, preferred);
    assert.equal(
        store.consume(preferred, {
            connectionId: 'conn-1',
            operation: 'lumen.nodeRm',
            resources: ['db://assets/ui'],
            risk: 'destructive',
        }),
        true,
    );
});

test('preferredToken falls back when malformed', () => {
    const store = new McpApprovalLeaseStore();
    const issued = store.issue({
        connectionId: 'conn-1',
        resources: ['db://assets/ui'],
        preferredToken: 'short',
    });
    assert.notEqual(issued.token, 'short');
    assert.ok(issued.token.length >= 32);
});
