/**
 * @description 根据 `@peanut/pod-engine/kernel` 包根目录解析逻辑源码热更新监听路径。
 * @param packageRootDir `@peanut/pod-engine/kernel` 包根目录
 * @returns 建议监听的目录路径列表
 */
export function resolvePluginManagerHostWatchPaths(packageRootDir: string): readonly string[] {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ normalizedPackageRootDir = packageRootDir.replace(/\\/g, '/').replace(/\/+$/, '');
    return [`${normalizedPackageRootDir}/src`];
}

/**
 * @description 根据拆分后的 `@peanut/pod-engine/kernel` 与 `@peanut/pod-panel` 包根目录解析默认热更新监听路径。
 * @param corePackageRootDir `@peanut/pod-engine/kernel` 包根目录
 * @param panelPackageRootDir `@peanut/pod-panel` 包根目录
 * @returns 建议监听的目录路径列表
 */
export function resolvePluginManagerSplitHostWatchPaths(corePackageRootDir: string, panelPackageRootDir: string): readonly string[] {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ normalizedCorePackageRootDir = corePackageRootDir.replace(/\\/g, '/').replace(/\/+$/, '');
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ normalizedPanelPackageRootDir = panelPackageRootDir.replace(/\\/g, '/').replace(/\/+$/, '');
    return [
        `${normalizedCorePackageRootDir}/src`,
        `${normalizedPanelPackageRootDir}/panels/plugin-manager/embedded`,
        `${normalizedPanelPackageRootDir}/src`,
    ];
}
