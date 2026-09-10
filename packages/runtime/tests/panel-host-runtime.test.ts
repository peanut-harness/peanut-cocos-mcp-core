import assert from 'assert/strict';
import test from 'node:test';

import type { IEditorApiPanelWindowLaunchRequest } from '../src/index';

import {
    EditorApiHostPanelWindowProvider,
    EditorApiPanelHostBridgeRegistry,
    EditorApiPanelHostInstaller,
    EditorApiWindowBackedPanelHostBridge,
    MissingEditorApiPanelHostError,
    RuntimeFacade,
} from '../src/index';

test('panel host runtime service should keep host container session snapshots and browser bindings', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const browserWindow: Record<string, unknown> = {
        documentTitle: 'Plugin Manager Panel',
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const bootstrapScript = 'window.acquirePanelBridge = async function acquirePanelBridge() { return window.panelBridge; };';

    await runtimeFacade.panelHost.open('builtin.plugin-manager.panel', 'panels/plugin-manager/index.html');
    await runtimeFacade.panelHost.setBootstrapScript('builtin.plugin-manager.panel', bootstrapScript);
    await runtimeFacade.panelHost.attachBrowserWindow('builtin.plugin-manager.panel', browserWindow);
    await runtimeFacade.panelHost.focus('builtin.plugin-manager.panel');

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const panelHostSessionSnapshot = await runtimeFacade.panelHost.getSession('builtin.plugin-manager.panel');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const panelHostSessionSnapshots = await runtimeFacade.panelHost.listSessions();

    assert.notEqual(panelHostSessionSnapshot, null);
    assert.equal(panelHostSessionSnapshot?.panelId, 'builtin.plugin-manager.panel');
    assert.equal(panelHostSessionSnapshot?.entry, 'panels/plugin-manager/index.html');
    assert.equal(panelHostSessionSnapshot?.isOpen, true);
    assert.equal(panelHostSessionSnapshot?.hasFocus, true);
    assert.equal(panelHostSessionSnapshot?.hasBrowserWindow, true);
    assert.equal(panelHostSessionSnapshot?.hasBootstrapScript, true);
    assert.equal(panelHostSessionSnapshot?.bootstrapScript, bootstrapScript);
    assert.equal(panelHostSessionSnapshots.length, 1);
    assert.equal(panelHostSessionSnapshots[0]?.panelId, 'builtin.plugin-manager.panel');
});

test('panel host runtime service should remove host container session snapshots after close', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');

    await runtimeFacade.panelHost.open('builtin.panel.main', 'panels/builtin-panel/index.html');
    assert.notEqual(await runtimeFacade.panelHost.getSession('builtin.panel.main'), null);

    await runtimeFacade.panelHost.close('builtin.panel.main');

    assert.equal(await runtimeFacade.panelHost.getSession('builtin.panel.main'), null);
    assert.equal((await runtimeFacade.panelHost.listSessions()).length, 0);
});

test('panel host runtime service should require a real editor-api host bridge by default on 3.8.7', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const bootstrapScript = 'window.acquirePanelBridge = async function acquirePanelBridge() { return window.panelBridge; };';

    await assert.rejects(
        async (): Promise<void> => {
            await runtimeFacade.panelHost.launchContainer('builtin.panel.main', 'panels/builtin-panel/index.html', bootstrapScript);
        },
        (error: unknown): boolean => {
            return error instanceof MissingEditorApiPanelHostError;
        },
    );
});

test('panel host runtime service should allow an explicit memory fallback for tests on 3.8.7', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7', {
        allowMemoryPanelWindowProviderFallback: true,
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const bootstrapScript = 'window.acquirePanelBridge = async function acquirePanelBridge() { return window.panelBridge; };';

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const panelHostLaunchResult = await runtimeFacade.panelHost.launchContainer(
        'builtin.panel.memory-fallback',
        'panels/builtin-panel/index.html',
        bootstrapScript,
    );

    assert.equal(panelHostLaunchResult.session.panelId, 'builtin.panel.memory-fallback');
    assert.equal(panelHostLaunchResult.browserWindow?.__EDITOR_PANEL_HOST__?.hostSurface, 'editor-api-webview');
    assert.equal(panelHostLaunchResult.browserWindow?.__PEANUT_PANEL_BOOTSTRAP_SCRIPT__, bootstrapScript);
});

