const SNAPSHOT_EVENT = 'pluginManager.snapshot';
const DETAIL_EVENT = 'pluginManager.failure.detail';
const EXPORT_EVENT = 'pluginManager.failure.export';
const RETRY_EVENT = 'pluginManager.failure.retryCleanup';
const ACTIVATE_EVENT = 'pluginManager.runtime.activate';
const DEACTIVATE_EVENT = 'pluginManager.runtime.deactivate';
const DISPOSE_EVENT = 'pluginManager.runtime.dispose';
const PANEL_RESOLVE_EVENT = 'pluginManager.panel.resolve';
const PACKAGE_PLAN_EVENT = 'pluginManager.package.plan';
const PACKAGE_INSTALL_EVENT = 'pluginManager.package.install';
const PACKAGE_UPGRADE_EVENT = 'pluginManager.package.upgrade';
const PACKAGE_UNINSTALL_EVENT = 'pluginManager.package.uninstall';
const PACKAGE_PICK_DIRECTORY_EVENT = 'pluginManager.package.pickDirectory';
const PREFERENCES_UPDATE_EVENT = 'pluginManager.preferences.update';
const EXECUTION_DIAGNOSTICS_EVENT = 'pluginManager.executionDiagnostics';
const KERNEL_RELOAD_EVENT = 'pluginManager.kernel.reload';
const MCP_SET_ENABLED_EVENT = 'pluginManager.mcp.setEnabled';
const MCP_APPROVE_PLAN_EVENT = 'pluginManager.mcp.plan.approve';
const MCP_REJECT_PLAN_EVENT = 'pluginManager.mcp.plan.reject';
const BUILTIN_PLUGIN_MANAGER_PANEL_ID = 'builtin.plugin-manager.panel';
const SNOWB_BMF_PLUGIN_ID = 'snowb.bmfont';
const COCOS_PLUGIN_HOST_EXTENSION_NAME = 'peanut-pod';

const PANEL_TRANSLATIONS = {
    'en-US': {
        'locale.label': 'Language',
        'locale.en-US': 'English',
        'locale.zh-CN': 'Simplified Chinese',
        'tab.runtime': 'Runtime',
        'tab.packages': 'Packages',
        'tab.diagnostics': 'Diagnostics',
        'tab.installed': 'Installed',
        'tab.remote': 'Remote Extensions',
        'tab.extensions': 'Extension Tools',
        'tab.mcp': 'MCP',
        'tab.about': 'About',
        'hero.controlSurface': 'Builtin Control Surface',
        'hero.title': 'Plugin Manager',
        'hero.subtitle': 'Runtime state and hotplug recovery overview.',
        'hero.overview': 'overview',
        'hero.waitingBridge': 'Waiting for panel bridge to provide runtime data.',
        'status.live': 'Live',
        'status.preview': 'Preview',
        'status.liveBridge': 'Live host bridge connected.',
        'status.previewBridge': 'Preview bridge active.',
        'toast.pending': 'Processing…',
        'summary.runtime': 'Runtime',
        'summary.runtimeHint': 'registered plugins',
        'summary.installed': 'Installed',
        'summary.failures': 'Failures',
        'summary.failuresHint': 'open incidents',
        'summary.selected': 'Selected',
        'summary.queue': 'Queue',
        'summary.none': 'none',
        'summary.idle': 'idle',
        'summary.noPluginSelected': 'no plugin selected',
        'sidebar.runtimeCatalog': 'Runtime Catalog',
        'sidebar.pluginsTitle': 'Plugins',
        'sidebar.pluginsCopy': 'Select a plugin to inspect runtime state and recovery actions.',
        'sidebar.failuresTitle': 'Failures',
        'sidebar.failuresCopy': 'Quarantined incidents that still need cleanup or manual review.',
        'empty.noPlugins': 'No plugins registered.',
        'empty.noPluginFailures': 'No plugin failures.',
        'empty.noPluginSelected': 'No plugin selected.',
        'detail.overview': 'Overview',
        'detail.choosePlugin': 'Choose a plugin from the left to inspect details.',
        'detail.failureMessage': 'Failure Message',
        'detail.noFailureSelected': 'No failure selected.',
        'detail.noExport': 'No export has been generated yet.',
        'detail.version': 'Version',
        'detail.trust': 'Trust',
        'detail.failurePhase': 'Failure Phase',
        'detail.export': 'Export',
        'detail.exportReady': 'ready',
        'detail.exportPending': 'not exported',
        'detail.installedActive': 'Installed Active',
        'detail.installedVersions': 'Installed Versions',
        'detail.notInstalled': 'not installed',
        'detail.none': 'none',
        'actions.title': 'Lifecycle And Recovery',
        'actions.copy': 'Available: refresh, export, retry cleanup, activate, deactivate, and dispose. Actions execute through the live panel bridge.',
        'actions.refresh': 'Refresh',
        'actions.reloadKernel': 'Reload Kernel',
        'actions.export': 'Export Failure',
        'actions.retryCleanup': 'Retry Cleanup',
        'actions.activate': 'Activate',
        'actions.deactivate': 'Deactivate',
        'actions.dispose': 'Dispose',
        'actions.openPanel': 'Open Panel',
        'actions.closePanel': 'Back to Manager',
        'actions.settings': 'Settings',
        'actions.createUnavailable': 'New',
        'actions.registerSource': 'Register Source',
        'actions.removeSource': 'Remove Source',
        'actions.plan': 'Plan',
        'actions.install': 'Install',
        'actions.installActivate': 'Install + Activate',
        'actions.upgrade': 'Upgrade',
        'actions.upgradeActivate': 'Upgrade + Activate',
        'actions.uninstallSelected': 'Uninstall Selected',
        'actions.choosePackageDirectory': 'Choose Plugin Directory',
        'package.title': 'Install, Upgrade, Uninstall',
        'package.sourceRegistry': 'Manual And Registry Sources',
        'package.recentSources': 'Recently Used',
        'package.packagePath': 'Package Path',
        'package.pending': 'Package actions pending.',
        'package.noSources': 'No packaged sources available.',
        'package.noRecentSources': 'No recent package sources.',
        'package.searchPlaceholder': 'Search plugin id / source / package path',
        'package.pluginIdPlaceholder': 'plugin id',
        'package.versionPlaceholder': 'version',
        'package.sourcePathPlaceholder': 'source path / registry label',
        'package.packagePathPlaceholder': 'package path',
        'package.installPathPlaceholder': 'Package directory (contains plugin.manifest.json)',
        'package.filter.all': 'All Sources',
        'package.filter.installed': 'Installed',
        'package.filter.not-installed': 'Not Installed',
        'package.filter.upgrade': 'Upgrade Candidates',
        'package.sort.plugin-id-asc': 'Plugin Id A-Z',
        'package.sort.plugin-id-desc': 'Plugin Id Z-A',
        'package.sort.source-asc': 'Source A-Z',
        'package.sort.recent-first': 'Recent First',
        'package.action.install': 'install',
        'package.action.upgrade': 'upgrade',
        'package.action.uninstall': 'uninstall',
        'package.source.manual': 'Manual',
        'package.source.registry': 'Registry',
        'package.summary.install': 'install completed for {pluginId}@{version}.',
        'package.summary.upgrade': 'upgrade completed for {pluginId}@{version}.',
        'package.summary.uninstall': 'uninstall completed for {pluginId}.',
        'package.summary.default': '{action} completed.',
        'package.planSummary': '{action} plan ready for {pluginId}@{version}.',
        'error.plugin_package_path_required': 'Choose a plugin package directory before continuing.',
        'error.cocos_dialog_api_unavailable': 'The Creator directory picker is unavailable. Please restart Creator and try again.',
        'cleanup.none': 'none',
        'cleanup.stable': 'stable',
        'cleanup.pending': 'pending',
        'cleanup.title': 'Cleanup Timeline',
        'cleanup.noSteps': 'No cleanup steps.',
        'cleanup.ok': 'ok',
        'execution.title': 'Execution Diagnostics',
        'execution.copy': 'Filter by priority, inspect recent exceptions, and expand task trace details.',
        'execution.unavailable': 'unavailable',
        'execution.noData': 'Execution diagnostics unavailable.',
        'execution.noSelection': 'No execution group selected.',
        'execution.showExceptional': 'Show Exceptional',
        'execution.exceptionalOnly': 'Exceptional Only',
        'execution.allGroups': 'All groups',
        'execution.exceptionalGroups': 'Exceptional only',
        'execution.refresh': 'Refresh Diagnostics',
        'execution.planning': 'Planning',
        'execution.pendingCommit': 'Pending Commit',
        'execution.activeCommit': 'Active Commit',
        'execution.recentGroups': 'Recent Groups',
        'execution.current': 'Current',
        'execution.history': 'History',
        'execution.group': 'Group',
        'execution.task': 'Task',
        'execution.tracePending': 'Trace pending.',
        'execution.noTargets': 'no targets',
        'execution.noError': 'no error',
        'execution.noDetail': 'no detail',
        'execution.empty': 'none',
        'execution.flag.timeout': 'timeout',
        'execution.flag.cancelled': 'cancelled',
        'execution.flag.replan': 'replan',
        'execution.flag.ok': 'ok',
        'panel.embedded': 'Embedded Panel',
        'panel.loading': 'Loading plugin panel…',
        'panel.ready': 'Plugin panel is ready.',
        'panel.requiresActive': 'Activate the plugin before opening its panel.',
        'about.eyebrow': 'Peanut Cocos',
        'about.title': 'Cocos Plugin Manager',
        'about.copy': 'The legacy management surface is backed by the v2 validated panel bridge.',
        'about.available': 'Available in v2',
        'about.availableCopy': 'Lifecycle, packages, sources, failure recovery, diagnostics, panel opening, and kernel reload.',
        'about.unavailable': 'Unavailable legacy controls',
        'about.unavailableCopy': 'Plugin scaffolding, remote catalog fetch/install, log-file operations, legacy settings pages, MCP health, and arbitrary version switching remain disabled.',
        'mcp.eyebrow': 'External Automation',
        'mcp.title': 'MCP Hub',
        'mcp.copy': 'Manage the single local MCP endpoint, shared plugin capabilities, and write approvals.',
        'mcp.settings': 'Project Setting',
        'mcp.enabled': 'Enable MCP Hub for this project',
        'mcp.unavailable': 'This editor host has not configured an MCP Hub.',
        'mcp.disabled': 'MCP Hub is disabled for this project.',
        'mcp.enabledStatus': 'MCP Hub is listening locally on a dynamic port.',
        'mcp.capabilities': 'Shared Capabilities',
        'mcp.noCapabilities': 'No active plugin has shared an MCP capability.',
        'mcp.approvals': 'Write Approvals',
        'mcp.approvalsCopy': 'Every write request waits here for your explicit approval.',
        'mcp.noApprovals': 'No write requests are waiting for approval.',
        'mcp.approve': 'Approve',
        'mcp.reject': 'Reject',
        'mcp.readOnly': 'read-only',
        'mcp.write': 'write',
        'mcp.port': 'Port',
        'mcp.catalogRevision': 'Catalog revision',
        'mcp.expiresAt': 'Expires',
    },
    'zh-CN': {
        'locale.label': '语言',
        'locale.en-US': 'English',
        'locale.zh-CN': '简体中文',
        'tab.runtime': '运行时',
        'tab.packages': '包管理',
        'tab.diagnostics': '诊断',
        'tab.installed': '已安装扩展',
        'tab.remote': '远程扩展',
        'tab.extensions': '扩展工具',
        'tab.mcp': 'MCP',
        'tab.about': '关于',
        'hero.controlSurface': '内置控制台',
        'hero.title': '插件管理器',
        'hero.subtitle': '运行时状态与热插拔恢复总览。',
        'hero.overview': '概览',
        'hero.waitingBridge': '等待 panel bridge 提供运行时数据。',
        'status.live': '实时',
        'status.preview': '预览',
        'status.liveBridge': '已连接实时宿主桥。',
        'status.previewBridge': '当前使用预览桥。',
        'toast.pending': '正在处理…',
        'summary.runtime': '运行时',
        'summary.runtimeHint': '已注册插件',
        'summary.installed': '已安装',
        'summary.failures': '故障',
        'summary.failuresHint': '待处理事件',
        'summary.selected': '当前选择',
        'summary.queue': '队列',
        'summary.none': '无',
        'summary.idle': '空闲',
        'summary.noPluginSelected': '未选择插件',
        'sidebar.runtimeCatalog': '运行时目录',
        'sidebar.pluginsTitle': '插件',
        'sidebar.pluginsCopy': '选择一个插件以查看运行时状态和恢复动作。',
        'sidebar.failuresTitle': '故障',
        'sidebar.failuresCopy': '仍需清理或人工处理的隔离事件。',
        'empty.noPlugins': '当前没有已注册插件。',
        'empty.noPluginFailures': '当前没有插件故障。',
        'empty.noPluginSelected': '当前未选择插件。',
        'detail.overview': '概览',
        'detail.choosePlugin': '从左侧选择一个插件以查看详情。',
        'detail.failureMessage': '失败消息',
        'detail.noFailureSelected': '当前未选择失败事件。',
        'detail.noExport': '尚未生成导出内容。',
        'detail.version': '版本',
        'detail.trust': '信任级别',
        'detail.failurePhase': '失败阶段',
        'detail.export': '导出',
        'detail.exportReady': '已生成',
        'detail.exportPending': '未导出',
        'detail.installedActive': '当前安装版本',
        'detail.installedVersions': '已安装版本',
        'detail.notInstalled': '未安装',
        'detail.none': '无',
        'actions.title': '生命周期与恢复',
        'actions.copy': '可执行：刷新、导出、重试清理、激活、停用、释放。所有动作都通过实时 panel bridge 执行。',
        'actions.refresh': '刷新',
        'actions.reloadKernel': '重载内核',
        'actions.export': '导出故障',
        'actions.retryCleanup': '重试清理',
        'actions.activate': '激活',
        'actions.deactivate': '停用',
        'actions.dispose': '释放',
        'actions.openPanel': '打开面板',
        'actions.closePanel': '返回管理器',
        'actions.settings': '设置',
        'actions.createUnavailable': '新建',
        'actions.registerSource': '登记来源',
        'actions.removeSource': '移除来源',
        'actions.plan': '规划',
        'actions.install': '安装',
        'actions.installActivate': '安装并激活',
        'actions.upgrade': '升级',
        'actions.upgradeActivate': '升级并激活',
        'actions.uninstallSelected': '卸载当前选择',
        'actions.choosePackageDirectory': '选择插件目录',
        'package.title': '安装、升级、卸载',
        'package.sourceRegistry': '手工与注册表来源',
        'package.recentSources': '最近使用',
        'package.packagePath': '包路径',
        'package.pending': '等待执行包管理动作。',
        'package.noSources': '当前没有可用的打包来源。',
        'package.noRecentSources': '当前没有最近使用的包来源。',
        'package.searchPlaceholder': '搜索插件 id / 来源 / 包路径',
        'package.pluginIdPlaceholder': '插件 id',
        'package.versionPlaceholder': '版本',
        'package.sourcePathPlaceholder': '来源路径 / 注册表标签',
        'package.packagePathPlaceholder': '包路径',
        'package.installPathPlaceholder': '目录包路径（含 plugin.manifest.json）',
        'package.filter.all': '全部来源',
        'package.filter.installed': '已安装',
        'package.filter.not-installed': '未安装',
        'package.filter.upgrade': '可升级候选',
        'package.sort.plugin-id-asc': '插件 Id A-Z',
        'package.sort.plugin-id-desc': '插件 Id Z-A',
        'package.sort.source-asc': '来源 A-Z',
        'package.sort.recent-first': '最近优先',
        'package.action.install': '安装',
        'package.action.upgrade': '升级',
        'package.action.uninstall': '卸载',
        'package.source.manual': '手工',
        'package.source.registry': '注册表',
        'package.summary.install': '已完成 {pluginId}@{version} 的安装。',
        'package.summary.upgrade': '已完成 {pluginId}@{version} 的升级。',
        'package.summary.uninstall': '已完成 {pluginId} 的卸载。',
        'package.summary.default': '已完成{action}动作。',
        'package.planSummary': '已生成 {pluginId}@{version} 的{action}计划。',
        'error.plugin_package_path_required': '请先选择插件包目录，再继续操作。',
        'error.cocos_dialog_api_unavailable': 'Creator 目录选择窗口不可用，请重启 Creator 后重试。',
        'cleanup.none': '无',
        'cleanup.stable': '稳定',
        'cleanup.pending': '待处理',
        'cleanup.title': '清理时间线',
        'cleanup.noSteps': '当前没有清理步骤。',
        'cleanup.ok': '成功',
        'execution.title': '执行诊断',
        'execution.copy': '按优先级筛选，查看最近异常，并展开任务 trace 详情。',
        'execution.unavailable': '不可用',
        'execution.noData': '当前没有执行诊断数据。',
        'execution.noSelection': '当前未选择执行组。',
        'execution.showExceptional': '只看异常',
        'execution.exceptionalOnly': '仅异常',
        'execution.allGroups': '全部执行组',
        'execution.exceptionalGroups': '仅异常执行组',
        'execution.refresh': '刷新诊断',
        'execution.planning': '规划中',
        'execution.pendingCommit': '等待提交',
        'execution.activeCommit': '提交中',
        'execution.recentGroups': '最近执行组',
        'execution.current': '当前',
        'execution.history': '历史',
        'execution.group': '执行组',
        'execution.task': '任务',
        'execution.tracePending': 'Trace 尚未生成。',
        'execution.noTargets': '无目标',
        'execution.noError': '无错误',
        'execution.noDetail': '无详情',
        'execution.empty': '无',
        'execution.flag.timeout': '超时',
        'execution.flag.cancelled': '已取消',
        'execution.flag.replan': '已重规划',
        'execution.flag.ok': '正常',
        'panel.embedded': '内嵌面板',
        'panel.loading': '正在加载插件面板…',
        'panel.ready': '插件面板已就绪。',
        'panel.requiresActive': '请先激活插件，再打开面板。',
        'about.eyebrow': 'Peanut Cocos',
        'about.title': 'Cocos 插件管理器',
        'about.copy': '旧版管理界面由 v2 已验证的 panel bridge 驱动。',
        'about.available': 'v2 当前可用',
        'about.availableCopy': '生命周期、插件包、来源登记、故障恢复、执行诊断、面板打开与内核重载。',
        'about.unavailable': '旧版暂不支持的控件',
        'about.unavailableCopy': '插件脚手架、远程目录拉取与安装、日志文件操作、旧设置页、MCP 健康检查和任意版本切换保持禁用。',
        'mcp.eyebrow': '外部自动化',
        'mcp.title': 'MCP Hub',
        'mcp.copy': '管理唯一的本机 MCP 端点、插件共享能力与写操作审批。',
        'mcp.settings': '项目设置',
        'mcp.enabled': '为当前项目启用 MCP Hub',
        'mcp.unavailable': '当前编辑器宿主尚未配置 MCP Hub。',
        'mcp.disabled': '当前项目已禁用 MCP Hub。',
        'mcp.enabledStatus': 'MCP Hub 正在动态本机端口上监听。',
        'mcp.capabilities': '共享能力',
        'mcp.noCapabilities': '没有已激活插件分享 MCP capability。',
        'mcp.approvals': '写操作审批',
        'mcp.approvalsCopy': '每个写操作请求都会在此等待你的明确批准。',
        'mcp.noApprovals': '当前没有等待审批的写操作请求。',
        'mcp.approve': '批准',
        'mcp.reject': '拒绝',
        'mcp.readOnly': '只读',
        'mcp.write': '写入',
        'mcp.port': '端口',
        'mcp.catalogRevision': '目录版本',
        'mcp.expiresAt': '到期时间',
    },
};

