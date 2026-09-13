import assert from 'assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import test from 'node:test';

import { RuntimeFacade } from '@peanut/pod-engine/runtime';

import { PluginManagerApp } from '../src/app/plugin-manager-app.js';
import { CocosMcpHub } from '../src/mcp/cocos-mcp-hub.js';
import { McpBatchApprovalStore } from '../src/mcp/mcp-batch-approval-store.js';

/**
 * @description 创建临时项目并预置 project.log。
 * @param prefix 目录前缀。
 * @param initialLog 初始日志内容。
 * @returns 项目根。
 */
function createProject(prefix: string, initialLog = ''): string {
    const projectPath = mkdtempSync(join(tmpdir(), prefix));
    const logDir = join(projectPath, 'temp', 'logs');
    mkdirSync(logDir, { recursive: true });
    writeFileSync(join(logDir, 'project.log'), initialLog, 'utf8');
    return projectPath;
}

/**
 * @description 启动 Hub 并返回便捷 request。
 * @param projectPath 项目根。
 * @param hubOptions Hub 选项扩展。
 */
async function startHub(
    projectPath: string,
    hubOptions: {
        readonly repairMessage?: {
            request(target: string, message: string, ...args: unknown[]): Promise<unknown>;
        };
        readonly requirePostflightVerified?: boolean;
        readonly mirrorLocalApprovalLease?: (request: {
            readonly connectionId: string;
            readonly resources: readonly string[];
            readonly operations?: readonly string[];
            readonly maxRisk?: 'write' | 'destructive';
            readonly idleLeaseMs?: number;
            readonly maxHoldMs?: number;
            readonly preferredToken?: string;
        }) => { readonly token: string; readonly expiresAt: number } | null;
    } = {},
): Promise<{
    readonly hub: CocosMcpHub;
    readonly pluginManager: PluginManagerApp;
    readonly request: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
    readonly connectionId: string;
}> {
    const pluginManager = new PluginManagerApp(new RuntimeFacade('3.8.7'));
    const hub = new CocosMcpHub(() => pluginManager, {
        projectPath,
        ...hubOptions,
    });
    await hub.start();
    const descriptor = JSON.parse(
        readFileSync(join(projectPath, '.peanut-ai', 'cocos-mcp.json'), 'utf8'),
    ) as Record<string, unknown>;
    const connectionId = 'a'.repeat(32);
    const request = async (
        payload: Record<string, unknown>,
        options: { readonly allowError?: boolean } = {},
    ): Promise<Record<string, unknown>> => {
        const response = await fetch(`http://127.0.0.1:${descriptor.port as number}/mcp`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-peanut-mcp-token': descriptor.token as string,
            },
            body: JSON.stringify(payload),
        });
        if (options.allowError !== true) {
            assert.equal(response.status, 200);
        }
        return (await response.json()) as Record<string, unknown>;
    };
    return { hub, pluginManager, request, connectionId };
}

test('matrix: write without approval becomes plan; approve+token enables batch reuse', async (): Promise<void> => {
    const projectPath = createProject('peanut-mcp-matrix-batch-');
    const { hub, pluginManager, request, connectionId } = await startHub(projectPath);
    const registry = pluginManager.getMcpCapabilityRegistry();
    let invokeCount = 0;
    registry.register(
        'peanut.matrix',
        {
            name: 'peanut.matrix.write-asset',
            description: '写资源。',
            category: 'cocos',
            inputSchema: {
                type: 'object',
                properties: {
                    target: { type: 'string' },
                    approvalToken: { type: 'string' },
                    resources: { type: 'array', items: { type: 'string' } },
                },
                additionalProperties: false,
            },
            readOnly: false,
            risk: 'write',
        },
        async (): Promise<unknown> => {
            invokeCount += 1;
            return { wrote: invokeCount };
        },
    );
    try {
        await hub.setPluginExposure('peanut.matrix', 'all');
        const planned = await request({
            action: 'call',
            name: 'peanut.matrix.write-asset',
            input: { target: 'db://assets/ui' },
            connectionId,
        });
        assert.equal(planned.ok, true);
        const plan = planned.result as Record<string, unknown>;
        assert.equal(typeof plan.planId, 'string');
        assert.equal(plan.confirmationRequired, true);
        assert.equal(invokeCount, 0);

        const issued = hub.approvePlanAndIssueToken(plan.planId as string, ['db://assets/ui']);
        assert.ok(issued != null);
        const executed = await request({
            action: 'execute',
            planId: plan.planId,
            connectionId,
        });
        assert.equal(executed.ok, true);
        assert.equal(invokeCount, 1);

        const reused = await request({
            action: 'call',
            name: 'peanut.matrix.write-asset',
            input: {
                target: 'db://assets/ui',
                approvalToken: issued?.approvalToken,
                resources: ['db://assets/ui'],
            },
            connectionId,
        });
        assert.equal(reused.ok, true);
        const reusedResult = reused.result as Record<string, unknown>;
        assert.equal(reusedResult.wrote, 2);
        assert.equal(typeof reusedResult.postflight, 'object');
        assert.equal(invokeCount, 2);

        const expanded = await request({
            action: 'call',
            name: 'peanut.matrix.write-asset',
            input: {
                target: 'db://assets/other',
                approvalToken: issued?.approvalToken,
                resources: ['db://assets/other'],
            },
            connectionId,
        });
        const expandedResult = expanded.result as Record<string, unknown>;
        assert.equal(typeof expandedResult.planId, 'string');
        assert.equal(invokeCount, 2);
    } finally {
        await hub.stop();
        rmSync(projectPath, { recursive: true, force: true });
    }
});

