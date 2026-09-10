import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'fs';
import { join, relative, resolve } from 'path';

/** @description 项目内插件文件系统的标准目录布局。 */
export interface IProjectPluginFileLayout {
    /** @description Cocos 工程根目录。 */
    readonly projectPath: string;
    /** @description Peanut 插件文件系统根目录。 */
    readonly rootPath: string;
    /** @description 已安装插件包目录。 */
    readonly pluginsPath: string;
    /** @description 插件受限缓存目录。 */
    readonly cachesPath: string;
    /** @description 插件及管理器 JSON 配置目录。 */
    readonly configsPath: string;
    /** @description 项目级插件配置目录。 */
    readonly projectConfigsPath: string;
    /** @description 插件私有运行设置目录。 */
    readonly localConfigsPath: string;
    /** @description 可选的宿主全局插件配置目录。 */
    readonly globalConfigsPath: string | null;
    /** @description 插件管理器全局配置文件。 */
    readonly managerConfigPath: string;
    /** @description 安装过程暂存目录。 */
    readonly stagingPath: string;
    /** @description 已安装版本索引文件。 */
    readonly installedManifestPath: string;
}

/** @description 项目插件文件系统的可选宿主配置。 */
export interface IProjectPluginFileStoreOptions {
    /** @description 宿主级全局插件配置目录；省略时不启用 global scope。 */
    readonly globalConfigsPath?: string;
}

/** @description 插件配置读取层级。 */
export type PluginSettingsScope = 'global' | 'project' | 'local' | 'effective';

/** @description 插件缓存目录中一个已发现的条目。 */
export interface IPluginCacheEntry {
    /** @description 相对于当前插件缓存根目录的规范化路径。 */
    readonly relativePath: string;
    /** @description 条目类型。 */
    readonly kind: 'file' | 'directory';
    /** @description 文件大小；目录始终为 0。 */
    readonly size: number;
}

/** @description 单个插件的文件系统使用摘要。 */
export interface IPluginFileStorageSummary {
    /** @description 插件标识。 */
    readonly pluginId: string;
    /** @description 缓存占用字节数。 */
    readonly cacheSize: number;
    /** @description 是否存在持久化配置。 */
    readonly hasConfig: boolean;
}

/** @description 文件系统修复结果。 */
export interface IPluginFileRepairResult {
    /** @description 是否执行了目录或临时文件修复。 */
    readonly repaired: boolean;
    /** @description 已执行的修复动作。 */
    readonly actions: readonly string[];
    /** @description 保留但无法解析的配置文件。 */
    readonly invalidConfigPluginIds: readonly string[];
}

/** @description 受支持的 JSON 值。 */
export type JsonValue = boolean | number | string | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** @description 插件配置必须使用 JSON 对象作为根值。 */
export type PluginConfig = Readonly<Record<string, JsonValue>>;

/**
 * @description Cocos 项目内插件文件系统；所有插件路径均以项目根目录和插件标识双重约束。
 */
export class ProjectPluginFileStore {
    /** @description 当前项目的固定文件系统布局。 */
    private readonly _layout: IProjectPluginFileLayout;

    /**
     * @description 创建项目级插件文件系统。
     * @param projectPath Cocos 工程根目录
     */
    public constructor(projectPath: string, options: IProjectPluginFileStoreOptions = {}) {
        const resolvedProjectPath = resolve(projectPath);
        const rootPath = join(resolvedProjectPath, 'peanut-plugins');
        this._layout = {
            projectPath: resolvedProjectPath,
            rootPath,
            pluginsPath: join(rootPath, 'plugins'),
            cachesPath: join(rootPath, 'caches'),
            configsPath: join(rootPath, 'configs'),
            projectConfigsPath: join(rootPath, 'configs', 'project'),
            localConfigsPath: join(rootPath, 'configs', 'local'),
            globalConfigsPath: options.globalConfigsPath == null ? null : resolve(options.globalConfigsPath),
            managerConfigPath: join(rootPath, 'configs', 'manager.config.json'),
            stagingPath: join(rootPath, 'staging'),
            installedManifestPath: join(rootPath, 'installed.json'),
        };
    }

