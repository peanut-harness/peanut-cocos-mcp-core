import assert from 'assert/strict';
import { createServer } from 'http';
import test from 'node:test';

import type { IGrantedPermissionSet, IPluginRuntimeMeta } from 'peanut-contracts';
import { RuntimeFacade } from 'peanut-runtime';

import { PluginLeaseStore } from '../src/hotplug/plugin-lease-store';
import { NativeCapabilityRegistry } from '../src/grants/native-capability-registry';
import { DesignSourceCapabilityRegistry } from '../src/grants/design-source-capability-registry';
import { CompatiblePluginNetworkTransport, type IPluginNetworkTransport } from '../src/grants/plugin-network-transport';
import { RuntimeGrantFactory } from '../src/grants/runtime-grant-factory';
import type { ICanvasService } from '../src/shared/plugin-manager-contracts';

test('runtime grant factory should expose only granted clients and release them with plugin leases', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ runtimeFacade = new RuntimeFacade('3.8.7');
    await runtimeFacade.selection.setActiveIds(['grant-selection-node']);
    await runtimeFacade.project.configure('projects/grant-plugin', 'Grant Plugin Project');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ runtimeGrantFactory = new RuntimeGrantFactory(runtimeFacade, new PluginLeaseStore());
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginRuntimeMeta: IPluginRuntimeMeta = {
        id: 'grant.plugin',
        version: '0.1.0',
        installPath: 'plugins/grant-plugin',
        trustLevel: 'builtin',
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ grantedPermissionSet: IGrantedPermissionSet = {
        pluginId: pluginRuntimeMeta.id,
        grantedAt: '2026-07-09T00:00:00.000Z',
        permissions: {
            editorMessages: ['grant:ping'],
            assetDb: {
                read: true,
                write: false,
                delete: false,
            },
        },
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginLeaseStore = new PluginLeaseStore();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ runtimeGrantFactoryWithLeaseStore = new RuntimeGrantFactory(runtimeFacade, pluginLeaseStore);

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ grantedRuntimeClientSet = runtimeGrantFactoryWithLeaseStore.create(pluginRuntimeMeta, grantedPermissionSet);

    assert.notEqual(grantedRuntimeClientSet.version, undefined);
    assert.notEqual(grantedRuntimeClientSet.message, undefined);
    assert.notEqual(grantedRuntimeClientSet.assetRead, undefined);
    assert.equal(grantedRuntimeClientSet.scene, undefined);
    assert.notEqual(grantedRuntimeClientSet.selection, undefined);
    assert.notEqual(grantedRuntimeClientSet.projectRead, undefined);
    assert.notEqual(runtimeGrantFactoryWithLeaseStore.get(pluginRuntimeMeta.id), null);
    assert.deepEqual(await grantedRuntimeClientSet.selection?.getActiveIds(), ['grant-selection-node']);
    assert.equal(await grantedRuntimeClientSet.projectRead?.getProjectName(), 'Grant Plugin Project');
    assert.equal(await grantedRuntimeClientSet.projectRead?.getProjectPath(), 'projects/grant-plugin');
    assert.equal(grantedRuntimeClientSet.version.getCurrentVersion().raw, '3.8.7');

    await pluginLeaseStore.releasePlugin(pluginRuntimeMeta.id);

    assert.equal(runtimeGrantFactoryWithLeaseStore.get(pluginRuntimeMeta.id), null);
    assert.equal(runtimeGrantFactory.get(pluginRuntimeMeta.id), null);
    await assert.rejects(async (): Promise<void> => {
        await grantedRuntimeClientSet.selection?.getActiveIds();
    }, /revoked/);
    await assert.rejects(async (): Promise<void> => {
        await grantedRuntimeClientSet.projectRead?.getProjectName();
    }, /revoked/);
    assert.throws((): void => {
        grantedRuntimeClientSet.version.getCurrentVersion();
    }, /revoked/);
});

test('runtime grant factory should provide and revoke an authorized Canvas capability', async (): Promise<void> => {
    // 保存模拟宿主运行时，Canvas capability 的授权不依赖真实 Creator API。
    const runtimeFacade = new RuntimeFacade('3.8.7');
    // 保存当前测试的插件 lease 存储，用于验证 native service 会随插件停用失效。
    const pluginLeaseStore = new PluginLeaseStore();
    // 保存宿主原生 capability 注册表；测试通过显式注册避免依赖磁盘原生载荷。
    const nativeCapabilityRegistry = new NativeCapabilityRegistry();
    // 保存最小 Canvas 服务实现，覆盖创建、绘制和 PNG 编码的受控边界。
    const canvasService: ICanvasService = {
        createSurface: (width: number, height: number) => ({
            width,
            height,
            getContext2D: () => ({ drawImage: (): void => {} }),
            toPng: (): Uint8Array => new Uint8Array([137, 80, 78, 71]),
        }),
        loadImage: async (): Promise<{ width: number; height: number }> => ({ width: 1, height: 1 }),
    };
    nativeCapabilityRegistry.registerCanvas('1.0.0', canvasService);
    // 保存带 native capability 的 runtime grant 工厂。
    const runtimeGrantFactory = new RuntimeGrantFactory(runtimeFacade, pluginLeaseStore, nativeCapabilityRegistry);
    // 保存请求 Canvas 1.x 的插件运行时元信息。
    const pluginRuntimeMeta: IPluginRuntimeMeta = {
        id: 'grant.native-plugin',
        version: '0.1.0',
        installPath: 'plugins/grant-native-plugin',
        trustLevel: 'builtin',
    };
    // 保存包含 Canvas capability 请求的最终授权集合。
    const grantedPermissionSet: IGrantedPermissionSet = {
        pluginId: pluginRuntimeMeta.id,
        grantedAt: '2026-07-21T00:00:00.000Z',
        permissions: {
            native: {
                requirements: {
                    canvas: '^1.0.0',
                },
            },
        },
    };

    const grantedRuntimeClientSet = runtimeGrantFactory.create(pluginRuntimeMeta, grantedPermissionSet);
    const surface = grantedRuntimeClientSet.native.canvas?.createSurface(16, 8);
    assert.equal(surface?.width, 16);
    assert.deepEqual(surface?.toPng(), new Uint8Array([137, 80, 78, 71]));

    await pluginLeaseStore.releasePlugin(pluginRuntimeMeta.id);

    assert.throws((): void => {
        grantedRuntimeClientSet.native.canvas?.createSurface(1, 1);
    }, /revoked/);
});

test('runtime grant factory should expose AssetDB deletion only when separately granted', async (): Promise<void> => {
    const runtimeFacade = new RuntimeFacade('3.8.7');
    const pluginLeaseStore = new PluginLeaseStore();
    const runtimeGrantFactory = new RuntimeGrantFactory(runtimeFacade, pluginLeaseStore);
    const pluginRuntimeMeta: IPluginRuntimeMeta = { id: 'grant.asset-delete-plugin', version: '0.1.0', installPath: 'plugins/grant-asset-delete-plugin', trustLevel: 'builtin' };
    const grantedRuntimeClientSet = runtimeGrantFactory.create(pluginRuntimeMeta, {
        pluginId: pluginRuntimeMeta.id,
        grantedAt: '2026-08-03T00:00:00.000Z',
        permissions: { assetDb: { read: false, write: false, delete: true } },
    });

    assert.notEqual(grantedRuntimeClientSet.assetDelete, undefined);
    await grantedRuntimeClientSet.assetDelete?.deleteAsset('assets/ui/obsolete.png');
    await pluginLeaseStore.releasePlugin(pluginRuntimeMeta.id);
    await assert.rejects(async (): Promise<void> => {
        await grantedRuntimeClientSet.assetDelete?.deleteAsset('assets/ui/obsolete.png');
    }, /revoked/);
});

test('runtime grant factory should inject only public design source capability descriptors', (): void => {
    const runtimeFacade = new RuntimeFacade('3.8.7');
    const pluginLeaseStore = new PluginLeaseStore();
    const designSourceCapabilityRegistry = new DesignSourceCapabilityRegistry();
    designSourceCapabilityRegistry.replace([
        { id: 'figma', available: true, version: '0.1.0' },
        { id: 'psd', available: false, reason: 'native_capability_unavailable' },
    ]);
    const runtimeGrantFactory = new RuntimeGrantFactory(runtimeFacade, pluginLeaseStore, undefined, designSourceCapabilityRegistry);
    const pluginRuntimeMeta: IPluginRuntimeMeta = {
        id: 'grant.design-source-plugin', version: '0.1.0', installPath: 'plugins/grant-design-source-plugin', trustLevel: 'builtin',
    };
    const grantedPermissionSet: IGrantedPermissionSet = {
        pluginId: pluginRuntimeMeta.id, grantedAt: '2026-08-01T00:00:00.000Z', permissions: {},
    };

    const grantedRuntimeClientSet = runtimeGrantFactory.create(pluginRuntimeMeta, grantedPermissionSet);

    assert.deepEqual(grantedRuntimeClientSet.designSources, [
        { id: 'figma', available: true, version: '0.1.0' },
        { id: 'psd', available: false, reason: 'native_capability_unavailable' },
    ]);
});

test('runtime grant factory should reject network domains outside the manifest grant', async (): Promise<void> => {
    const runtimeGrantFactory = new RuntimeGrantFactory(new RuntimeFacade('3.8.7'), new PluginLeaseStore());
    const pluginRuntimeMeta: IPluginRuntimeMeta = {
        id: 'grant.network-plugin', version: '0.1.0', installPath: 'plugins/grant-network-plugin', trustLevel: 'builtin',
    };
    const grantedPermissionSet: IGrantedPermissionSet = {
        pluginId: pluginRuntimeMeta.id,
        grantedAt: '2026-08-01T00:00:00.000Z',
        permissions: { network: { allowHttp: true, allowWebSocket: false, domains: ['api.figma.com'] } },
    };
    const network = runtimeGrantFactory.create(pluginRuntimeMeta, grantedPermissionSet).network;

    await assert.rejects(async (): Promise<void> => {
        await network?.fetch({ url: 'https://example.com/blocked' });
    }, /plugin_network_domain_not_granted:example\.com/);
});

test('runtime grant factory should use an injected network transport on Creator 3.8.3', async (): Promise<void> => {
    const transport: IPluginNetworkTransport = {
        fetch: async () => ({
            ok: true,
            status: 200,
            json: async (): Promise<unknown> => ({ source: 'legacy-editor-host' }),
            arrayBuffer: async (): Promise<ArrayBuffer> => new ArrayBuffer(0),
        }),
    };
    const runtimeGrantFactory = new RuntimeGrantFactory(
        new RuntimeFacade('3.8.3'),
        new PluginLeaseStore(),
        undefined,
        undefined,
        transport,
    );
    const pluginRuntimeMeta: IPluginRuntimeMeta = {
        id: 'grant.compat-network-plugin', version: '0.1.0', installPath: 'plugins/grant-compat-network-plugin', trustLevel: 'builtin',
    };
    const grantedPermissionSet: IGrantedPermissionSet = {
        pluginId: pluginRuntimeMeta.id,
        grantedAt: '2026-08-05T00:00:00.000Z',
        permissions: { network: { allowHttp: true, allowWebSocket: false, domains: ['api.figma.com'] } },
    };

    const response = await runtimeGrantFactory.create(pluginRuntimeMeta, grantedPermissionSet).network?.fetch({ url: 'https://api.figma.com/v1/me' });

    assert.deepEqual(await response?.json(), { source: 'legacy-editor-host' });
});

test('compatible network transport should read an HTTP response without relying on fetch', async (): Promise<void> => {
    const server = createServer((_request, response): void => {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ transport: 'node-http' }));
    });
    await new Promise<void>((resolve, reject): void => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
    });
    try {
        const serverAddress = server.address();
        assert.notEqual(serverAddress, null);
        assert.equal(typeof serverAddress, 'object');
        const port = (serverAddress as { readonly port: number }).port;
        const response = await new CompatiblePluginNetworkTransport().fetch({ url: `http://127.0.0.1:${port}/compatibility` });

        assert.equal(response.ok, true);
        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { transport: 'node-http' });
    } finally {
        await new Promise<void>((resolve, reject): void => {
            server.close((error): void => error == null ? resolve() : reject(error));
        });
    }
});