test('panel host runtime service should launch an editor-api container through an installed host bridge on 3.8.7', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const hostGlobal: Record<string, unknown> = {};
    new EditorApiPanelHostInstaller(hostGlobal).installWindowFactory({
        /** @description 执行当前模块对外提供的处理流程。
 * @returns 当前操作完成后产生的处理结果。
 */
        async createWindow(): Promise<{
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            loadURL: (entry: string) => void;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            executeJavaScript: () => void;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            hostWindowId: string;
        }> {
            return {
                loadURL: () => {},
                executeJavaScript: () => {},
                hostWindowId: 'runtime-test-window',
            };
        },
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7', {
        editorApiHostGlobal: hostGlobal,
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const bootstrapScript = 'window.acquirePanelBridge = async function acquirePanelBridge() { return window.panelBridge; };';

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const panelHostLaunchResult = await runtimeFacade.panelHost.launchContainer(
        'builtin.panel.main',
        'panels/builtin-panel/index.html',
        bootstrapScript,
    );

    assert.equal(panelHostLaunchResult.session.panelId, 'builtin.panel.main');
    assert.equal(panelHostLaunchResult.session.entry, 'panels/builtin-panel/index.html');
    assert.equal(panelHostLaunchResult.session.hasBrowserWindow, true);
    assert.equal(panelHostLaunchResult.session.hasBootstrapScript, true);
    assert.equal(typeof panelHostLaunchResult.browserWindow === 'object' && panelHostLaunchResult.browserWindow != null, true);
    assert.equal(panelHostLaunchResult.browserWindow?.location?.href, 'panels/builtin-panel/index.html');
    assert.equal(panelHostLaunchResult.browserWindow?.__EDITOR_PANEL_HOST__?.hostSurface, 'editor-api-webview');
    assert.equal(panelHostLaunchResult.browserWindow?.__PEANUT_PANEL_BOOTSTRAP_SCRIPT__, bootstrapScript);
    assert.equal(panelHostLaunchResult.browserWindow?.hostWindowId, 'runtime-test-window');
});

test('runtime facade should allow injecting a custom editor-api panel window provider', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    let capturedLaunchRequest: IEditorApiPanelWindowLaunchRequest | null = null;
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7', {
        editorApiPanelWindowProvider: {
            /** @description 执行当前模块对外提供的处理流程。
 * @param request 当前调用所需的输入参数，决定本次处理的目标或行为。
 * @returns 当前操作完成后产生的处理结果。
 */
            launchPanelWindow(request: IEditorApiPanelWindowLaunchRequest) {
                capturedLaunchRequest = request;
                return {
                    location: {
                        href: `custom://${request.entry}`,
                    },
                    __EDITOR_PANEL_HOST__: {
                        adapterId: request.adapterId,
                        hostSurface: 'editor-api-webview',
                        panelId: request.panelId,
                        entry: request.entry,
                    },
                    __PEANUT_PANEL_BOOTSTRAP_SCRIPT__: request.bootstrapScript,
                    __CUSTOM_PROVIDER__: true,
                };
            },
        },
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const bootstrapScript = 'window.panelBridge = { ready: true };';

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const panelHostLaunchResult = await runtimeFacade.panelHost.launchContainer(
        'custom.panel.main',
        'panels/custom/index.html',
        bootstrapScript,
    );

    assert.notEqual(capturedLaunchRequest, null);
    assert.equal(capturedLaunchRequest?.panelId, 'custom.panel.main');
    assert.equal(panelHostLaunchResult.browserWindow?.location?.href, 'custom://panels/custom/index.html');
    assert.equal(panelHostLaunchResult.browserWindow?.__CUSTOM_PROVIDER__, true);
});

