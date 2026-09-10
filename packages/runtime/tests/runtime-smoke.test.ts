import assert from 'assert/strict';
import test from 'node:test';

import type { IAcceptedTask } from '../src/execution/ingress/task-ingress';

import { EditorApiHostAssetBridgeProvider, EditorApiHostSceneBridgeProvider, RuntimeFacade, TaskMerger } from '../src/index';
import { VersionResolver } from '../src/cocos/version/version-resolver';
import { RuntimeSmokeHarness } from '../src/integration/runtime-smoke-harness';

test('runtime smoke harness should resolve the 3.8 adapter and complete a task snapshot', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeSmokeHarness = new RuntimeSmokeHarness('3.8.7');
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const runtimeSmokeResult = await runtimeSmokeHarness.run();

    assert.equal(runtimeSmokeResult.adapterId, 'adapter-38');
    assert.notEqual(runtimeSmokeResult.taskSnapshot, null);
    assert.equal(runtimeSmokeResult.taskSnapshot?.pluginId, 'runtime-smoke-plugin');
    assert.equal(runtimeSmokeResult.taskSnapshot?.status, 'succeeded');
    assert.equal(runtimeSmokeResult.taskSnapshot?.kind, 'asset.query');
});

test('task merger should dedupe identical requests and batch compatible requests', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskMerger = new TaskMerger();
    // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
    const acceptedTasks: IAcceptedTask[] = [
        {
            taskId: 'task-1',
            request: {
                requestId: 'request-1',
                pluginId: 'plugin-a',
                scope: 'asset',
                priority: 'normal',
                kind: 'asset.query',
                payload: {
                    pathOrUuid: 'assets/example.prefab',
                },
                mergePolicy: 'dedupe',
                idempotencyKey: 'asset.query:assets/example.prefab',
            },
        },
        {
            taskId: 'task-2',
            request: {
                requestId: 'request-2',
                pluginId: 'plugin-b',
                scope: 'asset',
                priority: 'normal',
                kind: 'asset.query',
                payload: {
                    pathOrUuid: 'assets/example.prefab',
                },
                mergePolicy: 'dedupe',
                idempotencyKey: 'asset.query:assets/example.prefab',
            },
        },
        {
            taskId: 'task-3',
            request: {
                requestId: 'request-3',
                pluginId: 'plugin-c',
                scope: 'asset',
                priority: 'normal',
                kind: 'asset.refresh',
                payload: {
                    pathOrUuid: 'assets/example.prefab',
                },
                mergePolicy: 'batch_commit',
            },
        },
        {
            taskId: 'task-4',
            request: {
                requestId: 'request-4',
                pluginId: 'plugin-d',
                scope: 'asset',
                priority: 'normal',
                kind: 'asset.refresh',
                payload: {
                    pathOrUuid: 'assets/example-2.prefab',
                },
                mergePolicy: 'batch_commit',
            },
        },
    ];

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const taskMergeGroups = await taskMerger.merge(acceptedTasks);

    assert.equal(taskMergeGroups.length, 2);
    assert.equal(taskMergeGroups[0]?.mergePolicy, 'dedupe');
    assert.deepEqual(taskMergeGroups[0]?.taskIds, ['task-1', 'task-2']);
    assert.equal(taskMergeGroups[1]?.mergePolicy, 'batch_commit');
    assert.deepEqual(taskMergeGroups[1]?.taskIds, ['task-3', 'task-4']);
});

