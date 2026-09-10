import type { AssetCatalogBucket, IAssetCatalogDocument, IAssetCatalogEntry, IAssetCatalogQuery } from './catalog-types';
import { AssetCatalogBuckets } from './asset-catalog-buckets';

/**
 * @description 对已生成目录做确定性检索（不依赖 AI）。
 */
export class AssetCatalogQueryService {
    /**
     * @description 按条件查询条目。
     * @param document 目录文档。
     * @param query 查询条件。
     * @returns 命中条目列表。
     */
    public query(document: IAssetCatalogDocument, query: IAssetCatalogQuery): readonly IAssetCatalogEntry[] {
        if (query.uuid != null && query.uuid.trim().length > 0) {
            const hit = document.uuidMap[query.uuid.trim()];
            return hit == null ? [] : [hit];
        }
        const type = query.type;
        if (type != null && !AssetCatalogBuckets.isBucket(type)) {
            throw new Error(`unknown_catalog_type:${type}`);
        }
        const source = type == null
            ? Object.values(document.byType).flat()
            : document.byType[type];
        return this.filterEntries(source, query);
    }

    /**
     * @description 对已加载的条目列表做路径/名称过滤。
     * @param entries 候选条目。
     * @param query 查询条件。
     * @returns 过滤后的条目。
     */
    public filterEntries(entries: readonly IAssetCatalogEntry[], query: IAssetCatalogQuery): readonly IAssetCatalogEntry[] {
        const pathNeedle = query.pathContains?.trim().toLowerCase() ?? '';
        const nameNeedle = query.nameContains?.trim().toLowerCase() ?? '';
        const filtered = entries.filter((entry) => {
            if (pathNeedle.length > 0 && !entry.path.toLowerCase().includes(pathNeedle)) {
                return false;
            }
            if (nameNeedle.length > 0 && !entry.name.toLowerCase().includes(nameNeedle)) {
                return false;
            }
            return true;
        });
        const limit = query.limit;
        if (limit == null) {
            return filtered;
        }
        if (!Number.isInteger(limit) || limit < 1) {
            throw new Error(`invalid_query_limit:${String(limit)}`);
        }
        return filtered.slice(0, limit);
    }

    /**
     * @description 解析类型字符串为分桶。
     * @param raw 原始类型字符串。
     * @returns 分桶。
     */
    public parseType(raw: string): AssetCatalogBucket {
        if (!AssetCatalogBuckets.isBucket(raw)) {
            throw new Error(`unknown_catalog_type:${raw}`);
        }
        return raw;
    }
}