test('editor-api host panel window provider should prefer a real host bridge when present', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    let capturedLaunchRequest: IEditorApiPanelWindowLaunchRequest | null = null;
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const editorApiHostPanelWindowProvider = new EditorApiHostPanelWindowProvider(
        {
            /** @description 执行当前模块对外提供的处理流程。
 * @param request 当前调用所需的输入参数，决定本次处理的目标或行为。
 * @returns 当前操作完成后产生的处理结果。
 */
            async openPanelWindow(request: IEditorApiPanelWindowLaunchRequest) {
                capturedLaunchRequest = request;
                return {
                    location: {
                        href: `editor-host://${request.entry}`,
                    },
                    __EDITOR_PANEL_HOST__: {
                        adapterId: request.adapterId,
                        hostSurface: 'editor-api-webview',
                        panelId: request.panelId,
                        entry: request.entry,
                    },
                    __PEANUT_PANEL_BOOTSTRAP_SCRIPT__: request.bootstrapScript,
                    __REAL_EDITOR_HOST__: true,
                };
            },
        },
    );

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const editorApiPanelBrowserWindow = await editorApiHostPanelWindowProvider.launchPanelWindow({
        adapterId: 'adapter-38',
        panelId: 'real-host.panel',
        entry: 'panels/real-host/index.html',
        bootstrapScript: 'window.panelBridge = { live: true };',
    });

    assert.notEqual(capturedLaunchRequest, null);
    assert.equal(capturedLaunchRequest?.panelId, 'real-host.panel');
    assert.equal(editorApiPanelBrowserWindow.location.href, 'editor-host://panels/real-host/index.html');
    assert.equal(editorApiPanelBrowserWindow.__REAL_EDITOR_HOST__, true);
});

