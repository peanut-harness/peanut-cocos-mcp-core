import type { IPluginCacheEntry, PluginConfig, ProjectPluginFileStore } from '@peanut/pod-engine/installation';

import type { IPluginFileStorageApi } from './plugin-manager-contracts.js';

/** @description 将插件调用固定到其自身缓存与配置空间的文件存储客户端。 */
export class PluginFileStorage implements IPluginFileStorageApi {
    /** @description 当前调用方插件标识。 */
    private readonly _pluginId: string;
    /** @description 项目级文件系统。 */
    private readonly _fileStore: ProjectPluginFileStore;
    /** @description 宿主为当前插件授权的文件空间。 */
    private readonly _spaces: ReadonlySet<'plugin_data' | 'plugin_cache' | 'project_temp'>;

    /**
     * @description 创建插件受限文件存储客户端。
     * @param pluginId 当前调用方插件标识
     * @param fileStore 项目级文件系统
     * @param spaces 宿主授权的文件空间
     */
    public constructor(pluginId: string, fileStore: ProjectPluginFileStore, spaces: readonly ('plugin_data' | 'plugin_cache' | 'project_temp')[]) {
        this._pluginId = pluginId;
        this._fileStore = fileStore;
        this._spaces = new Set(spaces);
    }

    /** @description 返回 cache scope 内逻辑路径的宿主描述路径。 */
    public async describe(_scope: 'cache', relativePath?: string): Promise<string> { this._requireSpace('plugin_cache'); return this._fileStore.describePluginCachePath(this._pluginId, relativePath); }
    /** @description 在 cache scope 内创建目录。 */
    public async mkdir(_scope: 'cache', relativePath: string): Promise<void> { this._requireSpace('plugin_cache'); this._fileStore.createCacheDirectory(this._pluginId, relativePath); }
    /** @description 从 cache scope 内读取二进制文件。 */
    public async read(_scope: 'cache', relativePath: string): Promise<Uint8Array | null> { this._requireSpace('plugin_cache'); return this._fileStore.readCacheFile(this._pluginId, relativePath); }
    /** @description 向 cache scope 内原子写入二进制文件。 */
    public async write(_scope: 'cache', relativePath: string, content: Uint8Array): Promise<void> { this._requireSpace('plugin_cache'); this._fileStore.writeCacheFile(this._pluginId, relativePath, content); }
    /** @description 列出 cache scope 内条目。 */
    public async list(_scope: 'cache', relativePath?: string): Promise<readonly IPluginCacheEntry[]> { this._requireSpace('plugin_cache'); return this._fileStore.listCacheEntries(this._pluginId, relativePath); }
    /** @description 删除 cache scope 内文件或目录。 */
    public async remove(_scope: 'cache', relativePath: string): Promise<boolean> { this._requireSpace('plugin_cache'); return this._fileStore.removeCacheEntry(this._pluginId, relativePath); }
    /** @description 读取当前插件 local settings。 */
    public async getLocalSettings(): Promise<Readonly<Record<string, unknown>>> { this._requireSpace('plugin_data'); return this._fileStore.readPluginSettings(this._pluginId, 'local'); }
    /** @description 原子替换当前插件 local settings。 */
    public async setLocalSettings(settings: Readonly<Record<string, unknown>>): Promise<void> { this._requireSpace('plugin_data'); this._fileStore.writePluginSettings(this._pluginId, 'local', PluginConfigReader.read(settings)); }
    /** @description 深层合并当前插件 local settings，`null` 删除字段。 */
    public async mergeLocalSettings(patch: Readonly<Record<string, unknown>>): Promise<Readonly<Record<string, unknown>>> { this._requireSpace('plugin_data'); return this._fileStore.mergePluginSettings(this._pluginId, 'local', PluginConfigReader.read(patch)); }

    /** @description 校验当前调用已获得目标文件空间授权。 */
    private _requireSpace(space: 'plugin_data' | 'plugin_cache'): void {
        if (!this._spaces.has(space)) {
            throw new Error(`plugin_file_space_not_granted:${this._pluginId}:${space}`);
        }
    }
}

/**
 * @description 将插件提交的 settings 校验为可持久化 JSON 对象。
 */
class PluginConfigReader {
    /**
     * @description 读取并校验插件 settings。
     * @param value 插件提交的未受信对象
     * @returns 可写入 packaging 文件仓的 JSON 配置
     */
    public static read(value: Readonly<Record<string, unknown>>): PluginConfig {
        if (!PluginConfigReader.isConfig(value)) {
            throw new Error('plugin_settings_not_json_object');
        }
        return value;
    }

    /**
     * @description 判断值是否为可序列化的 JSON 对象。
     * @param value 未受信输入
     * @returns 是否可作为 PluginConfig
     */
    private static isConfig(value: unknown): value is PluginConfig {
        return typeof value === 'object' && value !== null && !Array.isArray(value) && PluginConfigReader.isJsonValue(value);
    }

    /**
     * @description 递归判断值是否仅由 JSON 允许的原始值、数组和对象组成。
     * @param value 未受信输入
     * @returns 是否为 JSON 值
     */
    private static isJsonValue(value: unknown): boolean {
        if (value === null || typeof value === 'boolean' || typeof value === 'string') {
            return true;
        }
        if (typeof value === 'number') {
            return Number.isFinite(value);
        }
        if (Array.isArray(value)) {
            return value.every((item) => PluginConfigReader.isJsonValue(item));
        }
        if (typeof value !== 'object' || value == null) {
            return false;
        }
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) {
            return false;
        }
        return Object.values(value).every((item) => PluginConfigReader.isJsonValue(item));
    }
}

/** @description 未配置项目文件仓时返回明确错误的插件文件存储客户端。 */
export class UnavailablePluginFileStorage implements IPluginFileStorageApi {
    /** @description 返回项目文件仓未配置错误。 */
    private _unavailable(): never { throw new Error('plugin_file_storage_unavailable'); }
    /** @description 返回 cache scope 内逻辑路径的宿主描述路径。 */
    public async describe(_scope: 'cache', _relativePath?: string): Promise<string> { return this._unavailable(); }
    /** @description 在 cache scope 内创建目录。 */
    public async mkdir(_scope: 'cache', _relativePath: string): Promise<void> { return this._unavailable(); }
    /** @description 从 cache scope 内读取二进制文件。 */
    public async read(_scope: 'cache', _relativePath: string): Promise<Uint8Array | null> { return this._unavailable(); }
    /** @description 向 cache scope 内原子写入二进制文件。 */
    public async write(_scope: 'cache', _relativePath: string, _content: Uint8Array): Promise<void> { return this._unavailable(); }
    /** @description 列出 cache scope 内条目。 */
    public async list(_scope: 'cache', _relativePath?: string): Promise<readonly IPluginCacheEntry[]> { return this._unavailable(); }
    /** @description 删除 cache scope 内文件或目录。 */
    public async remove(_scope: 'cache', _relativePath: string): Promise<boolean> { return this._unavailable(); }
    /** @description 读取当前插件 local settings。 */
    public async getLocalSettings(): Promise<Readonly<Record<string, unknown>>> { return this._unavailable(); }
    /** @description 原子替换当前插件 local settings。 */
    public async setLocalSettings(_settings: Readonly<Record<string, unknown>>): Promise<void> { return this._unavailable(); }
    /** @description 深层合并当前插件 local settings，`null` 删除字段。 */
    public async mergeLocalSettings(_patch: Readonly<Record<string, unknown>>): Promise<Readonly<Record<string, unknown>>> { return this._unavailable(); }
}
