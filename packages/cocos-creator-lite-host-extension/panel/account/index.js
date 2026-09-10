'use strict';

const { readFileSync } = require('fs');
const { join } = require('path');

exports.template = readFileSync(join(__dirname, 'index.html'), 'utf8');
exports.style = readFileSync(join(__dirname, 'index.css'), 'utf8');
exports.$ = {
    endpoint: '#endpoint',
    token: '#token',
    saveEndpoint: '#saveEndpoint',
    signIn: '#signIn',
    signOut: '#signOut',
    refresh: '#refresh',
    upgrade: '#upgrade',
    refreshPro: '#refreshPro',
    status: '#status',
};

exports.ready = function ready() {
    const render = async () => {
        const status = await Editor.Message.request('peanut-pod-lite-host', 'query-status');
        this.$.status.innerText = JSON.stringify(
            {
                ready: status.ready,
                pro: status.pro,
                account: status.account,
            },
            null,
            2,
        );
    };
    this.$.saveEndpoint.addEventListener('click', async () => {
        await Editor.Message.request('peanut-pod-lite-host', 'set-pod-endpoint', this.$.endpoint.value.trim());
        await render();
    });
    this.$.signIn.addEventListener('click', async () => {
        await Editor.Message.request('peanut-pod-lite-host', 'set-access-token', this.$.token.value);
        this.$.token.value = '';
        await render();
    });
    this.$.signOut.addEventListener('click', async () => {
        await Editor.Message.request('peanut-pod-lite-host', 'clear-account');
        await render();
    });
    this.$.refresh.addEventListener('click', async () => {
        await Editor.Message.request('peanut-pod-lite-host', 'query-subscription');
        await render();
    });
    this.$.upgrade.addEventListener('click', async () => {
        const checkout = await Editor.Message.request('peanut-pod-lite-host', 'start-checkout');
        if (typeof checkout?.checkoutUrl === 'string') {
            await Editor.shell?.openExternal?.(checkout.checkoutUrl);
        }
        await render();
    });
    this.$.refreshPro.addEventListener('click', async () => {
        await Editor.Message.request('peanut-pod-lite-host', 'refresh-pro');
        await render();
    });
    void render();
};