    /**
     * @description 返回当前项目的标准插件目录布局。
     * @returns 不可变的布局快照
     */
    public getLayout(): IProjectPluginFileLayout {
        return this._layout;
    }

    /**
     * @description 创建插件文件系统的基础目录。
     * @returns 无返回值
     */
    public ensureLayout(): void {
        for (const directoryPath of [this._layout.rootPath, this._layout.pluginsPath, this._layout.cachesPath, this._layout.configsPath, this._layout.projectConfigsPath, this._layout.localConfigsPath, this._layout.stagingPath]) {
            mkdirSync(directoryPath, { recursive: true });
        }
        if (this._layout.globalConfigsPath != null) {
            mkdirSync(this._layout.globalConfigsPath, { recursive: true });
        }
    }

    /**
     * @description 读取当前插件缓存中的一个文件。
     * @param pluginId 当前插件标识
     * @param relativePath 相对于该插件缓存根目录的文件路径
     * @returns 文件二进制内容；文件不存在时返回 `null`
     */
    public readCacheFile(pluginId: string, relativePath: string): Uint8Array | null {
        const cacheFilePath = this._resolvePluginCachePath(pluginId, relativePath, false);
        if (!existsSync(cacheFilePath)) {
            return null;
        }
        this._assertPathHasNoSymbolicLink(this._getPluginCachePath(pluginId), cacheFilePath);
        if (!statSync(cacheFilePath).isFile()) {
            throw new Error(`plugin_cache_path_not_file:${pluginId}:${relativePath}`);
        }
        return readFileSync(cacheFilePath);
    }

    /**
     * @description 返回插件缓存中指定逻辑路径的绝对描述路径，仅用于宿主日志或受控子进程参数。
     * @param pluginId 当前插件标识
     * @param relativePath 相对于该插件缓存根目录的可选路径
     * @returns 已验证的绝对路径
     */
    public describePluginCachePath(pluginId: string, relativePath = ''): string {
        return this._resolvePluginCachePath(pluginId, relativePath, true);
    }

    /**
     * @description 创建当前插件缓存内的目录。
     * @param pluginId 当前插件标识
     * @param relativePath 相对于该插件缓存根目录的目录路径
     * @returns 无返回值
     */
    public createCacheDirectory(pluginId: string, relativePath: string): void {
        const cacheRootPath = this._getPluginCachePath(pluginId);
        const directoryPath = this._resolvePluginCachePath(pluginId, relativePath, true);
        if (directoryPath === cacheRootPath) {
            mkdirSync(cacheRootPath, { recursive: true });
            return;
        }
        this._ensureParentDirectory(cacheRootPath, directoryPath);
        if (existsSync(directoryPath)) {
            this._assertPathHasNoSymbolicLink(cacheRootPath, directoryPath);
            if (!statSync(directoryPath).isDirectory()) {
                throw new Error(`plugin_cache_path_not_directory:${pluginId}:${relativePath}`);
            }
            return;
        }
        mkdirSync(directoryPath, { recursive: false });
    }

    /**
     * @description 原子写入当前插件缓存中的一个文件。
     * @param pluginId 当前插件标识
     * @param relativePath 相对于该插件缓存根目录的文件路径
     * @param content 待写入的二进制内容
     * @returns 无返回值
     */
    public writeCacheFile(pluginId: string, relativePath: string, content: Uint8Array): void {
        const cacheRootPath = this._getPluginCachePath(pluginId);
        const cacheFilePath = this._resolvePluginCachePath(pluginId, relativePath, false);
        this._ensureParentDirectory(cacheRootPath, cacheFilePath);
        this._writeAtomically(cacheFilePath, content);
    }

