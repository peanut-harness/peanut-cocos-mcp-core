import { AssetCatalogBuilder } from './asset-catalog-builder';
import { AssetCatalogHttpServer } from './asset-catalog-http-server';
import { AssetCatalogPathResolver } from './asset-catalog-path-resolver';
import { AssetCatalogQueryGateway } from './asset-catalog-query-gateway';
import { AssetCatalogQueryService } from './asset-catalog-query-service';
import type { IAssetCatalogRebuildSource } from './asset-catalog-rebuild-source';
import { AssetCatalogStore } from './asset-catalog-store';
import type { IAssetDbQueryClient } from './asset-db-query-client';
import type { IAssetCatalogDocument, IAssetCatalogEntry } from './catalog-types';
import type { IAssetCatalogSummary } from './asset-catalog-store';
import { EditorAssetDbRebuildSource } from './editor-asset-db-rebuild-source';
import { MetaScanRebuildSource } from './meta-scan-rebuild-source';

/**
 * @description 生成或刷新资产目录的应用服务。
 */
export class AssetCatalogRefreshService {
    /** @description 目录构建器（同步 meta 路径）。 */
    private readonly _builder: AssetCatalogBuilder;
    /** @description 目录存储。 */
    private readonly _store: AssetCatalogStore;
    /** @description 路径解析器。 */
    private readonly _paths: AssetCatalogPathResolver;
    /** @description 分片查询网关。 */
    private readonly _gateway: AssetCatalogQueryGateway;
    /** @description 类型解析。 */
    private readonly _queryService: AssetCatalogQueryService;
    /** @description 默认离线重建源。 */
    private readonly _metaRebuildSource: IAssetCatalogRebuildSource;

    /**
     * @description 创建刷新服务。
     * @param builder 构建器。
     * @param store 存储。
     * @param paths 路径解析器。
     * @param gateway 查询网关。
     * @param queryService 查询服务。
     * @param metaRebuildSource 可选 meta 重建源。
     */
    public constructor(
        builder: AssetCatalogBuilder = new AssetCatalogBuilder(),
        store: AssetCatalogStore = new AssetCatalogStore(),
        paths: AssetCatalogPathResolver = new AssetCatalogPathResolver(),
        gateway: AssetCatalogQueryGateway = new AssetCatalogQueryGateway(),
        queryService: AssetCatalogQueryService = new AssetCatalogQueryService(),
        metaRebuildSource: IAssetCatalogRebuildSource = new MetaScanRebuildSource(builder),
    ) {
        this._builder = builder;
        this._store = store;
        this._paths = paths;
        this._gateway = gateway;
        this._queryService = queryService;
        this._metaRebuildSource = metaRebuildSource;
    }

    /**
     * @description 扫描 meta 并写入目录文件（离线完整路径）。
     * @param projectPath 项目路径。
     * @param outputPath 可选输出路径。
     * @param cwd 当前工作目录。
     * @returns 写入结果摘要。
     */
    public refresh(
        projectPath: string,
        outputPath: string | undefined,
        cwd: string,
    ): { readonly catalogPath: string; readonly document: IAssetCatalogDocument; readonly summary: IAssetCatalogSummary } {
        const projectRoot = this._paths.resolveProjectRoot(projectPath, cwd);
        const outputDirectory = this._paths.resolveOutputDirectory(projectRoot, outputPath, cwd);
        const document = this._builder.build(projectRoot);
        const catalogPath = this._store.write(outputDirectory, document);
        const summary = this._store.readSummary(outputDirectory);
        return { catalogPath, document, summary };
    }

    /**
     * @description 优先用 AssetDB 消息重建；未提供 client 时回退 meta 扫描。
     * @param projectPath 项目路径。
     * @param outputPath 可选输出路径。
     * @param cwd 当前工作目录。
     * @param assetDb 可选 AssetDB 查询客户端。
     * @returns 写入结果摘要。
     */
    public async refreshPreferringAssetDb(
        projectPath: string,
        outputPath: string | undefined,
        cwd: string,
        assetDb?: IAssetDbQueryClient,
    ): Promise<{ readonly catalogPath: string; readonly document: IAssetCatalogDocument; readonly summary: IAssetCatalogSummary; readonly source: 'asset-db' | 'meta' }> {
        const projectRoot = this._paths.resolveProjectRoot(projectPath, cwd);
        const outputDirectory = this._paths.resolveOutputDirectory(projectRoot, outputPath, cwd);
        if (assetDb == null) {
            const document = await this._metaRebuildSource.rebuild(projectRoot);
            const catalogPath = this._store.write(outputDirectory, document);
            return { catalogPath, document, summary: this._store.readSummary(outputDirectory), source: 'meta' };
        }
        const document = await new EditorAssetDbRebuildSource(assetDb, this._builder).rebuild(projectRoot);
        const catalogPath = this._store.write(outputDirectory, document);
        return { catalogPath, document, summary: this._store.readSummary(outputDirectory), source: 'asset-db' };
    }

    /**
     * @description 读取摘要（轻量，给 AI 看规模）。
     * @param projectPath 项目路径。
     * @param outputPath 可选输出路径。
     * @param cwd 当前工作目录。
     * @returns 摘要。
     */
    public summary(projectPath: string, outputPath: string | undefined, cwd: string): IAssetCatalogSummary {
        const projectRoot = this._paths.resolveProjectRoot(projectPath, cwd);
        const outputDirectory = this._paths.resolveOutputDirectory(projectRoot, outputPath, cwd);
        return this._store.readSummary(outputDirectory);
    }

    /**
     * @description 按需分片查询。
     * @param projectPath 项目路径。
     * @param outputPath 可选输出路径。
     * @param cwd 当前工作目录。
     * @param query 查询参数。
     * @returns 命中条目。
     */
    public query(
        projectPath: string,
        outputPath: string | undefined,
        cwd: string,
        query: {
            readonly uuid?: string;
            readonly type?: string;
            readonly pathContains?: string;
            readonly nameContains?: string;
            readonly limit?: number;
        },
    ): readonly IAssetCatalogEntry[] {
        const projectRoot = this._paths.resolveProjectRoot(projectPath, cwd);
        const outputDirectory = this._paths.resolveOutputDirectory(projectRoot, outputPath, cwd);
        return this._gateway.query(outputDirectory, {
            uuid: query.uuid,
            type: query.type == null ? undefined : this._queryService.parseType(query.type),
            pathContains: query.pathContains,
            nameContains: query.nameContains,
            limit: query.limit,
        });
    }

    /**
     * @description 启动本地 HTTP 查询接口。
     * @param projectPath 项目路径。
     * @param outputPath 可选输出路径。
     * @param cwd 当前工作目录。
     * @param port 端口。
     * @returns 监听信息与可关闭句柄。
     */
    public async serve(
        projectPath: string,
        outputPath: string | undefined,
        cwd: string,
        port: number,
    ): Promise<{ readonly host: string; readonly port: number; readonly close: () => Promise<void> }> {
        const server = new AssetCatalogHttpServer(this._paths, this._store, this._gateway, this._queryService);
        const listening = await server.listen(projectPath, outputPath, cwd, port);
        return {
            host: listening.host,
            port: listening.port,
            close: async (): Promise<void> => server.close(),
        };
    }
}
