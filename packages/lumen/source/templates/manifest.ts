/**
 * @description 内置 default_prefab 清单与插件缓存同步结果。
 */
export interface ILumenTemplateManifest {
    /**
     * @description 模板面向的 Creator 版本（包内默认 `3.8.3`）。
     */
    readonly cocosVersion: string;

    /**
     * @description lumen 包版本。
     */
    readonly packageVersion: string;

    /**
     * @description 模板内容指纹（相对路径 + 字节内容）。
     */
    readonly contentHash: string;

    /**
     * @description `.prefab` 数量。
     */
    readonly templateCount: number;

    /**
     * @description 清单生成时间（ISO）。
     */
    readonly generatedAt: string;
}

/**
 * @description 缓存同步结果。
 */
export interface ILumenTemplateCacheSyncResult {
    /**
     * @description 可供 Session 使用的模板根（缓存内 `default_prefab`）。
     */
    readonly templateRoot: string;

    /**
     * @description 是否执行了复制。
     */
    readonly copied: boolean;

    /**
     * @description 生效清单。
     */
    readonly manifest: ILumenTemplateManifest;

    /**
     * @description 内置包内模板根（复制源）。
     */
    readonly bundledRoot: string;
}

/**
 * @description 缓存状态（供面板 / CLI）。
 */
export interface ILumenTemplateCacheStatus {
    /**
     * @description 缓存根。
     */
    readonly cacheDir: string;

    /**
     * @description 缓存内模板根；无缓存时为 null。
     */
    readonly templateRoot: string | null;

    /**
     * @description 包内清单。
     */
    readonly bundled: ILumenTemplateManifest;

    /**
     * @description 缓存清单；无则 null。
     */
    readonly cache: ILumenTemplateManifest | null;

    /**
     * @description 缓存是否与包内指纹一致。
     */
    readonly inSyncWithBundled: boolean;
}
