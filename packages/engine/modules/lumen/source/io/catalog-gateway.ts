import { AssetCatalogRefreshService } from '@peanut/pod-engine/assets';
import type { IAssetCatalogEntry } from '@peanut/pod-engine/assets';

import type { ILumenResolveQuery } from '../types';

/**
 * @description lumen 对 asset-catalog 的薄封装，负责 refresh 与句柄解析。
 */
export class LumenCatalogGateway {
    /** @description catalog 刷新/查询服务。 */
    private readonly _refreshService: AssetCatalogRefreshService;

    /**
     * @description 创建网关。
     * @param refreshService 可选注入的 catalog 服务
     */
    public constructor(refreshService: AssetCatalogRefreshService = new AssetCatalogRefreshService()) {
        this._refreshService = refreshService;
    }

    /**
     * @description 刷新项目资产目录索引。
     * @param projectRoot 项目根
     * @param cwd 工作目录
     * @returns 摘要 JSON
     */
    public refreshCatalog(projectRoot: string, cwd: string = process.cwd()): {
        readonly generatedAt: string;
        readonly counts: Readonly<Record<string, number>>;
    } {
        const result = this._refreshService.refresh(projectRoot, undefined, cwd);
        return {
            generatedAt: result.summary.generatedAt,
            counts: result.summary.counts,
        };
    }

    /**
     * @description 按条件解析资源句柄；未命中时抛错，迫使调用方先完成编辑器 Import。
     * @param projectRoot 项目根
     * @param query 查询
     * @param cwd 工作目录
     * @returns 命中条目列表
     */
    public resolve(
        projectRoot: string,
        query: ILumenResolveQuery,
        cwd: string = process.cwd(),
    ): readonly IAssetCatalogEntry[] {
        const hits = this._refreshService.query(projectRoot, undefined, cwd, {
            uuid: query.uuid,
            type: query.type,
            pathContains: query.pathContains,
            nameContains: query.nameContains,
            limit: query.limit ?? 20,
        });
        return hits;
    }

    /**
     * @description 解析唯一句柄；0 或多条均视为错误。
     * @param projectRoot 项目根
     * @param query 查询
     * @param cwd 工作目录
     * @returns 唯一条目
     */
    public resolveOne(
        projectRoot: string,
        query: ILumenResolveQuery,
        cwd: string = process.cwd(),
    ): IAssetCatalogEntry {
        const hits = this.resolve(projectRoot, { ...query, limit: query.limit ?? 5 }, cwd);
        if (hits.length === 0) {
            throw new Error(
                `lumen_catalog_miss:${JSON.stringify(query)}:run_editor_import_then_catalog_refresh`,
            );
        }
        if (hits.length > 1) {
            throw new Error(`lumen_catalog_ambiguous:${JSON.stringify(query)}:count=${hits.length}`);
        }
        const hit = hits[0];
        if (hit == null) {
            throw new Error('lumen_catalog_miss');
        }
        return hit;
    }
}
