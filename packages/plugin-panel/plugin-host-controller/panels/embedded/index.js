'use strict';

const pluginIdInput = document.querySelector('#pluginId');
const hostSlotInput = document.querySelector('#hostSlotId');
const statusElement = document.querySelector('#status');
let requestSequence = 0;
const pendingRequests = new Map();

/**
 * @description 在 Controller 面板中展示当前 bridge 请求的结果。
 * @param {string} message 要展示的状态文本。
 * @param {boolean} isError 是否以错误状态显示。
 * @returns {void} 状态显示更新后返回。
 */
function setStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.classList.toggle('error', isError);
}

/**
 * @description 向受限宿主 bridge 发送请求，并在收到匹配响应或超时时结束。
 * @param {string} type 已声明的 bridge 请求类型。
 * @param {object} payload 经面板输入校验后的请求负载。
 * @returns {Promise<unknown>} bridge 返回的数据。
 */
function requestHost(type, payload) {
    return new Promise((resolve, reject) => {
        const requestId = `plugin-host-controller-${Date.now()}-${requestSequence += 1}`;
        const timeout = window.setTimeout(() => {
            pendingRequests.delete(requestId);
            reject(new Error('plugin_host_controller_request_timeout'));
        }, 10000);
        pendingRequests.set(requestId, { resolve, reject, timeout });
        window.parent.postMessage({ type, requestId, payload }, '*');
    });
}

window.addEventListener('message', (event) => {
    const response = event.data;
    if (response?.type === 'snowb-cpm:init') {
        setStatus('控制器已就绪。');
        window.parent.postMessage({ type: 'snowb-cpm:ready' }, '*');
        return;
    }
    if (response?.type !== 'snowb-cpm:response' || typeof response.requestId !== 'string') {
        return;
    }
    const pendingRequest = pendingRequests.get(response.requestId);
    if (pendingRequest == null) {
        return;
    }
    pendingRequests.delete(response.requestId);
    window.clearTimeout(pendingRequest.timeout);
    if (response.ok) {
        pendingRequest.resolve(response.data);
        return;
    }
    pendingRequest.reject(new Error(typeof response.error === 'string' ? response.error : 'plugin_host_controller_request_failed'));
});

document.querySelector('#loadButton').addEventListener('click', async () => {
    const pluginId = pluginIdInput.value.trim();
    const hostSlotId = hostSlotInput.value;
    if (pluginId.length === 0) {
        setStatus('请填写插件 ID。', true);
        return;
    }
    setStatus(`正在加载 ${pluginId} 到 ${hostSlotId}…`);
    try {
        await requestHost('snowb-cpm:plugin-host-load', { pluginId, hostSlotId });
        setStatus(`${pluginId} 已加载到 ${hostSlotId}。`);
    } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), true);
    }
});

document.querySelector('#closeButton').addEventListener('click', async () => {
    const hostSlotId = hostSlotInput.value;
    setStatus(`正在关闭 ${hostSlotId}…`);
    try {
        await requestHost('snowb-cpm:plugin-host-close', { hostSlotId });
        setStatus(`${hostSlotId} 已关闭。`);
    } catch (error) {
        setStatus(error instanceof Error ? error.message : String(error), true);
    }
});
