import { createRequire } from 'module';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

import type { IPluginManifest } from 'peanut-contracts';

import type { IPluginModule } from '../shared/plugin-manager-contracts.js';

/**
 * @description 宿主主进程的 CommonJS `require` 句柄；`cache` 即全局 `Module._cache`，用于按安装目录失效插件模块缓存。
 *
 * Creator/Electron 把动态 `import()` 映射到 `require()`，命中的就是这个缓存；kernel reload 不会自动清它，
 * 因此磁盘上更新后的插件 bundle 在 reload 后仍会读到旧实例。此处保留句柄供 reload 前显式失效。
 *
 * 以 `process.cwd()` 派生的 file URL 作为 `createRequire` 基准，而非 `import.meta.url`：plugin-core 会被 esbuild
 * 打成 CommonJS bundle 注入面板宿主扩展，此时 `import.meta.url` 被 shim 成 `undefined`；而 `require.cache` 与 `fs`
 * 均为全局/内置，与基准路径无关，故用 cwd URL 即可，兼容 ESM 直跑与 CJS bundle 两种形态。
 */
const hostRequire = createRequire(pathToFileURL(`${process.cwd()}/`).href) as ((id: string) => unknown) & {
    readonly cache?: Record<string, unknown>;
};

/**
 * @description 每次解析递增的模块加载序号，用于在纯 Node ESM 下生成唯一的 import URL query，强制 ESM loader 重读磁盘。
 *
 * 用单调计数而非 `Date.now()`，避免同一毫秒内连续 reload 时 query 撞号导致 ESM 缓存命中旧模块。
 */
let moduleLoadSequence = 0;

/**
 * @description 已安装插件目录到生命周期模块实例的解析接口；实现必须运行在宿主主进程，不能暴露给通用 runtime。
 */
export interface IPluginPackageModuleResolver {
    /**
     * @description 加载并验证一个已安装插件的主入口。
     * @param installPath 已安装插件版本目录
     * @param manifest 已通过 packaging 检查的插件清单
     * @returns 可交给 PluginLoader 的生命周期模块实例
     */
    resolve(installPath: string, manifest: IPluginManifest): Promise<IPluginModule>;
}

/**
 * @description Creator/Node 主进程的目录包模块解析器；仅接受包根目录内的 ESM 或 CJS 主入口。
 */
export class NodePluginPackageModuleResolver implements IPluginPackageModuleResolver {
    /**
     * @description 加载指定包的主入口并归一化常见导出形式。
     * @param installPath 已安装插件版本目录
     * @param manifest 已通过 packaging 检查的插件清单
     * @returns 通过 manifest 一致性校验的生命周期模块实例
     */
    public async resolve(installPath: string, manifest: IPluginManifest): Promise<IPluginModule> {
        // 保存规范化包根目录，用于阻止 manifest main 跳出插件沙箱。
        const normalizedInstallPath = resolve(installPath);
        // 保存解析后的主入口路径，必须位于当前插件安装目录内。
        const entryPath = resolve(normalizedInstallPath, manifest.main);
        // 保存跨平台统一为 `/` 的根目录路径，用于 Windows 与 POSIX 上一致地做前缀校验。
        const portableInstallPath = normalizedInstallPath.replace(/\\/g, '/');
        // 保存跨平台统一为 `/` 的入口路径，避免反斜杠导致合法 Windows 包被误拒绝。
        const portableEntryPath = entryPath.replace(/\\/g, '/');
        if (portableEntryPath !== portableInstallPath && !portableEntryPath.startsWith(`${portableInstallPath}/`)) {
            throw new Error(`plugin_main_outside_install_root:${manifest.id}`);
        }

        // kernel reload 复用本解析器再次加载插件；先失效该安装目录下的 CommonJS 模块缓存，
        // 否则动态 import 会命中旧 module.exports，磁盘上的新 bundle 永远不会被重新读取。
        this._invalidateInstalledModuleCache(normalizedInstallPath);
        // Creator 把动态 import 映射到 require()，只能吃文件系统路径；纯 Node ESM 在 Windows 上必须用 file URL。
        const moduleNamespace = (await import(this._toImportSpecifier(entryPath))) as Record<string, unknown>;
        // 保存归一化后的生命周期模块候选，兼容 default、plugin 与工厂导出。
        const pluginModule = this._resolveModuleExport(moduleNamespace);
        if (pluginModule == null) {
            throw new Error(`plugin_module_export_missing:${manifest.id}`);
        }
        if (pluginModule.manifest.id !== manifest.id || pluginModule.manifest.version !== manifest.version) {
            throw new Error(`plugin_module_manifest_mismatch:${manifest.id}`);
        }
        return pluginModule;
    }

