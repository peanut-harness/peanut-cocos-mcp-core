import type { IAssetCatalogDocument, IAssetCatalogEntry, IAssetCatalogUuidConflict } from './catalog-types';
import { AssetCatalogBuckets } from './asset-catalog-buckets';
import { AssetCatalogTypeClassifier } from './asset-catalog-type-classifier';
import { AssetCatalogScanner, type IScannedAssetMeta } from './asset-catalog-scanner';
import { CocosUuidCodec } from './cocos-uuid-codec';

/**
 * @description 从扫描结果构建可检索资产目录文档。
 */
export class AssetCatalogBuilder {
    /** @description 文件系统扫描器。 */
    private readonly _scanner: AssetCatalogScanner;
    /** @description 类型分桶分类器。 */
    private readonly _classifier: AssetCatalogTypeClassifier;
    /** @description UUID 压缩编解码器。 */
    private readonly _uuidCodec: CocosUuidCodec;

    /**
     * @description 创建目录构建器。
     * @param scanner 扫描器。
     * @param classifier 类型分类器。
     * @param uuidCodec UUID 编解码器。
     */
    public constructor(
        scanner: AssetCatalogScanner = new AssetCatalogScanner(),
        classifier: AssetCatalogTypeClassifier = new AssetCatalogTypeClassifier(),
        uuidCodec: CocosUuidCodec = new CocosUuidCodec(),
    ) {
        this._scanner = scanner;
        this._classifier = classifier;
        this._uuidCodec = uuidCodec;
    }

    /**
     * @description 扫描项目并生成完整目录文档。
     * @param projectRoot 项目根绝对路径。
     * @param assetRootName 资产根目录名。
     * @returns 资产目录文档。
     */
    public build(projectRoot: string, assetRootName = 'assets'): IAssetCatalogDocument {
        const scanned = this._scanner.scan(projectRoot, assetRootName);
        const bundlePaths = this._collectBundlePaths(scanned);
        const entries: IAssetCatalogEntry[] = [];
        for (const item of scanned) {
            entries.push(...this._entriesFromScan(item, bundlePaths));
        }
        return this.assembleFromEntries(projectRoot, assetRootName, entries);
    }

    /**
     * @description 将已规范化条目组装为目录文档（供 meta 扫描与 AssetDB 消息重建共用）。
     * @param projectRoot 项目根绝对路径。
     * @param assetRootName 资产根目录名。
     * @param entries 扁平条目。
     * @returns 资产目录文档。
     */
    public assembleFromEntries(
        projectRoot: string,
        assetRootName: string,
        entries: readonly IAssetCatalogEntry[],
    ): IAssetCatalogDocument {
        return this._assemble(projectRoot, assetRootName, entries);
    }

    /**
     * @description 收集标记为 Asset Bundle 的目录路径。
     * @param scanned 扫描结果。
     * @returns Bundle 目录相对路径集合。
     */
    private _collectBundlePaths(scanned: readonly IScannedAssetMeta[]): ReadonlySet<string> {
        const bundles = new Set<string>();
        for (const item of scanned) {
            if (item.meta.importer === 'directory' && item.meta.isBundle) {
                bundles.add(item.assetPath);
            }
        }
        return bundles;
    }

    /**
     * @description 将单份 meta 展开为主资源与子资源条目。
     * @param item 扫描项。
     * @param bundlePaths Bundle 路径集合。
     * @returns 条目列表。
     */
    private _entriesFromScan(item: IScannedAssetMeta, bundlePaths: ReadonlySet<string>): readonly IAssetCatalogEntry[] {
        const bundle = this._resolveBundle(item.assetPath, bundlePaths);
        const name = AssetCatalogScanner.fileNameOf(item.assetPath);
        const primaryType = this._classifier.classify(item.meta.importer);
        const entries: IAssetCatalogEntry[] = [
            {
                type: primaryType,
                path: item.assetPath,
                uuid: item.meta.uuid,
                compressedUuid: this._uuidCodec.compress(item.meta.uuid),
                importer: item.meta.importer,
                name,
                bundle,
                parentUuid: '',
                displayName: '',
            },
        ];
        for (const sub of item.meta.subMetas) {
            entries.push({
                type: this._classifier.classify(item.meta.importer, sub.importer),
                path: item.assetPath,
                uuid: sub.uuid,
                compressedUuid: this._uuidCodec.compress(sub.uuid),
                importer: sub.importer,
                name,
                bundle,
                parentUuid: item.meta.uuid,
                displayName: sub.displayName || sub.name,
            });
        }
        return entries;
    }

    /**
     * @description 解析资源所属 Bundle（最长路径前缀）。
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

    /**
     * @description 将扁平条目组装为目录文档。
     * @param projectRoot 项目根。
     * @param assetRootName 资产根名。
     * @param entries 全部条目。
     * @returns 目录文档。
     */
    private _assemble(projectRoot: string, assetRootName: string, entries: readonly IAssetCatalogEntry[]): IAssetCatalogDocument {
        const byType = AssetCatalogBuckets.emptyByType();
        const uuidMap: Record<string, IAssetCatalogEntry> = {};
        const counts = AssetCatalogBuckets.emptyCounts();
        const conflicts: IAssetCatalogUuidConflict[] = [];
        for (const entry of entries) {
            byType[entry.type].push(entry);
            counts[entry.type] += 1;
            const existing = uuidMap[entry.uuid];
            if (existing != null) {
                conflicts.push({
                    uuid: entry.uuid,
                    keptPath: existing.path,
                    duplicatePath: entry.path,
                });
                continue;
            }
            uuidMap[entry.uuid] = entry;
        }
        for (const bucket of AssetCatalogBuckets.all) {
            byType[bucket].sort((left, right) => left.path.localeCompare(right.path) || left.uuid.localeCompare(right.uuid));
        }
        return {
            schemaVersion: 1,
            generatedAt: new Date().toISOString(),
            projectRoot,
            assetRoot: assetRootName,
            counts,
            byType,
            uuidMap,
            conflicts,
        };
    }
}
