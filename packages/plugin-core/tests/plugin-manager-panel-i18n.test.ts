import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { translatePluginManagerPanelError } from '../src/panels/plugin-manager-panel-i18n.js';

describe('plugin manager panel error localization', () => {
    it('translates known host errors for Chinese and English panels', () => {
        assert.equal(
            translatePluginManagerPanelError('zh-CN', 'cocos_plugin_host_slots_exhausted'),
            '插件宿主槽位已全部占用，请先关闭一个已打开的插件面板。',
        );
        assert.equal(
            translatePluginManagerPanelError('en-US', 'cocos_plugin_host_slots_exhausted'),
            'All plugin host slots are occupied. Close an open plugin panel and try again.',
        );
    });

    it('preserves unknown host errors for diagnostics', () => {
        assert.equal(translatePluginManagerPanelError('zh-CN', 'unknown_host_error'), 'unknown_host_error');
    });
});