test('task merger should only coalesce requests with compatible payload shapes', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskMerger = new TaskMerger();
    // 累积当前流程产生的有序结果，供后续步骤统一返回或消费。
    const acceptedTasks: IAcceptedTask[] = [
        {
            taskId: 'task-a',
            request: {
                requestId: 'request-a',
                pluginId: 'plugin-a',
                scope: 'scene',
                priority: 'normal',
                kind: 'scene.patch',
                payload: {
                    nodeId: 'node-a',
                    patch: {
                        x: 1,
                        y: 2,
                    },
                },
                mergePolicy: 'coalesce',
            },
        },
        {
            taskId: 'task-b',
            request: {
                requestId: 'request-b',
                pluginId: 'plugin-b',
                scope: 'scene',
                priority: 'normal',
                kind: 'scene.patch',
                payload: {
                    nodeId: 'node-b',
                    patch: {
                        x: 3,
                        y: 4,
                    },
                },
                mergePolicy: 'coalesce',
            },
        },
        {
            taskId: 'task-c',
            request: {
                requestId: 'request-c',
                pluginId: 'plugin-c',
                scope: 'scene',
                priority: 'normal',
                kind: 'scene.patch',
                payload: {
                    nodeId: 'node-c',
                    patch: {
                        x: 5,
                    },
                },
                mergePolicy: 'coalesce',
            },
        },
    ];

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const taskMergeGroups = await taskMerger.merge(acceptedTasks);

    assert.equal(taskMergeGroups.length, 2);
    assert.deepEqual(taskMergeGroups[0]?.taskIds, ['task-a', 'task-b']);
    assert.deepEqual(taskMergeGroups[1]?.taskIds, ['task-c']);
});

test('execution runtime service should expose final task results after commit', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');
    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const taskReceipt = await runtimeFacade.execution.submit({
        requestId: 'result-query-request',
        pluginId: 'result-query-plugin',
        scope: 'asset',
        priority: 'normal',
        kind: 'asset.refresh',
        payload: {
            pathOrUuid: 'assets/example.prefab',
        },
        mergePolicy: 'batch_commit',
    });

    // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
    const taskResult = await runtimeFacade.execution.getResult(taskReceipt.taskId);

    assert.notEqual(taskResult, null);
    assert.equal(taskResult?.ok, true);
    assert.equal(taskResult?.status, 'succeeded');
    assert.equal(taskResult?.data?.canonicalTaskId, taskReceipt.taskId);
    assert.equal(taskResult?.data?.kind, 'asset.refresh');
    assert.equal(taskResult?.changes.length, 1);
});

test('runtime facade should route selection and project state through the active creator adapter', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');

    await runtimeFacade.selection.setActiveIds(['runtime-selection-a', 'runtime-selection-b']);
    await runtimeFacade.project.configure('projects/runtime-smoke', 'Runtime Smoke Project');

    assert.deepEqual(await runtimeFacade.selection.getActiveIds(), ['runtime-selection-a', 'runtime-selection-b']);
    assert.equal(await runtimeFacade.project.getProjectPath(), 'projects/runtime-smoke');
    assert.equal(await runtimeFacade.project.getProjectName(), 'Runtime Smoke Project');
});

test('runtime facade should support stable Editor API versions from 3.6 through 3.8', (): void => {
    assert.equal(new RuntimeFacade('3.6.4').version.getCurrentVersion().phase, 'editor_api_stable');
    assert.equal(new RuntimeFacade('3.7.4').version.getCurrentVersion().phase, 'editor_api_stable');
    assert.equal(new RuntimeFacade('3.8.7').version.getCurrentVersion().phase, 'editor_api_stable');
});

test('version resolver should classify roadmap phases for 2.4 and early 3.x', (): void => {
    assert.equal(new VersionResolver('2.4.13').getCurrentVersion().phase, 'creator_2x');
    assert.equal(new VersionResolver('3.0.1').getCurrentVersion().phase, 'creator_3x_early');
    assert.equal(new VersionResolver('3.5.2').getCurrentVersion().phase, 'creator_3x_early');
});

test('runtime facade should reject out-of-roadmap versions', (): void => {
    assert.throws((): RuntimeFacade => new RuntimeFacade('3.9.0'), /unsupported_cocos_creator_version:3\.9\.0/);
    assert.throws((): RuntimeFacade => new RuntimeFacade('2.3.4'), /unsupported_cocos_creator_version:2\.3\.4/);
});

