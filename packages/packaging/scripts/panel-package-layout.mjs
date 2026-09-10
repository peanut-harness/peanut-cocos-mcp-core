/**
 * @description Node 打包脚本使用的统一 panel 目录布局；宿主入口固定在 embedded，UI 资源固定在 standalone。
 */

/**
 * @description 计算单面板统一目录包的发布路径。
 * @param {string} panelId 面板稳定标识；仅用于区分 `libs` 下的共享运行时目录
 * @returns {{ panelDirectory: string; panelLibraryDirectory: string; embeddedDirectory: string; embeddedEntryPath: string; embeddedScriptPath: string; embeddedStylePath: string; standaloneDirectory: string; standaloneEntryPath: string; standaloneScriptPath: string; standaloneStylePath: string }} 标准路径集合
 */
export function createPanelPackageLayout(panelId) {
    const panelDirectory = 'panels';
    const panelLibraryDirectory = `libs/${panelId}`;
    const embeddedDirectory = `${panelDirectory}/embedded`;
    const standaloneDirectory = `${panelDirectory}/standalone`;
    return {
        panelDirectory,
        panelLibraryDirectory,
        embeddedDirectory,
        embeddedEntryPath: `${embeddedDirectory}/index.html`,
        embeddedScriptPath: `${embeddedDirectory}/index.js`,
        embeddedStylePath: `${embeddedDirectory}/index.css`,
        standaloneDirectory,
        standaloneEntryPath: `${standaloneDirectory}/index.html`,
        standaloneScriptPath: `${standaloneDirectory}/index.js`,
        standaloneStylePath: `${standaloneDirectory}/index.css`,
    };
}

/**
 * @description 创建 embedded 或 standalone 模板的三件套内容；bundle、worker、wasm 保持在共享 libs 中。
 * @param {{ runtimeBasePath: string; runtimeEntryPath: string; title: string; localeScriptPath?: string }} options 面板运行时与可选 locale 配置
 * @returns {{ html: string; script: string; style: string }} 可直接写入模板 index.* 的固定内容
 */
export function createPanelTemplateAssets(options) {
    const localeScript = options.localeScriptPath == null ? '' : `    <script src="${options.runtimeBasePath}${options.localeScriptPath}"></script>`;
    return {
        html: [
            '<!doctype html>',
            '<html lang="zh-CN">',
            '  <head>',
            '    <meta charset="utf-8" />',
            '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
            `    <title>${options.title}</title>`,
            '    <link rel="stylesheet" href="./index.css" />',
            '  </head>',
            '  <body>',
            '    <div id="root"></div>',
            localeScript,
            '    <script type="module" src="./index.js"></script>',
            '  </body>',
            '</html>',
            '',
        ].filter((line) => line !== '').join('\n'),
        script: [
            `window.__PEANUT_PANEL_RUNTIME_BASE_URL__ = new URL('${options.runtimeBasePath}', import.meta.url).href;`,
            `await import('${options.runtimeBasePath}${options.runtimeEntryPath}');`,
            '',
        ].join('\n'),
        style: '/* Styles are emitted by the standalone panel runtime. */\n',
    };
}
