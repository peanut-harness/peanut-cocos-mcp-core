import { createRequire } from 'module';
import { resolve } from 'path';
import { pathToFileURL } from 'url';

import type { IPluginManifest } from '@peanut/pod-protocol';

import type { IPluginModule } from '../shared/plugin-manager-contracts.js';

/**
 * @description 宿主进程的 CommonJS `require` 句柄（`cache` 与全局 `Module._cache`），用于把安装目录失效的模块缓存。
 *
 * Creator/Electron 曾将动态 `import()` 映射到 `require()`，依赖旧的解析与缓存；kernel reload 不能自动清它。
 * 因此必须在加载后的插件 bundle 在 reload 时读到新内容。此处在 reload 前显式失效。
 *
 * 以 `process.cwd()` 对应的 file URL 作为 `createRequire` 的基准（而非 `import.meta.url`）：plugin-core 会被 esbuild
 * 打成 CommonJS bundle 注入到宿主扩展中，此时 `import.meta.url` 被 shim 成 `undefined`。因 `require.cache` 与 `fs`
 * 本为全局/共享，与基准路径无关，用 cwd URL 即可；避免 ESM 直接与 CJS bundle 混用时的动态坑。
 */
const hostRequire = createRequire(pathToFileURL(`${process.cwd()}/`).href) as ((id: string) => unknown) & {
    readonly cache?: Record<string, unknown>;
};

/**
 * @description 每次解析递增的模块加载序号，用作纯 Node ESM 场景下唯一的 import URL query，强制 ESM loader 重读磁盘。
 *
 * 用递增序号而非 `Date.now()`，避免同一毫秒内多次 reload 时 query 撞车导致 ESM 缓存仍命中旧模块。
 */
let moduleLoadSequence = 0;

/**
 * @description 把安装包目录解析为插件模块实例的解析接口；实现可绑定宿主加载器，不得暴露给普通 runtime。
 */
export interface IPluginPackageModuleResolver {
    /**
     * @description 加载并验证一个已安装的插件入口。
     * @param installPath 已安装插件版本目录
     * @param manifest 已通过 packaging 校验的插件清单
     * @returns 可交给 PluginLoader 的插件模块实例
     */
    resolve(installPath: string, manifest: IPluginManifest): Promise<IPluginModule>;
}

/**
 * @description Creator/Node 宿主进程的目录型模块解析器，可加载安装目录内的 ESM 或 CJS 入口。
 */