const PANEL_STATE_LABELS = {
    'en-US': {
        none: 'none',
        active: 'active',
        inactive: 'inactive',
        disposed: 'disposed',
        failed: 'failed',
        discovered: 'discovered',
        validated: 'validated',
        staged: 'staged',
        loaded: 'loaded',
        registered: 'registered',
        succeeded: 'succeeded',
        cancelled: 'cancelled',
        planning: 'planning',
        pending_commit: 'pending commit',
        committing: 'active commit',
        critical: 'critical',
        high: 'high',
        normal: 'normal',
        low: 'low',
        all: 'all',
        install: 'install',
        upgrade: 'upgrade',
        uninstall: 'uninstall',
        activate: 'activate',
        deactivate: 'deactivate',
        register: 'register',
        dispose: 'dispose',
        activation_prepare: 'activation_prepare',
        cleanup: 'cleanup',
        cleanup_retry: 'cleanup_retry',
        planned: 'planned',
        completed: 'completed',
        skipped: 'skipped',
        builtin: 'builtin',
        trusted: 'trusted',
        partner: 'partner',
        community: 'community',
        manual: 'manual',
        registry: 'registry',
        local: 'local',
    },
    'zh-CN': {
        none: '无',
        active: '运行中',
        inactive: '未激活',
        disposed: '已释放',
        failed: '失败',
        discovered: '已发现',
        validated: '已校验',
        staged: '已暂存',
        loaded: '已加载',
        registered: '已注册',
        succeeded: '成功',
        cancelled: '已取消',
        planning: '规划中',
        pending_commit: '等待提交',
        committing: '提交中',
        critical: '关键',
        high: '高',
        normal: '普通',
        low: '低',
        all: '全部',
        install: '安装',
        upgrade: '升级',
        uninstall: '卸载',
        activate: '激活',
        deactivate: '停用',
        register: '注册',
        dispose: '释放',
        activation_prepare: '激活准备',
        cleanup: '清理',
        cleanup_retry: '清理重试',
        planned: '已规划',
        completed: '已完成',
        skipped: '已跳过',
        builtin: '内置',
        trusted: '受信任',
        partner: '合作方',
        community: '社区',
        manual: '手工',
        registry: '注册表',
        local: '本地',
    },
};

function normalizeLocale(locale) {
    return locale === 'en-US' || locale === 'zh-CN' ? locale : 'zh-CN';
}

function getLocale(state = latestRenderedState ?? window.pluginManagerPanelUiState) {
    return normalizeLocale(state?.preferences?.locale);
}

function t(state, key, params) {
    const locale = getLocale(state);
    const text = PANEL_TRANSLATIONS[locale][key] ?? key;
    if (params == null) {
        return text;
    }
    return Object.entries(params).reduce((renderedText, [paramKey, paramValue]) => {
        return renderedText.replaceAll(`{${paramKey}}`, String(paramValue));
    }, text);
}

function translateValue(state, value) {
    const locale = getLocale(state);
    return PANEL_STATE_LABELS[locale][value] ?? value;
}

function getPanelDomRoot() {
    return window.__PEANUT_PLUGIN_MANAGER_PANEL_ROOT__ ?? document;
}

function getPanelElementById(elementId) {
    return getPanelDomRoot().querySelector(`#${elementId}`);
}

function applyStaticTranslations(state) {
    const locale = getLocale(state);
    const panelDomRoot = getPanelDomRoot();
    (panelDomRoot.documentElement ?? panelDomRoot).lang = locale;
    panelDomRoot.querySelectorAll('[data-i18n]').forEach((element) => {
        const key = element.getAttribute('data-i18n');
        if (key != null) {
            element.textContent = PANEL_TRANSLATIONS[locale][key] ?? key;
        }
    });
    panelDomRoot.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
        const key = element.getAttribute('data-i18n-placeholder');
        if (key != null) {
            element.setAttribute('placeholder', PANEL_TRANSLATIONS[locale][key] ?? key);
        }
    });
}

const elements = {
    runtimeTabButton: getPanelElementById('runtimeTabButton'),
    packagesTabButton: getPanelElementById('packagesTabButton'),
    diagnosticsTabButton: getPanelElementById('diagnosticsTabButton'),
    mcpTabButton: getPanelElementById('mcpTabButton'),
    aboutTabButton: getPanelElementById('aboutTabButton'),
    pluginList: getPanelElementById('pluginList'),
    failureList: getPanelElementById('failureList'),
    refreshButton: getPanelElementById('refreshButton'),
    localeSelect: getPanelElementById('localeSelect'),
    legacySettingsButton: getPanelElementById('legacySettingsButton'),
    reloadKernelButton: getPanelElementById('reloadKernelButton'),
    exportButton: getPanelElementById('exportButton'),
    retryButton: getPanelElementById('retryButton'),
    activateButton: getPanelElementById('activateButton'),
    deactivateButton: getPanelElementById('deactivateButton'),
    disposeButton: getPanelElementById('disposeButton'),
    openPanelButton: getPanelElementById('openPanelButton'),
    closePanelButton: getPanelElementById('closePanelButton'),
    embeddedPanelSection: getPanelElementById('embeddedPanelSection'),
    embeddedPanelTitle: getPanelElementById('embeddedPanelTitle'),
    embeddedPanelStatus: getPanelElementById('embeddedPanelStatus'),
    embeddedPanelFrame: getPanelElementById('embeddedPanelFrame'),
    packageCatalog: getPanelElementById('packageCatalog'),
    recentPackageCatalog: getPanelElementById('recentPackageCatalog'),
    packagePathInput: getPanelElementById('packagePathInput'),
    choosePackageDirectoryButton: getPanelElementById('choosePackageDirectoryButton'),
    packageSourceKindSelect: getPanelElementById('packageSourceKindSelect'),
    packageSourcePluginIdInput: getPanelElementById('packageSourcePluginIdInput'),
    packageSourceVersionInput: getPanelElementById('packageSourceVersionInput'),
    packageSourcePathInput: getPanelElementById('packageSourcePathInput'),
    packageSourcePackagePathInput: getPanelElementById('packageSourcePackagePathInput'),
    packageSearchInput: getPanelElementById('packageSearchInput'),
    packageFilterSelect: getPanelElementById('packageFilterSelect'),
    packageSortSelect: getPanelElementById('packageSortSelect'),
    planPackageButton: getPanelElementById('planPackageButton'),
    installPackageButton: getPanelElementById('installPackageButton'),
    installAndActivatePackageButton: getPanelElementById('installAndActivatePackageButton'),
    upgradePackageButton: getPanelElementById('upgradePackageButton'),
    upgradeAndActivatePackageButton: getPanelElementById('upgradeAndActivatePackageButton'),
    uninstallPackageButton: getPanelElementById('uninstallPackageButton'),
    registerPackageSourceButton: getPanelElementById('registerPackageSourceButton'),
    removePackageSourceButton: getPanelElementById('removePackageSourceButton'),
    packageActionSummary: getPanelElementById('packageActionSummary'),
    metricPluginCount: getPanelElementById('metricPluginCount'),
    metricFailureCount: getPanelElementById('metricFailureCount'),
    metricSelectedState: getPanelElementById('metricSelectedState'),
    metricSelectedHint: getPanelElementById('metricSelectedHint'),
    metricQueueCount: getPanelElementById('metricQueueCount'),
    metricQueueHint: getPanelElementById('metricQueueHint'),
    installedVersionSummary: getPanelElementById('installedVersionSummary'),
    statusMessage: getPanelElementById('statusMessage'),
    statusBadge: getPanelElementById('statusBadge'),
    mcpStatusBadge: getPanelElementById('mcpStatusBadge'),
    mcpStatusMessage: getPanelElementById('mcpStatusMessage'),
    mcpEnabledToggle: getPanelElementById('mcpEnabledToggle'),
    mcpSummary: getPanelElementById('mcpSummary'),
    mcpCapabilityCount: getPanelElementById('mcpCapabilityCount'),
    mcpCapabilityList: getPanelElementById('mcpCapabilityList'),
    mcpPendingPlanCount: getPanelElementById('mcpPendingPlanCount'),
    mcpPlanList: getPanelElementById('mcpPlanList'),
    failureCountBadge: getPanelElementById('failureCountBadge'),
    detailIcon: getPanelElementById('detailIcon'),
    detailTitle: getPanelElementById('detailTitle'),
    detailSubtitle: getPanelElementById('detailSubtitle'),
    detailStatePill: getPanelElementById('detailStatePill'),
    detailGrid: getPanelElementById('detailGrid'),
    detailIncidentMessage: getPanelElementById('detailIncidentMessage'),
    cleanupBadge: getPanelElementById('cleanupBadge'),
    cleanupTimeline: getPanelElementById('cleanupTimeline'),
    exportPreview: getPanelElementById('exportPreview'),
    executionUpdatedBadge: getPanelElementById('executionUpdatedBadge'),
    executionPriorityFilters: getPanelElementById('executionPriorityFilters'),
    executionExceptionalToggle: getPanelElementById('executionExceptionalToggle'),
    executionRefreshButton: getPanelElementById('executionRefreshButton'),
    planningGroups: getPanelElementById('planningGroups'),
    pendingGroups: getPanelElementById('pendingGroups'),
    activeGroups: getPanelElementById('activeGroups'),
    recentGroups: getPanelElementById('recentGroups'),
    executionDetail: getPanelElementById('executionDetail'),
};

let activePanelDriver = null;
let latestRenderedState = null;
let lastToastFeedbackMessage = null;
const visibleToastKeys = new Set();
const uiState = {
    activeWorkbenchTab: 'runtime',
    packageSearch: '',
    packageFilter: 'all',
    packageCatalogSort: 'plugin-id-asc',
    executionPriorityFilter: 'all',
    showOnlyExceptionalExecutionGroups: false,
};

/**
 * @description 切换 Cocos 原生工作台的可见分区，同时保持所有数据面板实例存活。
 * @param {string} tabId 目标工作台分区标识
 * @returns {void}
 */
function setActiveWorkbenchTab(tabId) {
    const supportedTabIds = ['runtime', 'packages', 'diagnostics', 'about'];
    if (!supportedTabIds.includes(tabId)) {
        return;
    }

    uiState.activeWorkbenchTab = tabId;
    const panelDomRoot = getPanelDomRoot();
    panelDomRoot.querySelectorAll('[data-workbench-tab]').forEach((tabButton) => {
        const isActive = tabButton.getAttribute('data-workbench-tab') === tabId;
        tabButton.classList.toggle('is-active', isActive);
        tabButton.setAttribute('aria-selected', String(isActive));
    });
    panelDomRoot.querySelectorAll('[data-workbench-view]').forEach((tabView) => {
        const isActive = tabView.getAttribute('data-workbench-view') === tabId;
        tabView.classList.toggle('is-active', isActive);
        tabView.hidden = !isActive;
    });
}

bootstrap().catch((error) => {
    applyError(error);
});

async function bootstrap() {
    activePanelDriver = await resolvePanelDriver();
    bindActions(activePanelDriver);
    bindEmbeddedPanelLifecycle();
    bindCocosKernelReloadRefresh(activePanelDriver);
    activePanelDriver.subscribe((state) => {
        render(state);
    });
    const initialState = await activePanelDriver.initialize();
    render(initialState);
}

/**
 * @description 绑定内嵌 iframe 的加载与 SnowB 就绪通知，只接受当前 iframe 窗口发出的消息。
 * @returns {void}
 */
function bindEmbeddedPanelLifecycle() {
    elements.embeddedPanelFrame?.addEventListener('load', () => {
        if (latestRenderedState?.embeddedPanel == null || elements.embeddedPanelFrame?.contentWindow == null) {
            return;
        }
        elements.embeddedPanelStatus.textContent = t(latestRenderedState, 'panel.ready');
        const packageRoot = resolvePanelPackageRoot(latestRenderedState.embeddedPanel.entry);
        elements.embeddedPanelFrame.contentWindow.postMessage({
            type: 'snowb-cpm:init',
            installPath: packageRoot,
            locale: normalizeLocale(latestRenderedState.preferences?.locale),
        }, '*');
    });
    window.addEventListener('message', (event) => {
        if (event.source !== elements.embeddedPanelFrame?.contentWindow || typeof event.data?.type !== 'string' || !event.data.type.startsWith('snowb-cpm:')) {
            return;
        }
        if (event.data.type === 'snowb-cpm:ready') {
            elements.embeddedPanelStatus.textContent = t(latestRenderedState, 'panel.ready');
            return;
        }
        if (event.data.type === 'snowb-cpm:sbf-bytes' || event.data.type === 'snowb-cpm:sbf-bytes-error' || event.data.type === 'snowb-cpm:response') {
            return;
        }
        void handleEmbeddedSnowbRequest(event.data);
    });
}

