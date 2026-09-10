/**
 * @description Headless 复现 test-demos/cocos-for-agent/tools/mcp-tableview-scaffold.mjs：
 * scaffold cell/host prefab + scene，compAdd TableView 脚本族，校验树与序列化。
 */
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { CocosUuidCodec } from 'peanut-asset-catalog';

import { EditorMcpLumenGateway, EditorMcpPluginModule } from '../dist/index.js';

const TABLEVIEW_SCRIPTS = [
    ['TableView.ts', '11111111-1111-4111-8111-111111111111', 'export class TableView {}'],
    ['TableViewCell.ts', '22222222-2222-4222-8222-222222222222', 'export class TableViewCell {}'],
    ['TableViewDemoCell.ts', '33333333-4444-4555-8666-777777777777', 'export class TableViewDemoCell {}'],
    ['TableViewTestHarness.ts', '44444444-5555-4666-8777-888888888888', 'export class TableViewTestHarness {}'],
];

/**
 * @description 写入 TableView 验证脚本与 meta。
 * @param {string} root 项目根。
 * @returns {Record<string, string>} 类名 → uuid。
 */
function seedTableViewScripts(root) {
    const dir = join(root, 'assets/tests/tableview');
    mkdirSync(dir, { recursive: true });
    /** @type {Record<string, string>} */
    const uuids = {};
    for (const [name, uuid, body] of TABLEVIEW_SCRIPTS) {
        const className = name.replace(/\.ts$/, '');
        uuids[className] = uuid;
        writeFileSync(join(dir, name), `${body}\n`);
        writeFileSync(
            join(dir, `${name}.meta`),
            `${JSON.stringify(
                {
                    ver: '4.0.24',
                    importer: 'typescript',
                    imported: true,
                    uuid,
                    files: ['.js'],
                    subMetas: {},
                    userData: {},
                },
                null,
                2,
            )}\n`,
        );
    }
    return uuids;
}

/**
 * @description 激活带真实 lumen gateway 的 MCP 插件。
 * @param {string} projectPath 项目根。
 * @returns {Promise<EditorMcpPluginModule>}
 */
async function activatePlugin(projectPath) {
    const pluginModule = new EditorMcpPluginModule(undefined, new EditorMcpLumenGateway(async () => projectPath));
    await pluginModule.activate({
        plugin: { id: 'peanut.editor-mcp' },
        runtime: {
            version: {
                getCurrentVersion: () => ({
                    raw: '3.8.7',
                    major: 3,
                    minor: 8,
                    patch: 7,
                    stage: 'editor_api_38',
                    phase: 'editor_api_stable',
                }),
            },
            projectRead: {
                getProjectName: async () => 'tableview-scaffold',
                getProjectPath: async () => projectPath,
            },
        },
        services: { request: async () => ({}) },
        logger: { info() {}, warn() {}, error() {} },
    });
    return pluginModule;
}

/**
 * @description 在树中按名称查找节点。
 * @param {object | null | undefined} node 树根。
 * @param {string} name 节点名。
 * @returns {object | null}
 */
function findNodeByName(node, name) {
    if (!node) {
        return null;
    }
    if (node.name === name) {
        return node;
    }
    for (const child of node.children ?? []) {
        const hit = findNodeByName(child, name);
        if (hit) {
            return hit;
        }
    }
    return null;
}

/**
 * @description 断言 prefab/scene JSON 含指定脚本压缩 uuid。
 * @param {string} filePath 资产路径。
 * @param {string[]} compressedTypes 压缩 uuid 列表。
 */
function assertSerializedScriptTypes(filePath, compressedTypes) {
    const entries = JSON.parse(readFileSync(filePath, 'utf8'));
    for (const compressed of compressedTypes) {
        assert.equal(
            entries.some((entry) => entry.__type__ === compressed),
            true,
            `missing __type__ ${compressed} in ${filePath}`,
        );
    }
}

