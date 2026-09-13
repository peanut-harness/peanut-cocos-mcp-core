/**
 * @description 真实 Creator AssetDB 写入桥接 provider 契约，由版本适配器共享。
 */
export interface IEditorApiAssetBridgeProvider {
    /**
     * @description 判断当前宿主是否提供可调用的 AssetDB 消息接口。
     * @returns 可调用时返回 `true`
     */
    isAvailable(): boolean;

    /**
     * @description 查询指定资源或子资源的最新快照。
     * @param pathOrUuid 资源路径或 UUID
     * @returns 不可用或不存在时返回 `null`
     */
    queryAsset(pathOrUuid: string): Promise<unknown | null>;

    /**
     * @description 刷新指定资源并返回最新快照。
     * @param pathOrUuid 资源路径或 UUID
     * @returns 不可用或不存在时返回 `null`
     */
    refreshAsset(pathOrUuid: string): Promise<unknown | null>;

    /**
     * @description 按条件批量查询资源快照。
     * @param options 可选路径模式与 importer 过滤条件
     * @returns 资源快照列表
     */
    queryAssets(options?: {
        readonly pattern?: string;
        readonly importer?: string | readonly string[];
    }): Promise<readonly unknown[]>;

    /**
     * @description 写入、刷新并选中指定 Prefab。
     * @param relativePath 项目内相对路径
     * @param prefab Prefab 序列化内容
     * @returns 宿主写入结果
     */
    writePrefab(relativePath: string, prefab: readonly Record<string, unknown>[]): Promise<unknown>;

    /**
     * @description 写入受支持的二进制资源并刷新 AssetDB。
     * @param relativePath 项目内相对路径
     * @param content 二进制内容
     * @param mediaType 受支持的媒体类型
     * @returns 宿主写入结果
     */
    writeBinary(
        relativePath: string,
        content: Uint8Array,
        mediaType: 'image/png' | 'image/svg+xml' | 'application/json' | 'font/ttf' | 'font/otf',
    ): Promise<unknown>;

    /**
     * @description 删除已验证的项目相对资源。
     * @param relativePath 项目内相对路径
     * @returns 无返回值
     */
    deleteAsset(relativePath: string): Promise<void>;
}