/**
 * @description 向 SnowB iframe 请求当前工程的 SBF base64 数据。
 * @returns {Promise<string>} 当前编辑器工程编码
 */
function requestEmbeddedSnowbSbfBase64() {
    const frameWindow = elements.embeddedPanelFrame?.contentWindow;
    return new Promise((resolve, reject) => {
        if (frameWindow == null) {
            reject(new Error('snowb_panel_frame_unavailable'));
            return;
        }
        const timeout = window.setTimeout(() => {
            window.removeEventListener('message', onMessage);
            reject(new Error('snowb_sbf_encoding_timeout'));
        }, 20000);
        const onMessage = (event) => {
            if (event.source !== frameWindow) {
                return;
            }
            if (event.data?.type === 'snowb-cpm:sbf-bytes' && typeof event.data.base64 === 'string') {
                window.clearTimeout(timeout);
                window.removeEventListener('message', onMessage);
                resolve(event.data.base64);
                return;
            }
            if (event.data?.type === 'snowb-cpm:sbf-bytes-error') {
                window.clearTimeout(timeout);
                window.removeEventListener('message', onMessage);
                reject(new Error(typeof event.data.error === 'string' ? event.data.error : 'snowb_sbf_encoding_failed'));
            }
        };
        window.addEventListener('message', onMessage);
        frameWindow.postMessage({ type: 'snowb-cpm:request-sbf-bytes' }, '*');
    });
}

/** @description 从已安装面板入口推导 Peanut 工程根目录。 */
function resolveEmbeddedProjectDirectory(panelEntry) {
    const normalizedEntry = panelEntry.replaceAll('\\', '/');
    const marker = '/peanut-plugins/plugins/';
    const markerIndex = normalizedEntry.indexOf(marker);
    if (markerIndex < 0) {
        throw new Error('snowb_project_directory_unavailable');
    }
    return normalizedEntry.slice(0, markerIndex);
}

/** @description 从 Creator 原生目录选择器选取 assets 内的 BMFont 发布目录。 */
async function pickEmbeddedSnowbPublishTarget(projectDirectory) {
    const dialog = window.Editor?.Dialog ?? window.top?.Editor?.Dialog ?? globalThis.Editor?.Dialog;
    if (typeof dialog?.select !== 'function') throw new Error('snowb_publish_dialog_unavailable');
    const path = require('path');
    const assetsDirectory = path.resolve(projectDirectory, 'assets');
    const dialogResult = await dialog.select({
        title: '选择 BMFont 发布目录（仅限 assets）',
        path: assetsDirectory,
        type: 'directory',
    });
    const selectedDirectory = Array.isArray(dialogResult?.filePaths) ? dialogResult.filePaths[0] : null;
    if (typeof selectedDirectory !== 'string' || selectedDirectory.length === 0) return null;
    const relativeDirectory = path.relative(assetsDirectory, path.resolve(selectedDirectory));
    if (relativeDirectory.startsWith('..') || path.isAbsolute(relativeDirectory)) throw new Error('snowb_publish_target_outside_assets');
    const normalizedDirectory = relativeDirectory.replaceAll('\\', '/').replace(/^\/+|\/+$/g, '');
    return normalizedDirectory.length === 0 ? 'db://assets/' : `db://assets/${normalizedDirectory}/`;
}

/** @description 从 Creator 原生文件选择器打开任意 SnowB .sbf 工程，默认定位至插件私有 cache。 */
async function pickEmbeddedSnowbSbfFile(cacheDirectory) {
    const dialog = window.Editor?.Dialog ?? window.top?.Editor?.Dialog ?? globalThis.Editor?.Dialog;
    if (typeof dialog?.select !== 'function') throw new Error('snowb_open_dialog_unavailable');
    const dialogResult = await dialog.select({
        title: '打开 SnowB 工程',
        path: cacheDirectory,
        type: 'file',
        filters: [{ name: 'SnowB Project', extensions: ['sbf'] }],
    });
    const selectedPath = Array.isArray(dialogResult?.filePaths) ? dialogResult.filePaths[0] : null;
    return typeof selectedPath === 'string' && selectedPath.length > 0 ? selectedPath : null;
}

/** @description 为 SnowB headless 导出注册宿主 Canvas 原生模块搜索路径。 */
function installSnowbNativeModulePath() {
    if (typeof require !== 'function' || typeof __dirname !== 'string') {
        return;
    }
    const path = require('path');
    const moduleApi = require('module');
    const target = `${process.platform}-${process.arch}`;
    const nativeModuleRoot = path.resolve(__dirname, '../../native-capabilities/canvas/1.x', target);
    const currentNodePath = process.env.NODE_PATH?.split(path.delimiter).filter(Boolean) ?? [];
    if (!currentNodePath.includes(nativeModuleRoot)) {
        process.env.NODE_PATH = [nativeModuleRoot, ...currentNodePath].join(path.delimiter);
        moduleApi.Module._initPaths();
    }
}

/** @description 把 SnowB iframe 请求转发给插件包内的受控宿主桥。 */
async function handleEmbeddedSnowbRequest(request) {
    const embeddedPanel = latestRenderedState?.embeddedPanel;
    const frameWindow = elements.embeddedPanelFrame?.contentWindow;
    if (embeddedPanel?.pluginId !== 'snowb.bmfont' || frameWindow == null || typeof require !== 'function') {
        return;
    }
    try {
        installSnowbNativeModulePath();
        const fs = require('fs');
        const path = require('path');
        const packageRoot = resolvePanelPackageRoot(embeddedPanel.entry);
        const manifestPath = path.join(packageRoot, 'snowb.bmfont.manifest.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const panelBridgePath = path.resolve(packageRoot, manifest.panelBridge ?? 'snowb.panel-bridge.cjs');
        if (!panelBridgePath.startsWith(`${packageRoot}${path.sep}`) || !fs.existsSync(panelBridgePath)) {
            throw new Error('snowb_panel_bridge_unavailable');
        }
        delete require.cache[panelBridgePath];
        const panelBridge = require(panelBridgePath);
        if (typeof panelBridge.handleRequest !== 'function') {
            throw new Error('snowb_panel_bridge_handler_missing');
        }
        elements.embeddedPanelStatus.textContent = '正在处理 SnowB 操作…';
        const response = await panelBridge.handleRequest({
            request,
            projectDirectory: resolveEmbeddedProjectDirectory(embeddedPanel.entry),
            requestSbfBase64: requestEmbeddedSnowbSbfBase64,
            editorApi: window.Editor ?? window.top?.Editor ?? globalThis.Editor,
            pickPublishTarget: () => pickEmbeddedSnowbPublishTarget(resolveEmbeddedProjectDirectory(embeddedPanel.entry)),
            pickSbfFile: pickEmbeddedSnowbSbfFile,
            setStatus(message, variant) {
                if (variant === 'success') {
                    elements.embeddedPanelStatus.textContent = t(latestRenderedState, 'panel.ready');
                    return;
                }
                elements.embeddedPanelStatus.textContent = message;
            },
        });
        if (response != null) {
            frameWindow.postMessage(response, '*');
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        elements.embeddedPanelStatus.textContent = message;
        if (typeof request.requestId === 'string') {
            frameWindow.postMessage({
                type: 'snowb-cpm:response',
                requestId: request.requestId,
                requestType: request.type,
                ok: false,
                error: message,
            }, '*');
        }
    }
}

/**
 * @description 订阅 Cocos 主进程的内核重载广播，使菜单操作也能刷新已打开的面板。
 * @param {ReturnType<typeof createBridgeBackedDriver>} panelDriver 当前面板数据驱动器
 * @returns {void}
 */
function bindCocosKernelReloadRefresh(panelDriver) {
    const editorApi = window.Editor ?? window.top?.Editor ?? globalThis.Editor;
    if (typeof editorApi?.Message?.addBroadcastListener !== 'function') {
        return;
    }

    editorApi.Message.addBroadcastListener('peanut-pod:kernel-reloaded', () => {
        void panelDriver.refresh();
    });
}

function bindActions(panelDriver) {
    const panelDomRoot = getPanelDomRoot();
    panelDomRoot.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }
        const actionButton = event.target.closest('button.button');
        if (actionButton == null || actionButton.disabled) {
            return;
        }
        showPanelToast(t(latestRenderedState, 'toast.pending'), 'pending');
    });
    panelDomRoot.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }
        const versionActionButton = event.target.closest('[data-package-version-action]');
        if (versionActionButton == null || versionActionButton.disabled) {
            return;
        }
        const version = versionActionButton.getAttribute('data-package-version');
        if (version == null || activePanelDriver == null) {
            return;
        }
        if (versionActionButton.getAttribute('data-package-version-action') === 'switch') {
            void activePanelDriver.switchSelectedPackageVersion(version);
            return;
        }
        void activePanelDriver.removeSelectedPackageVersion(version);
    });
    elements.runtimeTabButton?.addEventListener('click', () => {
        setActiveWorkbenchTab('runtime');
    });
    elements.packagesTabButton?.addEventListener('click', () => {
        setActiveWorkbenchTab('packages');
    });
    elements.diagnosticsTabButton?.addEventListener('click', () => {
        setActiveWorkbenchTab('diagnostics');
    });
    elements.mcpTabButton?.addEventListener('click', () => {
        setActiveWorkbenchTab('mcp');
    });
    elements.aboutTabButton?.addEventListener('click', () => {
        setActiveWorkbenchTab('about');
    });
    setActiveWorkbenchTab(uiState.activeWorkbenchTab);
    elements.refreshButton?.addEventListener('click', () => {
        void panelDriver.refresh();
    });
    elements.localeSelect?.addEventListener('change', () => {
        void panelDriver.updatePreferences({
            locale: elements.localeSelect.value,
        });
    });
    elements.legacySettingsButton?.addEventListener('click', () => {
        elements.localeSelect?.focus();
    });
    elements.reloadKernelButton?.addEventListener('click', () => {
        void panelDriver.reloadKernel();
    });
    elements.mcpEnabledToggle?.addEventListener('change', () => {
        void panelDriver.setMcpHubEnabled(elements.mcpEnabledToggle.checked);
    });
    elements.mcpPlanList?.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }
        const planButton = event.target.closest('[data-mcp-plan-action]');
        const planId = planButton?.getAttribute('data-mcp-plan-id');
        if (planId == null) {
            return;
        }
        if (planButton.getAttribute('data-mcp-plan-action') === 'approve') {
            void panelDriver.approveMcpPlan(planId);
            return;
        }
        void panelDriver.rejectMcpPlan(planId);
    });
    elements.exportButton?.addEventListener('click', () => {
        void panelDriver.exportSelectedFailure();
    });
    elements.retryButton?.addEventListener('click', () => {
        void panelDriver.retrySelectedCleanup();
    });
    elements.activateButton?.addEventListener('click', () => {
        void panelDriver.activateSelectedPlugin();
    });
    elements.deactivateButton?.addEventListener('click', () => {
        void panelDriver.deactivateSelectedPlugin();
    });
    elements.disposeButton?.addEventListener('click', () => {
        void panelDriver.disposeSelectedPlugin();
    });
    elements.openPanelButton?.addEventListener('click', () => {
        void panelDriver.openSelectedPluginPanel();
    });
    elements.closePanelButton?.addEventListener('click', () => {
        void panelDriver.closeEmbeddedPluginPanel();
    });
    elements.planPackageButton?.addEventListener('click', () => {
        void panelDriver.planPackage(elements.packagePathInput?.value ?? '');
    });
    elements.choosePackageDirectoryButton?.addEventListener('click', () => {
        void choosePackageDirectory(panelDriver);
    });
    elements.installPackageButton?.addEventListener('click', () => {
        void panelDriver.installPackage(elements.packagePathInput?.value ?? '');
    });
    elements.installAndActivatePackageButton?.addEventListener('click', () => {
        void panelDriver.installAndActivatePackage(elements.packagePathInput?.value ?? '');
    });
    elements.upgradePackageButton?.addEventListener('click', () => {
        void panelDriver.upgradePackage(elements.packagePathInput?.value ?? '');
    });
    elements.upgradeAndActivatePackageButton?.addEventListener('click', () => {
        void panelDriver.upgradeAndActivatePackage(elements.packagePathInput?.value ?? '');
    });
    elements.uninstallPackageButton?.addEventListener('click', () => {
        void panelDriver.uninstallSelectedPackage();
    });
    elements.registerPackageSourceButton?.addEventListener('click', () => {
        void panelDriver.registerPackageSource({
            sourceKind: elements.packageSourceKindSelect?.value ?? 'manual',
            pluginId: elements.packageSourcePluginIdInput?.value ?? '',
            version: elements.packageSourceVersionInput?.value ?? '',
            sourcePath: elements.packageSourcePathInput?.value ?? '',
            packagePath: elements.packageSourcePackagePathInput?.value ?? '',
        });
    });
    elements.removePackageSourceButton?.addEventListener('click', () => {
        void panelDriver.removePackageSource(elements.packageSourcePackagePathInput?.value ?? elements.packagePathInput?.value ?? '');
    });
    elements.packageSearchInput?.addEventListener('input', () => {
        uiState.packageSearch = elements.packageSearchInput.value.trim().toLowerCase();
        if (window.pluginManagerPanelUiState != null) {
            render(window.pluginManagerPanelUiState);
        }
    });
    elements.packageFilterSelect?.addEventListener('change', () => {
        uiState.packageFilter = elements.packageFilterSelect.value;
        void panelDriver.updatePreferences({
            packageFilter: uiState.packageFilter,
        });
        if (window.pluginManagerPanelUiState != null) {
            render(window.pluginManagerPanelUiState);
        }
    });
    elements.packageSortSelect?.addEventListener('change', () => {
        uiState.packageCatalogSort = elements.packageSortSelect.value;
        void panelDriver.updatePreferences({
            packageCatalogSort: uiState.packageCatalogSort,
        });
        if (window.pluginManagerPanelUiState != null) {
            render(window.pluginManagerPanelUiState);
        }
    });
    elements.executionExceptionalToggle?.addEventListener('click', () => {
        void panelDriver.toggleExceptionalExecutionGroups();
    });
    elements.executionRefreshButton?.addEventListener('click', () => {
        void panelDriver.refreshExecutionDiagnostics();
    });
}

async function choosePackageDirectory(panelDriver) {
    try {
        const packagePath = await panelDriver.pickPackageDirectory();
        if (typeof packagePath === 'string' && packagePath.length > 0 && elements.packagePathInput != null) {
            elements.packagePathInput.value = packagePath;
        }
    } catch (error) {
        applyError(error);
    }
}

async function resolvePanelDriver() {
    if (window.pluginManagerPanelUiActions != null) {
        return createWindowBackedDriver();
    }

    const panelBridge = await resolvePanelBridge();
    return createBridgeBackedDriver(panelBridge);
}

