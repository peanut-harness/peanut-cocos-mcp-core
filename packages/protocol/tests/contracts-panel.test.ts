import assert from 'assert/strict';
import test from 'node:test';

import type {
    IPanelBridgeClient,
    IPanelBridgeEnvelope,
    IPanelBridgeMessageHandler,
    IPanelBridgeRequest,
    IPanelBridgeRequestHandler,
    IPanelBridgeResponse,
    IPanelContribution,
    PanelId,
} from '../src/index';

test('panel bridge contracts should support typed request and response composition', async (): Promise<void> => {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelId: PanelId = 'contracts.panel.bridge';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ request: IPanelBridgeRequest<{ includeSelection: boolean }> = {
        id: 'contracts-panel-request',
        event: 'contracts.panel.getState',
        expectsResponse: true,
        payload: {
            includeSelection: true,
        },
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ requestHandler: IPanelBridgeRequestHandler<{ includeSelection: boolean }, { selectedCount: number }> = async (
        incomingRequest,
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    ): Promise<{ selectedCount: number }> => {
        return {
            selectedCount: incomingRequest.payload?.includeSelection ? 3 : 0,
        };
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ messageListener: IPanelBridgeMessageHandler<{ panelId: string }> = async (envelope): Promise<void> => {
        assert.equal(envelope.payload?.panelId, panelId);
    };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ contribution: IPanelContribution = {
        id: panelId,
        title: 'Bridge Panel',
        entry: 'panels/bridge/index.html',
        placement: 'main',
        singleton: true,
        activationPolicy: 'on_plugin_activate',
        sessionPolicy: 'restore_layout',
    };

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    let /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ disposed = false;
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    let /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ subscribedEvent = '';
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ client: IPanelBridgeClient = {
        /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
        async postMessage<TPayload extends Record<string, unknown>>(envelope: IPanelBridgeEnvelope<TPayload>): Promise<void> {
            assert.equal(envelope.event, 'contracts.panel.notify');
        },
        /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
        async request<TPayload extends Record<string, unknown>, TResponse extends Record<string, unknown>>(
            panelRequest: IPanelBridgeRequest<TPayload>,
        ): Promise<IPanelBridgeResponse<TResponse>> {
            // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
            /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
            const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ responsePayload = await requestHandler(panelRequest as IPanelBridgeRequest<{ includeSelection: boolean }>);
            return {
                requestId: panelRequest.id,
                ok: true,
                payload: responsePayload as TResponse,
            };
        },
        /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
        subscribe<TPayload extends Record<string, unknown>>(event: string, listener: IPanelBridgeMessageHandler<TPayload>): () => void {
            subscribedEvent = event;
            void listener({
                id: 'contracts-panel-listener',
                event,
                payload: {
                    panelId,
                } as TPayload,
            });

            return (): void => {
                disposed = true;
            };
        },
        /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
        async dispose(): Promise<void> {
            disposed = true;
        },
    };

    await client.postMessage({
        id: 'contracts-panel-notify',
        event: 'contracts.panel.notify',
        payload: {
            panelId,
        },
    });
    // 保存请求调用产生的响应结果，供后续断言验证。
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ response = await client.request<{ includeSelection: boolean }, { selectedCount: number }>(request);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ unsubscribe = client.subscribe('contracts.panel.synced', messageListener);

    assert.equal(contribution.id, panelId);
    assert.equal(response.ok, true);
    assert.equal(response.payload?.selectedCount, 3);
    assert.equal(subscribedEvent, 'contracts.panel.synced');
    unsubscribe();
    assert.equal(disposed, true);
});