test('matrix: destructive write requires confirmDestructive even with directWrite', async (): Promise<void> => {
    const projectPath = createProject('peanut-mcp-matrix-destructive-');
    const { hub, pluginManager, request, connectionId } = await startHub(projectPath);
    pluginManager.getMcpCapabilityRegistry().register(
        'peanut.matrix',
        {
            name: 'peanut.matrix.delete-asset',
            description: '删除资源。',
            category: 'cocos',
            inputSchema: {
                type: 'object',
                properties: { confirmDestructive: { type: 'boolean' } },
                additionalProperties: false,
            },
            readOnly: false,
            risk: 'destructive',
        },
        async (): Promise<unknown> => ({ deleted: true }),
    );
    try {
        await hub.setPluginExposure('peanut.matrix', 'all');
        await hub.setDirectWriteEnabled(true);
        const denied = await request(
            {
                action: 'call',
                name: 'peanut.matrix.delete-asset',
                input: {},
                connectionId,
            },
            { allowError: true },
        );
        assert.equal(denied.ok, false);
        assert.match(String(denied.error), /destructive_confirmation_required/);

        const allowed = await request({
            action: 'call',
            name: 'peanut.matrix.delete-asset',
            input: { confirmDestructive: true },
            connectionId,
        });
        assert.equal(allowed.ok, true);
        assert.equal((allowed.result as Record<string, unknown>).deleted, true);
    } finally {
        await hub.stop();
        rmSync(projectPath, { recursive: true, force: true });
    }
});

test('matrix: postflight error triggers one refresh repair then verifies', async (): Promise<void> => {
    const projectPath = createProject('peanut-mcp-matrix-repair-', 'seed\n');
    const logPath = join(projectPath, 'temp', 'logs', 'project.log');
    const repairCalls: string[] = [];
    const { hub, pluginManager, request, connectionId } = await startHub(projectPath, {
        repairMessage: {
            request: async (_target, message) => {
                repairCalls.push(message);
                writeFileSync(logPath, `${readFileSync(logPath, 'utf8')}repair-ok\n`, 'utf8');
                return true;
            },
        },
    });
    pluginManager.getMcpCapabilityRegistry().register(
        'peanut.matrix',
        {
            name: 'peanut.matrix.noisy-write',
            description: '写后产生临时错误再修复。',
            category: 'cocos',
            inputSchema: { type: 'object', additionalProperties: false },
            readOnly: false,
            risk: 'write',
        },
        async (): Promise<unknown> => {
            writeFileSync(
                logPath,
                `${readFileSync(logPath, 'utf8')}Error: Cannot find character.atlas\n`,
                'utf8',
            );
            return { wrote: true };
        },
    );
    try {
        await hub.setPluginExposure('peanut.matrix', 'all');
        await hub.setDirectWriteEnabled(true);
        const body = await request({
            action: 'call',
            name: 'peanut.matrix.noisy-write',
            input: {},
            connectionId,
        });
        assert.equal(body.ok, true);
        const result = body.result as Record<string, unknown>;
        const postflight = result.postflight as Record<string, unknown>;
        assert.equal(postflight.logChecked, true);
        assert.equal(Array.isArray(postflight.repairAttempts), true);
        assert.equal((postflight.repairAttempts as unknown[])[0] != null, true);
        assert.equal(repairCalls[0], 'refresh-asset');
        assert.equal(postflight.verified, true);
    } finally {
        await hub.stop();
        rmSync(projectPath, { recursive: true, force: true });
    }
});