function createWindowBackedDriver() {
    const listeners = window.__PEANUT_PLUGIN_MANAGER_PANEL_STATE_LISTENERS__ ?? [];
    window.__PEANUT_PLUGIN_MANAGER_PANEL_STATE_LISTENERS__ = listeners;

    return {
        async initialize() {
            if (window.pluginManagerPanelUiState == null) {
                await window.pluginManagerPanelUiActions.refresh();
            }
            return window.pluginManagerPanelUiState;
        },
        subscribe(listener) {
            listeners.push(listener);
        },
        async refresh() {
            return window.pluginManagerPanelUiActions.refresh();
        },
        async reloadKernel() {
            return window.pluginManagerPanelUiActions.reloadKernel();
        },
        async refreshExecutionDiagnostics() {
            return window.pluginManagerPanelUiActions.refreshExecutionDiagnostics();
        },
        async exportSelectedFailure() {
            await window.pluginManagerPanelUiActions.exportSelectedFailure();
            return window.pluginManagerPanelUiState;
        },
        async retrySelectedCleanup() {
            await window.pluginManagerPanelUiActions.retrySelectedCleanup();
            return window.pluginManagerPanelUiState;
        },
        async activateSelectedPlugin() {
            return window.pluginManagerPanelUiActions.activateSelectedPlugin();
        },
        async deactivateSelectedPlugin() {
            return window.pluginManagerPanelUiActions.deactivateSelectedPlugin();
        },
        async disposeSelectedPlugin() {
            return window.pluginManagerPanelUiActions.disposeSelectedPlugin();
        },
        async openSelectedPluginPanel() {
            if (window.pluginManagerPanelUiState?.selectedPluginId === SNOWB_BMF_PLUGIN_ID) {
                await openSnowbPluginHostPanel();
                return window.pluginManagerPanelUiState;
            }
            return window.pluginManagerPanelUiActions.openSelectedPluginPanel();
        },
        async closeEmbeddedPluginPanel() {
            return window.pluginManagerPanelUiActions.closeEmbeddedPluginPanel();
        },
        async planPackage(packagePath) {
            return window.pluginManagerPanelUiActions.planPackage(packagePath);
        },
        async pickPackageDirectory() {
            return null;
        },
        async installPackage(packagePath) {
            return window.pluginManagerPanelUiActions.installPackage(packagePath);
        },
        async upgradePackage(packagePath) {
            return window.pluginManagerPanelUiActions.upgradePackage(packagePath);
        },
        async installAndActivatePackage(packagePath) {
            return window.pluginManagerPanelUiActions.installAndActivatePackage(packagePath);
        },
        async upgradeAndActivatePackage(packagePath) {
            return window.pluginManagerPanelUiActions.upgradeAndActivatePackage(packagePath);
        },
        async uninstallSelectedPackage() {
            return window.pluginManagerPanelUiActions.uninstallSelectedPackage();
        },
        async switchSelectedPackageVersion(version) {
            return window.pluginManagerPanelUiActions.switchSelectedPackageVersion(version);
        },
        async removeSelectedPackageVersion(version) {
            return window.pluginManagerPanelUiActions.removeSelectedPackageVersion(version);
        },
        async selectPackageCatalogItem(packagePath) {
            return window.pluginManagerPanelUiActions.selectPackageCatalogItem(packagePath);
        },
        async selectPlugin(pluginId) {
            return window.pluginManagerPanelUiActions.selectPlugin(pluginId);
        },
        async selectExecutionGroup(groupId) {
            return window.pluginManagerPanelUiActions.selectExecutionGroup(groupId);
        },
        async setExecutionPriorityFilter(priority) {
            return window.pluginManagerPanelUiActions.setExecutionPriorityFilter(priority);
        },
        async toggleExceptionalExecutionGroups() {
            return window.pluginManagerPanelUiActions.toggleExceptionalExecutionGroups();
        },
        async updatePreferences(preferences) {
            return window.pluginManagerPanelUiActions.updatePreferences(preferences);
        },
        async registerPackageSource(source) {
            return window.pluginManagerPanelUiActions.registerPackageSource(source);
        },
        async removePackageSource(packagePath) {
            return window.pluginManagerPanelUiActions.removePackageSource(packagePath);
        },
    };
}

function createBridgeBackedDriver(panelBridge) {
    const state = {
        bridgeMode: panelBridge.__bridgeMode === 'host' ? 'host' : 'preview',
        runtimeRecords: [],
        failureItems: [],
        packageCatalog: [],
        recentPackagePaths: [],
        kernelReloadSupported: false,
        preferences: {
            locale: 'zh-CN',
            packageFilter: 'all',
            packageCatalogSort: 'plugin-id-asc',
            selectedPluginId: null,
            selectedPackagePath: null,
        },
        selectedPluginId: null,
        selectedPackagePath: null,
        selectedRuntimeRecord: null,
        embeddedPanel: null,
        selectedInstalledPackageSnapshot: null,
        selectedIncident: null,
        selectedFailureExport: null,
        lastCleanupSteps: [],
        lastPackageActionSummary: null,
        lastActionSummary: null,
        lastError: null,
        status: 'idle',
        executionDiagnosticsSnapshot: null,
        selectedExecutionGroupId: null,
        executionPriorityFilter: 'all',
        showOnlyExceptionalExecutionGroups: false,
        mcpHub: {
            isAvailable: false,
            isEnabled: false,
            port: null,
            catalogRevision: 0,
            capabilities: [],
            pendingPlans: [],
        },
    };
    const listeners = [];

    const notify = () => {
        for (const listener of listeners) {
            listener({ ...state });
        }
    };

    const requestBridge = async (event, payload) => {
        const response = await panelBridge.request({
            id: buildRequestId(event),
            event,
            expectsResponse: true,
            payload,
        });
        if (!response.ok || response.payload == null) {
            throw new Error(response.error ?? `plugin_manager_panel_request_failed:${event}`);
        }
        return response.payload;
    };

    const refreshSelectedDetail = async () => {
        if (state.selectedPluginId == null) {
            state.selectedRuntimeRecord = null;
            state.selectedInstalledPackageSnapshot = null;
            state.selectedIncident = null;
            state.selectedFailureExport = null;
            state.lastCleanupSteps = [];
            return;
        }

        state.selectedRuntimeRecord = state.runtimeRecords.find((runtimeRecord) => {
            return runtimeRecord.pluginId === state.selectedPluginId;
        }) ?? null;

        try {
            const detail = await requestBridge(DETAIL_EVENT, {
                pluginId: state.selectedPluginId,
            });
            state.selectedInstalledPackageSnapshot = detail.installedPackageSnapshot ?? null;
            state.selectedIncident = detail.incident ?? null;
            state.lastCleanupSteps = detail.incident?.cleanupSteps ?? [];
        } catch (error) {
            state.selectedInstalledPackageSnapshot = null;
            state.selectedIncident = null;
            state.lastCleanupSteps = [];
            state.lastError = normalizeErrorMessage(error);
        }
    };

    if (typeof panelBridge.subscribe === 'function') {
        panelBridge.subscribe('pluginManager.failure.updated', async (envelope) => {
            if (envelope?.payload?.incident?.pluginId === state.selectedPluginId) {
                state.selectedIncident = envelope.payload.incident;
                state.lastCleanupSteps = envelope.payload.cleanupSteps ?? [];
            }
            await driver.refresh();
        });
    }

    const driver = {
        async initialize() {
            await this.refresh();
            return { ...state };
        },
        subscribe(listener) {
            listeners.push(listener);
        },
        async refresh() {
            state.status = 'loading';
            notify();
            try {
                const snapshot = await requestBridge(SNAPSHOT_EVENT, {});
                state.runtimeRecords = snapshot.runtimeRecords ?? [];
                state.failureItems = snapshot.failureItems ?? [];
                state.packageCatalog = snapshot.packageCatalog ?? [];
                state.recentPackagePaths = snapshot.recentPackagePaths ?? [];
                state.kernelReloadSupported = snapshot.kernelReloadSupported === true;
                state.preferences = snapshot.preferences ?? state.preferences;
                state.executionDiagnosticsSnapshot = snapshot.executionDiagnosticsSnapshot ?? state.executionDiagnosticsSnapshot;
                state.mcpHub = snapshot.mcpHub ?? state.mcpHub;
                state.executionPriorityFilter = state.executionPriorityFilter ?? 'all';
                state.selectedPluginId = resolveSelectedPluginId(
                    state.preferences.selectedPluginId ?? state.selectedPluginId,
                    state.runtimeRecords,
                    state.failureItems,
                );
                state.selectedPackagePath = resolveSelectedPackagePath(
                    state.preferences.selectedPackagePath ?? state.selectedPackagePath,
                    state.packageCatalog,
                    state.selectedPluginId,
                );
                state.selectedExecutionGroupId = resolveSelectedExecutionGroupId(
                    state.executionDiagnosticsSnapshot,
                    state.selectedExecutionGroupId,
                    state.executionPriorityFilter,
                    state.showOnlyExceptionalExecutionGroups,
                );
                await refreshSelectedDetail();
                if (
                    state.embeddedPanel?.pluginId !== state.selectedPluginId
                    || state.selectedRuntimeRecord?.state !== 'active'
                ) {
                    state.embeddedPanel = null;
                }
                state.lastError = null;
                state.status = 'ready';
            } catch (error) {
                state.lastError = normalizeErrorMessage(error);
                state.status = 'error';
            }
            notify();
            return { ...state };
        },
        async exportSelectedFailure() {
            if (state.selectedPluginId == null) {
                return { ...state };
            }
            try {
                const payload = await requestBridge(EXPORT_EVENT, {
                    pluginId: state.selectedPluginId,
                });
                state.selectedFailureExport = payload.exportResult ?? null;
                state.lastError = null;
                state.lastActionSummary = buildSuccessMessage(state, 'actions.export');
            } catch (error) {
                state.lastError = normalizeErrorMessage(error);
            }
            notify();
            return { ...state };
        },
        async retrySelectedCleanup() {
            if (state.selectedPluginId == null) {
                return { ...state };
            }
            try {
                const payload = await requestBridge(RETRY_EVENT, {
                    pluginId: state.selectedPluginId,
                });
                state.selectedIncident = payload.incident ?? null;
                state.lastCleanupSteps = payload.cleanupSteps ?? [];
                state.selectedFailureExport = null;
                state.lastError = null;
                state.lastActionSummary = buildSuccessMessage(state, 'actions.retryCleanup');
                await this.refresh();
            } catch (error) {
                state.lastError = normalizeErrorMessage(error);
                notify();
            }
            return { ...state };
        },
        async activateSelectedPlugin() {
            return runRuntimeAction(ACTIVATE_EVENT);
        },
        async deactivateSelectedPlugin() {
            return runRuntimeAction(DEACTIVATE_EVENT);
        },
        async disposeSelectedPlugin() {
            return runRuntimeAction(DISPOSE_EVENT);
        },
        async openSelectedPluginPanel() {
            if (state.selectedPluginId == null) {
                return { ...state };
            }
            if (state.selectedPluginId === SNOWB_BMF_PLUGIN_ID) {
                try {
                    await openSnowbPluginHostPanel();
                    state.lastError = null;
                    state.lastActionSummary = '已在 Plugin Host 中打开 SnowB BMFont 面板。';
                    state.status = 'ready';
                } catch (error) {
                    state.status = 'error';
                    state.lastError = normalizeErrorMessage(error);
                }
                notify();
                return { ...state };
            }
            state.status = 'loading';
            state.embeddedPanel = null;
            state.lastError = null;
            notify();
            try {
                state.embeddedPanel = await requestBridge(PANEL_RESOLVE_EVENT, {
                    pluginId: state.selectedPluginId,
                });
                state.status = 'ready';
            } catch (error) {
                state.status = 'error';
                state.lastError = normalizeErrorMessage(error);
            }
            notify();
            return { ...state };
        },
        async closeEmbeddedPluginPanel() {
            state.embeddedPanel = null;
            state.status = 'ready';
            state.lastError = null;
            notify();
            return { ...state };
        },
        async refreshExecutionDiagnostics() {
            try {
                const snapshot = await requestBridge(EXECUTION_DIAGNOSTICS_EVENT, {});
                state.executionDiagnosticsSnapshot = snapshot;
                state.selectedExecutionGroupId = resolveSelectedExecutionGroupId(
                    state.executionDiagnosticsSnapshot,
                    state.selectedExecutionGroupId,
                    state.executionPriorityFilter,
                    state.showOnlyExceptionalExecutionGroups,
                );
                state.lastError = null;
                state.lastActionSummary = buildSuccessMessage(state, 'execution.refresh');
            } catch (error) {
                state.lastError = normalizeErrorMessage(error);
            }
            notify();
            return { ...state };
        },
        async setMcpHubEnabled(isEnabled) {
            return runMcpAction(MCP_SET_ENABLED_EVENT, { isEnabled }, isEnabled ? 'MCP Hub 已启用。' : 'MCP Hub 已禁用。');
        },
        async approveMcpPlan(planId) {
            return runMcpAction(MCP_APPROVE_PLAN_EVENT, { planId }, 'MCP 写操作已批准。');
        },
        async rejectMcpPlan(planId) {
            return runMcpAction(MCP_REJECT_PLAN_EVENT, { planId }, 'MCP 写操作已拒绝。');
        },
        async reloadKernel() {
            try {
                if (typeof panelBridge.reloadKernel === 'function') {
                    await panelBridge.reloadKernel();
                } else {
                    if (!state.kernelReloadSupported) {
                        return { ...state };
                    }
                    await requestBridge(KERNEL_RELOAD_EVENT, {});
                }
                state.lastError = null;
                state.lastActionSummary = buildSuccessMessage(state, 'actions.reloadKernel');
                await this.refresh();
            } catch (error) {
                state.lastError = normalizeErrorMessage(error);
                notify();
            }
            return { ...state };
        },
        async planPackage(packagePath) {
            state.status = 'loading';
            notify();
            try {
                const payload = await requestBridge(PACKAGE_PLAN_EVENT, {
                    packagePath,
                });
                state.selectedPluginId = payload.installPlan?.pluginId ?? state.selectedPluginId;
                state.selectedInstalledPackageSnapshot = payload.installedPackageSnapshot ?? null;
                state.lastPackageActionSummary = t(state, 'package.planSummary', {
                    action: translateValue(state, payload.installPlan.operation),
                    pluginId: payload.installPlan.pluginId,
                    version: payload.installPlan.version,
                });
                state.lastActionSummary = state.lastPackageActionSummary;
                state.status = 'ready';
                state.lastError = null;
                await refreshSelectedDetail();
            } catch (error) {
                state.status = 'error';
                state.lastError = normalizeErrorMessage(error);
            }
            notify();
            return { ...state };
        },
        async pickPackageDirectory() {
            const payload = await requestBridge(PACKAGE_PICK_DIRECTORY_EVENT, {});
            return typeof payload.packagePath === 'string' ? payload.packagePath : null;
        },
        async installPackage(packagePath) {
            return runPackageAction(PACKAGE_INSTALL_EVENT, packagePath);
        },
        async upgradePackage(packagePath) {
            return runPackageAction(PACKAGE_UPGRADE_EVENT, packagePath);
        },
        async installAndActivatePackage(packagePath) {
            return runPackageAction('pluginManager.package.installAndActivate', packagePath);
        },
        async upgradeAndActivatePackage(packagePath) {
            return runPackageAction('pluginManager.package.upgradeAndActivate', packagePath);
        },
        async uninstallSelectedPackage() {
            if (state.selectedPluginId == null) {
                return { ...state };
            }
            return runPackageUninstall(state.selectedPluginId);
        },
        async switchSelectedPackageVersion(version) {
            return runPackageVersionAction('switch', version);
        },
        async removeSelectedPackageVersion(version) {
            return runPackageVersionAction('remove', version);
        },
        async selectPlugin(pluginId) {
            state.embeddedPanel = null;
            state.selectedPluginId = pluginId;
            state.selectedFailureExport = null;
            state.status = 'loading';
            notify();
            await refreshSelectedDetail();
            state.status = 'ready';
            notify();
            return { ...state };
        },
        async selectExecutionGroup(groupId) {
            state.selectedExecutionGroupId = groupId;
            notify();
            return { ...state };
        },
        async setExecutionPriorityFilter(priority) {
            state.executionPriorityFilter = priority;
            state.selectedExecutionGroupId = resolveSelectedExecutionGroupId(
                state.executionDiagnosticsSnapshot,
                state.selectedExecutionGroupId,
                state.executionPriorityFilter,
                state.showOnlyExceptionalExecutionGroups,
            );
            notify();
            return { ...state };
        },
        async toggleExceptionalExecutionGroups() {
            state.showOnlyExceptionalExecutionGroups = !state.showOnlyExceptionalExecutionGroups;
            state.selectedExecutionGroupId = resolveSelectedExecutionGroupId(
                state.executionDiagnosticsSnapshot,
                state.selectedExecutionGroupId,
                state.executionPriorityFilter,
                state.showOnlyExceptionalExecutionGroups,
            );
            notify();
            return { ...state };
        },
        async selectPackageCatalogItem(packagePath) {
            state.selectedPackagePath = packagePath;
            const selectedPackageCatalogItem = state.packageCatalog.find((packageCatalogItem) => {
                return packageCatalogItem.packagePath === packagePath;
            });
            if (selectedPackageCatalogItem?.pluginId != null) {
                return this.selectPlugin(selectedPackageCatalogItem.pluginId);
            }
            notify();
            return { ...state };
        },
        async updatePreferences(preferences) {
            try {
                const payload = await requestBridge(PREFERENCES_UPDATE_EVENT, {
                    preferences,
                });
                state.preferences = payload.preferences;
                notify();
                return { ...state };
            } catch (error) {
                state.lastError = normalizeErrorMessage(error);
                notify();
                return { ...state };
            }
        },
        async registerPackageSource(source) {
            state.status = 'loading';
            notify();
            try {
                const payload = await requestBridge('pluginManager.packageSource.register', {
                    source,
                });
                state.packageCatalog = payload.packageCatalog ?? [];
                state.selectedPackagePath = source.packagePath;
                state.lastError = null;
                state.lastActionSummary = buildSuccessMessage(state, 'actions.registerSource');
                await this.refresh();
            } catch (error) {
                state.status = 'error';
                state.lastError = normalizeErrorMessage(error);
                notify();
            }
            return { ...state };
        },
        async removePackageSource(packagePath) {
            state.status = 'loading';
            notify();
            try {
                const payload = await requestBridge('pluginManager.packageSource.remove', {
                    packagePath,
                });
                state.packageCatalog = payload.packageCatalog ?? [];
                if (state.selectedPackagePath === packagePath) {
                    state.selectedPackagePath = null;
                }
                state.lastError = null;
                state.lastActionSummary = buildSuccessMessage(state, 'actions.removeSource');
                await this.refresh();
            } catch (error) {
                state.status = 'error';
                state.lastError = normalizeErrorMessage(error);
                notify();
            }
            return { ...state };
        },
    };

    async function runRuntimeAction(event) {
        if (state.selectedPluginId == null) {
            return { ...state };
        }
        try {
            await requestBridge(event, {
                pluginId: state.selectedPluginId,
            });
            state.selectedFailureExport = null;
            state.lastActionSummary = buildSuccessMessage(state, getRuntimeActionTranslationKey(event));
            await driver.refresh();
        } catch (error) {
            state.lastError = normalizeErrorMessage(error);
            notify();
        }
        return { ...state };
    }

    async function runPackageAction(event, packagePath) {
        state.status = 'loading';
        notify();
        try {
            const payload = await requestBridge(event, {
                packagePath,
            });
            state.selectedPluginId = payload.installResult?.pluginId ?? state.selectedPluginId;
            state.selectedInstalledPackageSnapshot = payload.installedPackageSnapshot ?? null;
            state.lastPackageActionSummary = summarizePackageAction(payload);
            state.lastError = null;
            state.lastActionSummary = state.lastPackageActionSummary;
            await driver.refresh();
        } catch (error) {
            state.status = 'error';
            state.lastError = normalizeErrorMessage(error);
            notify();
        }
        return { ...state };
    }

    async function runPackageUninstall(pluginId) {
        state.status = 'loading';
        notify();
        try {
            const payload = await requestBridge(PACKAGE_UNINSTALL_EVENT, {
                pluginId,
            });
            state.selectedInstalledPackageSnapshot = payload.installedPackageSnapshot ?? null;
            state.lastPackageActionSummary = summarizePackageAction(payload);
            state.lastError = null;
            state.lastActionSummary = state.lastPackageActionSummary;
            await driver.refresh();
        } catch (error) {
            state.status = 'error';
            state.lastError = normalizeErrorMessage(error);
            notify();
        }
        return { ...state };
    }

    async function runPackageVersionAction(action, version) {
        if (state.selectedPluginId == null) {
            return { ...state };
        }
        state.status = 'loading';
        notify();
        try {
            const payload = await requestBridge(
                action === 'switch' ? 'pluginManager.package.switchVersion' : 'pluginManager.package.removeVersion',
                {
                    pluginId: state.selectedPluginId,
                    version,
                },
            );
            state.selectedInstalledPackageSnapshot = payload.installedPackageSnapshot ?? null;
            state.lastPackageActionSummary = `${action}:${state.selectedPluginId}@${version}`;
            state.lastActionSummary = state.lastPackageActionSummary;
            state.lastError = null;
            await driver.refresh();
        } catch (error) {
            state.status = 'error';
            state.lastError = normalizeErrorMessage(error);
            notify();
        }
        return { ...state };
    }

    async function runMcpAction(event, payload, summary) {
        try {
            state.mcpHub = await requestBridge(event, payload);
            state.lastError = null;
            state.lastActionSummary = summary;
        } catch (error) {
            state.lastError = normalizeErrorMessage(error);
        }
        notify();
        return { ...state };
    }

    return driver;
}