test('runtime facade should resolve adapter-24 for Creator 2.4 and refuse writes without AssetDB', async (): Promise<void> => {
    const runtimeFacade = new RuntimeFacade('2.4.13');
    const profile = runtimeFacade.getActiveAdapterProfile();
    assert.equal(profile?.adapterId, 'adapter-24');
    assert.equal(profile?.supportLevel, 'minimal');
    assert.equal(runtimeFacade.version.getCurrentVersion().phase, 'creator_2x');
    await assert.rejects(
        () => runtimeFacade.asset.writePrefab('assets/ui/Panel.prefab', [{ __type__: 'cc.Prefab' }]),
        /adapter_24_write_refused/,
    );
});

test('runtime facade should write Prefab via adapter-24 when Editor.assetdb is available', async (): Promise<void> => {
    const calls: string[] = [];
    const store = new Map<string, string>();
    const hostGlobal = {
        Editor: {
            assetdb: {
                exists: (url: string) => store.has(url),
                urlToUuid: (url: string) => (store.has(url) ? `uuid:${url}` : null),
                uuidToUrl: (uuid: string) => (uuid.startsWith('uuid:') ? uuid.slice('uuid:'.length) : null),
                createOrSave: (url: string, data: string, callback?: (error: Error | null) => void) => {
                    calls.push(`createOrSave:${url}`);
                    store.set(url, data);
                    callback?.(null);
                },
                refresh: (url: string, callback?: (error: Error | null, result?: unknown) => void) => {
                    calls.push(`refresh:${url}`);
                    callback?.(null, { url });
                },
            },
        },
    };
    const runtimeFacade = new RuntimeFacade('2.4.13', { editorApiHostGlobal: hostGlobal });
    const profile = runtimeFacade.getActiveAdapterProfile();
    assert.equal(profile?.adapterId, 'adapter-24');
    assert.equal(profile?.supportLevel, 'compatible');
    const result = await runtimeFacade.asset.writePrefab('assets/ui/Panel.prefab', [
        { __type__: 'cc.Prefab', _name: 'Panel' },
    ]);
    assert.ok(calls.some((entry) => entry.startsWith('createOrSave:db://assets/ui/Panel.prefab')));
    assert.ok(calls.some((entry) => entry.startsWith('refresh:db://assets/ui/Panel.prefab')));
    assert.equal((result as { dbUrl?: string }).dbUrl, 'db://assets/ui/Panel.prefab');
});

test('runtime facade should resolve adapter-35 for Creator 3.0–3.5', (): void => {
    const runtimeFacade = new RuntimeFacade('3.5.2');
    const profile = runtimeFacade.getActiveAdapterProfile();
    assert.equal(profile?.adapterId, 'adapter-35');
    assert.equal(profile?.supportLevel, 'compatible');
    assert.equal(runtimeFacade.version.getCurrentVersion().phase, 'creator_3x_early');
});

test('runtime facade should expose read-only current scene and hierarchy snapshots', async (): Promise<void> => {
    const runtimeFacade = new RuntimeFacade('3.8.7');

    const currentSceneRoot = await runtimeFacade.scene.getCurrent();
    const sceneHierarchy = await runtimeFacade.scene.getHierarchy();

    assert.equal(currentSceneRoot?.nodeId, 'root-node');
    assert.equal(sceneHierarchy.some((node) => node.nodeId === 'root-node'), true);
});

