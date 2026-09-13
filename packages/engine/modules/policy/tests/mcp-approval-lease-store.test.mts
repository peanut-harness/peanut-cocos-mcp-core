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

test('sessionBound uses longer idle and max hold leases', () => {
    const store = new McpApprovalLeaseStore();
    const issued = store.issue({
        connectionId: 'conn-session',
        resources: ['db://assets/ui'],
        sessionBound: true,
    });
    assert.equal(issued.idleLeaseMs, McpApprovalLeaseStore.sessionIdleLeaseMs);
    assert.equal(issued.maxHoldMs, McpApprovalLeaseStore.sessionMaxHoldMs);
    assert.ok(issued.expiresAt - Date.now() > 20 * 60_000);
    assert.equal(
        store.consume(issued.token, {
            connectionId: 'conn-session',
            operation: 'asset.import',
            resources: ['db://assets/ui'],
            risk: 'write',
        }),
        true,
    );
});

test('sessionBound defaults can be overridden by explicit idle/max', () => {
    const store = new McpApprovalLeaseStore();
    const issued = store.issue({
        connectionId: 'conn-override',
        resources: ['db://assets/ui'],
        sessionBound: true,
        idleLeaseMs: 1_000,
        maxHoldMs: 2_000,
    });
    assert.equal(issued.idleLeaseMs, 1_000);
    assert.equal(issued.maxHoldMs, 2_000);
});

test('default issue still uses short idle/max without sessionBound', () => {
    const store = new McpApprovalLeaseStore();
    const issued = store.issue({
        connectionId: 'conn-default',
        resources: ['db://assets/ui'],
    });
    assert.equal(issued.idleLeaseMs, McpApprovalLeaseStore.defaultIdleLeaseMs);
    assert.equal(issued.maxHoldMs, McpApprovalLeaseStore.defaultMaxHoldMs);
});