function render(state) {
    latestRenderedState = state;
    syncPanelToast(state);
    renderHeader(state);
    renderPluginList(state);
    renderFailureList(state);
    renderPackageCatalog(state);
    renderRecentPackageCatalog(state);
    renderDetail(state);
    renderCleanup(state);
    renderActions(state);
    renderEmbeddedPanel(state);
    renderExecutionDiagnostics(state);
    renderMcpHub(state);
}

function renderHeader(state) {
    applyStaticTranslations(state);
    elements.metricPluginCount.textContent = String(state.runtimeRecords.length);
    elements.metricFailureCount.textContent = String(state.failureItems.length);
    elements.metricSelectedState.textContent = state.selectedRuntimeRecord?.state != null
        ? translateValue(state, state.selectedRuntimeRecord.state)
        : t(state, 'summary.none');
    elements.metricSelectedHint.textContent = state.selectedPluginId ?? t(state, 'summary.noPluginSelected');
    elements.metricQueueCount.textContent = String(getQueueGroupCount(state.executionDiagnosticsSnapshot));
    elements.metricQueueHint.textContent = state.executionDiagnosticsSnapshot?.queue?.activeCommitGroup?.groupId ?? t(state, 'summary.idle');
    const installedPluginVersions = state.runtimeRecords.filter((runtimeRecord) => {
        return runtimeRecord.pluginId !== BUILTIN_PLUGIN_MANAGER_PANEL_ID;
    }).map((runtimeRecord) => {
        return `${runtimeRecord.pluginId}@${runtimeRecord.version}`;
    });
    elements.installedVersionSummary.textContent = `${t(state, 'summary.installed')}: ${installedPluginVersions.join(' · ') || t(state, 'summary.none')}`;
    elements.installedVersionSummary.title = elements.installedVersionSummary.textContent;
    elements.localeSelect.value = normalizeLocale(state.preferences?.locale);
    uiState.packageFilter = state.preferences?.packageFilter ?? uiState.packageFilter;
    uiState.packageCatalogSort = state.preferences?.packageCatalogSort ?? uiState.packageCatalogSort;
    uiState.executionPriorityFilter = state.executionPriorityFilter ?? uiState.executionPriorityFilter;
    elements.packageFilterSelect.value = uiState.packageFilter;
    elements.packageSortSelect.value = uiState.packageCatalogSort;
    elements.failureCountBadge.textContent = String(state.failureItems.length);
    elements.failureCountBadge.className = `pill ${state.failureItems.length > 0 ? 'pill-danger' : 'pill-success'}`;
    elements.statusMessage.textContent = state.lastError ?? state.lastActionSummary ?? (state.bridgeMode === 'host' ? t(state, 'status.liveBridge') : t(state, 'status.previewBridge'));
    if (state.lastError != null) {
        elements.statusBadge.textContent = normalizeLocale(state.preferences?.locale) === 'zh-CN' ? '失败' : 'Failed';
        elements.statusBadge.className = 'pill pill-danger';
        return;
    }
    if (state.lastActionSummary != null) {
        elements.statusBadge.textContent = normalizeLocale(state.preferences?.locale) === 'zh-CN' ? '成功' : 'Succeeded';
        elements.statusBadge.className = 'pill pill-success';
        return;
    }
    elements.statusBadge.textContent = state.bridgeMode === 'host' ? t(state, 'status.live') : t(state, 'status.preview');
    elements.statusBadge.className = `pill ${state.bridgeMode === 'host' ? 'pill-success' : 'pill-neutral'}`;
}

/**
 * @description 构造面板顶部可见的成功反馈，复用现有操作本地化文案。
 * @param translationKey 当前操作对应的翻译键
 * @returns 供状态区显示的成功结果
 */
function buildSuccessMessage(state, translationKey) {
    const action = t(state, translationKey);
    return normalizeLocale(state.preferences?.locale) === 'zh-CN' ? `${action}成功。` : `${action} succeeded.`;
}

/**
 * @description 把运行时 bridge 事件映射为面板可读的操作翻译键。
 * @param event 插件运行时 bridge 事件名
 * @returns 对应的操作翻译键
 */
function getRuntimeActionTranslationKey(event) {
    switch (event) {
        case ACTIVATE_EVENT:
            return 'actions.activate';
        case DEACTIVATE_EVENT:
            return 'actions.deactivate';
        case DISPOSE_EVENT:
            return 'actions.dispose';
        default:
            return 'actions.refresh';
    }
}

function renderPluginList(state) {
    if (state.runtimeRecords.length === 0) {
        elements.pluginList.innerHTML = `<div class="empty-state">${escapeHtml(t(state, 'empty.noPlugins'))}</div>`;
        return;
    }

    elements.pluginList.innerHTML = state.runtimeRecords.map((runtimeRecord) => {
        const selectedClass = runtimeRecord.pluginId === state.selectedPluginId ? ' is-selected' : '';
        return `<button type="button" class="plugin-card${selectedClass}" data-plugin-id="${escapeHtml(runtimeRecord.pluginId)}">
    ${buildPluginIcon(runtimeRecord.iconUrl, runtimeRecord.displayName ?? runtimeRecord.pluginId, 'plugin-card-logo')}
    <span class="plugin-card-title">${escapeHtml(runtimeRecord.displayName ?? runtimeRecord.pluginId)}</span>
    <span class="plugin-card-meta">${escapeHtml(runtimeRecord.version)} · ${escapeHtml(translateValue(state, runtimeRecord.trustLevel))}</span>
    <div class="plugin-card-row">
        <span class="pill ${statusPillClass(runtimeRecord.state)}">${escapeHtml(translateValue(state, runtimeRecord.state))}</span>
        <span>${escapeHtml(runtimeRecord.installPath ?? t(state, 'summary.runtime').toLowerCase())}</span>
    </div>
</button>`;
    }).join('');

    elements.pluginList.querySelectorAll('[data-plugin-id]').forEach((buttonElement) => {
        buttonElement.addEventListener('click', async () => {
            await activePanelDriver?.selectPlugin(buttonElement.getAttribute('data-plugin-id'));
        });
    });
}

function renderFailureList(state) {
    if (state.failureItems.length === 0) {
        elements.failureList.innerHTML = `<div class="empty-state">${escapeHtml(t(state, 'empty.noPluginFailures'))}</div>`;
        return;
    }

    elements.failureList.innerHTML = state.failureItems.map((failureItem) => {
        return `<div class="failure-row">
    <strong>${escapeHtml(failureItem.pluginId)}</strong>
    <span>${escapeHtml(translateValue(state, failureItem.phase))}</span>
    <span>${escapeHtml(failureItem.summary ?? t(state, 'execution.noDetail'))}</span>
</div>`;
    }).join('');
}

function renderPackageCatalog(state) {
    const filteredPackageCatalog = filterPackageCatalog(state.packageCatalog ?? []);
    if (filteredPackageCatalog.length === 0) {
        elements.packageCatalog.innerHTML = `<div class="empty-state">${escapeHtml(t(state, 'package.noSources'))}</div>`;
        return;
    }

    const groupedPackageCatalog = groupPackageCatalogBySource(filteredPackageCatalog);
    elements.packageCatalog.innerHTML = groupedPackageCatalog.map(([sourcePath, packageCatalogItems]) => {
        return `<div class="catalog-group">
    <div class="catalog-group-title">${escapeHtml(sourcePath)}</div>
    ${packageCatalogItems.map((packageCatalogItem) => {
        return buildPackageCatalogCard(packageCatalogItem, state.selectedPackagePath);
    }).join('')}
</div>`;
    }).join('');

    wirePackageCatalogSelection(elements.packageCatalog);
}

function renderRecentPackageCatalog(state) {
    const recentPackageCatalog = (state.recentPackagePaths ?? []).map((packagePath) => {
        return (state.packageCatalog ?? []).find((packageCatalogItem) => {
            return packageCatalogItem.packagePath === packagePath;
        });
    }).filter(Boolean);

    if (recentPackageCatalog.length === 0) {
        elements.recentPackageCatalog.innerHTML = `<div class="empty-state">${escapeHtml(t(state, 'package.noRecentSources'))}</div>`;
        return;
    }

    elements.recentPackageCatalog.innerHTML = recentPackageCatalog.map((packageCatalogItem) => {
        return buildPackageCatalogCard(packageCatalogItem, state.selectedPackagePath);
    }).join('');

    wirePackageCatalogSelection(elements.recentPackageCatalog);
}

function buildPackageCatalogCard(packageCatalogItem, selectedPackagePath) {
    const state = latestRenderedState ?? window.pluginManagerPanelUiState;
    const selectedClass = packageCatalogItem.packagePath === selectedPackagePath ? ' is-selected' : '';
    return `<button type="button" class="plugin-card${selectedClass}" data-package-path="${escapeHtml(packageCatalogItem.packagePath)}">
    ${buildPluginIcon(packageCatalogItem.iconUrl, packageCatalogItem.displayName ?? packageCatalogItem.pluginId, 'plugin-card-logo')}
    <span class="plugin-card-title">${escapeHtml(packageCatalogItem.displayName ?? packageCatalogItem.pluginId)}</span>
    <span class="plugin-card-meta">${escapeHtml(packageCatalogItem.version)} · ${escapeHtml(packageCatalogItem.sourcePath)}</span>
    <div class="plugin-card-row">
        <span class="pill pill-neutral">${escapeHtml(translateValue(state, packageCatalogItem.sourceKind))}</span>
        <span class="pill ${packageCatalogItem.installedActiveVersion == null ? 'pill-neutral' : 'pill-success'}">${escapeHtml(packageCatalogItem.installedActiveVersion ?? t(state, 'detail.notInstalled'))}</span>
        <span>${escapeHtml(packageCatalogItem.packagePath)}</span>
    </div>
</button>`;
}

function buildPluginIcon(iconUrl, label, className) {
    if (typeof iconUrl === 'string' && iconUrl.startsWith('file://')) {
        return `<img class="${className}" src="${escapeHtml(iconUrl)}" alt="" aria-hidden="true" />`;
    }
    return `<span class="${className} plugin-logo-fallback" aria-hidden="true">${escapeHtml(label.slice(0, 1).toUpperCase())}</span>`;
}

function wirePackageCatalogSelection(rootElement) {
    rootElement.querySelectorAll('[data-package-path]').forEach((buttonElement) => {
        buttonElement.addEventListener('click', async () => {
            const packagePath = buttonElement.getAttribute('data-package-path');
            elements.packagePathInput.value = packagePath ?? '';
            const selectedPackageCatalogItem = (window.pluginManagerPanelUiState?.packageCatalog ?? []).find((packageCatalogItem) => {
                return packageCatalogItem.packagePath === packagePath;
            });
            if (selectedPackageCatalogItem != null) {
                elements.packageSourceKindSelect.value = selectedPackageCatalogItem.sourceKind;
                elements.packageSourcePluginIdInput.value = selectedPackageCatalogItem.pluginId;
                elements.packageSourceVersionInput.value = selectedPackageCatalogItem.version;
                elements.packageSourcePathInput.value = selectedPackageCatalogItem.sourcePath;
                elements.packageSourcePackagePathInput.value = selectedPackageCatalogItem.packagePath;
            }
            await activePanelDriver?.selectPackageCatalogItem(packagePath);
        });
    });
}