    /**
     * @description 失效指定安装目录下已缓存的 CommonJS 模块，确保 reload 后读到磁盘上的最新插件代码。
     *
     * 此处清理 `require.cache`，覆盖 Creator/Electron（动态 import 映射到 require）与纯 Node 下 `import()` 加载
     * `.cjs` 时复用的 CommonJS 缓存。纯 Node ESM（`.mjs`）的模块缓存无公开失效接口，由 {@link _toImportSpecifier}
     * 追加唯一 query 强制 ESM loader 重读磁盘来兜底。失效范围严格收敛在安装目录前缀内，避免清掉共享第三方依赖。
     * @param normalizedInstallPath 已规范化的插件版本安装目录
     * @returns 无返回值；缓存不存在或为空时安全跳过。
     */
    private _invalidateInstalledModuleCache(normalizedInstallPath: string): void {
        const cache = hostRequire.cache;
        if (cache == null) {
            return;
        }
        // CommonJS 模块缓存键是 Node 解析符号链接后的真实路径（如 macOS 上 /var → /private/var），
        // 因此把安装目录也归一到真实路径再比对，否则前缀校验会因 /private 前缀错配而漏删。
        // 通过 hostRequire 取 fs，避免静态 import 在不同 @types/node 版本下成员缺失的构建问题。
        const fsModule = hostRequire('fs') as { realpathSync?: (path: string) => string };
        const realpathSync = fsModule.realpathSync;
        if (typeof realpathSync !== 'function') {
            return;
        }
        let realInstallPath: string;
        try {
            realInstallPath = realpathSync(normalizedInstallPath).replace(/\\/g, '/');
        } catch {
            return;
        }
        for (const cacheKey of Object.keys(cache)) {
            const portableCacheKey = cacheKey.replace(/\\/g, '/');
            if (portableCacheKey === realInstallPath || portableCacheKey.startsWith(`${realInstallPath}/`)) {
                delete cache[cacheKey];
            }
        }
    }

    /**
     * @description 按宿主运行时选择 import 说明符：Electron/Creator 用绝对路径，Node ESM 用 file URL。
     * @param entryPath 位于安装目录内的绝对路径
     * @param electronVersion `process.versions.electron`；非 Electron 时省略
     * @returns Creator `require()` 可解析的路径，或 Node ESM 的 `file://` URL
     */
    public static toImportSpecifier(entryPath: string, electronVersion?: string): string {
        if (typeof electronVersion === 'string' && electronVersion.length > 0) {
            return entryPath;
        }
        return pathToFileURL(entryPath).href;
    }

    /**
     * @description 把已校验的本地入口转成当前宿主可加载、且 reload 时能绕过模块缓存的 import 说明符。
     *
     * Electron/Creator 把动态 `import()` 映射到 `require()`，已由 {@link _invalidateInstalledModuleCache} 失效缓存，
     * 且其 CJS shim 不接受 query，故返回原始路径。纯 Node ESM 的 `import()` 按 URL 命中独立缓存，`require.cache`
     * 失效对它无效，因此追加时间戳 query 强制 ESM loader 视为新模块、重读磁盘。
     * @param entryPath 位于安装目录内的绝对路径
     * @returns Creator `require()` 可解析的路径，或 Node ESM 带失效 query 的 `file://` URL
     */
    private _toImportSpecifier(entryPath: string): string {
        const specifier = NodePluginPackageModuleResolver.toImportSpecifier(entryPath, process.versions.electron);
        if (typeof process.versions.electron === 'string' && process.versions.electron.length > 0) {
            return specifier;
        }
        return `${specifier}?t=${++moduleLoadSequence}`;
    }

    /**
     * @description 从模块命名空间中提取支持的生命周期模块导出形式。
     * @param moduleNamespace 动态 import 得到的命名空间对象
     * @returns 满足生命周期协议的模块；无法识别时返回 `null`
     */
    private _resolveModuleExport(moduleNamespace: Record<string, unknown>): IPluginModule | null {
        // 保存约定的工厂导出；该形式适合需要为每次激活创建新实例的插件。
        const createPluginModule = moduleNamespace.createPluginModule;
        if (typeof createPluginModule === 'function') {
            // 保存工厂创建的模块实例，确保只调用一次以避免重复副作用。
            const createdModule = createPluginModule();
            return this._isPluginModule(createdModule) ? createdModule : null;
        }
        // 保存 CommonJS 动态导入时挂在 default 上的导出对象；Node 会将 `module.exports` 放在该字段。
        const defaultExport = moduleNamespace.default;
        if (typeof defaultExport === 'object' && defaultExport != null) {
            // 保存 CommonJS exports 中的约定工厂，兼容 esbuild 生成的 `exports.createPluginModule`。
            const defaultCreatePluginModule = (defaultExport as Record<string, unknown>).createPluginModule;
            if (typeof defaultCreatePluginModule === 'function') {
                // 保存工厂创建的模块实例，确保只调用一次以避免重复副作用。
                const createdModule = defaultCreatePluginModule();
                return this._isPluginModule(createdModule) ? createdModule : null;
            }
        }
        // 保存按优先级选取的对象导出，兼容 ESM default、CJS default 与命名 plugin。
        const candidate = defaultExport ?? moduleNamespace.plugin;
        return this._isPluginModule(candidate) ? candidate : null;
    }

    /**
     * @description 判断未知导出是否满足最小插件生命周期协议。
     * @param candidate 待检查的导出值
     * @returns 满足 register/activate/deactivate/dispose 与 manifest 形状时为 `true`
     */
    private _isPluginModule(candidate: unknown): candidate is IPluginModule {
        if (typeof candidate !== 'object' || candidate == null) {
            return false;
        }
        // 保存运行时对象视图，用于在不使用 any 的条件下检查导出形状。
        const moduleCandidate = candidate as Record<string, unknown>;
        return (
            typeof moduleCandidate.register === 'function'
            && typeof moduleCandidate.activate === 'function'
            && typeof moduleCandidate.deactivate === 'function'
            && typeof moduleCandidate.dispose === 'function'
            && typeof moduleCandidate.manifest === 'object'
            && moduleCandidate.manifest != null
        );
    }
}
