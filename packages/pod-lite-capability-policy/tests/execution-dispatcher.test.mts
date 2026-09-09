import assert from 'node:assert/strict';
import { test } from 'node:test';

import { CoreCocosMcpExecutionDispatcher, McpApprovalLeaseStore } from '../dist/index.js';

test('write execution consumes a lease bound to connection, operation and resources', async () => {
    let calls = 0;
    const leases = new McpApprovalLeaseStore();
    const dispatcher = new CoreCocosMcpExecutionDispatcher([{ operations: ['scene.save'], execute: async () => ++calls }], leases);
    const context = { connectionId: 'local-a', resources: ['scene:active'] };
    await assert.rejects(dispatcher.execute('scene.save', { approvalId: 'forged' }, context), /approval_required/u);
    const lease = leases.issue({ ...context, operations: ['scene.save'] });
    await assert.rejects(dispatcher.execute('scene.save', { approvalId: lease.token }), /approval_required/u);
    await assert.rejects(
        dispatcher.execute('scene.save', { approvalId: lease.token }, { ...context, connectionId: 'local-b' }),
        /approval_required/u,
    );
    await assert.rejects(
        dispatcher.execute('scene.save', { approvalId: lease.token }, { ...context, resources: ['scene:other'] }),
        /approval_required/u,
    );
    assert.equal(calls, 0);
    assert.equal(await dispatcher.execute('scene.save', { approvalId: lease.token }, context), 1);
    leases.revoke(lease.token);
    await assert.rejects(dispatcher.execute('scene.save', { approvalId: lease.token }, context), /approval_required/u);
    assert.equal(calls, 1);
});

test('read execution needs no approval and malformed input never reaches the runtime', async () => {
    let calls = 0;
    const dispatcher = new CoreCocosMcpExecutionDispatcher([{ operations: ['editor.queryVersion'], execute: async () => ++calls }]);
    await assert.rejects(dispatcher.execute('editor.queryVersion', { injected: true }), /schema_invalid/u);
    assert.equal(calls, 0);
    assert.equal(await dispatcher.execute('editor.queryVersion', {}), 1);
    await assert.rejects(dispatcher.execute('preview.capture', {}), /operation_not_public/u);
});

test('a write lease cannot authorize destructive work', async () => {
    let calls = 0;
    const leases = new McpApprovalLeaseStore();
    const dispatcher = new CoreCocosMcpExecutionDispatcher([{ operations: ['asset.delete'], execute: async () => ++calls }], leases);
    const context = { connectionId: 'local-a', resources: ['db://assets/test.txt'] };
    const lease = leases.issue({ ...context, operations: ['asset.delete'], maxRisk: 'write' });
    await assert.rejects(
        dispatcher.execute('asset.delete', { approvalId: lease.token, paths: ['test.txt'] }, context),
        /approval_required/u,
    );
    assert.equal(calls, 0);
});
