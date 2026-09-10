import assert from 'assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import test from 'node:test';

import { PluginDevelopmentControlServer, type IPluginDevelopmentControl } from '../src/development/plugin-development-control-server';

test('plugin development control server should authenticate and dispatch local development actions', async (): Promise<void> => {
    const calls: string[] = [];
    const operationLog: Array<{ readonly action: string; readonly target: string | null; readonly ok: boolean }> = [];
    const serverPorts: Array<number | null> = [];
    const controller: IPluginDevelopmentControl = {
        status: (pluginId?: string): unknown => ({ pluginId: pluginId ?? null, state: 'active' }),
        reconcile: async (): Promise<void> => {
            calls.push('reconcile');
        },
        reload: async (pluginId: string): Promise<void> => {
            calls.push(`reload:${pluginId}`);
        },
        install: async (packagePath: string): Promise<unknown> => {
            calls.push(`install:${packagePath}`);
            return { installPath: packagePath };
        },
        trace: async (): Promise<unknown> => ({ events: [] }),
        setControlServerPort: (port: number | null): void => {
            serverPorts.push(port);
        },
        recordOperation: (action, target, _durationMs, ok): void => {
            operationLog.push({ action, target, ok });
        },
    };
    const server = new PluginDevelopmentControlServer(() => controller, { port: 0, token: 'local-token' });

    await server.start();
    try {
        const port = server.getPort();
        assert.notEqual(port, null);
        assert.deepEqual(serverPorts, [port]);

        const forbiddenResponse = await requestControl(port, 'wrong-token', { action: 'status' });
        assert.equal(forbiddenResponse.status, 403);

        const statusResponse = await requestControl(port, 'local-token', { action: 'status', pluginId: 'acme.example' });
        assert.equal(statusResponse.status, 200);
        assert.deepEqual(statusResponse.payload, { ok: true, result: { pluginId: 'acme.example', state: 'active' } });

        const reconcileResponse = await requestControl(port, 'local-token', { action: 'reconcile' });
        assert.equal(reconcileResponse.status, 200);
        assert.deepEqual(reconcileResponse.payload, { ok: true, result: { accepted: true } });

        const reloadResponse = await requestControl(port, 'local-token', { action: 'reload', pluginId: 'acme.example' });
        assert.equal(reloadResponse.status, 200);
        assert.deepEqual(reloadResponse.payload, { ok: true, result: { accepted: true } });

        const installResponse = await requestControl(port, 'local-token', { action: 'install', packagePath: 'D:/plugins/acme.example' });
        assert.equal(installResponse.status, 200);
        assert.deepEqual(installResponse.payload, { ok: true, result: { installPath: 'D:/plugins/acme.example' } });
        assert.deepEqual(calls, ['reconcile', 'reload:acme.example', 'install:D:/plugins/acme.example']);
        assert.deepEqual(operationLog, [
            { action: 'status', target: 'acme.example', ok: true },
            { action: 'reconcile', target: null, ok: true },
            { action: 'reload', target: 'acme.example', ok: true },
            { action: 'install', target: 'package', ok: true },
        ]);
    } finally {
        await server.stop();
        assert.deepEqual(serverPorts, [serverPorts[0], null]);
    }
});

test('plugin development control server should publish and remove its project-local connection descriptor', async (): Promise<void> => {
    const projectPath = mkdtempSync(join(tmpdir(), 'peanut-development-control-'));
    const server = new PluginDevelopmentControlServer(() => createDevelopmentControlStub(), { port: 0, projectPath });
    const descriptorPath = join(projectPath, '.peanut-ai', 'cocos-development-control.json');

    try {
        await server.start();
        assert.equal(existsSync(descriptorPath), true);
        const descriptor = JSON.parse(readFileSync(descriptorPath, 'utf8')) as Record<string, unknown>;
        assert.equal(descriptor.schemaVersion, 1);
        assert.equal(descriptor.endpoint, 'http://127.0.0.1');
        assert.equal(descriptor.port, server.getPort());
        assert.equal(typeof descriptor.token, 'string');
        assert.equal((descriptor.token as string).length, 64);

        await server.stop();
        assert.equal(existsSync(descriptorPath), false);
    } finally {
        await server.stop();
        rmSync(projectPath, { recursive: true, force: true });
    }
});

async function requestControl(
    port: number,
    token: string,
    body: { readonly action: string; readonly pluginId?: string; readonly packagePath?: string },
): Promise<{ readonly status: number; readonly payload: unknown }> {
    const response = await fetch(`http://127.0.0.1:${port}/development-control`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-peanut-dev-token': token,
        },
        body: JSON.stringify(body),
    });
    return {
        status: response.status,
        payload: response.status === 403 ? null : await response.json(),
    };
}

function createDevelopmentControlStub(): IPluginDevelopmentControl {
    return {
        status: (): unknown => [],
        reconcile: async (): Promise<void> => undefined,
        reload: async (): Promise<void> => undefined,
        install: async (): Promise<unknown> => ({}),
        trace: async (): Promise<unknown> => ({}),
        setControlServerPort: (): void => undefined,
        recordOperation: (): void => undefined,
    };
}
