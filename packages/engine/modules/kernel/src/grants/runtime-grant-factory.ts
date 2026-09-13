import type {
  IGrantedPermissionSet,
  IPluginRuntimeMeta,
} from "@peanut/pod-protocol";
import type { ICocosRuntime } from "@peanut/pod-engine/runtime";
import { AssetCatalogFastLookupApi } from "@peanut/pod-engine/assets";

import { PluginLeaseStore } from "../hotplug/plugin-lease-store.js";
import { DesignSourceCapabilityRegistry } from "./design-source-capability-registry.js";
import { NativeCapabilityRegistry } from "./native-capability-registry.js";
import {
  CompatiblePluginNetworkTransport,
  type IPluginNetworkTransport,
} from "./plugin-network-transport.js";
import type {
  IAssetCatalogClient,
  IAssetReadAssetSnapshot,
  IAssetReadClient,
  IAssetDeleteClient,
  IAssetWriteClient,
  ICanvasImage,
  ICanvasService,
  ICanvasSurface,
  ICreatorVersionClient,
  IGrantedRuntimeClientSet,
  IMessageClient,
  IProjectReadClient,
  IPluginNetworkClient,
  IPluginNetworkRequest,
  IPluginNetworkResponse,
  ISceneClient,
  ISelectionClient,
} from "../shared/plugin-manager-contracts.js";

interface IGrantLeaseState {
  /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
  isActive: boolean;
}

/**
 * @description Runtime grant 工厂，负责为插件创建受限的 runtime client 集合并跟踪其生命周期。
 */
export class RuntimeGrantFactory {
  /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
  private readonly _runtime: ICocosRuntime;
  /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
  private readonly _pluginLeaseStore: PluginLeaseStore;
  /** @description 宿主原生 capability 注册表；只负责返回已经签名校验的服务。 */
  private readonly _nativeCapabilityRegistry: NativeCapabilityRegistry;
  /** @description 宿主设计来源 capability 注册表，仅向插件下发无敏感信息的状态快照。 */
  private readonly _designSourceCapabilityRegistry: DesignSourceCapabilityRegistry;
  /** @description 宿主网络传输；屏蔽不同 Creator/Electron 版本的 Fetch 能力差异。 */
  private readonly _networkTransport: IPluginNetworkTransport;
  /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
  private readonly _grants = new Map<string, IGrantedRuntimeClientSet>();

  /**
   * @description 创建一个新的 Runtime grant 工厂。
   * @param runtime Runtime 门面实例
   * @param pluginLeaseStore 插件 lease 存储
   */
  public constructor(
    runtime: ICocosRuntime,
    pluginLeaseStore: PluginLeaseStore,
    nativeCapabilityRegistry = new NativeCapabilityRegistry(),
    designSourceCapabilityRegistry = new DesignSourceCapabilityRegistry(),
    networkTransport: IPluginNetworkTransport = new CompatiblePluginNetworkTransport(),
  ) {
    this._runtime = runtime;
    this._pluginLeaseStore = pluginLeaseStore;
    this._nativeCapabilityRegistry = nativeCapabilityRegistry;
    this._designSourceCapabilityRegistry = designSourceCapabilityRegistry;
    this._networkTransport = networkTransport;
  }

