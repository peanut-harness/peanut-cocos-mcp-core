/**
 * @description 解析随包分发的 `default_prefab` 模板根；可选同步到插件缓存。
 */
import { join } from 'path';

import { LumenPackageRoot } from '../package-root';
import { LumenTemplateCache } from './cache';
import type { ILumenTemplateCacheSyncResult } from './manifest';

/**
 * @description 模板根解析选项。
 */
export interface ILumenTemplateRootResolveOptions {
    /**
     * @description 插件缓存根；传入则 ensureSynced 后返回缓存内模板根。
     */
    readonly cacheDir?: string;

    /**
     * @description lumen 包根；缺省为本包安装根。
     */
    readonly packageRoot?: string;
}

/**
 * @description 解析产品内置 `default_prefab` 模板根，供 lumen 脚手架缺省使用。
 */
export class LumenDefaultTemplateRoot {
    /**
     * @description 解析随包或 monorepo 开发态模板根（不写缓存）。
     * @param packageRoot 可选包根
     * @returns 绝对路径
     */
    public static resolveBundled(packageRoot?: string): string {
        return LumenTemplateCache.resolveBundledRoot(packageRoot ?? LumenPackageRoot.resolve());
    }

    /**
     * @description 兼容旧调用：返回内置模板根。
     * @returns 绝对路径；理论上总是有值（缺包则抛错）
     */
    public static resolve(): string | null {
        try {
            return this.resolveBundled();
        } catch {
            return null;
        }
    }

    /**
     * @description 按选项解析：有 `cacheDir` 则同步到缓存后返回缓存根，否则返回内置根。
     * @param options 解析选项
     * @returns 模板根绝对路径
     */
    public static resolveForRuntime(options: ILumenTemplateRootResolveOptions = {}): string {
        const packageRoot = options.packageRoot ?? LumenPackageRoot.resolve();
        if (options.cacheDir != null && options.cacheDir.trim().length > 0) {
            return LumenTemplateCache.ensureSynced(options.cacheDir, packageRoot).templateRoot;
        }
        return this.resolveBundled(packageRoot);
    }

    /**
     * @description 插件启动时调用：检查缓存是否最新，过期则从内置包导出。
     * @param cacheDir 插件缓存根
     * @param packageRoot 可选包根
     * @returns 同步结果（含 templateRoot）
     */
    public static ensurePluginCache(
        cacheDir: string,
        packageRoot?: string,
    ): ILumenTemplateCacheSyncResult {
        return LumenTemplateCache.ensureSynced(cacheDir, packageRoot ?? LumenPackageRoot.resolve());
    }

    /**
     * @description 强制重置为包内 3.8.3 模板。
     * @param cacheDir 插件缓存根
     * @param packageRoot 可选包根
     * @returns 同步结果
     */
    public static resetPluginCache(
        cacheDir: string,
        packageRoot?: string,
    ): ILumenTemplateCacheSyncResult {
        return LumenTemplateCache.resetFromBundled(cacheDir, packageRoot ?? LumenPackageRoot.resolve());
    }

    /**
     * @description 从外部版本包导入到插件缓存。
     * @param sourceRoot 版本包根
     * @param cacheDir 插件缓存根
     * @returns 同步结果
     */
    public static importPluginCache(
        sourceRoot: string,
        cacheDir: string,
    ): ILumenTemplateCacheSyncResult {
        return LumenTemplateCache.importPack(sourceRoot, cacheDir);
    }

    /**
     * @description 读取缓存状态。
     * @param cacheDir 插件缓存根
     * @param packageRoot 可选包根
     * @returns 状态
     */
    public static readPluginCacheStatus(cacheDir: string, packageRoot?: string) {
        return LumenTemplateCache.readCacheStatus(cacheDir, packageRoot ?? LumenPackageRoot.resolve());
    }
}