test('matrix: approval token idle lease expires and forces re-plan', async (): Promise<void> => {
    const store = new McpBatchApprovalStore();
    const connectionId = 'b'.repeat(32);
    const issued = store.issue({
        connectionId,
        resources: ['db://assets/ui'],
        operations: ['peanut.matrix.write-asset'],
        idleLeaseMs: 30,
        maxHoldMs: 5_000,
    });
    assert.equal(
        store.tryConsume(issued.token, {
            connectionId,
            operation: 'peanut.matrix.write-asset',
            resources: ['db://assets/ui'],
            risk: 'write',
        }),
        true,
    );
    await new Promise((resolve) => {
        setTimeout(resolve, 50);
    });
    assert.equal(
        store.tryConsume(issued.token, {
            connectionId,
            operation: 'peanut.matrix.write-asset',
            resources: ['db://assets/ui'],
            risk: 'write',
        }),
        false,
    );
});

test('matrix: issueApprovalToken hub action then consume on write call', async (): Promise<void> => {
    const projectPath = createProject('peanut-mcp-matrix-issue-token-');
    const { hub, pluginManager, request, connectionId } = await startHub(projectPath);
    let invokeCount = 0;
    pluginManager.getMcpCapabilityRegistry().register(
        'peanut.matrix',
        {
            name: 'peanut.matrix.batch-write',
            description: '批次写。',
            category: 'cocos',
            inputSchema: {
                type: 'object',
                properties: {
                    target: { type: 'string' },
                    approvalToken: { type: 'string' },
                    resources: { type: 'array', items: { type: 'string' } },
                },
                additionalProperties: false,
            },
            readOnly: false,
            risk: 'write',
        },
        async (): Promise<unknown> => {
            invokeCount += 1;
            return { n: invokeCount };
        },
    );
    try {
        await hub.setPluginExposure('peanut.matrix', 'all');
        const issued = await request({
            action: 'issueApprovalToken',
            connectionId,
            resources: ['db://assets/ui'],
            operations: ['peanut.matrix.batch-write'],
            maxRisk: 'write',
        });
        assert.equal(issued.ok, true);
        const token = (issued.result as Record<string, unknown>).approvalToken as string;
        const first = await request({
            action: 'call',
            name: 'peanut.matrix.batch-write',
            input: {
                target: 'db://assets/ui',
                approvalToken: token,
                resources: ['db://assets/ui'],
            },
            connectionId,
        });
        assert.equal(first.ok, true);
        assert.equal((first.result as Record<string, unknown>).n, 1);
        const second = await request({
            action: 'call',
            name: 'peanut.matrix.batch-write',
            input: {
                target: 'db://assets/ui',
                approvalToken: token,
                resources: ['db://assets/ui'],
            },
            connectionId,
        });
        assert.equal(second.ok, true);
        assert.equal((second.result as Record<string, unknown>).n, 2);
    } finally {
        await hub.stop();
        rmSync(projectPath, { recursive: true, force: true });
    }
});

test('matrix: issueApprovalToken mirrors Lite lease when hook bound', async (): Promise<void> => {
    const projectPath = createProject('peanut-mcp-matrix-mirror-lease-');
    const liteLeases = new Map<string, { connectionId: string; resources: readonly string[]; operations?: readonly string[]; maxRisk?: string }>();
    const { hub, pluginManager, request, connectionId } = await startHub(projectPath, {
        mirrorLocalApprovalLease: (req) => {
            const token =
                typeof req.preferredToken === 'string' && req.preferredToken.length >= 32
                    ? req.preferredToken
                    : 'f'.repeat(64);
            liteLeases.set(token, {
                connectionId: req.connectionId,
                resources: req.resources,
                operations: req.operations,
                maxRisk: req.maxRisk,
            });
            return { token, expiresAt: Date.now() + 60_000 };
        },
    });
    try {
        const issued = await request({
            action: 'issueApprovalToken',
            connectionId,
            resources: ['db://assets/ui'],
            operations: ['peanut.matrix.batch-write'],
            maxRisk: 'write',
        });
        assert.equal(issued.ok, true);
        const result = issued.result as Record<string, unknown>;
        const token = result.approvalToken as string;
        assert.equal(result.approvalId, token);
        assert.equal(result.liteMirrored, true);
        assert.ok(liteLeases.has(token));
        const mirrored = liteLeases.get(token)!;
        assert.equal(mirrored.connectionId, connectionId);
        assert.deepEqual([...mirrored.resources], ['db://assets/ui']);
        assert.deepEqual([...(mirrored.operations ?? [])], ['peanut.matrix.batch-write']);
        assert.equal(mirrored.maxRisk, 'write');
    } finally {
        await hub.stop();
        rmSync(projectPath, { recursive: true, force: true });
    }
});

