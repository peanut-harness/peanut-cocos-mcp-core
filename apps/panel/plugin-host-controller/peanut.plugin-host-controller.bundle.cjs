'use strict';

const manifest = require('./peanut.plugin-host-controller.manifest.json');

class PluginHostControllerModule {
    constructor() {
        this.manifest = manifest;
    }

    register(context) {
        context.registry.registerCommand({
            id: 'peanut.plugin-host-controller.openPanel',
            title: 'Open Plugin Host Controller',
            handler: 'peanut.plugin-host-controller.open-panel',
        });
        context.registry.registerMenu({
            id: 'peanut.plugin-host-controller.menu.openPanel',
            title: 'Plugin Host Controller',
            path: 'Tools/Peanut',
            commandId: 'peanut.plugin-host-controller.openPanel',
        });
        context.registry.registerPanel({
            id: 'peanut.plugin-host-controller.panel',
            title: 'Plugin Host Controller',
            entry: 'panels/embedded/index.html',
            placement: 'utility',
            singleton: true,
            activationPolicy: 'manual',
            sessionPolicy: 'restore_layout_and_state',
        });
    }

    async activate() {}

    async deactivate() {}

    async dispose() {}
}

function createPluginModule() {
    return new PluginHostControllerModule();
}

module.exports = {
    createPluginModule,
};