test('runtime facade should export prefabs through Creator AssetDB and select the exported asset', async (): Promise<void> => {
    const requests: unknown[][] = [];
    const selections: unknown[][] = [];
    let queryCount = 0;
    const provider = new EditorApiHostAssetBridgeProvider({
        Editor: {
            Message: {
                request: async (...args: unknown[]): Promise<unknown> => {
                    requests.push(args);
                    if (args[1] === 'query-asset-info') {
                        queryCount += 1;
                        return queryCount === 1 ? null : { uuid: 'ui-panel-uuid' };
                    }
                    return { uuid: 'created-panel-uuid' };
                },
            },
            Selection: {
                select: async (...args: string[]): Promise<void> => {
                    selections.push(args);
                },
            },
        },
    });
    const runtimeFacade = new RuntimeFacade('3.8.7', { editorApiAssetBridgeProvider: provider });

    const exported = await runtimeFacade.asset.writePrefab('assets/ui/Panel.prefab', [{ __type__: 'cc.Prefab' }]);

    assert.deepEqual(requests.map((item) => item.slice(0, 3)), [
        ['asset-db', 'query-asset-info', 'db://assets/ui/Panel.prefab'],
        ['asset-db', 'create-asset', 'db://assets/ui/Panel.prefab'],
        ['asset-db', 'refresh-asset', 'db://assets/ui/Panel.prefab'],
        ['asset-db', 'query-asset-info', 'db://assets/ui/Panel.prefab'],
    ]);
    assert.deepEqual(selections, [['asset', 'ui-panel-uuid']]);
    assert.deepEqual(exported, {
        path: 'assets/ui/Panel.prefab',
        dbUrl: 'db://assets/ui/Panel.prefab',
        asset: { uuid: 'ui-panel-uuid' },
        uuid: 'ui-panel-uuid',
        selected: true,
    });
});

test('runtime facade should route scene reads and script execution through the Creator 3.8 scene-script adapter', async (): Promise<void> => {
    const requests: unknown[][] = [];
    const rootNode = {
        uuid: 'root-uuid',
        name: 'Root',
        active: true,
        children: [{ uuid: 'child-uuid', name: 'Child', active: true, children: [] }],
    };
    const flatHierarchy = [
        { uuid: 'root-uuid', name: 'Root', active: true, path: 'Root', children: [] },
        { uuid: 'child-uuid', name: 'Child', active: true, path: 'Root/Child', children: [] },
    ];
    const provider = new EditorApiHostSceneBridgeProvider('peanut.plugin-host', {
        Editor: {
            Message: {
                request: async (...args: unknown[]): Promise<unknown> => {
                    requests.push(args);
                    const options = args[2] as { method: string };
                    if (options.method === 'getCurrentScene') {
                        return rootNode;
                    }
                    if (options.method === 'getSceneHierarchy') {
                        // 宿主场景脚本返回带 path 的扁平列表（与 scene.ts collectSceneNodes 一致）。
                        return flatHierarchy;
                    }
                    return { ok: true };
                },
            },
        },
    });
    const runtimeFacade = new RuntimeFacade('3.8.7', { editorApiSceneBridgeProvider: provider });

    assert.deepEqual(await runtimeFacade.scene.getCurrent(), rootNode);
    assert.deepEqual(await runtimeFacade.scene.getHierarchy(), flatHierarchy);
    assert.deepEqual(await runtimeFacade.scene.execute('peanut.scene-tools', 'validateScene', [{ expectedNode: 'Root' }]), {
        ok: true,
    });
    assert.deepEqual(requests, [
        ['scene', 'execute-scene-script', { name: 'peanut.plugin-host', method: 'getCurrentScene', args: [] }],
        ['scene', 'execute-scene-script', { name: 'peanut.plugin-host', method: 'getSceneHierarchy', args: [] }],
        [
            'scene',
            'execute-scene-script',
            { name: 'peanut.scene-tools', method: 'validateScene', args: [{ expectedNode: 'Root' }] },
        ],
    ]);
});

test('runtime facade should return the Cocos-generated SpriteFrame UUID after importing a PNG', async (): Promise<void> => {
    let queryCount = 0;
    const provider = new EditorApiHostAssetBridgeProvider({
        Editor: {
            Message: {
                request: async (...args: unknown[]): Promise<unknown> => {
                    if (args[1] === 'query-asset-info') {
                        queryCount += 1;
                        return queryCount <= 2
                            ? null
                            : { uuid: 'texture-uuid', subMetas: { spriteFrame: { uuid: 'sprite-frame-uuid' } } };
                    }
                    return { uuid: 'created-texture-uuid' };
                },
            },
        },
    });
    const runtimeFacade = new RuntimeFacade('3.8.7', { editorApiAssetBridgeProvider: provider });

    const imported = await runtimeFacade.asset.writeBinary('assets/ui/Profile.png', new Uint8Array([137, 80, 78, 71]), 'image/png');

    assert.deepEqual(imported, {
        path: 'assets/ui/Profile.png',
        dbUrl: 'db://assets/ui/Profile.png',
        asset: { uuid: 'texture-uuid', subMetas: { spriteFrame: { uuid: 'sprite-frame-uuid' } } },
        mediaType: 'image/png',
        byteLength: 4,
        uuid: 'texture-uuid',
        spriteFrameUuid: 'sprite-frame-uuid',
    });
});