    /**
     * @description 列出当前插件缓存目录中的所有文件和目录。
     * @param pluginId 当前插件标识
     * @param relativePath 可选的相对目录；省略时列出全部缓存
     * @returns 按相对路径排序的条目列表
     */
    public listCacheEntries(pluginId: string, relativePath = ''): readonly IPluginCacheEntry[] {
        const cacheRootPath = this._getPluginCachePath(pluginId);
        const targetPath = this._resolvePluginCachePath(pluginId, relativePath, true);
        if (!existsSync(targetPath)) {
            return [];
        }
        this._assertPathHasNoSymbolicLink(cacheRootPath, targetPath);
        const entries: IPluginCacheEntry[] = [];
        this._collectCacheEntries(cacheRootPath, targetPath, entries);
        return entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
    }

    /**
     * @description 删除当前插件缓存中的一个文件或目录。
     * @param pluginId 当前插件标识
     * @param relativePath 相对于该插件缓存根目录的目标路径
     * @returns 目标存在且已删除时返回 `true`
     */
    public removeCacheEntry(pluginId: string, relativePath: string): boolean {
        const cacheRootPath = this._getPluginCachePath(pluginId);
        const targetPath = this._resolvePluginCachePath(pluginId, relativePath, false);
        if (!existsSync(targetPath)) {
            return false;
        }
        this._assertPathHasNoSymbolicLink(cacheRootPath, targetPath);
        rmSync(targetPath, { recursive: true, force: true });
        return true;
    }

    /**
     * @description 清空一个插件的全部缓存内容。
     * @param pluginId 需要清理的插件标识
     * @returns 已删除的缓存字节数
     */
    public clearPluginCache(pluginId: string): number {
        const cacheRootPath = this._getPluginCachePath(pluginId);
        const cacheSize = this.getPluginCacheSize(pluginId);
        if (existsSync(cacheRootPath)) {
            this._assertPathHasNoSymbolicLink(this._layout.cachesPath, cacheRootPath);
            rmSync(cacheRootPath, { recursive: true, force: true });
        }
        return cacheSize;
    }

    /**
     * @description 清空所有插件缓存内容；仅插件管理器管理面应调用此方法。
     * @returns 清理前所有缓存的总字节数
     */
    public clearAllCaches(): number {
        const totalSize = this.listPluginStorageSummaries().reduce((total, summary) => total + summary.cacheSize, 0);
        if (existsSync(this._layout.cachesPath)) {
            this._assertPathHasNoSymbolicLink(this._layout.rootPath, this._layout.cachesPath);
            rmSync(this._layout.cachesPath, { recursive: true, force: true });
        }
        mkdirSync(this._layout.cachesPath, { recursive: true });
        return totalSize;
    }

    /**
     * @description 计算一个插件缓存目录的总文件大小。
     * @param pluginId 需要统计的插件标识
     * @returns 缓存总字节数
     */
    public getPluginCacheSize(pluginId: string): number {
        const cacheRootPath = this._getPluginCachePath(pluginId);
        if (!existsSync(cacheRootPath)) {
            return 0;
        }
        this._assertPathHasNoSymbolicLink(this._layout.cachesPath, cacheRootPath);
        return this._calculateDirectorySize(cacheRootPath);
    }

    /**
     * @description 按配置层级读取插件设置；`effective` 按 global、project、local 顺序深层合并。
     * @param pluginId 插件标识
     * @param scope 目标配置层级
     * @returns 对应层或合并后的 JSON 配置对象
     */
    public readPluginSettings(pluginId: string, scope: PluginSettingsScope): PluginConfig {
        if (scope !== 'effective') {
            return this._readConfig(this._getPluginSettingsPath(pluginId, scope), `plugin_settings_invalid_json:${pluginId}:${scope}`);
        }
        return this._mergeSettings(
            this._mergeSettings(this._layout.globalConfigsPath == null ? {} : this.readPluginSettings(pluginId, 'global'), this.readPluginSettings(pluginId, 'project')),
            this.readPluginSettings(pluginId, 'local'),
        );
    }