function renderDetail(state) {
    const runtimeRecord = state.selectedRuntimeRecord;
    const incident = state.selectedIncident;
    const selectedState = runtimeRecord?.state ?? 'idle';
    renderDetailIcon(runtimeRecord);
    elements.detailTitle.textContent = runtimeRecord?.displayName ?? state.selectedPluginId ?? t(state, 'detail.overview');
    elements.detailSubtitle.textContent = runtimeRecord == null ? t(state, 'detail.choosePlugin') : `${runtimeRecord.version} · ${translateValue(state, runtimeRecord.trustLevel)}`;
    elements.detailStatePill.textContent = translateValue(state, selectedState);
    elements.detailStatePill.className = `pill ${statusPillClass(selectedState)}`;
    elements.detailIncidentMessage.textContent = incident?.errorMessage ?? t(state, 'detail.noFailureSelected');
    elements.exportPreview.textContent = state.selectedFailureExport?.serializedIncident ?? t(state, 'detail.noExport');
    elements.packageActionSummary.textContent = state.lastPackageActionSummary ?? t(state, 'package.pending');
    if (state.selectedPackagePath != null) {
        elements.packagePathInput.value = state.selectedPackagePath;
    }

    if (runtimeRecord == null) {
        elements.detailGrid.innerHTML = `<div class="empty-state">${escapeHtml(t(state, 'empty.noPluginSelected'))}</div>`;
        return;
    }

    const detailEntries = [
        [t(state, 'detail.version'), runtimeRecord.version],
        [t(state, 'detail.trust'), translateValue(state, runtimeRecord.trustLevel)],
        [t(state, 'detail.failurePhase'), translateValue(state, incident?.phase ?? 'none')],
        [t(state, 'detail.export'), state.selectedFailureExport == null ? t(state, 'detail.exportPending') : t(state, 'detail.exportReady')],
        [t(state, 'detail.installedActive'), state.selectedInstalledPackageSnapshot?.activeVersion ?? t(state, 'detail.notInstalled')],
        [t(state, 'detail.installedVersions'), state.selectedInstalledPackageSnapshot?.versions?.join(', ') ?? t(state, 'detail.none')],
    ];
    const installedVersions = state.selectedInstalledPackageSnapshot?.versions ?? [];
    const versionControls = installedVersions.map((version) => {
        const isActiveVersion = version === state.selectedInstalledPackageSnapshot?.activeVersion;
        const switchButton = isActiveVersion
            ? ''
            : `<button type="button" class="button button-ghost" data-package-version-action="switch" data-package-version="${escapeHtml(version)}">Activate ${escapeHtml(version)}</button>`;
        const removeButton = isActiveVersion
            ? ''
            : `<button type="button" class="button button-danger" data-package-version-action="remove" data-package-version="${escapeHtml(version)}">Remove ${escapeHtml(version)}</button>`;
        return `<div class="detail-grid-item"><span class="detail-label">Installed version</span><strong>${escapeHtml(version)}${isActiveVersion ? ' · active' : ''}</strong><div class="action-row">${switchButton}${removeButton}</div></div>`;
    });
    elements.detailGrid.innerHTML = [...detailEntries.map(([label, value]) => {
        return `<div class="detail-grid-item"><span class="detail-label">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
    }), ...versionControls].join('');
}

function renderDetailIcon(runtimeRecord) {
    if (elements.detailIcon == null) {
        return;
    }
    const label = runtimeRecord?.displayName ?? runtimeRecord?.pluginId ?? 'P';
    elements.detailIcon.innerHTML = buildPluginIcon(runtimeRecord?.iconUrl, label, 'plugin-logo-image');
}

/** @description 使用固定 Plugin Host 打开 SnowB 页面，以便宿主完成受控 bridge 初始化。 */
async function openSnowbPluginHostPanel() {
    const editorApi = window.Editor ?? window.top?.Editor ?? globalThis.Editor;
    if (typeof editorApi?.Message?.request !== 'function') {
        throw new Error('cocos_plugin_host_message_unavailable');
    }
    await editorApi.Message.request(COCOS_PLUGIN_HOST_EXTENSION_NAME, 'open-snowb-bmfont-panel');
}

function renderCleanup(state) {
    const cleanupSteps = state.lastCleanupSteps ?? [];
    const cleanupStable = cleanupSteps.length > 0 && cleanupSteps.every((step) => step.ok);
    elements.cleanupBadge.textContent = cleanupSteps.length === 0 ? t(state, 'cleanup.none') : (cleanupStable ? t(state, 'cleanup.stable') : t(state, 'cleanup.pending'));
    elements.cleanupBadge.className = `pill ${cleanupSteps.length === 0 ? 'pill-neutral' : cleanupStable ? 'pill-success' : 'pill-danger'}`;

    if (cleanupSteps.length === 0) {
        elements.cleanupTimeline.innerHTML = `<div class="empty-state">${escapeHtml(t(state, 'cleanup.noSteps'))}</div>`;
        return;
    }

    elements.cleanupTimeline.innerHTML = cleanupSteps.map((cleanupStep) => {
        return `<div class="timeline-row">
    <span class="timeline-target">${escapeHtml(cleanupStep.targetType)}</span>
    <span class="timeline-id">${escapeHtml(cleanupStep.targetId)}</span>
    <span class="pill ${cleanupStep.ok ? 'pill-success' : 'pill-danger'}">${cleanupStep.ok ? escapeHtml(t(state, 'cleanup.ok')) : escapeHtml(cleanupStep.errorMessage ?? t(state, 'cleanup.pending'))}</span>
</div>`;
    }).join('');
}

function renderActions(state) {
    const hasSelection = state.selectedPluginId != null;
    const hasInstalledPackage = state.selectedInstalledPackageSnapshot != null;
    const isBuiltinManagerSelection = state.selectedPluginId === BUILTIN_PLUGIN_MANAGER_PANEL_ID;
    elements.exportButton.disabled = !hasSelection || state.selectedIncident == null;
    elements.retryButton.disabled = !hasSelection || state.selectedIncident == null;
    elements.activateButton.disabled = !hasSelection || isBuiltinManagerSelection;
    elements.deactivateButton.disabled = !hasSelection || isBuiltinManagerSelection;
    elements.disposeButton.disabled = !hasSelection || isBuiltinManagerSelection;
    elements.openPanelButton.disabled = !hasSelection || isBuiltinManagerSelection || state.selectedRuntimeRecord?.state !== 'active';
    elements.activateButton.title = isBuiltinManagerSelection ? 'Builtin Plugin Manager is protected.' : '';
    elements.deactivateButton.title = isBuiltinManagerSelection ? 'Builtin Plugin Manager is protected.' : '';
    elements.disposeButton.title = isBuiltinManagerSelection ? 'Builtin Plugin Manager is protected.' : '';
    elements.openPanelButton.title = state.selectedRuntimeRecord?.state !== 'active' ? t(state, 'panel.requiresActive') : '';
    elements.reloadKernelButton.disabled = !state.kernelReloadSupported;
    elements.installAndActivatePackageButton.disabled = false;
    elements.upgradeAndActivatePackageButton.disabled = false;
    elements.uninstallPackageButton.disabled = !hasSelection || !hasInstalledPackage;
}

function renderMcpHub(state) {
    const mcpHub = state.mcpHub;
    if (mcpHub == null) {
        return;
    }
    const isAvailable = mcpHub.isAvailable === true;
    const isEnabled = mcpHub.isEnabled === true;
    elements.mcpEnabledToggle.disabled = !isAvailable;
    elements.mcpEnabledToggle.checked = isEnabled;
    elements.mcpStatusBadge.textContent = !isAvailable
        ? t(state, 'execution.unavailable')
        : (isEnabled ? t(state, 'status.live') : t(state, 'summary.idle'));
    elements.mcpStatusBadge.className = `pill ${isAvailable && isEnabled ? 'pill-success' : 'pill-neutral'}`;
    elements.mcpStatusMessage.textContent = !isAvailable
        ? t(state, 'mcp.unavailable')
        : (isEnabled ? t(state, 'mcp.enabledStatus') : t(state, 'mcp.disabled'));
    elements.mcpSummary.innerHTML = `<dt>${escapeHtml(t(state, 'mcp.port'))}</dt><dd>${escapeHtml(String(mcpHub.port ?? '—'))}</dd><dt>${escapeHtml(t(state, 'mcp.catalogRevision'))}</dt><dd>${escapeHtml(String(mcpHub.catalogRevision ?? 0))}</dd>`;

    const capabilities = mcpHub.capabilities ?? [];
    elements.mcpCapabilityCount.textContent = String(capabilities.length);
    elements.mcpCapabilityCount.className = `pill ${capabilities.length > 0 ? 'pill-success' : 'pill-neutral'}`;
    elements.mcpCapabilityList.innerHTML = capabilities.length === 0
        ? buildEmptyState(t(state, 'mcp.noCapabilities'))
        : capabilities.map((capability) => `<article class="mcp-row"><div class="mcp-row-head"><span class="mcp-row-name">${escapeHtml(capability.name)}</span><span class="pill ${capability.readOnly ? 'pill-success' : 'pill-danger'}">${escapeHtml(capability.readOnly ? t(state, 'mcp.readOnly') : t(state, 'mcp.write'))}</span></div><p class="mcp-row-copy">${escapeHtml(capability.description)}</p></article>`).join('');

    const pendingPlans = mcpHub.pendingPlans ?? [];
    elements.mcpPendingPlanCount.textContent = String(pendingPlans.length);
    elements.mcpPendingPlanCount.className = `pill ${pendingPlans.length > 0 ? 'pill-danger' : 'pill-neutral'}`;
    elements.mcpPlanList.innerHTML = pendingPlans.length === 0
        ? buildEmptyState(t(state, 'mcp.noApprovals'))
        : pendingPlans.map((plan) => `<article class="mcp-row"><div class="mcp-row-head"><span class="mcp-row-name">${escapeHtml(plan.name)}</span><span class="pill pill-danger">${escapeHtml(plan.risk)}</span></div><p class="mcp-row-copy">${escapeHtml(t(state, 'mcp.expiresAt'))}: ${escapeHtml(new Date(plan.expiresAt).toLocaleTimeString())}</p><div class="mcp-row-actions"><button type="button" class="button button-primary button-compact" data-mcp-plan-action="approve" data-mcp-plan-id="${escapeHtml(plan.id)}">${escapeHtml(t(state, 'mcp.approve'))}</button><button type="button" class="button button-danger button-compact" data-mcp-plan-action="reject" data-mcp-plan-id="${escapeHtml(plan.id)}">${escapeHtml(t(state, 'mcp.reject'))}</button></div></article>`).join('');
}

function renderExecutionDiagnostics(state) {
    const executionDiagnosticsSnapshot = state.executionDiagnosticsSnapshot;
    elements.executionUpdatedBadge.textContent = executionDiagnosticsSnapshot?.updatedAt ?? t(state, 'execution.unavailable');
    elements.executionUpdatedBadge.className = `pill ${executionDiagnosticsSnapshot == null ? 'pill-neutral' : 'pill-success'}`;
    elements.executionExceptionalToggle.textContent = state.showOnlyExceptionalExecutionGroups ? t(state, 'execution.exceptionalOnly') : t(state, 'execution.showExceptional');
    renderExecutionPriorityFilters(state);

    if (executionDiagnosticsSnapshot == null) {
        elements.planningGroups.innerHTML = buildEmptyState(t(state, 'execution.noData'));
        elements.pendingGroups.innerHTML = buildEmptyState(t(state, 'execution.noData'));
        elements.activeGroups.innerHTML = buildEmptyState(t(state, 'execution.noData'));
        elements.recentGroups.innerHTML = buildEmptyState(t(state, 'execution.noData'));
        elements.executionDetail.innerHTML = buildEmptyState(t(state, 'execution.noSelection'));
        return;
    }

    renderExecutionGroupList(elements.planningGroups, filterExecutionGroups(
        executionDiagnosticsSnapshot.currentGroups.filter((groupSnapshot) => {
            return groupSnapshot.stage === 'planning';
        }),
        state,
    ));
    renderExecutionGroupList(elements.pendingGroups, filterExecutionGroups(
        executionDiagnosticsSnapshot.currentGroups.filter((groupSnapshot) => {
            return groupSnapshot.stage === 'pending_commit';
        }),
        state,
    ));
    renderExecutionGroupList(elements.activeGroups, filterExecutionGroups(
        executionDiagnosticsSnapshot.currentGroups.filter((groupSnapshot) => {
            return groupSnapshot.stage === 'committing';
        }),
        state,
    ));
    renderExecutionGroupList(elements.recentGroups, filterExecutionGroups(executionDiagnosticsSnapshot.recentGroups, state));

    const selectedExecutionGroup = getSelectedExecutionGroup(executionDiagnosticsSnapshot, state.selectedExecutionGroupId);
    if (selectedExecutionGroup == null) {
        elements.executionDetail.innerHTML = buildEmptyState(t(state, 'execution.noSelection'));
        return;
    }

    elements.executionDetail.innerHTML = `<div class="detail-head-row">
    <div>
        <span class="detail-label">${escapeHtml(t(state, 'execution.group'))}</span>
        <h3>${escapeHtml(selectedExecutionGroup.groupId)}</h3>
        <p class="detail-note">${escapeHtml(selectedExecutionGroup.targets.join(', ') || t(state, 'execution.noTargets'))}</p>
    </div>
    <span class="pill ${statusPillClass(selectedExecutionGroup.status)}">${escapeHtml(translateValue(state, selectedExecutionGroup.status))}</span>
</div>
<div class="diagnostics-detail-stack">
    ${selectedExecutionGroup.taskSummaries.map((taskSummary) => {
        const traceMarkup = taskSummary.trace == null
            ? buildEmptyState(t(state, 'execution.tracePending'))
            : taskSummary.trace.steps.map((traceStep) => {
                return `<div class="timeline-row">
    <span class="timeline-target">${escapeHtml(traceStep.title)}</span>
    <span class="timeline-id">${escapeHtml(translateValue(state, traceStep.status))}</span>
    <span>${escapeHtml(traceStep.detail ?? t(state, 'execution.noDetail'))}</span>
</div>`;
            }).join('');

        return `<article class="diagnostics-task-card">
    <div class="detail-head-row">
        <div>
            <span class="detail-label">${escapeHtml(t(state, 'execution.task'))}</span>
            <h3>${escapeHtml(taskSummary.taskId)}</h3>
            <p class="detail-note">${escapeHtml(taskSummary.errorCode ?? t(state, 'execution.noError'))}</p>
        </div>
        <span class="pill ${statusPillClass(taskSummary.status)}">${escapeHtml(translateValue(state, taskSummary.status))}</span>
    </div>
    <div class="timeline">${traceMarkup}</div>
</article>`;
    }).join('')}
</div>`;
}

/**
 * @description 根据控制器状态挂载或释放当前插件的内嵌 iframe。
 * @param {Record<string, unknown>} state 当前插件管理器 UI 状态
 * @returns {void}
 */
function renderEmbeddedPanel(state) {
    const embeddedPanel = state.embeddedPanel;
    if (embeddedPanel == null) {
        elements.embeddedPanelSection.hidden = true;
        if (elements.embeddedPanelFrame.dataset.entry != null) {
            elements.embeddedPanelFrame.removeAttribute('src');
            delete elements.embeddedPanelFrame.dataset.entry;
        }
        return;
    }

    elements.embeddedPanelSection.hidden = false;
    elements.embeddedPanelTitle.textContent = embeddedPanel.title;
    elements.embeddedPanelFrame.title = embeddedPanel.title;
    if (elements.embeddedPanelFrame.dataset.entry === embeddedPanel.entry) {
        return;
    }
    elements.embeddedPanelStatus.textContent = t(state, 'panel.loading');
    elements.embeddedPanelFrame.dataset.entry = embeddedPanel.entry;
    elements.embeddedPanelFrame.src = toEditorFileUrl(embeddedPanel.entry);
}

/**
 * @description 将宿主返回的绝对面板文件路径转换为 iframe 可加载的 file URL。
 * @param {string} entry 面板 HTML 绝对路径或现成 URL
 * @returns {string} Creator iframe 可加载的 URL
 */
function toEditorFileUrl(entry) {
    if (/^[a-z][a-z\d+.-]*:/i.test(entry) && !/^[a-z]:[\\/]/i.test(entry)) {
        return entry;
    }
    const portableEntry = entry.replaceAll('\\', '/');
    const prefix = /^[a-z]:\//i.test(portableEntry) ? 'file:///' : 'file://';
    return encodeURI(`${prefix}${portableEntry}`);
}

/**
 * @description 从统一面板布局入口推导插件安装根目录，供 SnowB 兼容初始化消息使用。
 * @param {string} entry 已校验的面板入口路径
 * @returns {string} 插件安装根目录
 */
function resolvePanelPackageRoot(entry) {
    const portableEntry = entry.replaceAll('\\', '/');
    const installedPackageMatch = portableEntry.match(/^(.*\/peanut-plugins\/plugins\/[^/]+\/[^/]+)(?:\/|$)/);
    if (installedPackageMatch != null) {
        return installedPackageMatch[1];
    }
    const panelDirectoryIndex = portableEntry.lastIndexOf('/panels/');
    return panelDirectoryIndex < 0 ? portableEntry : portableEntry.slice(0, panelDirectoryIndex);
}

function renderExecutionPriorityFilters(state) {
    const priorities = ['all', 'critical', 'high', 'normal', 'low'];
    elements.executionPriorityFilters.innerHTML = priorities.map((priority) => {
        const selectedClass = state.executionPriorityFilter === priority ? ' is-selected' : '';
        return `<button type="button" class="filter-chip${selectedClass}" data-execution-priority="${priority}">${escapeHtml(translateValue(state, priority))}</button>`;
    }).join('');

    elements.executionPriorityFilters.querySelectorAll('[data-execution-priority]').forEach((buttonElement) => {
        buttonElement.addEventListener('click', async () => {
            await activePanelDriver?.setExecutionPriorityFilter(buttonElement.getAttribute('data-execution-priority'));
        });
    });
}

function renderExecutionGroupList(rootElement, groups) {
    if (groups.length === 0) {
        rootElement.innerHTML = buildEmptyState(t(latestRenderedState, 'execution.empty'));
        return;
    }

    rootElement.innerHTML = groups.map((groupSnapshot) => {
        const selectedClass = latestRenderedState?.selectedExecutionGroupId === groupSnapshot.groupId ? ' is-selected' : '';
        const exceptionalClass = isExceptionalExecutionGroup(groupSnapshot) ? ' is-exceptional' : '';
        return `<button type="button" class="diagnostics-row${selectedClass}${exceptionalClass}" data-execution-group-id="${escapeHtml(groupSnapshot.groupId)}">
    <span class="diagnostics-title">${escapeHtml(groupSnapshot.groupId)}</span>
    <span class="diagnostics-meta">${escapeHtml(translateValue(latestRenderedState, groupSnapshot.priority))} · ${escapeHtml(translateValue(latestRenderedState, groupSnapshot.stage))} · ${escapeHtml(translateValue(latestRenderedState, groupSnapshot.status))}</span>
    <span class="diagnostics-note">${escapeHtml(groupSnapshot.targets.join(', ') || t(latestRenderedState, 'execution.noTargets'))}</span>
    <span class="diagnostics-note">${escapeHtml(groupSnapshot.taskIds.join(', '))}</span>
    <div class="diagnostics-flags">${buildExecutionFlags(groupSnapshot)}</div>
</button>`;
    }).join('');

    rootElement.querySelectorAll('[data-execution-group-id]').forEach((buttonElement) => {
        buttonElement.addEventListener('click', async () => {
            await activePanelDriver?.selectExecutionGroup(buttonElement.getAttribute('data-execution-group-id'));
        });
    });
}

function filterPackageCatalog(packageCatalog) {
    const filteredPackageCatalog = packageCatalog.filter((packageCatalogItem) => {
        const matchesSearch = uiState.packageSearch.length === 0
            || packageCatalogItem.pluginId.toLowerCase().includes(uiState.packageSearch)
            || packageCatalogItem.sourcePath.toLowerCase().includes(uiState.packageSearch)
            || packageCatalogItem.packagePath.toLowerCase().includes(uiState.packageSearch);
        if (!matchesSearch) {
            return false;
        }

        if (uiState.packageFilter === 'installed') {
            return packageCatalogItem.installedActiveVersion != null;
        }
        if (uiState.packageFilter === 'not-installed') {
            return packageCatalogItem.installedActiveVersion == null;
        }
        if (uiState.packageFilter === 'upgrade') {
            return packageCatalogItem.installedActiveVersion != null && packageCatalogItem.installedActiveVersion !== packageCatalogItem.version;
        }
        return true;
    });
    return sortPackageCatalog(filteredPackageCatalog);
}

function groupPackageCatalogBySource(packageCatalog) {
    const groupedPackageCatalog = new Map();
    for (const packageCatalogItem of packageCatalog) {
        const sourcePath = packageCatalogItem.sourcePath;
        const group = groupedPackageCatalog.get(sourcePath) ?? [];
        group.push(packageCatalogItem);
        groupedPackageCatalog.set(sourcePath, group);
    }
    return [...groupedPackageCatalog.entries()];
}

function sortPackageCatalog(packageCatalog) {
    const sortedPackageCatalog = [...packageCatalog];
    if (uiState.packageCatalogSort === 'plugin-id-desc') {
        sortedPackageCatalog.sort((leftItem, rightItem) => {
            return rightItem.pluginId.localeCompare(leftItem.pluginId);
        });
        return sortedPackageCatalog;
    }
    if (uiState.packageCatalogSort === 'source-asc') {
        sortedPackageCatalog.sort((leftItem, rightItem) => {
            return leftItem.sourcePath.localeCompare(rightItem.sourcePath) || leftItem.pluginId.localeCompare(rightItem.pluginId);
        });
        return sortedPackageCatalog;
    }
    if (uiState.packageCatalogSort === 'recent-first') {
        sortedPackageCatalog.sort((leftItem, rightItem) => {
            const recentPackagePaths = latestRenderedState?.recentPackagePaths ?? window.pluginManagerPanelUiState?.recentPackagePaths ?? [];
            const leftIndex = recentPackagePaths.indexOf(leftItem.packagePath);
            const rightIndex = recentPackagePaths.indexOf(rightItem.packagePath);
            const normalizedLeftIndex = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
            const normalizedRightIndex = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;
            return normalizedLeftIndex - normalizedRightIndex || leftItem.pluginId.localeCompare(rightItem.pluginId);
        });
        return sortedPackageCatalog;
    }
    sortedPackageCatalog.sort((leftItem, rightItem) => {
        return leftItem.pluginId.localeCompare(rightItem.pluginId);
    });
    return sortedPackageCatalog;
}

async function resolvePanelBridge() {
    const cocosPanelBridge = createCocosPanelBridge();
    if (cocosPanelBridge != null) {
        return cocosPanelBridge;
    }

    const bridgeFactory = typeof window.acquirePanelBridge === 'function' ? window.acquirePanelBridge : null;
    if (bridgeFactory != null) {
        const bridge = await Promise.resolve(bridgeFactory());
        if (bridge != null) {
            bridge.__bridgeMode = 'host';
            return bridge;
        }
    }

    if (window.panelBridge != null) {
        window.panelBridge.__bridgeMode = 'host';
        return window.panelBridge;
    }

    return createPreviewBridge();
}

function createCocosPanelBridge() {
    const editorApi = window.Editor ?? window.top?.Editor ?? globalThis.Editor;
    if (editorApi?.Message?.request == null) {
        return null;
    }

    const extensionName = window.__PEANUT_COCOS_EXTENSION_NAME__ ?? 'peanut-pod';
    return {
        __bridgeMode: 'host',
        async reloadKernel() {
            return editorApi.Message.request(extensionName, 'reload-kernel-demo');
        },
        async postMessage(envelope) {
            await editorApi.Message.request(extensionName, 'post-panel-bridge', envelope);
        },
        async request(request) {
            return editorApi.Message.request(extensionName, 'request-panel-bridge', request);
        },
    };
}

function createPreviewBridge() {
    const listeners = new Map();
    let previewPackageInstalled = true;
    let previewDiagnosticsSnapshot = createPreviewExecutionDiagnosticsSnapshot();
    const previewIncident = {
        pluginId: 'preview.failure.plugin',
        phase: 'activate',
        previousState: 'loaded',
        failedAt: new Date().toISOString(),
        installPreserved: true,
        errorMessage: 'preview_plugin_activate_failed',
        errorStack: 'Error: preview_plugin_activate_failed\\n    at activate (preview-plugin-module.ts:42:13)',
        cleanupSteps: [
            {
                stepId: 'preview.failure.plugin:panel:preview.failure.panel',
                phase: 'cleanup',
                targetType: 'panel',
                targetId: 'preview.failure.panel',
                ok: true,
                summary: 'Panel "preview.failure.panel" released.',
            },
            {
                stepId: 'preview.failure.plugin:lease:preview.failure.plugin:lease:cleanup',
                phase: 'cleanup',
                targetType: 'lease',
                targetId: 'preview.failure.plugin:lease:cleanup',
                ok: false,
                summary: 'Lease "preview.failure.plugin:lease:cleanup" release failed.',
                errorMessage: 'preview_cleanup_pending',
            },
        ],
    };
    const previewRuntimeRecord = {
        pluginId: 'preview.failure.plugin',
        version: '0.1.0',
        state: 'failed',
        trustLevel: 'community',
        installPath: 'plugins/preview.failure.plugin',
        health: {
            status: 'failed',
            updatedAt: new Date().toISOString(),
            summary: 'Plugin activate failed with 1 cleanup issue(s).',
            diagnostics: ['failure:preview.failure.plugin:activate:preview_plugin_activate_failed'],
        },
        failureIncident: previewIncident,
    };
    const previewManualSources = [];

    return {
        __bridgeMode: 'preview',
        async postMessage() {},
        async request(request) {
            switch (request.event) {
                case SNAPSHOT_EVENT:
                    return {
                        requestId: request.id,
                        ok: true,
                        payload: {
                            runtimeRecords: previewPackageInstalled ? [previewRuntimeRecord] : [],
                            failureItems: previewPackageInstalled ? [buildFailureItem(previewIncident, previewRuntimeRecord)] : [],
                            packageCatalog: [...previewManualSources],
                            recentPackagePaths: [],
                            kernelReloadSupported: false,
                            preferences: {
                                locale: 'zh-CN',
                                packageFilter: 'all',
                                packageCatalogSort: 'plugin-id-asc',
                                selectedPluginId: null,
                                selectedPackagePath: null,
                            },
                            executionDiagnosticsSnapshot: previewDiagnosticsSnapshot,
                        },
                    };
                case EXECUTION_DIAGNOSTICS_EVENT:
                    return {
                        requestId: request.id,
                        ok: true,
                        payload: previewDiagnosticsSnapshot,
                    };
                case KERNEL_RELOAD_EVENT:
                    return {
                        requestId: request.id,
                        ok: true,
                        payload: {
                            accepted: false,
                        },
                    };
                case DETAIL_EVENT:
                    return {
                        requestId: request.id,
                        ok: true,
                        payload: {
                            runtimeRecord: previewPackageInstalled ? previewRuntimeRecord : null,
                            incident: previewPackageInstalled ? previewIncident : null,
                            installedPackageSnapshot: previewPackageInstalled
                                ? {
                                      pluginId: previewRuntimeRecord.pluginId,
                                      activeVersion: previewRuntimeRecord.version,
                                      versions: [previewRuntimeRecord.version],
                                  }
                                : null,
                        },
                    };
                case EXPORT_EVENT:
                    return {
                        requestId: request.id,
                        ok: true,
                        payload: {
                            exportResult: {
                                pluginId: previewIncident.pluginId,
                                exportedAt: new Date().toISOString(),
                                incident: previewIncident,
                                serializedIncident: JSON.stringify(previewIncident, null, 4),
                            },
                        },
                    };
                case RETRY_EVENT: {
                    previewIncident.cleanupSteps = previewIncident.cleanupSteps.map((cleanupStep) => {
                        return {
                            ...cleanupStep,
                            ok: true,
                            errorMessage: undefined,
                            summary: `${cleanupStep.targetType} "${cleanupStep.targetId}" is now stable.`,
                        };
                    });
                    const payload = {
                        cleanupSteps: previewIncident.cleanupSteps,
                        incident: previewIncident,
                    };
                    previewDiagnosticsSnapshot = createPreviewExecutionDiagnosticsSnapshot({
                        showTimeout: false,
                        showReplan: true,
                    });
                    notifyPreviewListeners(listeners, 'pluginManager.failure.updated', payload);
                    return {
                        requestId: request.id,
                        ok: true,
                        payload,
                    };
                }
                case ACTIVATE_EVENT:
                    previewRuntimeRecord.state = 'active';
                    previewDiagnosticsSnapshot = createPreviewExecutionDiagnosticsSnapshot({
                        activeStatus: 'succeeded',
                    });
                    return buildRuntimeActionResponse(request.id, 'activate', previewRuntimeRecord, null);
                case DEACTIVATE_EVENT:
                    previewRuntimeRecord.state = 'inactive';
                    return buildRuntimeActionResponse(request.id, 'deactivate', previewRuntimeRecord, null);
                case DISPOSE_EVENT:
                    previewRuntimeRecord.state = 'disposed';
                    return buildRuntimeActionResponse(request.id, 'dispose', previewRuntimeRecord, null);
                case PACKAGE_PLAN_EVENT:
                    return {
                        requestId: request.id,
                        ok: true,
                        payload: {
                            installPlan: {
                                operation: 'install',
                                pluginId: previewRuntimeRecord.pluginId,
                                version: previewRuntimeRecord.version,
                                packagePath: request.payload?.packagePath ?? 'packages/preview.failure.plugin-0.1.0.pcp',
                                stagedPath: `staging/${previewRuntimeRecord.pluginId}/${previewRuntimeRecord.version}`,
                                previousVersion: null,
                                steps: [],
                                warnings: [],
                            },
                            installedPackageSnapshot: {
                                pluginId: previewRuntimeRecord.pluginId,
                                activeVersion: previewRuntimeRecord.version,
                                versions: [previewRuntimeRecord.version],
                            },
                        },
                    };
                case PACKAGE_INSTALL_EVENT:
                case PACKAGE_UPGRADE_EVENT:
                    previewPackageInstalled = true;
                    return {
                        requestId: request.id,
                        ok: true,
                        payload: {
                            action: request.event === PACKAGE_INSTALL_EVENT ? 'install' : 'upgrade',
                            installResult: {
                                operation: request.event === PACKAGE_INSTALL_EVENT ? 'install' : 'upgrade',
                                pluginId: previewRuntimeRecord.pluginId,
                                version: previewRuntimeRecord.version,
                                installed: true,
                                installPath: `installed/${previewRuntimeRecord.pluginId}/${previewRuntimeRecord.version}`,
                                stagedPath: `staging/${previewRuntimeRecord.pluginId}/${previewRuntimeRecord.version}`,
                                previousVersion: null,
                                warnings: [],
                            },
                            uninstallResult: null,
                            installedPackageSnapshot: {
                                pluginId: previewRuntimeRecord.pluginId,
                                activeVersion: previewRuntimeRecord.version,
                                versions: [previewRuntimeRecord.version],
                            },
                        },
                    };
                case PACKAGE_UNINSTALL_EVENT:
                    previewPackageInstalled = false;
                    previewDiagnosticsSnapshot = createPreviewExecutionDiagnosticsSnapshot({
                        activeStatus: 'cancelled',
                        showCancellation: true,
                    });
                    return {
                        requestId: request.id,
                        ok: true,
                        payload: {
                            action: 'uninstall',
                            installResult: null,
                            uninstallResult: {
                                pluginId: previewRuntimeRecord.pluginId,
                                removed: true,
                                installPath: `installed/${previewRuntimeRecord.pluginId}/${previewRuntimeRecord.version}`,
                            },
                            installedPackageSnapshot: null,
                            runtimeRecord: null,
                            incident: null,
                        },
                    };
                case 'pluginManager.package.installAndActivate':
                case 'pluginManager.package.upgradeAndActivate':
                    previewPackageInstalled = true;
                    previewRuntimeRecord.state = 'active';
                    return {
                        requestId: request.id,
                        ok: true,
                        payload: {
                            action: request.event.includes('install') ? 'install' : 'upgrade',
                            installResult: {
                                operation: request.event.includes('install') ? 'install' : 'upgrade',
                                pluginId: previewRuntimeRecord.pluginId,
                                version: previewRuntimeRecord.version,
                                installed: true,
                                installPath: `installed/${previewRuntimeRecord.pluginId}/${previewRuntimeRecord.version}`,
                                stagedPath: `staging/${previewRuntimeRecord.pluginId}/${previewRuntimeRecord.version}`,
                                previousVersion: null,
                                warnings: [],
                            },
                            uninstallResult: null,
                            installedPackageSnapshot: {
                                pluginId: previewRuntimeRecord.pluginId,
                                activeVersion: previewRuntimeRecord.version,
                                versions: [previewRuntimeRecord.version],
                            },
                            runtimeRecord: previewRuntimeRecord,
                            incident: null,
                        },
                    };
                case PREFERENCES_UPDATE_EVENT:
                    return {
                        requestId: request.id,
                        ok: true,
                        payload: {
                            preferences: {
                                locale: request.payload?.preferences?.locale ?? 'zh-CN',
                                packageFilter: request.payload?.preferences?.packageFilter ?? 'all',
                                packageCatalogSort: request.payload?.preferences?.packageCatalogSort ?? 'plugin-id-asc',
                                selectedPluginId: request.payload?.preferences?.selectedPluginId ?? null,
                                selectedPackagePath: request.payload?.preferences?.selectedPackagePath ?? null,
                            },
                        },
                    };
                case 'pluginManager.packageSource.register': {
                    const source = request.payload?.source;
                    const nextSource = {
                        sourceKind: source?.sourceKind ?? 'manual',
                        packagePath: source?.packagePath ?? '',
                        sourcePath: source?.sourcePath ?? '',
                        pluginId: source?.pluginId ?? '',
                        version: source?.version ?? '',
                        installedActiveVersion: null,
                    };
                    const nextManualSources = [nextSource, ...previewManualSources.filter((manualSource) => {
                        return manualSource.packagePath !== nextSource.packagePath;
                    })];
                    previewManualSources.splice(0, previewManualSources.length, ...nextManualSources);
                    return {
                        requestId: request.id,
                        ok: true,
                        payload: {
                            action: 'register',
                            packageCatalog: [...previewManualSources],
                        },
                    };
                }
                case 'pluginManager.packageSource.remove': {
                    const packagePath = request.payload?.packagePath ?? '';
                    const nextManualSources = previewManualSources.filter((manualSource) => {
                        return manualSource.packagePath !== packagePath;
                    });
                    previewManualSources.splice(0, previewManualSources.length, ...nextManualSources);
                    return {
                        requestId: request.id,
                        ok: true,
                        payload: {
                            action: 'remove',
                            packageCatalog: [...previewManualSources],
                        },
                    };
                }
                default:
                    return {
                        requestId: request.id,
                        ok: false,
                        error: `preview_handler_not_found:${request.event}`,
                    };
            }
        },
        subscribe(event, listener) {
            const eventListeners = listeners.get(event) ?? [];
            eventListeners.push(listener);
            listeners.set(event, eventListeners);
            return () => {
                const nextListeners = (listeners.get(event) ?? []).filter((entry) => entry !== listener);
                listeners.set(event, nextListeners);
            };
        },
        async dispose() {},
    };
}

function notifyPreviewListeners(listeners, event, payload) {
    const eventListeners = listeners.get(event) ?? [];
    for (const listener of eventListeners) {
        listener({
            id: buildRequestId(`${event}:preview`),
            event,
            payload,
        });
    }
}

function buildRuntimeActionResponse(requestId, action, runtimeRecord, incident) {
    return {
        requestId,
        ok: true,
        payload: {
            action,
            runtimeRecord,
            incident,
        },
    };
}

function buildFailureItem(incident, runtimeRecord) {
    return {
        pluginId: incident.pluginId,
        state: runtimeRecord?.state ?? null,
        phase: incident.phase,
        failedAt: incident.failedAt,
        installPreserved: incident.installPreserved,
        summary: runtimeRecord?.health?.summary ?? null,
    };
}

function summarizePackageAction(payload) {
    const state = latestRenderedState ?? window.pluginManagerPanelUiState;
    if (payload.installResult != null) {
        return t(state, `package.summary.${payload.action}`, {
            pluginId: payload.installResult.pluginId,
            version: payload.installResult.version,
        });
    }
    if (payload.uninstallResult != null) {
        return t(state, 'package.summary.uninstall', {
            pluginId: payload.uninstallResult.pluginId,
        });
    }
    return t(state, 'package.summary.default', {
        action: translateValue(state, payload.action),
    });
}

function resolveSelectedPluginId(preferredPluginId, runtimeRecords, failureItems) {
    if (preferredPluginId != null) {
        const existingRuntimeRecord = runtimeRecords.find((runtimeRecord) => {
            return runtimeRecord.pluginId === preferredPluginId;
        });
        if (existingRuntimeRecord != null) {
            return existingRuntimeRecord.pluginId;
        }
    }
    if (failureItems[0] != null) {
        return failureItems[0].pluginId;
    }
    return runtimeRecords[0]?.pluginId ?? null;
}

function resolveSelectedPackagePath(preferredPackagePath, packageCatalog, selectedPluginId) {
    if (preferredPackagePath != null) {
        const selectedPackageCatalogItem = packageCatalog.find((packageCatalogItem) => {
            return packageCatalogItem.packagePath === preferredPackagePath;
        });
        if (selectedPackageCatalogItem != null) {
            return selectedPackageCatalogItem.packagePath;
        }
    }

    if (selectedPluginId != null) {
        const selectedPluginPackageCatalogItem = packageCatalog.find((packageCatalogItem) => {
            return packageCatalogItem.pluginId === selectedPluginId;
        });
        if (selectedPluginPackageCatalogItem != null) {
            return selectedPluginPackageCatalogItem.packagePath;
        }
    }

    return packageCatalog[0]?.packagePath ?? null;
}

function resolveSelectedExecutionGroupId(executionDiagnosticsSnapshot, preferredGroupId, priorityFilter, showOnlyExceptionalExecutionGroups) {
    const displayedGroups = getDisplayedExecutionGroups(executionDiagnosticsSnapshot, priorityFilter, showOnlyExceptionalExecutionGroups);
    if (preferredGroupId != null) {
        const selectedGroup = displayedGroups.find((groupSnapshot) => {
            return groupSnapshot.groupId === preferredGroupId;
        });
        if (selectedGroup != null) {
            return selectedGroup.groupId;
        }
    }

    return displayedGroups[0]?.groupId ?? null;
}

function filterExecutionGroups(groups, state) {
    return groups.filter((groupSnapshot) => {
        if ((state.executionPriorityFilter ?? 'all') !== 'all' && groupSnapshot.priority !== state.executionPriorityFilter) {
            return false;
        }
        if (state.showOnlyExceptionalExecutionGroups === true && !isExceptionalExecutionGroup(groupSnapshot)) {
            return false;
        }
        return true;
    });
}

function getDisplayedExecutionGroups(executionDiagnosticsSnapshot, priorityFilter, showOnlyExceptionalExecutionGroups) {
    if (executionDiagnosticsSnapshot == null) {
        return [];
    }

    return [...(executionDiagnosticsSnapshot.currentGroups ?? []), ...(executionDiagnosticsSnapshot.recentGroups ?? [])].filter((groupSnapshot) => {
        if (priorityFilter !== 'all' && groupSnapshot.priority !== priorityFilter) {
            return false;
        }
        if (showOnlyExceptionalExecutionGroups === true && !isExceptionalExecutionGroup(groupSnapshot)) {
            return false;
        }
        return true;
    });
}

function getSelectedExecutionGroup(executionDiagnosticsSnapshot, selectedExecutionGroupId) {
    if (executionDiagnosticsSnapshot == null || selectedExecutionGroupId == null) {
        return null;
    }

    return [...(executionDiagnosticsSnapshot.currentGroups ?? []), ...(executionDiagnosticsSnapshot.recentGroups ?? [])].find((groupSnapshot) => {
        return groupSnapshot.groupId === selectedExecutionGroupId;
    }) ?? null;
}

function getQueueGroupCount(executionDiagnosticsSnapshot) {
    if (executionDiagnosticsSnapshot?.queue == null) {
        return 0;
    }

    return (executionDiagnosticsSnapshot.queue.planningGroups?.length ?? 0)
        + (executionDiagnosticsSnapshot.queue.pendingCommitGroups?.length ?? 0)
        + (executionDiagnosticsSnapshot.queue.activeCommitGroup == null ? 0 : 1);
}

function isExceptionalExecutionGroup(groupSnapshot) {
    return groupSnapshot.hasTimeout === true
        || groupSnapshot.hasCancellation === true
        || groupSnapshot.hasReplan === true
        || groupSnapshot.status === 'failed';
}

function buildExecutionFlags(groupSnapshot) {
    const state = latestRenderedState ?? window.pluginManagerPanelUiState;
    const flags = [];
    if (groupSnapshot.hasTimeout) {
        flags.push(`<span class="pill pill-danger">${escapeHtml(t(state, 'execution.flag.timeout'))}</span>`);
    }
    if (groupSnapshot.hasCancellation) {
        flags.push(`<span class="pill pill-warning">${escapeHtml(t(state, 'execution.flag.cancelled'))}</span>`);
    }
    if (groupSnapshot.hasReplan) {
        flags.push(`<span class="pill pill-neutral">${escapeHtml(t(state, 'execution.flag.replan'))}</span>`);
    }
    if (flags.length === 0) {
        flags.push(`<span class="pill pill-success">${escapeHtml(t(state, 'execution.flag.ok'))}</span>`);
    }
    return flags.join('');
}

function buildEmptyState(text) {
    return `<div class="empty-state">${escapeHtml(text)}</div>`;
}

function createPreviewExecutionDiagnosticsSnapshot(options = {}) {
    const showTimeout = options.showTimeout ?? true;
    const showCancellation = options.showCancellation ?? false;
    const showReplan = options.showReplan ?? false;
    const activeStatus = options.activeStatus ?? 'active';

    return {
        queue: {
            queuedTaskIds: ['preview-task-live'],
            planningGroups: [
                {
                    groupId: 'preview-group-live',
                    priority: 'high',
                    mergePolicy: 'none',
                    taskIds: ['preview-task-live'],
                    sequence: 1,
                    kind: 'asset.query',
                    stage: 'planning',
                    targets: ['assets/preview.prefab'],
                },
            ],
            pendingCommitGroups: [],
            activeCommitGroup: null,
            isDrainingCommitQueue: true,
            lastCommittedPriority: 'normal',
            consecutiveCommitCount: 1,
        },
        currentGroups: [
            {
                groupId: 'preview-group-live',
                priority: 'high',
                mergePolicy: 'none',
                sequence: 1,
                kind: 'asset.query',
                taskIds: ['preview-task-live'],
                stage: 'planning',
                targets: ['assets/preview.prefab'],
                status: activeStatus,
                hasTimeout: false,
                hasCancellation: false,
                hasReplan: false,
                traceTaskId: 'preview-task-live',
                taskSummaries: [
                    {
                        taskId: 'preview-task-live',
                        status: 'planning',
                        isCancelled: false,
                        isTimedOut: false,
                        isReplanned: false,
                        errorCode: null,
                        trace: null,
                    },
                ],
                startedAt: new Date().toISOString(),
                finishedAt: null,
            },
        ],
        recentGroups: [
            {
                groupId: 'preview-group-timeout',
                priority: 'critical',
                mergePolicy: 'dedupe',
                sequence: 2,
                kind: 'asset.query',
                taskIds: ['preview-task-timeout'],
                stage: 'planning',
                targets: ['assets/timeout.prefab'],
                status: showCancellation ? 'cancelled' : 'failed',
                hasTimeout: showTimeout,
                hasCancellation: showCancellation,
                hasReplan: false,
                traceTaskId: 'preview-task-timeout',
                taskSummaries: [
                    {
                        taskId: 'preview-task-timeout',
                        status: showCancellation ? 'cancelled' : 'failed',
                        isCancelled: showCancellation,
                        isTimedOut: showTimeout,
                        isReplanned: false,
                        errorCode: showCancellation ? 'task_cancelled' : 'task_timeout',
                        trace: {
                            traceId: 'preview-task-timeout:trace',
                            taskId: 'preview-task-timeout',
                            kind: 'asset.query',
                            startedAt: new Date().toISOString(),
                            finishedAt: new Date().toISOString(),
                            steps: [
                                {
                                    id: 'planning',
                                    title: showCancellation ? 'Task cancelled before commit' : 'Task timed out before commit',
                                    status: showCancellation ? 'skipped' : 'failed',
                                    detail: showCancellation ? 'task_cancelled' : 'task_timeout',
                                },
                            ],
                        },
                    },
                ],
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
            },
            {
                groupId: 'preview-group-replan',
                priority: 'normal',
                mergePolicy: 'coalesce',
                sequence: 3,
                kind: 'scene.patch',
                taskIds: ['preview-task-replan'],
                stage: 'committing',
                targets: ['root-node'],
                status: 'succeeded',
                hasTimeout: false,
                hasCancellation: false,
                hasReplan: showReplan,
                traceTaskId: 'preview-task-replan',
                taskSummaries: [
                    {
                        taskId: 'preview-task-replan',
                        status: 'succeeded',
                        isCancelled: false,
                        isTimedOut: false,
                        isReplanned: showReplan,
                        errorCode: null,
                        trace: {
                            traceId: 'preview-task-replan:trace',
                            taskId: 'preview-task-replan',
                            kind: 'scene.patch',
                            startedAt: new Date().toISOString(),
                            finishedAt: new Date().toISOString(),
                            steps: [
                                {
                                    id: 'planning',
                                    title: 'Plan tasks',
                                    status: 'planned',
                                    detail: 'preview replan summary',
                                },
                                {
                                    id: 'commit',
                                    title: 'Commit task group',
                                    status: 'completed',
                                    detail: 'Applied coalesce group.',
                                },
                            ],
                        },
                    },
                ],
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
            },
        ],
        updatedAt: new Date().toISOString(),
    };
}

function applyError(error) {
    if (isCancellationError(error)) {
        return;
    }
    const errorMessage = normalizeErrorMessage(error);
    elements.statusMessage.textContent = errorMessage;
    elements.statusBadge.textContent = 'Error';
    elements.statusBadge.className = 'pill pill-danger';
    showPanelToast(errorMessage, 'error');
}

function syncPanelToast(state) {
    const feedbackMessage = state.lastError ?? state.lastActionSummary;
    if (feedbackMessage == null || feedbackMessage === lastToastFeedbackMessage) {
        return;
    }
    lastToastFeedbackMessage = feedbackMessage;
    if (state.lastError != null && isCancellationError(feedbackMessage)) {
        return;
    }
    showPanelToast(normalizeErrorMessage(new Error(feedbackMessage)), state.lastError != null ? 'error' : 'success');
}

function isCancellationError(error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return /(^|[_\s:-])(cancel|cancelled|canceled|取消)([_\s:-]|$)/i.test(errorMessage);
}

function showPanelToast(message, tone) {
    const toastKey = `${tone}:${message}`;
    if (visibleToastKeys.has(toastKey)) {
        return;
    }
    visibleToastKeys.add(toastKey);
    const panelDomRoot = getPanelDomRoot();
    const ownerDocument = panelDomRoot.ownerDocument ?? panelDomRoot;
    let toastRegion = ownerDocument.getElementById?.('pluginManagerToastRegion') ?? panelDomRoot.querySelector('#pluginManagerToastRegion');
    if (toastRegion == null) {
        toastRegion = ownerDocument.createElement('div');
        toastRegion.id = 'pluginManagerToastRegion';
        toastRegion.className = 'plugin-manager-toast-region';
        (ownerDocument.body ?? panelDomRoot).appendChild(toastRegion);
    }
    const toast = ownerDocument.createElement('div');
    toast.className = `plugin-manager-toast plugin-manager-toast--${tone}`;
    toast.textContent = message;
    toastRegion.appendChild(toast);
    window.setTimeout(() => {
        toast.remove();
        visibleToastKeys.delete(toastKey);
        if (toastRegion?.childElementCount === 0) {
            toastRegion.remove();
        }
    }, tone === 'pending' ? 1800 : 5000);
}

function normalizeErrorMessage(error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const locale = latestRenderedState?.preferences?.locale ?? 'zh-CN';
    return PANEL_TRANSLATIONS[locale]?.[`error.${errorMessage}`] ?? errorMessage;
}

function statusPillClass(stateText) {
    if (stateText === 'active' || stateText === 'ok' || stateText === 'succeeded') {
        return 'pill-success';
    }
    if (stateText === 'failed') {
        return 'pill-danger';
    }
    if (stateText === 'inactive' || stateText === 'disposed' || stateText === 'cancelled') {
        return 'pill-warning';
    }
    return 'pill-neutral';
}

function buildRequestId(label) {
    return `plugin-manager-panel:${label}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