test('runtime facade should read the SpriteFrame UUID when query-asset-info keys subAssets by Cocos class id f9941', async (): Promise<void> => {
    const provider = new EditorApiHostAssetBridgeProvider({
        Editor: {
            Message: {
                request: async (...args: unknown[]): Promise<unknown> => {
                    if (args[1] === 'query-asset-info') {
                        return {
                            uuid: 'image-uuid',
                            subAssets: {
                                f9941: { uuid: 'image-uuid@f9941', name: 'spriteFrame' },
                                '6c48a': { uuid: 'image-uuid@6c48a', name: 'texture' },
                            },
                        };
                    }
                    return { uuid: 'created-texture-uuid' };
                },
            },
        },
    });
    const runtimeFacade = new RuntimeFacade('3.8.7', { editorApiAssetBridgeProvider: provider });

    const imported = await runtimeFacade.asset.writeBinary('assets/ui/Icon.png', new Uint8Array([137, 80, 78, 71]), 'image/png');

    assert.equal(imported.spriteFrameUuid, 'image-uuid@f9941');
});

test('runtime facade should resolve SpriteFrame UUIDs from a single query-assets batch keyed by f9941', async (): Promise<void> => {
    interface ISubSnapshot {
        readonly uuid: string;
        readonly name: string;
    }
    interface IQueryAssetSnapshot {
        readonly path: string;
        readonly subAssets?: Readonly<Record<string, ISubSnapshot>>;
    }

    const provider = new EditorApiHostAssetBridgeProvider({
        Editor: {
            Message: {
                request: async (...args: unknown[]): Promise<unknown> => {
                    if (args[1] === 'query-assets') {
                        return [
                            {
                                uuid: 'img-a',
                                importer: 'image',
                                name: 'a.png',
                                url: 'db://assets/ui/Panel.assets/a.png',
                                subAssets: {
                                    f9941: { uuid: 'img-a@f9941', importer: 'sprite-frame', name: 'spriteFrame' },
                                    '6c48a': { uuid: 'img-a@6c48a', importer: 'texture', name: 'texture' },
                                },
                            },
                            {
                                uuid: 'img-b',
                                importer: 'image',
                                name: 'b.png',
                                url: 'db://assets/ui/Panel.assets/b.png',
                                subAssets: {
                                    f9941: { uuid: 'img-b@f9941', importer: 'sprite-frame', name: 'spriteFrame' },
                                },
                            },
                        ];
                    }
                    return [];
                },
            },
        },
    });
    const runtimeFacade = new RuntimeFacade('3.8.7', { editorApiAssetBridgeProvider: provider });

    const snapshots = (await runtimeFacade.asset.queryAssets({ pattern: 'db://assets/ui/Panel.assets' })) as readonly IQueryAssetSnapshot[];

    assert.equal(snapshots.length, 2);
    const byPath = new Map<string, string>();
    for (const snapshot of snapshots) {
        const sub = snapshot.subAssets;
        if (sub == null) {
            continue;
        }
        for (const subSnapshot of Object.values(sub)) {
            if (subSnapshot.uuid.endsWith('@f9941')) {
                byPath.set(snapshot.path, subSnapshot.uuid);
            }
        }
    }
    assert.equal(byPath.get('assets/ui/Panel.assets/a.png'), 'img-a@f9941');
    assert.equal(byPath.get('assets/ui/Panel.assets/b.png'), 'img-b@f9941');
});

