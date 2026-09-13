import { basename } from 'path';

import { AssetCatalogBuilder } from './asset-catalog-builder';
import type { IAssetDbQueryClient, IEditorAssetInfoSnapshot } from './asset-db-query-client';
import type { IAssetCatalogRebuildSource } from './asset-catalog-rebuild-source';
import { AssetCatalogTypeClassifier } from './asset-catalog-type-classifier';
import type { IAssetCatalogDocument, IAssetCatalogEntry } from './catalog-types';
import { CocosUuidCodec } from './cocos-uuid-codec';

/**
 * @description 通过 AssetDB 消息（query-assets）重建目录；须在 Creator Import 之后调用。
 */
export class EditorAssetDbRebuildSource implements IAssetCatalogRebuildSource {
    /** @description AssetDB 查询客户端。 */
    private readonly _assetDb: IAssetDbQueryClient;
    /** @description 文档组装器。 */
    private readonly _builder: AssetCatalogBuilder;
    /** @description 类型分类器。 */
    private readonly _classifier: AssetCatalogTypeClassifier;
    /** @description UUID 压缩。 */
    private readonly _uuidCodec: CocosUuidCodec;

    /**
     * @description 创建 AssetDB 重建源。
     * @param assetDb 查询客户端。
     * @param builder 可选构建器。
     * @param classifier 可选分类器。
     * @param uuidCodec 可选编解码器。
     */
    public constructor(
        assetDb: IAssetDbQueryClient,
        builder: AssetCatalogBuilder = new AssetCatalogBuilder(),
        classifier: AssetCatalogTypeClassifier = new AssetCatalogTypeClassifier(),
        uuidCodec: CocosUuidCodec = new CocosUuidCodec(),
    ) {
        this._assetDb = assetDb;
        this._builder = builder;
        this._classifier = classifier;
        this._uuidCodec = uuidCodec;
    }

    /**
     * @description 拉取 AssetDB 资源并组装目录文档。
     * @param projectRoot 项目根。
     * @returns 目录文档。
     */
    public async rebuild(projectRoot: string): Promise<IAssetCatalogDocument> {
        const assets = await this._assetDb.queryAssets({ pattern: 'db://assets/**/*' });
        const bundlePaths = this._collectBundlePaths(assets);
        const entries: IAssetCatalogEntry[] = [];
        for (const asset of assets) {
            entries.push(...this._entriesFromAsset(asset, bundlePaths));
        }
        return this._builder.assembleFromEntries(projectRoot, 'assets', entries);
    }

    /**
     * @description 收集 Bundle 目录路径。
     * @param assets 资源列表。
     * @returns Bundle 相对路径集合。
     */
    private _collectBundlePaths(assets: readonly IEditorAssetInfoSnapshot[]): ReadonlySet<string> {
        const bundles = new Set<string>();
        for (const asset of assets) {
            if (asset.isDirectory === true && asset.isBundle === true) {
                const path = this._toAssetRelativePath(asset.url);
                if (path.length > 0) {
                    bundles.add(path);
                }
            }
        }
        return bundles;
    }

    /**
     * @description 将单个 AssetInfo 展开为目录条目（含 subAssets）。
     * @param asset 资源快照。
     * @param bundlePaths Bundle 集合。
     * @returns 条目。
     */
    private _entriesFromAsset(
        asset: IEditorAssetInfoSnapshot,
        bundlePaths: ReadonlySet<string>,
    ): readonly IAssetCatalogEntry[] {
        const assetPath = this._toAssetRelativePath(asset.url);
        if (assetPath.length === 0) {
            return [];
        }
        const bundle = this._resolveBundle(assetPath, bundlePaths);
        const name = basename(assetPath) || asset.name;
        const primaryType = this._classifier.classify(asset.importer);
        const entries: IAssetCatalogEntry[] = [
            {
                type: primaryType,
                path: assetPath,
                uuid: asset.uuid,
                compressedUuid: this._uuidCodec.compress(asset.uuid),
                importer: asset.importer,
                name,
                bundle,
                parentUuid: '',
                displayName: '',
            },
        ];
        for (const [subKey, sub] of Object.entries(asset.subAssets ?? {})) {
            entries.push({
                type: this._classifier.classify(asset.importer, sub.importer),
                path: assetPath,
                uuid: sub.uuid,
                compressedUuid: this._uuidCodec.compress(sub.uuid),
                importer: sub.importer,
                name,
                bundle,
                parentUuid: asset.uuid,
                displayName: sub.name || subKey,
            });
        }
        return entries;
    }

    /**
     * @description 将 db URL 或绝对/相对路径转为 `assets/...`。
     * @param urlOrPath 原始路径。
     * @returns 项目相对资产路径。
     */
    private _toAssetRelativePath(urlOrPath: string): string {
        const normalized = urlOrPath.trim().replace(/\\/g, '/');
        if (normalized.startsWith('db://')) {
            return normalized.slice('db://'.length);
        }
        const assetsIndex = normalized.indexOf('/assets/');
        if (assetsIndex >= 0) {
            return normalized.slice(assetsIndex + 1);
        }
        if (normalized.startsWith('assets/')) {
            return normalized;
        }
        return '';
    }

    /**
     * @description 解析所属 Bundle。
     * @param assetPath 资源路径。
     * @param bundlePaths Bundle 集合。
     * @returns Bundle 路径或空串。
     */
    private _resolveBundle(assetPath: string, bundlePaths: ReadonlySet<string>): string {
        let best = '';
        for (const bundlePath of bundlePaths) {
            if (assetPath === bundlePath || assetPath.startsWith(`${bundlePath}/`)) {
                if (bundlePath.length > best.length) {
                    best = bundlePath;
                }
            }
        }
        return best;
    }
}
