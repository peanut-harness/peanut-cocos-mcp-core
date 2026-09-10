'use strict';

function createPodAccountClient({ endpoint, accessToken, transport, timeoutMs }) {
    const root = new URL(endpoint);
    if (root.protocol !== 'https:' || root.username || root.password || root.search || root.hash || root.pathname !== '/') {
        throw new Error('peanut_account_endpoint_invalid');
    }
    if (typeof accessToken !== 'string' || accessToken.length === 0) {
        throw new Error('peanut_account_token_missing');
    }
    const timeout = timeoutMs ?? 10_000;
    if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 30_000) {
        throw new Error('peanut_account_timeout_invalid');
    }
    const fetchImpl = transport ?? fetch;
    return Object.freeze({
        async subscription() {
            return request(fetchImpl, new URL('/v1/account/subscription', root), accessToken, timeout);
        },
        async checkout(productCode) {
            return request(fetchImpl, new URL('/v1/account/checkout', root), accessToken, timeout, {
                method: 'POST',
                body: JSON.stringify({ productCode }),
            });
        },
    });
}

async function request(fetchImpl, url, accessToken, timeoutMs, init = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetchImpl(url, {
            method: init.method ?? 'GET',
            headers: Object.freeze({
                authorization: `Bearer ${accessToken}`,
                accept: 'application/json',
                ...(init.body == null ? {} : { 'content-type': 'application/json' }),
            }),
            body: init.body,
            redirect: 'error',
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`peanut_account_request_refused:${response.status}`);
        }
        return response.json();
    } catch (error) {
        if (error instanceof Error && error.message.startsWith('peanut_account_request_refused:')) {
            throw error;
        }
        throw new Error('peanut_account_request_failed');
    } finally {
        clearTimeout(timer);
    }
}

module.exports = { createPodAccountClient };
