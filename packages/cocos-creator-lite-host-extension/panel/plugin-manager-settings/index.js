'use strict';

const fs = require('fs');
const path = require('path');

function resolveStaticPanelDirectory() {
    try {
        return path.resolve(path.dirname(require.resolve('peanut-plugin-panel')), '..', 'panels', 'plugin-manager-settings', 'embedded');
    } catch {
        return path.resolve(__dirname, '../../panels/plugin-manager-settings/embedded');
    }
}

function resolveSettingsStylesheet() {
    return path.join(resolveStaticPanelDirectory(), 'index.css');
}

function resolveExtensionName() {
    try {
        const extensionPackage = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf8'));
        return typeof extensionPackage.name === 'string' && extensionPackage.name.length > 0
            ? extensionPackage.name
            : 'peanut-pod';
    } catch {
        return 'peanut-pod';
    }
}

const staticPanelDirectory = resolveStaticPanelDirectory();
const staticPanelHtml = fs.readFileSync(path.join(staticPanelDirectory, 'index.html'), 'utf8');
const staticPanelBody = staticPanelHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? '';

exports.template = `<div id="pluginManagerSettingsRoot">${staticPanelBody.replace(/<script[^>]*src=[^>]*><\/script>/i, '')}</div>`;
exports.style = fs.readFileSync(resolveSettingsStylesheet(), 'utf8');
exports.$ = { pluginManagerSettingsRoot: '#pluginManagerSettingsRoot' };
exports.ready = function () {
    window.__PEANUT_COCOS_EXTENSION_NAME__ = resolveExtensionName();
    window.__PEANUT_PLUGIN_MANAGER_SETTINGS_PANEL_ROOT__ = this.$.pluginManagerSettingsRoot;
    const panelScriptPath = require.resolve(path.join(staticPanelDirectory, 'index.js'));
    delete require.cache[panelScriptPath];
    require(panelScriptPath);
};
