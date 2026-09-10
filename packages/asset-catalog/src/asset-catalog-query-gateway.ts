import type { AssetCatalogBucket, IAssetCatalogEntry, IAssetCatalogQuery } from './catalog-types';
import { AssetCatalogQueryService } from './asset-catalog-query-service';
import { AssetCatalogStore } from './asset-catalog-store';

/**
 * @description 按需加载分片的快速查询网关，供 CLI / HTTP 接口复用。
 */
export class AssetCatalogQueryGateway {
    /** @description 分片存储。 */
    private readonly _store: AssetCatalogStore;
    /** @description 内存过滤服务。 */
    private readonly _queryService: AssetCatalogQueryService;

    /**
     * @description 创建查询网关。
     * @param store 分片存储。
     * @param queryService 过滤服务。
     */
    public constructor(
        store: AssetCatalogStore = new AssetCatalogStore(),
        queryService: AssetCatalogQueryService = new AssetCatalogQueryService(),
    ) {
        this._store = store;
        this._queryService = queryService;
    }

    /**
     * @description 在输出目录上执行查询，只读取必要分片。
     * @param outputDirectory 目录输出路径。
     * @param query 查询条件。
     * @returns 命中条目。
     */
    public query(outputDirectory: string, query: IAssetCatalogQuery): readonly IAssetCatalogEntry[] {
        if (query.uuid != null && query.uuid.trim().length > 0) {
            const hit = this._store.readByUuid(outputDirectory, query.uuid.trim());
            return hit == null ? [] : [hit];
        }

        const type = query.type;
        const pathContains = query.pathContains;
        const nameContains = query.nameContains;
        if (type == null && (pathContains == null || pathContains.trim().length === 0) && (nameContains == null || nameContains.trim().length === 0)) {
            throw new Error('query_requires_uuid_or_type_or_path_or_name');
        }

        const buckets: AssetCatalogBucket[] = type == null
            ? [...this._store.listBuckets(outputDirectory)]
            : [this._queryService.parseType(type)];

        const collected: IAssetCatalogEntry[] = [];
        const limit = query.limit;
        for (const bucket of buckets) {
            const entries = this._store.readBucket(outputDirectory, bucket);
            const remaining = limit == null ? undefined : Math.max(1, limit - collected.length);
            const filtered = this._queryService.filterEntries(entries, {
                pathContains,
                nameContains,
                limit: remaining,
            });
            collected.push(...filtered);
            if (limit != null && collected.length >= limit) {
                return collected.slice(0, limit);
            }
        }
        return collected;
    }
}