  /**
   * @description 为指定插件创建受限 runtime client 集合。
   * @param pluginRuntimeMeta 插件运行时元信息
   * @param grantedPermissionSet 插件最终授权结果
   * @returns 受限 runtime client 集合
   */
  public create(
    pluginRuntimeMeta: IPluginRuntimeMeta,
    grantedPermissionSet: IGrantedPermissionSet,
  ): IGrantedRuntimeClientSet {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ grantLeaseState: IGrantLeaseState =
        {
          isActive: true,
        };
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ grantedRuntimeClientSet: IGrantedRuntimeClientSet =
        {
          version: this._createVersionClient(
            pluginRuntimeMeta.id,
            grantLeaseState,
          ),
          message:
            grantedPermissionSet.permissions.editorMessages == null
              ? undefined
              : this._createRevocableMessageClient(
                  pluginRuntimeMeta.id,
                  grantLeaseState,
                ),
          assetRead: grantedPermissionSet.permissions.assetDb?.read
            ? this._createAssetReadClient(pluginRuntimeMeta.id, grantLeaseState)
            : undefined,
          assetCatalog: grantedPermissionSet.permissions.assetDb?.read
            ? this._createAssetCatalogClient(
                pluginRuntimeMeta.id,
                grantLeaseState,
              )
            : undefined,
          assetWrite: grantedPermissionSet.permissions.assetDb?.write
            ? this._createAssetWriteClient(
                pluginRuntimeMeta.id,
                grantLeaseState,
              )
            : undefined,
          assetDelete: grantedPermissionSet.permissions.assetDb?.delete
            ? this._createAssetDeleteClient(
                pluginRuntimeMeta.id,
                grantLeaseState,
              )
            : undefined,
          scene:
            grantedPermissionSet.permissions.sceneScripts == null
              ? undefined
              : this._createSceneClient(pluginRuntimeMeta.id, grantLeaseState),
          selection: this._createSelectionClient(
            pluginRuntimeMeta.id,
            grantLeaseState,
          ),
          projectRead: this._createProjectReadClient(
            pluginRuntimeMeta.id,
            grantLeaseState,
          ),
          designSources: this._designSourceCapabilityRegistry.describe(),
          network: grantedPermissionSet.permissions.network?.allowHttp
            ? this._createNetworkClient(
                pluginRuntimeMeta.id,
                grantedPermissionSet.permissions.network.domains,
                grantLeaseState,
              )
            : undefined,
          native: this._createNativeCapabilityClients(
            pluginRuntimeMeta.id,
            grantedPermissionSet,
            grantLeaseState,
          ),
        };

    this._grants.set(pluginRuntimeMeta.id, grantedRuntimeClientSet);
    this._pluginLeaseStore.register(
      pluginRuntimeMeta.id,
      async (): Promise<void> => {
        grantLeaseState.isActive = false;
        this._grants.delete(pluginRuntimeMeta.id);
      },
    );
    return grantedRuntimeClientSet;
  }

  /**
   * @description 返回指定插件当前持有的 runtime grant。
   * @param pluginId 插件标识
   * @returns 命中时返回受限 runtime client 集合，否则返回 `null`
   */
  public get(pluginId: string): IGrantedRuntimeClientSet | null {
    return this._grants.get(pluginId) ?? null;
  }

  /** @description 替换宿主当前已验证的设计来源 capability；已激活插件重新激活后获得新快照。 */
  public replaceDesignSourceCapabilities(
    sources: readonly import("../shared/plugin-manager-contracts.js").IDesignSourceCapabilityDescriptor[],
  ): void {
    this._designSourceCapabilityRegistry.replace(sources);
  }

  /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
  private _createRevocableMessageClient(
    pluginId: string,
    grantLeaseState: IGrantLeaseState,
  ): IMessageClient {
    return {
      send: async (
        target: string,
        message: string,
        ...args: unknown[]
      ): Promise<void> => {
        this._assertGrantActive(pluginId, "message", grantLeaseState);
        await this._runtime.message.send(target, message, ...args);
      },
      request: async <TData = unknown>(
        target: string,
        message: string,
        ...args: unknown[]
      ): Promise<TData> => {
        this._assertGrantActive(pluginId, "message", grantLeaseState);
        return this._runtime.message.request<TData>(target, message, ...args);
      },
      broadcast: async (message: string, ...args: unknown[]): Promise<void> => {
        this._assertGrantActive(pluginId, "message", grantLeaseState);
        await this._runtime.message.broadcast(message, ...args);
      },
    };
  }

  /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
  private _createAssetReadClient(
    pluginId: string,
    grantLeaseState: IGrantLeaseState,
  ): IAssetReadClient {
    return {
      query: async (pathOrUuid: string): Promise<unknown | null> => {
        this._assertGrantActive(pluginId, "assetRead", grantLeaseState);
        return this._runtime.asset.query(pathOrUuid);
      },
      queryAssets: async (options?: {
        readonly pattern?: string;
        readonly importer?: string | readonly string[];
      }): Promise<readonly IAssetReadAssetSnapshot[]> => {
        this._assertGrantActive(pluginId, "assetRead", grantLeaseState);
        return this._runtime.asset.queryAssets(options) as Promise<
          readonly IAssetReadAssetSnapshot[]
        >;
      },
    };
  }

  /**
   * @description 创建随插件 lease 失效的本地资产目录快查客户端。
   * @param pluginId 插件标识。
   * @param grantLeaseState lease 状态。
   * @returns 资产目录客户端。
   */
  private _createAssetCatalogClient(
    pluginId: string,
    grantLeaseState: IGrantLeaseState,
  ): IAssetCatalogClient {
    const api = new AssetCatalogFastLookupApi();
    return {
      summary: (projectRoot, cwd) => {
        this._assertGrantActive(pluginId, "assetCatalog", grantLeaseState);
        return api.summary(projectRoot, cwd);
      },
      lookup: (projectRoot, input, cwd) => {
        this._assertGrantActive(pluginId, "assetCatalog", grantLeaseState);
        return api.lookup(projectRoot, input, cwd);
      },
      refresh: (projectRoot, cwd) => {
        this._assertGrantActive(pluginId, "assetCatalog", grantLeaseState);
        return api.refresh(projectRoot, cwd);
      },
      refreshPreferringAssetDb: async (projectRoot, cwd, assetDb) => {
        this._assertGrantActive(pluginId, "assetCatalog", grantLeaseState);
        return api.refreshPreferringAssetDb(projectRoot, cwd, assetDb);
      },
    };
  }

