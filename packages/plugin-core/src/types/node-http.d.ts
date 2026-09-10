declare module 'http' {
    /** @description 本地开发控制服务使用的最小 HTTP 请求契约。 */
    export interface IncomingMessage extends AsyncIterable<unknown> {
        readonly method?: string;
        readonly url?: string;
        readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
        readonly statusCode?: number;
        on(event: 'data', listener: (chunk: Uint8Array) => void): IncomingMessage;
        once(event: 'error', listener: () => void): IncomingMessage;
        once(event: 'end', listener: () => void): IncomingMessage;
        once(event: 'aborted', listener: () => void): IncomingMessage;
    }

    /** @description Node HTTP 客户端请求参数的最小声明。 */
    export interface RequestOptions {
        readonly method?: string;
        readonly headers?: Readonly<Record<string, string>>;
    }

    /** @description Node HTTP 客户端请求句柄。 */
    export interface ClientRequest {
        once(event: 'error', listener: () => void): ClientRequest;
        end(): void;
    }

    /** @description 本地开发控制服务使用的最小 HTTP 响应契约。 */
    export interface ServerResponse {
        readonly destroyed: boolean;
        writeHead(statusCode: number, headers?: Readonly<Record<string, string>>): ServerResponse;
        write(data: string): boolean;
        end(data?: string): void;
        once(event: 'close', listener: () => void): ServerResponse;
    }

    /** @description 本地开发控制服务使用的最小 Node HTTP 服务契约。 */
    export interface Server {
        once(event: 'error', listener: (error: Error) => void): Server;
        listen(port: number, hostname: string, listener: () => void): Server;
        close(listener: (error?: Error) => void): void;
        address(): { readonly port: number } | string | null;
    }

    /** @description 创建本地 HTTP 服务。 */
    export function createServer(listener: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>): Server;
    /** @description 发起 Node HTTP 客户端请求。 */
    export function request(url: string | URL, options: RequestOptions, listener: (response: IncomingMessage) => void): ClientRequest;
}

declare module 'https' {
    export { request } from 'http';
}
