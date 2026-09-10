/**
 * @description 单面板插件目录包的标准路径集合。
 */
export interface IPanelPackageLayoutPaths {
    /** @description 面板目录，相对于插件目录包根目录。 */
    readonly panelDirectory: string;
    /** @description embedded 与 standalone 模板共用的面板运行时库目录。 */
    readonly panelLibraryDirectory: string;
    /** @description 宿主加载的 embedded 面板目录。 */
    readonly embeddedDirectory: string;
    /** @description embedded HTML 固定入口。 */
    readonly embeddedEntryPath: string;
    /** @description embedded JavaScript 固定入口。 */
    readonly embeddedScriptPath: string;
    /** @description embedded 样式固定入口。 */
    readonly embeddedStylePath: string;
    /** @description standalone UI 资源目录。 */
    readonly standaloneDirectory: string;
    /** @description standalone HTML 固定入口。 */
    readonly standaloneEntryPath: string;
    /** @description standalone JavaScript 固定入口。 */
    readonly standaloneScriptPath: string;
    /** @description standalone 样式固定入口。 */
    readonly standaloneStylePath: string;
}

/**
 * @description 统一插件目录包的面板布局工具；宿主只加载 embedded，独立 UI 资源归入 standalone。
 */
export class PanelPackageLayout {
    /**
     * @description 计算指定面板在统一目录包内的全部稳定路径。
     * @param panelId 面板稳定标识；用作 `libs` 下共享运行时目录名
     * @returns 该面板的 embedded 与 standalone 标准路径
     */
    public static create(panelId: string): IPanelPackageLayoutPaths {
        // 保存标准单面板根目录；模板无需重复包一层面板稳定标识。
        const panelDirectory = 'panels';
        // 保存两种模板共用的 bundle、worker 与 wasm 运行时库目录。
        const panelLibraryDirectory = `libs/${panelId}`;
        // 保存宿主加载壳层目录，禁止直接把 standalone 资源作为宿主入口。
        const embeddedDirectory = `${panelDirectory}/embedded`;
        // 保存可独立打开的面板模板目录。
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
     * @description 判断 manifest 面板入口是否为该面板的标准 embedded HTML。
     * @param panelId 面板稳定标识；仅用于计算共享运行时目录
     * @param entry 面板贡献声明的相对入口
     * @returns 入口符合标准布局时返回 `true`
     */
    public static isEmbeddedEntry(panelId: string, entry: string): boolean {
        return entry === PanelPackageLayout.create(panelId).embeddedEntryPath;
    }
}