  /** @description 创建随插件 lease 失效的受限资源写入客户端。 */
  private _createAssetWriteClient(
    pluginId: string,
    grantLeaseState: IGrantLeaseState,
  ): IAssetWriteClient {
    return {
      writePrefab: async (
        relativePath: string,
        prefab: readonly Record<string, unknown>[],
      ): Promise<unknown> => {
        this._assertGrantActive(pluginId, "assetWrite", grantLeaseState);
        return this._runtime.asset.writePrefab(relativePath, prefab);
      },
      writeBinary: async (
        relativePath: string,
        content: Uint8Array,
        mediaType:
          | "image/png"
          | "image/svg+xml"
          | "application/json"
          | "font/ttf"
          | "font/otf",
      ): Promise<unknown> => {
        this._assertGrantActive(pluginId, "assetWrite", grantLeaseState);
        return this._runtime.asset.writeBinary(
          relativePath,
          content,
          mediaType,
        );
      },
      refresh: async (relativePath: string): Promise<unknown | null> => {
        this._assertGrantActive(pluginId, "assetWrite", grantLeaseState);
        return this._runtime.asset.refresh(relativePath);
      },
    };
  }

  /** @description 创建随插件 lease 失效的受限资源删除客户端。 */
  private _createAssetDeleteClient(
    pluginId: string,
    grantLeaseState: IGrantLeaseState,
  ): IAssetDeleteClient {
    return {
      deleteAsset: async (relativePath: string): Promise<void> => {
        this._assertGrantActive(pluginId, "assetDelete", grantLeaseState);
        await this._runtime.asset.deleteAsset(relativePath);
      },
    };
  }

  /** @description 创建随插件 lease 失效的 Creator 版本只读客户端。 */
  private _createVersionClient(
    pluginId: string,
    grantLeaseState: IGrantLeaseState,
  ): ICreatorVersionClient {
    return {
      getCurrentVersion: () => {
        this._assertGrantActive(pluginId, "version", grantLeaseState);
        return this._runtime.version.getCurrentVersion();
      },
    };
  }

  /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
  private _createSceneClient(
    pluginId: string,
    grantLeaseState: IGrantLeaseState,
  ): ISceneClient {
    return {
      getManifestField: (): "scene-script" | "contributions.scene.script" => {
        this._assertGrantActive(pluginId, "scene", grantLeaseState);
        return this._runtime.scene.getManifestField();
      },
      getCurrent: async (): Promise<Record<string, unknown> | null> => {
        this._assertGrantActive(pluginId, "scene", grantLeaseState);
        return this._runtime.scene.getCurrent();
      },
      getHierarchy: async (options?: {
        includeEditorNodes?: boolean;
      }): Promise<readonly Record<string, unknown>[]> => {
        this._assertGrantActive(pluginId, "scene", grantLeaseState);
        return this._runtime.scene.getHierarchy(options);
      },
      execute: async <TData = unknown>(
        packageName: string,
        method: string,
        args?: readonly unknown[],
      ): Promise<TData> => {
        this._assertGrantActive(pluginId, "scene", grantLeaseState);
        return this._runtime.scene.execute<TData>(packageName, method, args);
      },
    };
  }

  /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
  private _createSelectionClient(
    pluginId: string,
    grantLeaseState: IGrantLeaseState,
  ): ISelectionClient {
    return {
      getActiveIds: async (): Promise<readonly string[]> => {
        this._assertGrantActive(pluginId, "selection", grantLeaseState);
        return this._runtime.selection.getActiveIds();
      },
      setActiveIds: async (selectionIds: readonly string[]): Promise<void> => {
        this._assertGrantActive(pluginId, "selection", grantLeaseState);
        await this._runtime.selection.setActiveIds(selectionIds);
      },
    };
  }

  /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
  private _createProjectReadClient(
    pluginId: string,
    grantLeaseState: IGrantLeaseState,
  ): IProjectReadClient {
    return {
      getProjectPath: async (): Promise<string | null> => {
        this._assertGrantActive(pluginId, "projectRead", grantLeaseState);
        return this._runtime.project.getProjectPath();
      },
      getProjectName: async (): Promise<string | null> => {
        this._assertGrantActive(pluginId, "projectRead", grantLeaseState);
        return this._runtime.project.getProjectName();
      },
    };
  }

