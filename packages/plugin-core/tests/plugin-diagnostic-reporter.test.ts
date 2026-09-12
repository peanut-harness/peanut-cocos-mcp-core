import assert from 'assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import test from 'node:test';

import { PluginDiagnosticReporter } from '../src/diagnostics/plugin-diagnostic-reporter';
import { PanelBridgeGateway } from '../src/panels/panel-bridge-gateway';
import { PluginEventBus } from '../src/shared/plugin-event-bus';

test('diagnostic reporter should write a plugin-scoped export under peanut-plugins/logs', (): void => {
    const projectPath = mkdtempSync(join(tmpdir(), 'peanut-plugin-diagnostic-'));
    try {
        const reporter = new PluginDiagnosticReporter(projectPath);
        reporter.record({
            pluginId: 'sample.plugin',
            source: 'lifecycle',
            phase: 'activate',
            error: new Error('activate_failed'),
            context: { token: 'hidden', sourcePath: '/secret/project' },
        });
        const exported = reporter.export('sample.plugin');
        assert.notEqual(exported, null);
        assert.equal(existsSync(exported!.filePath), true);
        assert.equal(exported!.filePath.startsWith(join(projectPath, 'peanut-plugins', 'logs', 'sample.plugin')), true);
        const content = readFileSync(exported!.filePath, 'utf8');
        assert.equal(content.includes('[REDACTED]'), true);
        assert.equal(content.includes('[PATH_REDACTED]'), true);
    } finally {
        rmSync(projectPath, { recursive: true, force: true });
    }
});

test('policy rejections are recorded but classified as expected MCP policy', (): void => {
    const projectPath = mkdtempSync(join(tmpdir(), 'peanut-plugin-diagnostic-policy-'));
    const errors: unknown[] = [];
    const infos: unknown[] = [];
    const originalError = console.error;
    const originalInfo = console.info;
    console.error = (...args: unknown[]): void => {
        errors.push(args);
    };
    console.info = (...args: unknown[]): void => {
        infos.push(args);
    };
    try {
        const reporter = new PluginDiagnosticReporter(projectPath);
        reporter.record({
            pluginId: 'peanut.editor-mcp',
            source: 'mcp_capability',
            error: new Error('core_cocos_mcp_execution_approval_required:asset.catalog.refresh'),
            context: { capability: 'peanut.editor-mcp.asset-catalog-refresh' },
        });
        reporter.record({
            pluginId: 'peanut.editor-mcp',
            source: 'mcp_capability',
            error: new Error('editor_mcp_destructive_confirmation_required'),
            context: { capability: 'peanut.editor-mcp.lumen-refresh' },
        });
        reporter.record({
            pluginId: 'peanut.editor-mcp',
            source: 'mcp_capability',
            error: new Error('editor_mcp_operation_unsupported:cocos.capabilities'),
        });
        reporter.record({
            pluginId: 'peanut.editor-mcp',
            source: 'mcp_capability',
            error: new Error('lumen_catalog_miss:{"query":"cc.Button"}:run_editor_import_then_catalog_refresh'),
        });
        reporter.record({
            pluginId: 'peanut.editor-mcp',
            source: 'mcp_capability',
            error: new Error('UNMANAGED_ASSET: db://assets/mcp-verify/Probe.png'),
        });
        reporter.record({
            pluginId: 'peanut.editor-mcp',
            source: 'mcp_capability',
            error: new Error('silent_asset_path_outside_assets:FeatureReplaceProbe'),
        });
        reporter.record({
            pluginId: 'peanut.editor-mcp',
            source: 'mcp_capability',
            error: new Error('silent_replace_target_not_found:ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee'),
        });
        reporter.record({
            pluginId: 'peanut.editor-mcp',
            source: 'mcp_capability',
            error: new Error('real_crash_should_stay_error'),
        });
        assert.equal(infos.length, 7);
        assert.equal(errors.length, 1);
        for (const infoArgs of infos) {
            assert.ok(Array.isArray(infoArgs));
            assert.equal(infoArgs.length, 1, 'policy info must be a single string (no Error object)');
            assert.equal(typeof infoArgs[0], 'string');
            assert.match(String(infoArgs[0]), /^\[plugin:peanut\.editor-mcp\] policy:/);
        }
        assert.equal(reporter.list('peanut.editor-mcp').length, 8);
    } finally {
        console.error = originalError;
        console.info = originalInfo;
        rmSync(projectPath, { recursive: true, force: true });
    }
});

test('panel messages and event listeners should report failures without blocking other listeners', async (): Promise<void> => {
    const reports: Array<{ source: string; pluginId?: string }> = [];
    const gateway = new PanelBridgeGateway((report) => { reports.push(report); });
    let secondHandlerRan = false;
    gateway.registerMessageHandler('sample.plugin', 'panel', 'run', async (): Promise<void> => { throw new Error('first_handler_failed'); });
    gateway.registerMessageHandler('sample.plugin', 'panel', 'run', async (): Promise<void> => { secondHandlerRan = true; });
    await gateway.postMessage('sample.plugin', 'panel', { id: 'message-1', event: 'run', payload: {} });
    assert.equal(secondHandlerRan, true);
    assert.equal(reports[0]?.source, 'panel_message');

    const eventReports: unknown[] = [];
    const eventBus = new PluginEventBus((error) => { eventReports.push(error); });
    let secondListenerRan = false;
    eventBus.subscribe('run', async (): Promise<void> => { throw new Error('event_listener_failed'); });
    eventBus.subscribe('run', async (): Promise<void> => { secondListenerRan = true; });
    await eventBus.publish('run');
    assert.equal(secondListenerRan, true);
    assert.equal(eventReports.length, 1);
});
