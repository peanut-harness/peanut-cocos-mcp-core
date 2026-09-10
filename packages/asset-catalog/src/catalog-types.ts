/**
 * @description 资产目录中的稳定资源类型分桶。
 */
export type AssetCatalogBucket =
    | 'script'
    | 'image'
    | 'spriteFrame'
    | 'texture'
    | 'prefab'
    | 'scene'
    | 'config'
    | 'audio'
    | 'video'
    | 'spine'
    | 'dragonBones'
    | 'cubeMap'
    | 'tiledMap'
    | 'particle'
    | 'spriteAtlas'
    | 'autoAtlas'
    | 'font'
    | 'directory'
    | 'material'
    | 'animationClip'
    | 'animationGraph'
    | 'physicsMaterial'
    | 'terrain'
    | 'effect'
    | 'model'
    | 'mesh'
    | 'renderTexture'
    | 'renderPipeline'
    | 'renderFlow'
    | 'renderStage'
    | 'buffer'
    | 'other';

/**
 * @description 单条可检索资产记录。
 */
export interface IAssetCatalogEntry {
    /** @description 资源类型分桶。 */
    readonly type: AssetCatalogBucket;
    /** @description 相对项目根的资源路径（不含 `.meta`）。 */
    readonly path: string;
    /** @description 资源主 UUID 或子资源 UUID。 */
    readonly uuid: string;
    /** @description Creator 压缩 UUID；脚本挂 Prefab 时使用。 */
    readonly compressedUuid: string;
    /** @description meta importer 原始值。 */
    readonly importer: string;
    /** @description 文件名（不含目录）。 */
    readonly name: string;
    /** @description 所属 Asset Bundle 目录相对路径；非 Bundle 时为空字符串。 */
    readonly bundle: string;
    /** @description 父资源 UUID；子资源才有值，否则为空字符串。 */
    readonly parentUuid: string;
    /** @description 子资源显示名；非子资源时为空字符串。 */
    readonly displayName: string;
}

/**
 * @description UUID 冲突记录。
 */
export interface IAssetCatalogUuidConflict {
    /** @description 冲突的 UUID。 */
    readonly uuid: string;
    /** @description 已保留在 uuidMap 中的路径。 */
    readonly keptPath: string;
    /** @description 被跳过的重复路径。 */
    readonly duplicatePath: string;
}

/**
 * @description 完整资产目录文档，作为外编与 Agent 的确定性检索表。
 */
export interface IAssetCatalogDocument {
    /** @description 目录 schema 版本。 */
    readonly schemaVersion: 1;
    /** @description 生成时间（ISO-8601）。 */
    readonly generatedAt: string;
    /** @description 项目根目录绝对路径。 */
    readonly projectRoot: string;
    /** @description 扫描的资产根相对路径。 */
    readonly assetRoot: string;
    /** @description 各类型条目数量。 */
    readonly counts: Readonly<Record<AssetCatalogBucket, number>>;
    /** @description 按类型分桶的条目列表。 */
    readonly byType: Readonly<Record<AssetCatalogBucket, readonly IAssetCatalogEntry[]>>;
    /** @description UUID 到条目的倒排索引。 */
    readonly uuidMap: Readonly<Record<string, IAssetCatalogEntry>>;
    /** @description 扫描中发现的 UUID 冲突；不影响主表生成。 */
    readonly conflicts: readonly IAssetCatalogUuidConflict[];
}

/**
 * @description 目录查询条件。
 */
export interface IAssetCatalogQuery {
    /** @description 精确 UUID（可含子资源后缀）。 */
    readonly uuid?: string;
    /** @description 类型分桶过滤。 */
    readonly type?: AssetCatalogBucket;
    /** @description 路径子串（大小写不敏感）。 */
    readonly pathContains?: string;
    /** @description 文件名子串（大小写不敏感）。 */
    readonly nameContains?: string;
    /** @description 返回条数上限。 */
    readonly limit?: number;
}