    /**
     * @description 原子替换指定可写层级的插件设置。
     * @param pluginId 插件标识
     * @param scope 可写设置层级；不允许写入 `effective`
     * @param settings 待保存的 JSON 对象
     * @returns 无返回值
     */
    public writePluginSettings(pluginId: string, scope: Exclude<PluginSettingsScope, 'effective'>, settings: PluginConfig): void {
        this._writeConfig(this._getPluginSettingsPath(pluginId, scope), settings, `plugin_settings_invalid_value:${pluginId}:${scope}`);
    }

    /**
     * @description 深层合并指定可写层级的插件设置；`null` 表示删除字段。
     * @param pluginId 插件标识
     * @param scope 可写设置层级
     * @param patch 待合并的 JSON 补丁
     * @returns 合并后的层级配置
     */
    public mergePluginSettings(pluginId: string, scope: Exclude<PluginSettingsScope, 'effective'>, patch: PluginConfig): PluginConfig {
        const mergedSettings = this._mergeSettings(this.readPluginSettings(pluginId, scope), patch);
        this.writePluginSettings(pluginId, scope, mergedSettings);
        return mergedSettings;
    }

    /**
     * @description 删除指定层级的插件设置；仅插件管理器管理面应调用此方法。
     * @param pluginId 需要清除设置的插件标识
     * @param scope 需要删除的可写设置层级
     * @returns 设置存在且已删除时返回 `true`
     */
    public removePluginSettings(pluginId: string, scope: Exclude<PluginSettingsScope, 'effective'>): boolean {
        const configPath = this._getPluginSettingsPath(pluginId, scope);
        if (!existsSync(configPath)) {
            return false;
        }
        this._assertPathHasNoSymbolicLink(this._layout.configsPath, configPath);
        rmSync(configPath, { force: true });
        return true;
    }

    /**
     * @description 读取插件管理器的全局 JSON 配置。
     * @returns 配置对象；文件不存在时返回空对象
     */
    public readManagerConfig(): PluginConfig {
        return this._readConfig(this._layout.managerConfigPath, 'manager_config_invalid_json');
    }

    /**
     * @description 原子替换插件管理器的全局 JSON 配置。
     * @param config 待保存的 JSON 对象
     * @returns 无返回值
     */
    public writeManagerConfig(config: PluginConfig): void {
        this._writeConfig(this._layout.managerConfigPath, config, 'manager_config_invalid_value');
    }

    /**
     * @description 返回各插件缓存大小与配置存在状态，供插件管理器管理面展示。
     * @returns 按插件标识排序的使用摘要
     */
    public listPluginStorageSummaries(): readonly IPluginFileStorageSummary[] {
        const pluginIds = new Set<string>();
        this._collectDirectoryNames(this._layout.cachesPath, pluginIds);
        for (const configsPath of [this._layout.projectConfigsPath, this._layout.localConfigsPath, this._layout.globalConfigsPath]) {
            if (configsPath != null) {
                this._collectConfigPluginIds(configsPath, pluginIds);
            }
        }
        return [...pluginIds]
            .filter((pluginId) => this._isValidPluginId(pluginId))
            .sort((left, right) => left.localeCompare(right))
            .map((pluginId) => ({
                pluginId,
                cacheSize: this.getPluginCacheSize(pluginId),
                hasConfig: (['global', 'project', 'local'] as const).some((scope) => {
                    try {
                        return existsSync(this._getPluginSettingsPath(pluginId, scope));
                    } catch {
                        return false;
                    }
                }),
            }));
    }

