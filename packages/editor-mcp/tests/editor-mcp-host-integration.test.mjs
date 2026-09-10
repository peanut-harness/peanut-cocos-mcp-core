import assert from 'assert/strict';
import test from 'node:test';

import { PluginManagerApp } from 'peanut-plugin-core';
import { RuntimeFacade } from 'peanut-runtime';

import { createPluginModule } from '../dist/index.js';

test('Editor MCP plugin should route actions through PluginManager runtime grants and SnowB services', async () => {
    const runtimeFacade = new RuntimeFacade('3.8.7', {
        allowMemoryPanelWindowProviderFallback: true,
    });
    await runtimeFacade.project.configure('projects/editor-mcp', 'Editor MCP Project');
    await runtimeFacade.selection.setActiveIds(['editor-mcp-selected-node']);

    const pluginManagerApp = new PluginManagerApp(runtimeFacade);
    const pluginModule = createPluginModule();
    pluginManagerApp.registerManifest({
        manifest: pluginModule.manifest,
        installPath: 'plugins/peanut.editor-mcp',
        trustLevel: 'builtin',
    });
    pluginManagerApp.attachModule(pluginModule.manifest.id, pluginModule);

    const snowbServiceModule = {
        manifest: {
            ...pluginModule.manifest,
            id: 'snowb.bmfont',
            displayName: 'SnowB BMFont Test Service',
            main: './snowb.bmfont.bundle.js',
        },
        async register() {},
        async activate(context) {
            context.services.register('bmfont.export', async (callerPluginId, request) => ({ callerPluginId, request }));
        },
        async deactivate() {},
        async dispose() {},
    };
    pluginManagerApp.registerManifest({
        manifest: snowbServiceModule.manifest,
        installPath: 'plugins/snowb.bmfont',
        trustLevel: 'builtin',
    });
    pluginManagerApp.attachModule(snowbServiceModule.manifest.id, snowbServiceModule);

    await pluginManagerApp.activatePlugin(snowbServiceModule.manifest.id);
    await pluginManagerApp.activatePlugin(pluginModule.manifest.id);

    const mcpCapabilityRegistry = pluginManagerApp.getMcpCapabilityRegistry();
    const readOnlyCatalog = mcpCapabilityRegistry.getCatalog().capabilities;
    const readOnlyNames = readOnlyCatalog.map((capability) => capability.name);
    // 默认 read_only 曝光：只出现只读一级工具，写/删工具不出现。
    assert.equal(
        readOnlyCatalog.every((capability) => capability.readOnly === true),
        true,
    );
    assert.equal(readOnlyNames.includes('peanut.editor-mcp.editor-query-version'), true);
    assert.equal(readOnlyNames.includes('peanut.editor-mcp.lumen-inspect'), true);
    assert.equal(readOnlyNames.includes('peanut.editor-mcp.asset-import-plan'), true);
    assert.equal(readOnlyNames.includes('peanut.editor-mcp.asset-import'), false);
    assert.equal(readOnlyNames.includes('peanut.editor-mcp.lumen-comp-set'), false);
    // 旧入口工具已彻底移除。
    assert.equal(readOnlyNames.includes('peanut.editor-mcp.call'), false);
    assert.equal(readOnlyNames.includes('peanut.editor-mcp.query'), false);
    assert.equal(readOnlyNames.includes('peanut.editor-mcp.capabilities'), false);

    mcpCapabilityRegistry.setPluginExposure(pluginModule.manifest.id, 'all');
    const fullNames = mcpCapabilityRegistry.getCatalog().capabilities.map((capability) => capability.name);
    assert.equal(fullNames.includes('peanut.editor-mcp.asset-import'), true);
    assert.equal(fullNames.includes('peanut.editor-mcp.lumen-comp-set'), true);
    assert.equal(fullNames.includes('peanut.editor-mcp.lumen-node-rm'), true);
    assert.equal(fullNames.includes('peanut.editor-mcp.snowb-bmfont-export'), true);
    // 每个工具名唯一。
    assert.equal(new Set(fullNames).size, fullNames.length);

    const projectResult = await pluginModule.dispatchMcpAction('cocos.call', {
        operation: 'editor.queryProject',
    });
    const selectionResult = await pluginModule.dispatchMcpAction('editor-mcp.execute', {
        operation: 'editor.querySelection',
    });
    const sceneResult = await pluginModule.dispatchMcpAction('cocos.call', {
        operation: 'scene.getCurrent',
    });
    const snowbResult = await pluginModule.dispatchMcpAction('cocos.call', {
        operation: 'snowb.bmfont.export',
        input: {
            configRelativePath: 'assets/fonts/figma-export.json',
            outputRelativePath: 'assets/fonts/generated',
            exportFormat: 'text',
        },
    });

    assert.equal(projectResult.data.name, 'Editor MCP Project');
    assert.equal(projectResult.data.path, 'projects/editor-mcp');
    assert.deepEqual(selectionResult.data, {
        ids: ['editor-mcp-selected-node'],
        items: [{ id: 'editor-mcp-selected-node' }],
        count: 1,
    });
    assert.equal(sceneResult.data?.nodeId, 'root-node');
    assert.equal(snowbResult.data.callerPluginId, 'peanut.editor-mcp');
    assert.deepEqual(snowbResult.data.request, {
        action: 'export',
        projectDirectory: 'projects/editor-mcp',
        configRelativePath: 'assets/fonts/figma-export.json',
        sbfName: undefined,
        outputRelativePath: 'assets/fonts/generated',
        exportFormat: 'text',
    });

    await pluginManagerApp.deactivatePlugin(pluginModule.manifest.id, 'manual_disable');
    await pluginManagerApp.deactivatePlugin(snowbServiceModule.manifest.id, 'manual_disable');

    assert.equal(pluginManagerApp.getMcpCapabilityRegistry().getCatalog().capabilities.length, 0);

    await assert.rejects(async () => pluginModule.dispatchMcpAction('cocos.capabilities'), /editor_mcp_not_active/);
});
