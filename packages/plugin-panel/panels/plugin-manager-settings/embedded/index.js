const SETTINGS_SNAPSHOT_EVENT = 'pluginManager.settings.snapshot';
const SETTINGS_UPDATE_EVENT = 'pluginManager.settings.update';
const DEFAULT_PREFERENCES = {
    locale: 'zh-CN',
    packageFilter: 'all',
    packageCatalogSort: 'plugin-id-asc',
};

function getPanelDomRoot() {
    return window.__PEANUT_PLUGIN_MANAGER_SETTINGS_PANEL_ROOT__ ?? document;
}

function getPanelElementById(elementId) {
    const panelDomRoot = getPanelDomRoot();
    return typeof panelDomRoot?.querySelector === 'function'
        ? panelDomRoot.querySelector(`#${elementId}`)
        : null;
}

const elements = {
    form: getPanelElementById('settingsForm'),
    locale: getPanelElementById('settingsLocale'),
    packageFilter: getPanelElementById('settingsPackageFilter'),
    packageSort: getPanelElementById('settingsPackageSort'),
    status: getPanelElementById('settingsStatus'),
    error: getPanelElementById('settingsError'),
    resetButton: getPanelElementById('resetSettingsButton'),
    reloadButton: getPanelElementById('reloadSettingsButton'),
    saveButton: getPanelElementById('saveSettingsButton'),
};

let bridge = null;
let revision = 0;
let isDisposed = false;

function buildRequestId(event) {
    return `${event}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

function setStatus(message) {
    elements.status.textContent = message;
}

function setError(message) {
    elements.error.hidden = message.length === 0;
    elements.error.textContent = message;
}

function setBusy(isBusy) {
    elements.locale.disabled = isBusy;
    elements.packageFilter.disabled = isBusy;
    elements.packageSort.disabled = isBusy;
    elements.resetButton.disabled = isBusy;
    elements.reloadButton.disabled = isBusy;
    elements.saveButton.disabled = isBusy;
}

function readPreferences() {
    return {
        locale: elements.locale.value,
        packageFilter: elements.packageFilter.value,
        packageCatalogSort: elements.packageSort.value,
    };
}

function renderPreferences(preferences) {
    elements.locale.value = preferences.locale;
    elements.packageFilter.value = preferences.packageFilter;
    elements.packageSort.value = preferences.packageCatalogSort;
}

function resolveBridge() {
    const editorApi = window.Editor ?? window.top?.Editor ?? globalThis.Editor;
    if (editorApi?.Message?.request == null) {
        return {
            async request(request) {
                if (request.event === SETTINGS_SNAPSHOT_EVENT) {
                    return { ok: true, payload: { preferences: DEFAULT_PREFERENCES, revision: 0 } };
                }
                return { ok: true, payload: { preferences: request.payload.preferences, revision: request.payload.expectedRevision + 1 } };
            },
        };
    }
    const extensionName = window.__PEANUT_COCOS_EXTENSION_NAME__ ?? 'peanut-pod';
    return {
        request(request) {
            return editorApi.Message.request(extensionName, 'request-panel-bridge', request);
        },
    };
}

async function requestSettings(event, payload) {
    const response = await bridge.request({
        id: buildRequestId(event),
        event,
        expectsResponse: true,
        payload,
    });
    if (response?.ok !== true || response.payload == null) {
        throw new Error(response?.error ?? 'plugin_manager_settings_request_failed');
    }
    return response.payload;
}

async function loadSettings() {
    setBusy(true);
    setError('');
    setStatus('Loading…');
    try {
        const snapshot = await requestSettings(SETTINGS_SNAPSHOT_EVENT, {});
        if (isDisposed) {
            return;
        }
        revision = snapshot.revision;
        renderPreferences(snapshot.preferences);
        setStatus('Saved');
    } catch (error) {
        if (!isDisposed) {
            setError(error instanceof Error ? error.message : String(error));
            setStatus('Failed');
        }
    } finally {
        if (!isDisposed) {
            setBusy(false);
        }
    }
}

async function saveSettings() {
    setBusy(true);
    setError('');
    setStatus('Saving…');
    try {
        const snapshot = await requestSettings(SETTINGS_UPDATE_EVENT, {
            expectedRevision: revision,
            preferences: readPreferences(),
        });
        if (isDisposed) {
            return;
        }
        revision = snapshot.revision;
        renderPreferences(snapshot.preferences);
        setStatus('Saved');
    } catch (error) {
        if (!isDisposed) {
            setError(error instanceof Error ? error.message : String(error));
            setStatus('Not saved');
        }
    } finally {
        if (!isDisposed) {
            setBusy(false);
        }
    }
}

function isPanelReady() {
    return Object.values(elements).every((element) => element != null);
}

function initializePanel() {
    if (!isPanelReady()) {
        console.warn('[plugin-manager-settings] panel root is unavailable.');
        return;
    }

    elements.form.addEventListener('submit', (event) => {
        event.preventDefault();
        void saveSettings();
    });
    elements.reloadButton.addEventListener('click', () => {
        void loadSettings();
    });
    elements.resetButton.addEventListener('click', () => {
        renderPreferences(DEFAULT_PREFERENCES);
        setError('');
        setStatus('Defaults ready to save');
    });
    window.addEventListener('unload', () => {
        isDisposed = true;
    });

    bridge = resolveBridge();
    void loadSettings();
}

initializePanel();