    /**
     * @description 修复缺失的基础目录并清理原子写入遗留的临时文件。
     * @returns 结构化修复结果；损坏配置仅报告，不自动删除
     */
    public repair(): IPluginFileRepairResult {
        const actions: string[] = [];
        for (const directoryPath of [this._layout.rootPath, this._layout.pluginsPath, this._layout.cachesPath, this._layout.configsPath, this._layout.projectConfigsPath, this._layout.localConfigsPath, this._layout.stagingPath]) {
            if (!existsSync(directoryPath)) {
                mkdirSync(directoryPath, { recursive: true });
                actions.push(`created:${relative(this._layout.projectPath, directoryPath)}`);
            }
        }
        this._removeTemporaryFiles(this._layout.configsPath, actions);
        this._removeTemporaryFiles(this._layout.projectConfigsPath, actions);
        this._removeTemporaryFiles(this._layout.localConfigsPath, actions);
        const invalidConfigPluginIds: string[] = [];
        for (const fileName of readdirSync(this._layout.configsPath)) {
            if (!fileName.endsWith('.config.json')) {
                continue;
            }
            try {
                this._readConfig(join(this._layout.configsPath, fileName), 'config_invalid_json');
            } catch {
                invalidConfigPluginIds.push(fileName === 'manager.config.json' ? 'manager' : fileName.slice(0, -'.config.json'.length));
            }
        }
        return { repaired: actions.length > 0, actions, invalidConfigPluginIds: invalidConfigPluginIds.sort((left, right) => left.localeCompare(right)) };
    }

    /** @description 返回指定插件缓存根目录，并校验插件标识。 */
    private _getPluginCachePath(pluginId: string): string {
        this._requirePluginId(pluginId);
        return join(this._layout.cachesPath, pluginId);
    }

    /** @description 返回插件指定设置层级的实际文件路径。 */
    private _getPluginSettingsPath(pluginId: string, scope: Exclude<PluginSettingsScope, 'effective'>): string {
        this._requirePluginId(pluginId);
        if (scope === 'global') {
            if (this._layout.globalConfigsPath == null) {
                throw new Error('plugin_global_settings_unavailable');
            }
            return join(this._layout.globalConfigsPath, `${pluginId}.json`);
        }
        if (scope === 'project') {
            return join(this._layout.projectConfigsPath, `${pluginId}.json`);
        }
        return join(this._layout.localConfigsPath, `${pluginId}.json`);
    }

    /** @description 解析并校验插件缓存相对路径。 */
    private _resolvePluginCachePath(pluginId: string, relativePath: string, canReferenceRoot: boolean): string {
        const cacheRootPath = this._getPluginCachePath(pluginId);
        if (typeof relativePath !== 'string' || (!canReferenceRoot && relativePath.length === 0)) {
            throw new Error(`plugin_cache_relative_path_invalid:${pluginId}`);
        }
        const targetPath = resolve(cacheRootPath, relativePath);
        const pathFromRoot = relative(cacheRootPath, targetPath);
        if (pathFromRoot === '' && canReferenceRoot) {
            return targetPath;
        }
        if (pathFromRoot === '' || pathFromRoot === '..' || pathFromRoot.startsWith(`..${String.fromCharCode(92)}`) || pathFromRoot.startsWith('../')) {
            throw new Error(`plugin_cache_path_outside_scope:${pluginId}:${relativePath}`);
        }
        return targetPath;
    }

    /** @description 拒绝包含符号链接的已存在路径，避免解析后逃逸缓存或配置范围。 */
    private _assertPathHasNoSymbolicLink(rootPath: string, targetPath: string): void {
        if (!existsSync(rootPath)) {
            return;
        }
        const pathFromRoot = relative(rootPath, targetPath);
        let currentPath = rootPath;
        if (lstatSync(currentPath).isSymbolicLink()) {
            throw new Error(`plugin_file_symbolic_link_rejected:${currentPath}`);
        }
        for (const segment of pathFromRoot === '' ? [] : pathFromRoot.split(/[\\/]/)) {
            currentPath = join(currentPath, segment);
            if (existsSync(currentPath) && lstatSync(currentPath).isSymbolicLink()) {
                throw new Error(`plugin_file_symbolic_link_rejected:${currentPath}`);
            }
        }
    }