test('editor-api panel host bridge registry should register a real host bridge that runtime facade can consume by default', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const hostGlobal: {
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        __PEANUT_EDITOR_PANEL_HOST__?: {
            /** @description 执行当前模块对外提供的处理流程。
 * @param request 当前调用所需的输入参数，决定本次处理的目标或行为。
 * @returns 当前操作完成后产生的处理结果。
 */
            openPanelWindow(request: IEditorApiPanelWindowLaunchRequest): Promise<Record<string, unknown>>;
        };
    } = {};
    // 保存当前流程需要复用的索引或缓存状态，归当前作用域或实例管理。
    const editorApiPanelHostBridgeRegistry = new EditorApiPanelHostBridgeRegistry(hostGlobal);

    editorApiPanelHostBridgeRegistry.register({
        /** @description 执行当前模块对外提供的处理流程。
 * @param request 当前调用所需的输入参数，决定本次处理的目标或行为。
 * @returns 当前操作完成后产生的处理结果。
 */
        async openPanelWindow(request: IEditorApiPanelWindowLaunchRequest): Promise<Record<string, unknown>> {
            return {
                location: {
                    href: `registry://${request.entry}`,
                },
                __EDITOR_PANEL_HOST__: {
                    adapterId: request.adapterId,
                    hostSurface: 'editor-api-webview',
                    panelId: request.panelId,
                    entry: request.entry,
                },
                __PEANUT_PANEL_BOOTSTRAP_SCRIPT__: request.bootstrapScript,
                __REGISTERED_BRIDGE__: true,
            };
        },
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7', {
        editorApiHostGlobal: hostGlobal,
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const panelHostLaunchResult = await runtimeFacade.panelHost.launchContainer(
        'registry.panel.main',
        'panels/registry/index.html',
        'window.panelBridge = { registry: true };',
    );

    assert.notEqual(editorApiPanelHostBridgeRegistry.get(), null);
    assert.equal(panelHostLaunchResult.browserWindow?.location?.href, 'registry://panels/registry/index.html');
    assert.equal(panelHostLaunchResult.browserWindow?.__REGISTERED_BRIDGE__, true);
    assert.equal(editorApiPanelHostBridgeRegistry.unregister(), true);
    assert.equal(editorApiPanelHostBridgeRegistry.get(), null);
});

test('editor-api window-backed panel host bridge should adapt common host window methods into a browser window payload', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const loadUrlCalls: string[] = [];
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const executeJavaScriptCalls: string[] = [];
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const focusCalls: string[] = [];
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const closeCalls: string[] = [];
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const editorApiWindowBackedPanelHostBridge = new EditorApiWindowBackedPanelHostBridge({
        /** @description 执行当前模块对外提供的处理流程。
 * @returns 当前操作完成后产生的处理结果。
 */
        async createWindow(): Promise<{
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            loadURL: (entry: string) => void;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            executeJavaScript: (script: string) => void;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            focus: () => void;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            close: () => void;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            sessionId: string;
        }> {
            return {
                loadURL: (entry: string): void => {
                    loadUrlCalls.push(entry);
                },
                executeJavaScript: (script: string): void => {
                    executeJavaScriptCalls.push(script);
                },
                focus: (): void => {
                    focusCalls.push('window-backed.panel');
                },
                close: (): void => {
                    closeCalls.push('window-backed.panel');
                },
                sessionId: 'editor-window-1',
            };
        },
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const editorApiPanelBrowserWindow = await editorApiWindowBackedPanelHostBridge.openPanelWindow({
        adapterId: 'adapter-38',
        panelId: 'window-backed.panel',
        entry: 'panels/window-backed/index.html',
        bootstrapScript: 'window.panelBridge = { sample: true };',
    });

    assert.deepEqual(loadUrlCalls, ['panels/window-backed/index.html']);
    assert.deepEqual(executeJavaScriptCalls, ['window.panelBridge = { sample: true };']);
    await editorApiWindowBackedPanelHostBridge.focusPanelWindow('window-backed.panel', editorApiPanelBrowserWindow);
    await editorApiWindowBackedPanelHostBridge.closePanelWindow('window-backed.panel', editorApiPanelBrowserWindow);
    assert.deepEqual(focusCalls, ['window-backed.panel']);
    assert.deepEqual(closeCalls, ['window-backed.panel']);
    assert.equal(editorApiPanelBrowserWindow.location.href, 'panels/window-backed/index.html');
    assert.equal(editorApiPanelBrowserWindow.__EDITOR_PANEL_HOST__.panelId, 'window-backed.panel');
    assert.equal(editorApiPanelBrowserWindow.sessionId, 'editor-window-1');
});

test('editor-api panel host installer should install and uninstall a window factory backed host bridge', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const hostGlobal: Record<string, unknown> = {};
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const editorApiPanelHostInstaller = new EditorApiPanelHostInstaller(hostGlobal);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const executeJavaScriptCalls: string[] = [];

    editorApiPanelHostInstaller.installWindowFactory({
        /** @description 执行当前模块对外提供的处理流程。
 * @returns 当前操作完成后产生的处理结果。
 */
        async createWindow(): Promise<{
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            loadURL: (entry: string) => void;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            executeJavaScript: (script: string) => void;
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            windowId: string;
        }> {
            return {
                loadURL: () => {},
                executeJavaScript: (script: string): void => {
                    executeJavaScriptCalls.push(script);
                },
                windowId: 'installed-window-1',
            };
        },
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const runtimeFacade = new RuntimeFacade('3.8.7', {
        editorApiHostGlobal: hostGlobal,
    });
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const panelHostLaunchResult = await runtimeFacade.panelHost.launchContainer(
        'installed.panel.main',
        'panels/installed/index.html',
        'window.panelBridge = { installed: true };',
    );

    assert.notEqual(editorApiPanelHostInstaller.getInstalledBridge(), null);
    assert.equal(panelHostLaunchResult.browserWindow?.windowId, 'installed-window-1');
    assert.deepEqual(executeJavaScriptCalls, ['window.panelBridge = { installed: true };']);
    assert.equal(editorApiPanelHostInstaller.uninstall(), true);
    assert.equal(editorApiPanelHostInstaller.getInstalledBridge(), null);
});
