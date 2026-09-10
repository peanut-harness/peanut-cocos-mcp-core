import type { IExecutionDiagnosticsSnapshot } from "peanut-runtime";

import { PluginManagerApp } from "../app/plugin-manager-app.js";

const MAX_RECENT_DEVELOPMENT_OPERATIONS = 20;

export interface IPluginDevelopmentOperationSnapshot {
  readonly action: string;
  readonly target: string | null;
  readonly completedAt: string;
  readonly durationMs: number;
  readonly ok: boolean;
  readonly errorMessage: string | null;
}

export interface IPluginDevelopmentSessionSnapshot {
  readonly enabled: boolean;
  readonly port: number | null;
  readonly recentOperations: readonly IPluginDevelopmentOperationSnapshot[];
}

interface IPluginDevelopmentSessionState {
  enabled: boolean;
  port: number | null;
  recentOperations: IPluginDevelopmentOperationSnapshot[];
}

const developmentSessions = new WeakMap<
  PluginManagerApp,
  IPluginDevelopmentSessionState
>();

export class PluginDevelopmentController {
  private readonly _pluginManagerApp: PluginManagerApp;

  public constructor(pluginManagerApp: PluginManagerApp) {
    this._pluginManagerApp = pluginManagerApp;
  }

  public status(pluginId?: string) {
    const runtimeRecords = this._pluginManagerApp.listRuntimeRecords();
    return pluginId == null
      ? runtimeRecords
      : runtimeRecords.filter((record) => record.pluginId === pluginId);
  }

  public getSessionSnapshot(): IPluginDevelopmentSessionSnapshot {
    const session = this._getSession();
    return {
      enabled: session.enabled,
      port: session.port,
      recentOperations: [...session.recentOperations],
    };
  }

  public setControlServerPort(port: number | null): void {
    const session = this._getSession();
    session.enabled = port != null;
    session.port = port;
  }

  public recordOperation(
    action: string,
    target: string | null,
    durationMs: number,
    ok: boolean,
    errorMessage: string | null = null,
  ): void {
    const session = this._getSession();
    session.recentOperations.unshift({
      action,
      target,
      completedAt: new Date().toISOString(),
      durationMs,
      ok,
      errorMessage,
    });
    session.recentOperations.splice(MAX_RECENT_DEVELOPMENT_OPERATIONS);
  }

  public async reconcile(): Promise<void> {
    // 先按磁盘 installed.json 修复内存仓，避免离线装包后 activeVersion 与 runtime 漂移。
    await this._pluginManagerApp.repairPackages();
    await this._pluginManagerApp.activateInstalledPackages();
  }

  public async reload(pluginId: string): Promise<void> {
    const runtimeRecord = this._pluginManagerApp
      .listRuntimeRecords()
      .find((record) => record.pluginId === pluginId);
    if (runtimeRecord == null) {
      throw new Error(`开发刷新目标插件不存在: ${pluginId}`);
    }
    // 先按磁盘仓校正，再 deactivate→activate，迫使 NodePluginPackageModuleResolver 清 require.cache 并重读 bundle。
    await this._pluginManagerApp.repairPackages();
    await this._pluginManagerApp.deactivatePlugin(pluginId, "host_reload");
    await this._pluginManagerApp.activatePlugin(pluginId);
  }

  public async install(packagePath: string) {
    const inspection = await this._pluginManagerApp.inspectPackage(packagePath);
    if (inspection.manifest == null) {
      throw new Error(`开发安装包无效: ${packagePath}`);
    }
    const runtimeRecord = this._pluginManagerApp
      .listRuntimeRecords()
      .find((record) => record.pluginId === inspection.manifest!.id);
    if (runtimeRecord?.state === "active") {
      return this._pluginManagerApp.upgradeAndActivatePackage(packagePath);
    }
    return this._pluginManagerApp.installAndActivatePackage(packagePath);
  }

  public async trace(): Promise<IExecutionDiagnosticsSnapshot> {
    return this._pluginManagerApp.inspectExecutionDiagnostics();
  }

  private _getSession(): IPluginDevelopmentSessionState {
    const existingSession = developmentSessions.get(this._pluginManagerApp);
    if (existingSession != null) {
      return existingSession;
    }
    const session: IPluginDevelopmentSessionState = {
      enabled: false,
      port: null,
      recentOperations: [],
    };
    developmentSessions.set(this._pluginManagerApp, session);
    return session;
  }
}