  /** @description 创建按 manifest 域名白名单和 lease 约束的只读网络 client。 */
  private _createNetworkClient(
    pluginId: string,
    allowedDomains: readonly string[] | undefined,
    grantLeaseState: IGrantLeaseState,
  ): IPluginNetworkClient {
    const domains = new Set(
      (allowedDomains ?? []).map((domain): string => domain.toLowerCase()),
    );
    return {
      fetch: async (
        request: IPluginNetworkRequest,
      ): Promise<IPluginNetworkResponse> => {
        this._assertGrantActive(pluginId, "network", grantLeaseState);
        let targetUrl: URL;
        try {
          targetUrl = new URL(request.url);
        } catch {
          throw new Error("plugin_network_url_invalid");
        }
        const hostname = targetUrl.hostname.toLowerCase();
        const isGrantedDomain =
          domains.has(hostname) ||
          [...domains].some(
            (domain): boolean =>
              domain.startsWith("*.") && hostname.endsWith(domain.slice(1)),
          );
        if (
          (targetUrl.protocol !== "https:" && targetUrl.protocol !== "http:") ||
          !isGrantedDomain
        ) {
          throw new Error(`plugin_network_domain_not_granted:${hostname}`);
        }
        const response = await this._networkTransport.fetch({
          url: targetUrl.toString(),
          headers: request.headers,
        });
        this._assertGrantActive(pluginId, "network", grantLeaseState);
        return response;
      },
    };
  }

  /** @description 根据 manifest 中的 native capability 授权创建可撤销服务。 */
  private _createNativeCapabilityClients(
    pluginId: string,
    grantedPermissionSet: IGrantedPermissionSet,
    grantLeaseState: IGrantLeaseState,
  ) {
    // 保存当前插件声明的原生 capability 版本要求；未声明时不解析宿主原生载荷。
    const requirements = grantedPermissionSet.permissions.native?.requirements;
    // 保存 Canvas API 的兼容版本范围；未申请时不向插件暴露 Canvas 服务。
    const canvasVersionRange = requirements?.canvas;
    if (canvasVersionRange == null) {
      return {};
    }
    // 保存通过宿主完整性和签名验证的原生 Canvas 服务。
    const canvas =
      this._nativeCapabilityRegistry.requireCanvas(canvasVersionRange);
    return {
      canvas: this._createRevocableCanvasClient(
        pluginId,
        canvas,
        grantLeaseState,
      ),
    };
  }

  /** @description 包装 Canvas 服务，使插件 lease 释放后所有原生调用均被拒绝。 */
  private _createRevocableCanvasClient(
    pluginId: string,
    canvas: ICanvasService,
    grantLeaseState: IGrantLeaseState,
  ): ICanvasService {
    return {
      createSurface: (width: number, height: number): ICanvasSurface => {
        this._assertGrantActive(pluginId, "native", grantLeaseState);
        const surface = canvas.createSurface(width, height);
        return {
          get width(): number {
            return surface.width;
          },
          get height(): number {
            return surface.height;
          },
          getContext2D: () => {
            this._assertGrantActive(pluginId, "native", grantLeaseState);
            const context = surface.getContext2D();
            return {
              drawImage: (
                image: ICanvasImage,
                dx: number,
                dy: number,
              ): void => {
                this._assertGrantActive(pluginId, "native", grantLeaseState);
                context.drawImage(image, dx, dy);
              },
              createImageData: (imageWidth: number, imageHeight: number) => {
                this._assertGrantActive(pluginId, "native", grantLeaseState);
                return context.createImageData(imageWidth, imageHeight);
              },
              putImageData: (imageData, dx: number, dy: number): void => {
                this._assertGrantActive(pluginId, "native", grantLeaseState);
                context.putImageData(imageData, dx, dy);
              },
            };
          },
          resize: (nextWidth: number, nextHeight: number): void => {
            this._assertGrantActive(pluginId, "native", grantLeaseState);
            surface.resize(nextWidth, nextHeight);
          },
          toPng: (): Uint8Array => {
            this._assertGrantActive(pluginId, "native", grantLeaseState);
            return surface.toPng();
          },
        };
      },
      loadImage: async (source: Uint8Array): Promise<ICanvasImage> => {
        this._assertGrantActive(pluginId, "native", grantLeaseState);
        return canvas.loadImage(source);
      },
    };
  }

  /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
  private _assertGrantActive(
    pluginId: string,
    capability: keyof IGrantedRuntimeClientSet,
    grantLeaseState: IGrantLeaseState,
  ): void {
    if (!grantLeaseState.isActive) {
      throw new Error(
        `Plugin runtime grant "${capability}" for plugin "${pluginId}" has been revoked.`,
      );
    }
  }
}