export class NodePluginPackageModuleResolver implements IPluginPackageModuleResolver {
    /**
     * @description 解析指定插件并返回一个可注册的插件实例。
     * @param installPath 已安装插件版本目录
     * @param manifest 已通过 packaging 校验的插件清单
     * @returns 通过 manifest 一致性校验的插件模块实例
     */
    public async resolve(installPath: string, manifest: IPluginManifest): Promise<IPluginModule> {
        // 先规范化安装目录绝对路径，防止 manifest main 用相对路径逃逸。
        const normalizedInstallPath = resolve(installPath);
        // 入口绝对路径必须落在当前插件安装目录内。
        const entryPath = resolve(normalizedInstallPath, manifest.main);
        // 跨平台统一为 `/` 的根目录路径，便于 Windows 与 POSIX 做一致的前缀校验。
        const portableInstallPath = normalizedInstallPath.replace(/\\/g, '/');
        // 跨平台统一为 `/` 的入口路径，避免反斜杠导致合法 Windows 路径被拒。
        const portableEntryPath = entryPath.replace(/\\/g, '/');
        if (portableEntryPath !== portableInstallPath && !portableEntryPath.startsWith(`${portableInstallPath}/`)) {
            throw new Error(`plugin_main_outside_install_root:${manifest.id}`);
        }

        // kernel reload 场景必须能再次加载插件：先失效该安装目录下的 CommonJS 模块缓存，
        // 否则动态 import 会命中旧 module.exports，磁盘上的新 bundle 永远不会被重新读取。
        this._invalidateInstalledModuleCache(normalizedInstallPath);
        // 一律走 file URL：Creator 3.8+/Node ESM 在 Windows 上拒绝裸盘符路径（Received protocol 'd:'）。
        const moduleNamespace = (await import(this._toImportSpecifier(entryPath))) as Record<string, unknown>;
        // 按约定解析插件模块导出：优先工厂，其次 default；plugin 为兼容别名。
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
     * @description 失效指定安装目录下已缓存的 CommonJS 模块，确保 reload 能读到磁盘上的新插件代码。
     *
     * 此处清 `require.cache`，覆盖 Creator/Electron（动态 import 映射到 require）与纯 Node 对 `import()` 加载
     * `.cjs` 时复用的 CommonJS 缓存。纯 Node ESM（`.mjs`）的模块缓存无公开失效接口，由 {@link _toImportSpecifier}
     * 追加唯一 query 强制 ESM loader 重读磁盘来兜底。失效范围严格限制在安装目录前缀内，避免误伤宿主或其他插件。
     * @param normalizedInstallPath 已规范化的插件版本安装目录
     * @returns 无返回值；缓存不存在或为空时安全返回
     */
    private _invalidateInstalledModuleCache(normalizedInstallPath: string): void {
        const cache = hostRequire.cache;
        if (cache == null) {
            return;
        }
        // CommonJS 模块缓存键是 Node 解析后的真实路径（例如 macOS 上 /var → /private/var），
        // 因此把安装目录也解析成真实路径再比对，避免前缀校验因 /private 前缀差异而漏删。
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
     * @description 把文件系统路径转成 ESM `import()` 可用的 specifier；已是 `file:` URL 时幂等返回。
     *
     * 一律委托 Node `pathToFileURL`，不手写盘符拼接。Creator 3.8+ 使用默认 ESM loader，Windows 上裸绝对路径
     * 会被解析成错误协议（如 `d:`）而失败；macOS/Linux 的绝对路径经 `pathToFileURL` 后行为与原先 Node 分支一致。
     * `electronVersion` 保留以兼容旧调用方，不再用于返回裸路径（历史假设“Electron 把 import 映射为 require”在
     * Creator 3.8 Windows 上不成立）。
     * @param entryPath 位于安装目录内的绝对路径，或已是 `file:` 的 URL
     * @param _electronVersion 兼容保留；忽略
     * @returns ESM 可 `import()` 的 `file://` URL
     */
    public static toImportSpecifier(entryPath: string, _electronVersion?: string): string {
        // 已是 file URL：幂等返回，避免二次 pathToFileURL 把 scheme 当路径段。
        if (entryPath.startsWith('file:')) {
            return entryPath;
        }
        return pathToFileURL(entryPath).href;
    }

    /**
     * @description 实例侧校验过的入口路径转成当前宿主可加载、且 reload 时能绕过旧模块缓存的 import specifier。
     *
     * 在非 Electron 或需要 ESM 重读时追加时序 query。Electron 仍先靠 {@link _invalidateInstalledModuleCache}
     * 清 CJS 缓存；specifier 本身已是 `file://`，满足 Creator 3.8 ESM loader。
     * @param entryPath 位于安装目录内的绝对路径
     * @returns ESM 可解析的 `file://` URL（纯 Node 时带失效 query）
     */
    private _toImportSpecifier(entryPath: string): string {
        const specifier = NodePluginPackageModuleResolver.toImportSpecifier(entryPath, process.versions.electron);
        if (typeof process.versions.electron === 'string' && process.versions.electron.length > 0) {
            return specifier;
        }
        return `${specifier}?t=${++moduleLoadSequence}`;
    }

    /**
     * @description 从模块命名空间中选取支持的插件模块导出形式。
     * @param moduleNamespace 动态 import 得到的命名空间对象
     * @returns 符合插件模块协议的模块；无法识别时返回 `null`
     */
    private _resolveModuleExport(moduleNamespace: Record<string, unknown>): IPluginModule | null {
        // 约定优先的工厂导出形式，适合需要为每次激活创建新实例的插件。
        const createPluginModule = moduleNamespace.createPluginModule;
        if (typeof createPluginModule === 'function') {
            // 调用工厂得到模块实例，确保只创建一次以免重复副作用。
            const createdModule = createPluginModule();
            return this._isPluginModule(createdModule) ? createdModule : null;
        }
        // 兼容 CommonJS 互操作：很多 default 上的导出；Node 会把 `module.exports` 挂在该字段。
        const defaultExport = moduleNamespace.default;
        if (typeof defaultExport === 'object' && defaultExport != null) {
            // 兼容 CommonJS exports 中的约定工厂，例如 esbuild 生成的 `exports.createPluginModule`。
            const defaultCreatePluginModule = (defaultExport as Record<string, unknown>).createPluginModule;
            if (typeof defaultCreatePluginModule === 'function') {
                // 调用工厂得到模块实例，确保只创建一次以免重复副作用。
                const createdModule = defaultCreatePluginModule();
                return this._isPluginModule(createdModule) ? createdModule : null;
            }
        }
        // 再按优先级选取对象导出：ESM default、CJS default 或命名 plugin。
        const candidate = defaultExport ?? moduleNamespace.plugin;
        return this._isPluginModule(candidate) ? candidate : null;
    }

    /**
     * @description 判断未知值是否符合最小插件模块协议。
     * @param candidate 候选的导出值
     * @returns 含有 register/activate/deactivate/dispose 与 manifest 形状时为 `true`
     */
    private _isPluginModule(candidate: unknown): candidate is IPluginModule {
        if (typeof candidate !== 'object' || candidate == null) {
            return false;
        }
        // 运行时形状检查：避免使用 any，只逐项校验导出形状。
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
