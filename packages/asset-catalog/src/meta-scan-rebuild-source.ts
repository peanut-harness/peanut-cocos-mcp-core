import { AssetCatalogBuilder } from './asset-catalog-builder';
import type { IAssetCatalogDocument } from './catalog-types';
import type { IAssetCatalogRebuildSource } from './asset-catalog-rebuild-source';

/**
 * @description 通过扫描 assets 目录下全部 meta 文件重建目录（离线完整源）。
 */
export class MetaScanRebuildSource implements IAssetCatalogRebuildSource {
    /** @description 目录构建器。 */
    private readonly _builder: AssetCatalogBuilder;

    /**
     * @description 创建 meta 扫描重建源。
     * @param builder 可选构建器。
     */
    public constructor(builder: AssetCatalogBuilder = new AssetCatalogBuilder()) {
        this._builder = builder;
    }

    /**
     * @description 扫描 meta 并组装目录文档。
     * @param projectRoot 项目根。
     * @returns 目录文档。
     */
    public async rebuild(projectRoot: string): Promise<IAssetCatalogDocument> {
        return this._builder.build(projectRoot);
    }
}