test('MCP lumen scaffolds TableView verify assets (headless playbook)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'peanut-editor-mcp-tableview-'));
    try {
        mkdirSync(join(root, 'assets'), { recursive: true });
        writeFileSync(join(root, 'package.json'), '{"name":"tableview-scaffold","creator":{"version":"3.8.7"}}\n');
        const uuids = seedTableViewScripts(root);
        const codec = new CocosUuidCodec();
        const tableViewCompressed = codec.compress(uuids.TableView);
        const demoCellCompressed = codec.compress(uuids.TableViewDemoCell);
        const harnessCompressed = codec.compress(uuids.TableViewTestHarness);

        const pluginModule = await activatePlugin(root);
        const call = (operation, input) => pluginModule.dispatchMcpAction('cocos.call', { operation, input });

        const cellPrefab = 'assets/tests/tableview/TableViewDemoCell.prefab';
        const hostPrefab = 'assets/tests/tableview/TableViewHost.prefab';
        const scenePath = 'assets/tests/tableview/TableViewTest.scene';

        await call('lumen.scaffold', {
            prefabRelativePath: cellPrefab,
            rootName: 'TableViewDemoCell',
            template: 'ui/Sprite',
        });
        await call('lumen.structure', {
            prefabRelativePath: cellPrefab,
            parentPath: '/TableViewDemoCell',
            recipe: {
                name: 'Label',
                template: 'ui/Label',
                props: { string: 'cell', fontSize: 28 },
            },
            autoCommit: false,
        });
        await call('lumen.compSet', {
            prefabRelativePath: cellPrefab,
            nodePath: '/TableViewDemoCell',
            componentType: 'cc.UITransform',
            props: { contentSize: { width: 280, height: 72 } },
            autoCommit: false,
        });
        await call('lumen.compAdd', {
            prefabRelativePath: cellPrefab,
            nodePath: '/TableViewDemoCell',
            scriptName: 'TableViewDemoCell',
            autoCommit: true,
        });

        const cellTree = await call('lumen.tree', { prefabRelativePath: cellPrefab });
        assert.equal(cellTree.data.kind, 'prefab');
        assert.ok(findNodeByName(cellTree.data.tree, 'Label'));
        assertSerializedScriptTypes(join(root, cellPrefab), [demoCellCompressed]);

        await call('lumen.scaffold', {
            prefabRelativePath: hostPrefab,
            rootName: 'TableViewHost',
            template: 'ui/ScrollView',
        });
        await call('lumen.compSet', {
            prefabRelativePath: hostPrefab,
            nodePath: '/TableViewHost',
            componentType: 'cc.UITransform',
            props: { contentSize: { width: 320, height: 520 } },
            autoCommit: false,
        });
        await call('lumen.compAdd', {
            prefabRelativePath: hostPrefab,
            nodePath: '/TableViewHost',
            scriptName: 'TableView',
            autoCommit: false,
        });
        await call('lumen.compAdd', {
            prefabRelativePath: hostPrefab,
            nodePath: '/TableViewHost',
            scriptName: 'TableViewTestHarness',
            autoCommit: true,
        });

        const hostTree = await call('lumen.tree', { prefabRelativePath: hostPrefab });
        const hostNode = hostTree.data.tree;
        assert.ok(hostNode.components.includes('cc.ScrollView'));
        assert.ok(hostNode.components.includes(tableViewCompressed));
        assert.ok(hostNode.components.includes(harnessCompressed));
        assertSerializedScriptTypes(join(root, hostPrefab), [tableViewCompressed, harnessCompressed]);

        await call('lumen.scaffold', {
            prefabRelativePath: scenePath,
            rootName: 'TableViewTest',
            template: 'ui/Canvas',
        });
        const sceneTree0 = await call('lumen.tree', { prefabRelativePath: scenePath });
        const canvasRoot = findNodeByName(sceneTree0.data.tree, 'Canvas')?.path ?? '/TableViewTest/Canvas';

        await call('lumen.structure', {
            prefabRelativePath: scenePath,
            parentPath: canvasRoot,
            recipe: {
                name: 'TableViewHost',
                template: 'ui/ScrollView',
            },
            autoCommit: false,
        });
        await call('lumen.compSet', {
            prefabRelativePath: scenePath,
            nodePath: `${canvasRoot}/TableViewHost`,
            componentType: 'cc.UITransform',
            props: { contentSize: { width: 320, height: 520 } },
            autoCommit: false,
        });
        await call('lumen.compAdd', {
            prefabRelativePath: scenePath,
            nodePath: `${canvasRoot}/TableViewHost`,
            scriptName: 'TableView',
            autoCommit: false,
        });
        await call('lumen.compAdd', {
            prefabRelativePath: scenePath,
            nodePath: `${canvasRoot}/TableViewHost`,
            scriptName: 'TableViewTestHarness',
            autoCommit: true,
        });

        const sceneTree = await call('lumen.tree', { prefabRelativePath: scenePath });
        const sceneHost = findNodeByName(sceneTree.data.tree, 'TableViewHost');
        assert.ok(sceneHost);
        assert.ok(sceneHost.components.includes(tableViewCompressed));
        assert.ok(sceneHost.components.includes(harnessCompressed));
        assert.equal(existsSync(join(root, scenePath)), true);
        assertSerializedScriptTypes(join(root, scenePath), [tableViewCompressed, harnessCompressed]);

        const catalog = await call('asset.catalog.lookup', {
            type: 'script',
            path: 'tests/tableview',
            limit: 20,
        });
        assert.ok(catalog.data.count >= 4);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