    /** @description 创建目标文件的父目录，并拒绝路径上的符号链接。 */
    private _ensureParentDirectory(rootPath: string, targetPath: string): void {
        const pathSegments = relative(rootPath, targetPath).split(/[\\/]/).slice(0, -1);
        let currentDirectoryPath = rootPath;
        mkdirSync(currentDirectoryPath, { recursive: true });
        for (const pathSegment of pathSegments) {
            currentDirectoryPath = join(currentDirectoryPath, pathSegment);
            if (existsSync(currentDirectoryPath)) {
                this._assertPathHasNoSymbolicLink(rootPath, currentDirectoryPath);
            } else {
                mkdirSync(currentDirectoryPath, { recursive: false });
            }
        }
    }

    /** @description 通过同目录临时文件写入并原子替换目标文件。 */
    private _writeAtomically(targetPath: string, content: Uint8Array | string): void {
        const temporaryPath = `${targetPath}.tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        try {
            if (typeof content === 'string') {
                writeFileSync(temporaryPath, content, 'utf8');
            } else {
                writeFileSync(temporaryPath, content);
            }
            renameSync(temporaryPath, targetPath);
        } finally {
            rmSync(temporaryPath, { force: true });
        }
    }

    /** @description 递归收集缓存条目。 */
    private _collectCacheEntries(cacheRootPath: string, currentPath: string, entries: IPluginCacheEntry[]): void {
        const currentStats = statSync(currentPath);
        if (currentStats.isFile()) {
            entries.push({ relativePath: this._toPortableRelativePath(cacheRootPath, currentPath), kind: 'file', size: currentStats.size });
            return;
        }
        for (const directoryEntry of readdirSync(currentPath, { withFileTypes: true })) {
            const entryPath = join(currentPath, directoryEntry.name);
            this._assertPathHasNoSymbolicLink(cacheRootPath, entryPath);
            const entryRelativePath = this._toPortableRelativePath(cacheRootPath, entryPath);
            if (directoryEntry.isDirectory()) {
                entries.push({ relativePath: entryRelativePath, kind: 'directory', size: 0 });
                this._collectCacheEntries(cacheRootPath, entryPath, entries);
            } else {
                entries.push({ relativePath: entryRelativePath, kind: 'file', size: statSync(entryPath).size });
            }
        }
    }

    /** @description 递归计算目录内普通文件大小。 */
    private _calculateDirectorySize(directoryPath: string): number {
        this._assertPathHasNoSymbolicLink(this._layout.cachesPath, directoryPath);
        let totalSize = 0;
        for (const directoryEntry of readdirSync(directoryPath, { withFileTypes: true })) {
            const entryPath = join(directoryPath, directoryEntry.name);
            this._assertPathHasNoSymbolicLink(this._layout.cachesPath, entryPath);
            totalSize += directoryEntry.isDirectory() ? this._calculateDirectorySize(entryPath) : statSync(entryPath).size;
        }
        return totalSize;
    }

    /** @description 将相对路径转换为跨平台稳定的 `/` 分隔形式。 */
    private _toPortableRelativePath(rootPath: string, targetPath: string): string {
        return relative(rootPath, targetPath).replace(/\\/g, '/');
    }

    /** @description 读取、解析并校验一个 JSON 配置对象。 */
    private _readConfig(configPath: string, errorCode: string): PluginConfig {
        if (!existsSync(configPath)) {
            return {};
        }
        this._assertPathHasNoSymbolicLink(this._layout.configsPath, configPath);
        try {
            const parsedValue: unknown = JSON.parse(readFileSync(configPath, 'utf8'));
            if (!this._isJsonObject(parsedValue)) {
                throw new Error(errorCode);
            }
            return parsedValue;
        } catch (error) {
            if (error instanceof Error && error.message === errorCode) {
                throw error;
            }
            throw new Error(errorCode);
        }
    }

    /** @description 校验并通过临时文件原子写入 JSON 配置。 */
    private _writeConfig(configPath: string, config: PluginConfig, errorCode: string): void {
        if (!this._isJsonObject(config)) {
            throw new Error(errorCode);
        }
        this._ensureParentDirectory(resolve(configPath, '..'), configPath);
        this._assertPathHasNoSymbolicLink(resolve(configPath, '..'), configPath);
        this._writeAtomically(configPath, `${JSON.stringify(config, null, 4)}\n`);
    }

    /** @description 按递归对象规则合并设置；`null` 删除字段。 */
    private _mergeSettings(base: PluginConfig, patch: PluginConfig): PluginConfig {
        const mergedSettings: Record<string, JsonValue> = { ...base };
        for (const [key, value] of Object.entries(patch)) {
            if (value === null) {
                delete mergedSettings[key];
                continue;
            }
            const priorValue = mergedSettings[key];
            mergedSettings[key] = this._isJsonObject(value) && this._isJsonObject(priorValue)
                ? this._mergeSettings(priorValue, value)
                : value;
        }
        return mergedSettings;
    }

    /** @description 判断值是否为可序列化的 JSON 对象。 */
    private _isJsonObject(value: unknown): value is PluginConfig {
        return typeof value === 'object' && value !== null && !Array.isArray(value) && this._isJsonValue(value);
    }

    /** @description 递归判断值是否仅由 JSON 允许的原始值、数组和对象组成。 */
    private _isJsonValue(value: unknown): value is JsonValue {
        if (value === null || typeof value === 'boolean' || typeof value === 'string') {
            return true;
        }
        if (typeof value === 'number') {
            return Number.isFinite(value);
        }
        if (Array.isArray(value)) {
            return value.every((item) => this._isJsonValue(item));
        }
        if (typeof value !== 'object') {
            return false;
        }
        const prototype = Object.getPrototypeOf(value);
        if (prototype !== Object.prototype && prototype !== null) {
            return false;
        }
        return Object.values(value).every((item) => this._isJsonValue(item));
    }

    /** @description 收集目录中的一级目录名称。 */
    private _collectDirectoryNames(directoryPath: string, names: Set<string>): void {
        if (!existsSync(directoryPath)) {
            return;
        }
        this._assertPathHasNoSymbolicLink(this._layout.rootPath, directoryPath);
        for (const directoryEntry of readdirSync(directoryPath, { withFileTypes: true })) {
            if (directoryEntry.isDirectory()) {
                names.add(directoryEntry.name);
            }
        }
    }

    /** @description 收集一个设置层目录中的插件标识。 */
    private _collectConfigPluginIds(configsPath: string, pluginIds: Set<string>): void {
        if (!existsSync(configsPath)) {
            return;
        }
        for (const fileName of readdirSync(configsPath)) {
            if (fileName.endsWith('.json')) {
                pluginIds.add(fileName.slice(0, -'.json'.length));
            }
        }
    }

    /** @description 清理目录中的原子写入临时文件。 */
    private _removeTemporaryFiles(directoryPath: string, actions: string[]): void {
        for (const directoryEntry of readdirSync(directoryPath, { withFileTypes: true })) {
            if (directoryEntry.isDirectory() || !directoryEntry.name.includes('.tmp-')) {
                continue;
            }
            const temporaryPath = join(directoryPath, directoryEntry.name);
            this._assertPathHasNoSymbolicLink(this._layout.configsPath, temporaryPath);
            rmSync(temporaryPath, { force: true });
            actions.push(`removed:${relative(this._layout.projectPath, temporaryPath)}`);
        }
    }

    /** @description 判断插件标识是否可安全映射为单级目录和配置文件名。 */
    private _isValidPluginId(pluginId: string): boolean {
        return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(pluginId);
    }

    /** @description 校验插件标识。 */
    private _requirePluginId(pluginId: string): void {
        if (!this._isValidPluginId(pluginId)) {
            throw new Error(`plugin_file_plugin_id_invalid:${pluginId}`);
        }
    }
}