test('runtime facade should repair a PNG meta missing its SpriteFrame before binding it', async (): Promise<void> => {
    const requests: unknown[][] = [];
    let queryCount = 0;
    const provider = new EditorApiHostAssetBridgeProvider({
        Editor: {
            Message: {
                request: async (...args: unknown[]): Promise<unknown> => {
                    requests.push(args);
                    if (args[1] === 'query-asset-info') {
                        queryCount += 1;
                        return queryCount === 1
                            ? null
                            : queryCount === 2
                                ? { uuid: 'texture-uuid' }
                                : { uuid: 'texture-uuid', subMetas: { spriteFrame: { uuid: 'texture-uuid@f9941' } } };
                    }
                    if (args[1] === 'query-asset-meta') {
                        return { importer: 'image', uuid: 'texture-uuid', subMetas: {} };
                    }
                    return { uuid: 'created-texture-uuid' };
                },
            },
        },
    });
    const runtimeFacade = new RuntimeFacade('3.8.7', { editorApiAssetBridgeProvider: provider });
    const png = new Uint8Array([
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
        0, 0, 0, 2, 0, 0, 0, 3, 8, 6, 0, 0, 0, 0, 0, 0, 0,
    ]);

    const imported = await runtimeFacade.asset.writeBinary('assets/ui/Repaired.png', png, 'image/png');

    assert.match(JSON.stringify(imported), /texture-uuid@f9941/u);
    const savedMetaRequest = requests.find((request) => request[1] === 'save-asset-meta');
    assert.notEqual(savedMetaRequest, undefined);
    assert.match(String(savedMetaRequest?.[3]), /"importer": "sprite-frame"/u);
    assert.match(String(savedMetaRequest?.[3]), /"width": 2/u);
    assert.match(String(savedMetaRequest?.[3]), /"height": 3/u);
});

test('runtime facade should write a provider trace JSON through the Creator AssetDB bridge', async (): Promise<void> => {
    const requests: unknown[][] = [];
    const provider = new EditorApiHostAssetBridgeProvider({
        Editor: {
            Message: {
                request: async (...args: unknown[]): Promise<unknown> => {
                    requests.push(args);
                    if (args[1] === 'query-asset-info') {
                        return null;
                    }
                    return { uuid: 'trace-uuid' };
                },
            },
        },
    });
    const runtimeFacade = new RuntimeFacade('3.8.7', { editorApiAssetBridgeProvider: provider });

    const written = await runtimeFacade.asset.writeBinary('assets/ui/Profile.trace/figma-ui-config.json', new TextEncoder().encode('{"schemaVersion":"ui-design-config.v2"}'), 'application/json');

    assert.deepEqual(written, {
        path: 'assets/ui/Profile.trace/figma-ui-config.json',
        dbUrl: 'db://assets/ui/Profile.trace/figma-ui-config.json',
        asset: { uuid: 'trace-uuid' },
        mediaType: 'application/json',
        byteLength: 39,
        uuid: 'trace-uuid',
        spriteFrameUuid: null,
    });
    assert.deepEqual(requests.map((request) => request.slice(0, 2)), [
        ['asset-db', 'query-asset-info'],
        ['asset-db', 'create-asset'],
        ['asset-db', 'refresh-asset'],
        ['asset-db', 'query-asset-info'],
    ]);
});

test('runtime facade should delete an explicitly addressed AssetDB resource', async (): Promise<void> => {
    const requests: unknown[][] = [];
    const provider = new EditorApiHostAssetBridgeProvider({
        Editor: {
            Message: {
                request: async (...args: unknown[]): Promise<unknown> => {
                    requests.push(args);
                    return null;
                },
            },
        },
    });
    const runtimeFacade = new RuntimeFacade('3.8.7', { editorApiAssetBridgeProvider: provider });

    await runtimeFacade.asset.deleteAsset('assets/ui/Panel.assets/obsolete.png');

    assert.deepEqual(requests, [['asset-db', 'delete-asset', 'db://assets/ui/Panel.assets/obsolete.png']]);
});
