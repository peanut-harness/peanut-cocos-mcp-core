import type { IAssetCatalogDocument } from './catalog-types';

/**
 * @description 资产目录重建后端：产出与落盘 schema 一致的完整文档。
 */
export interface IAssetCatalogRebuildSource {
    /**
     * @description 重建项目资产目录文档。
     * @param projectRoot 项目根绝对路径。
     * @returns 目录文档。
     */
    rebuild(projectRoot: string): Promise<IAssetCatalogDocument>;
}
