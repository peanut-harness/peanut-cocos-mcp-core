import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'http';
import { URL } from 'url';

import type { IAssetCatalogEntry } from './catalog-types';
import { AssetCatalogPathResolver } from './asset-catalog-path-resolver';
import { AssetCatalogQueryGateway } from './asset-catalog-query-gateway';
import { AssetCatalogQueryService } from './asset-catalog-query-service';
import { AssetCatalogStore } from './asset-catalog-store';

/**
 * @description 本地 HTTP 查询服务，供 AI/工具按接口拉小结果集。
 */
export class AssetCatalogHttpServer {
    /** @description 路径解析。 */
    private readonly _paths: AssetCatalogPathResolver;
    /** @description 分片存储。 */
    private readonly _store: AssetCatalogStore;
    /** @description 查询网关。 */
    private readonly _gateway: AssetCatalogQueryGateway;
    /** @description 类型解析。 */
    private readonly _queryService: AssetCatalogQueryService;
    /** @description 当前 HTTP 服务器。 */
    private _server: Server | null = null;

    /**
     * @description 创建 HTTP 服务。
     * @param paths 路径解析器。
     * @param store 分片存储。
     * @param gateway 查询网关。
     * @param queryService 查询服务。
     */
    public constructor(
        paths: AssetCatalogPathResolver = new AssetCatalogPathResolver(),
        store: AssetCatalogStore = new AssetCatalogStore(),
        gateway: AssetCatalogQueryGateway = new AssetCatalogQueryGateway(),
        queryService: AssetCatalogQueryService = new AssetCatalogQueryService(),
    ) {
        this._paths = paths;
        this._store = store;
        this._gateway = gateway;
        this._queryService = queryService;
    }

    /**
     * @description 启动本地查询服务。
     * @param projectPath 项目路径。
     * @param outputPath 可选目录输出路径。
     * @param cwd 工作目录。
     * @param port 监听端口。
     * @returns 实际监听地址。
     */
    public async listen(
        projectPath: string,
        outputPath: string | undefined,
        cwd: string,
        port: number,
    ): Promise<{ readonly host: string; readonly port: number; readonly outputDirectory: string }> {
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new Error(`invalid_port:${String(port)}`);
        }
        const projectRoot = this._paths.resolveProjectRoot(projectPath, cwd);
        const outputDirectory = this._paths.resolveOutputDirectory(projectRoot, outputPath, cwd);
        // 确认摘要存在，避免空服务。
        this._store.readSummary(outputDirectory);

        const server = createServer((request, response) => {
            void this._handle(request, response, outputDirectory);
        });
        this._server = server;

        await new Promise<void>((resolve, reject) => {
            server.once('error', reject);
            server.listen(port, '127.0.0.1', () => resolve());
        });

        return {
            host: '127.0.0.1',
            port,
            outputDirectory,
        };
    }

    /**
     * @description 关闭服务。
     * @returns 关闭完成。
     */
    public async close(): Promise<void> {
        const server = this._server;
        if (server == null) {
            return;
        }
        this._server = null;
        await new Promise<void>((resolve, reject) => {
            server.close((error) => {
                if (error != null) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }

    /**
     * @description 处理单个 HTTP 请求。
     * @param request 请求。
     * @param response 响应。
     * @param outputDirectory 目录输出路径。
     */
    private async _handle(request: IncomingMessage, response: ServerResponse, outputDirectory: string): Promise<void> {
        try {
            const host = request.headers.host ?? '127.0.0.1';
            const url = new URL(request.url ?? '/', `http://${host}`);
            if (request.method !== 'GET') {
                this._writeJson(response, 405, { error: 'method_not_allowed' });
                return;
            }
            if (url.pathname === '/health') {
                this._writeJson(response, 200, { ok: true });
                return;
            }
            if (url.pathname === '/summary') {
                this._writeJson(response, 200, this._store.readSummary(outputDirectory));
                return;
            }
            if (url.pathname === '/query') {
                const limitRaw = url.searchParams.get('limit');
                const typeRaw = url.searchParams.get('type') ?? undefined;
                const hits = this._gateway.query(outputDirectory, {
                    uuid: url.searchParams.get('uuid') ?? undefined,
                    type: typeRaw == null || typeRaw.length === 0 ? undefined : this._queryService.parseType(typeRaw),
                    pathContains: url.searchParams.get('path') ?? undefined,
                    nameContains: url.searchParams.get('name') ?? undefined,
                    limit: limitRaw == null ? 20 : Number.parseInt(limitRaw, 10),
                });
                this._writeJson(response, 200, this._toQueryResponse(hits));
                return;
            }
            this._writeJson(response, 404, {
                error: 'not_found',
                endpoints: ['GET /health', 'GET /summary', 'GET /query?uuid=&type=&path=&name=&limit='],
            });
        } catch (error) {
            this._writeJson(response, 400, {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * @description 组装查询响应体。
     * @param hits 命中条目。
     * @returns 响应对象。
     */
    private _toQueryResponse(hits: readonly IAssetCatalogEntry[]): { readonly count: number; readonly hits: readonly IAssetCatalogEntry[] } {
        return {
            count: hits.length,
            hits,
        };
    }

    /**
     * @description 写入 JSON 响应。
     * @param response 响应对象。
     * @param statusCode 状态码。
     * @param body 响应体。
     */
    private _writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
        const payload = `${JSON.stringify(body)}\n`;
        response.writeHead(statusCode, {
            'content-type': 'application/json; charset=utf-8',
            'content-length': Buffer.byteLength(payload),
        });
        response.end(payload);
    }
}
