import { readdirSync, readFileSync, statSync } from 'fs';
import { basename, dirname, join, relative, sep } from 'path';

import { AssetMetaParser, type IParsedAssetMeta } from './asset-meta-parser';

/**
 * @description 扫描得到的单份 meta 与路径上下文。
 */
export interface IScannedAssetMeta {
    /** @description 相对项目根的资源路径（去掉 `.meta`）。 */
    readonly assetPath: string;
    /** @description 相对项目根的 meta 路径。 */
    readonly metaPath: string;
    /** @description 解析后的 meta 文档。 */
    readonly meta: IParsedAssetMeta;
}

/**
 * @description 在 Creator 项目 `assets/` 下递归扫描全部 `.meta`。
 */
export class AssetCatalogScanner {
    /** @description meta JSON 解析器。 */
    private readonly _parser: AssetMetaParser;

    /**
     * @description 创建扫描器。
     * @param parser meta 解析器；未传时使用默认实例。
     */
    public constructor(parser: AssetMetaParser = new AssetMetaParser()) {
        this._parser = parser;
    }

    /**
     * @description 扫描项目资产根并返回全部 meta。
     * @param projectRoot 项目根绝对路径。
     * @param assetRootName 资产根目录名，默认 `assets`。
     * @returns 扫描结果列表。
     */
    public scan(projectRoot: string, assetRootName = 'assets'): readonly IScannedAssetMeta[] {
        const assetRoot = join(projectRoot, assetRootName);
        const rootStat = statSync(assetRoot);
        if (!rootStat.isDirectory()) {
            throw new Error(`asset_root_not_directory:${assetRoot}`);
        }
        const results: IScannedAssetMeta[] = [];
        this._walk(projectRoot, assetRoot, results);
        results.sort((left, right) => left.assetPath.localeCompare(right.assetPath));
        return results;
    }

    /**
     * @description 递归遍历目录并收集 `.meta`。
     * @param projectRoot 项目根。
     * @param currentDirectory 当前目录。
     * @param results 输出收集器。
     */
    private _walk(projectRoot: string, currentDirectory: string, results: IScannedAssetMeta[]): void {
        const entries = readdirSync(currentDirectory, { withFileTypes: true });
        for (const entry of entries) {
            const absolutePath = join(currentDirectory, entry.name);
            if (entry.isDirectory()) {
                if (entry.name === '.git' || entry.name === 'node_modules') {
                    continue;
                }
                this._walk(projectRoot, absolutePath, results);
                continue;
            }
            if (!entry.isFile() || !entry.name.endsWith('.meta')) {
                continue;
            }
            const metaPath = this._toPosixRelative(projectRoot, absolutePath);
            const assetPath = metaPath.slice(0, -'.meta'.length);
            const rawText = readFileSync(absolutePath, 'utf8');
            const meta = this._parser.parse(rawText, metaPath);
            results.push({
                assetPath,
                metaPath,
                meta,
            });
        }
    }

    /**
     * @description 将绝对路径转为 POSIX 风格的项目相对路径。
     * @param projectRoot 项目根。
     * @param absolutePath 绝对路径。
     * @returns 相对路径。
     */
    private _toPosixRelative(projectRoot: string, absolutePath: string): string {
        return relative(projectRoot, absolutePath).split(sep).join('/');
    }

    /**
     * @description 从资源路径提取文件名。
     * @param assetPath 资源相对路径。
     * @returns 文件名。
     */
    public static fileNameOf(assetPath: string): string {
        return basename(assetPath);
    }

    /**
     * @description 从资源路径提取父目录路径。
     * @param assetPath 资源相对路径。
     * @returns 父目录相对路径。
     */
    public static directoryOf(assetPath: string): string {
        const parent = dirname(assetPath);
        return parent === '.' ? '' : parent;
    }
}
