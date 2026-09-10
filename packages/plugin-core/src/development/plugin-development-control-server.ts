import { createServer, type Server } from 'http';
import { randomBytes } from 'crypto';
import { existsSync, lstatSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

import { toHex } from '../shared/random-hex.js';

const MAX_REQUEST_BODY_LENGTH = 64 * 1024;

export interface IPluginDevelopmentControlServerOptions {
    readonly token?: string;
    readonly port?: number;
    readonly projectPath?: string;
}

export interface IPluginDevelopmentControl {
    status(pluginId?: string): unknown;
    reconcile(): Promise<void>;
    reload(pluginId: string): Promise<void>;
    install(packagePath: string): Promise<unknown>;
    trace(): Promise<unknown>;
    setControlServerPort(port: number | null): void;
    recordOperation(action: string, target: string | null, durationMs: number, ok: boolean, errorMessage?: string | null): void;
}

export class PluginDevelopmentControlServer {
    private readonly _controllerProvider: () => IPluginDevelopmentControl;
    private readonly _options: IPluginDevelopmentControlServerOptions;
    private readonly _token: string;
    private readonly _descriptorPath: string | null;
    private _server: Server | null = null;

    public constructor(controllerProvider: () => IPluginDevelopmentControl, options: IPluginDevelopmentControlServerOptions) {
        if (options.token != null && options.token.trim().length === 0) {
            throw new Error('plugin_development_control_token_invalid');
        }
        if (options.projectPath == null && options.token == null) {
            throw new Error('plugin_development_control_connection_unavailable');
        }
        if (options.port != null && (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535)) {
            throw new Error('plugin_development_control_port_invalid');
        }
        this._controllerProvider = controllerProvider;
        this._options = options;
        this._token = options.token ?? toHex(randomBytes(32));
        this._descriptorPath = options.projectPath == null ? null : join(resolve(options.projectPath), '.peanut-ai', 'cocos-development-control.json');
    }

    public async start(): Promise<void> {
        if (this._server != null) {
            return;
        }
        const server = createServer(async (request, response) => {
            if (request.method !== 'POST' || request.url !== '/development-control' || request.headers['x-peanut-dev-token'] !== this._token) {
                response.writeHead(403).end();
                return;
            }
            try {
                let body = '';
                for await (const chunk of request) {
                    body += String(chunk);
                    if (body.length > MAX_REQUEST_BODY_LENGTH) {
                        throw new Error('plugin_development_control_request_too_large');
                    }
                }
                const payload = JSON.parse(body) as { action?: string; pluginId?: string; packagePath?: string };
                const controller = this._controllerProvider();
                const startedAt = Date.now();
                let result: unknown;
                try {
                    result = await this._executeAction(controller, payload);
                    controller.recordOperation(this._getActionLabel(payload), this._getOperationTarget(payload), Date.now() - startedAt, true);
                } catch (error) {
                    controller.recordOperation(
                        this._getActionLabel(payload),
                        this._getOperationTarget(payload),
                        Date.now() - startedAt,
                        false,
                        error instanceof Error ? error.message : 'development_control_failed',
                    );
                    throw error;
                }
                response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, result }));
            } catch (error) {
                response.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'development_control_failed' }));
            }
        });
        this._server = server;
        try {
            await new Promise<void>((resolve, reject) => server.once('error', reject).listen(this._options.port ?? 0, '127.0.0.1', resolve));
            this._writeDescriptor();
            this._controllerProvider().setControlServerPort(this.getPort());
        } catch (error) {
            this._server = null;
            server.close(() => undefined);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        this._controllerProvider().setControlServerPort(null);
        const server = this._server;
        this._server = null;
        if (server != null) {
            await new Promise<void>((resolve, reject) => server.close((error) => error == null ? resolve() : reject(error)));
        }
        this._removeDescriptor();
    }

    public getPort(): number | null {
        const address = this._server?.address();
        return address != null && typeof address !== 'string' ? address.port : null;
    }

    private async _executeAction(
        controller: IPluginDevelopmentControl,
        payload: { action?: string; pluginId?: string; packagePath?: string },
    ): Promise<unknown> {
        switch (payload.action) {
            case 'status':
                return controller.status(payload.pluginId);
            case 'reconcile':
                await controller.reconcile();
                return { accepted: true };
            case 'reload':
                if (typeof payload.pluginId !== 'string' || payload.pluginId.trim().length === 0) {
                    throw new Error('plugin_development_control_plugin_id_invalid');
                }
                await controller.reload(payload.pluginId);
                return { accepted: true };
            case 'install':
                if (typeof payload.packagePath !== 'string' || payload.packagePath.trim().length === 0) {
                    throw new Error('plugin_development_control_package_path_invalid');
                }
                return controller.install(payload.packagePath);
            case 'trace':
                return controller.trace();
            default:
                throw new Error('plugin_development_control_action_invalid');
        }
    }

    private _writeDescriptor(): void {
        if (this._descriptorPath == null) {
            return;
        }
        const projectPath = resolve(this._options.projectPath!);
        if (!existsSync(projectPath) || !lstatSync(projectPath).isDirectory() || lstatSync(projectPath).isSymbolicLink()) {
            throw new Error('plugin_development_control_project_path_invalid');
        }
        const stateDirectory = join(projectPath, '.peanut-ai');
        if (existsSync(stateDirectory) && (!lstatSync(stateDirectory).isDirectory() || lstatSync(stateDirectory).isSymbolicLink())) {
            throw new Error('plugin_development_control_state_directory_invalid');
        }
        mkdirSync(stateDirectory, { recursive: true });
        if (existsSync(this._descriptorPath) && (!lstatSync(this._descriptorPath).isFile() || lstatSync(this._descriptorPath).isSymbolicLink())) {
            throw new Error('plugin_development_control_descriptor_invalid');
        }
        writeFileSync(this._descriptorPath, JSON.stringify({
            schemaVersion: 1,
            endpoint: 'http://127.0.0.1',
            port: this.getPort(),
            token: this._token,
        }, null, 2), 'utf8');
    }

    private _removeDescriptor(): void {
        if (this._descriptorPath == null || !existsSync(this._descriptorPath)) {
            return;
        }
        if (lstatSync(this._descriptorPath).isFile() && !lstatSync(this._descriptorPath).isSymbolicLink()) {
            rmSync(this._descriptorPath);
        }
    }

    private _getActionLabel(payload: { action?: string }): string {
        return typeof payload.action === 'string' && payload.action.length > 0 ? payload.action : 'unknown';
    }

    private _getOperationTarget(payload: { pluginId?: string; packagePath?: string }): string | null {
        if (typeof payload.pluginId === 'string' && payload.pluginId.length > 0) {
            return payload.pluginId;
        }
        return payload.packagePath == null ? null : 'package';
    }
}
