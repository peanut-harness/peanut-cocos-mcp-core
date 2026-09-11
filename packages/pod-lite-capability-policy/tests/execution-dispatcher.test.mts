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
    await assert.rejects(
        dispatcher.execute('scene.save', { approvalId: lease.token }, { ...context, resources: [' '] }),
        /approval_required/u,
    );
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


test('write execution accepts approvalId or approvalToken alias and prefers approvalId', async () => {
    let calls = 0;
    const leases = new McpApprovalLeaseStore();
    const dispatcher = new CoreCocosMcpExecutionDispatcher([{ operations: ['scene.save'], execute: async () => ++calls }], leases);
    const context = { connectionId: 'local-a', resources: ['scene:active'] };

    await assert.rejects(dispatcher.execute('scene.save', {}, context), /approval_required/u);
    await assert.rejects(dispatcher.execute('scene.save', { approvalId: '   ', approvalToken: '   ' }, context), /approval_required/u);
    assert.equal(calls, 0);

    const leaseIdOnly = leases.issue({ ...context, operations: ['scene.save'] });
    assert.equal(await dispatcher.execute('scene.save', { approvalId: leaseIdOnly.token }, context), 1);

    const leaseTokenOnly = leases.issue({ ...context, operations: ['scene.save'] });
    assert.equal(await dispatcher.execute('scene.save', { approvalToken: leaseTokenOnly.token }, context), 2);

    const preferred = leases.issue({ ...context, operations: ['scene.save'] });
    const other = leases.issue({ ...context, operations: ['scene.save'] });
    // both present: prefer approvalId even when approvalToken is also valid
    assert.equal(
        await dispatcher.execute(
            'scene.save',
            { approvalId: preferred.token, approvalToken: other.token },
            context,
        ),
        3,
    );
    // forged approvalId must not fall through to a valid approvalToken
    await assert.rejects(
        dispatcher.execute(
            'scene.save',
            { approvalId: 'forged-prefer-id', approvalToken: other.token },
            context,
        ),
        /approval_required/u,
    );
    // valid approvalId + forged token still succeeds (id wins)
    assert.equal(
        await dispatcher.execute(
            'scene.save',
            { approvalId: preferred.token, approvalToken: 'forged-token' },
            context,
        ),
        4,
    );
    assert.equal(calls, 4);
});

test('write schema accepts approvalToken without schema_invalid', async () => {
    let calls = 0;
    const leases = new McpApprovalLeaseStore();
    const dispatcher = new CoreCocosMcpExecutionDispatcher([{ operations: ['scene.createNode'], execute: async () => ++calls }], leases);
    const context = { connectionId: 'local-a', resources: ['scene:active'] };
    const lease = leases.issue({ ...context, operations: ['scene.createNode'] });
    assert.equal(
        await dispatcher.execute(
            'scene.createNode',
            { name: 'n', approvalToken: lease.token },
            context,
        ),
        1,
    );
    assert.equal(calls, 1);
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

test('write schema accepts confirmDestructive without schema_invalid', async () => {
    let calls = 0;
    const leases = new McpApprovalLeaseStore();
    const dispatcher = new CoreCocosMcpExecutionDispatcher([{ operations: ['lumen.nodeRm'], execute: async () => ++calls }], leases);
    const context = { connectionId: 'local-a', resources: ['db://assets/ui/Demo.prefab'] };
    const lease = leases.issue({ ...context, operations: ['lumen.nodeRm'], maxRisk: 'destructive' });
    assert.equal(
        await dispatcher.execute(
            'lumen.nodeRm',
            {
                prefabRelativePath: 'assets/ui/Demo.prefab',
                nodePath: '/Demo/Child',
                approvalToken: lease.token,
                confirmDestructive: true,
            },
            context,
        ),
        1,
    );
    assert.equal(calls, 1);
});

