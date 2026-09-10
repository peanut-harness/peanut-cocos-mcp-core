import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatPluginLogMessage } from '../src/shared/default-plugin-logger.js';

describe('default plugin logger localization', () => {
    it('formats known lifecycle messages in Chinese', () => {
        assert.equal(formatPluginLogMessage('figma_provider_registered', 'zh-CN'), 'Figma Provider 已注册');
        assert.equal(formatPluginLogMessage('editor_mcp_activated:peanut.editor-mcp', 'zh-CN'), 'Editor MCP 已激活: peanut.editor-mcp');
        assert.equal(formatPluginLogMessage('ui_prefab_registered', 'zh-Hans'), 'UI Prefab Provider 已注册');
    });

    it('formats known lifecycle messages in English', () => {
        assert.equal(formatPluginLogMessage('psd_provider_registered', 'en-US'), 'PSD provider registered');
        assert.equal(formatPluginLogMessage('ui_prefab_activated:peanut.ui-prefab', 'en-US'), 'UI Prefab provider activated: peanut.ui-prefab');
    });

    it('preserves unknown event codes for diagnostics', () => {
        assert.equal(formatPluginLogMessage('new_provider_event', 'zh-CN'), 'new_provider_event');
    });
});
