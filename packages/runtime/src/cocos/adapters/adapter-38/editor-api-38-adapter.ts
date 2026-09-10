import { BaseCreatorAdapter } from "../core/base-creator-adapter.js";
import type {
  IAssetBridge,
  IMessageBridge,
  IPanelHostBridge,
  ISceneBridge,
  ISelectionBridge,
} from "../core/creator-adapter.js";
import { CreatorHostState } from "../../shared/host-state.js";
import {
  DefaultEditorApiPanelWindowProvider,
  EditorApiPanelWindowLauncher,
  type IEditorApiPanelBrowserWindow,
  type IEditorApiPanelWindowProvider,
} from "./editor-api-panel-window-launcher.js";
import {
  EditorApiHostAssetBridgeProvider,
  type IEditorApiAssetBridgeProvider,
} from "./editor-api-host-asset-bridge-provider.js";
import { EditorApiHostMessageBridgeProvider } from "./editor-api-host-message-bridge-provider.js";
import { EditorApiHostSceneBridgeProvider } from "./editor-api-host-scene-bridge-provider.js";
import { EditorApiHostSelectionBridgeProvider } from "./editor-api-host-selection-bridge-provider.js";

/**
 * @description 面向 Cocos Creator 3.6–3.8 稳定 Editor API 阶段的兼容适配器。
 */
export class EditorApi38Adapter extends BaseCreatorAdapter {
  /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
  private readonly _panelWindowLauncher: EditorApiPanelWindowLauncher;
  /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
  private readonly _panelWindowProvider: IEditorApiPanelWindowProvider;
  /** @description Creator AssetDB 真实写入 provider。 */
  private readonly _assetBridgeProvider: IEditorApiAssetBridgeProvider;
  /** @description Creator 场景脚本真实读取与执行 provider；缺失时安全回退内存 bridge。 */
  private readonly _sceneBridgeProvider: EditorApiHostSceneBridgeProvider | null;
  /** @description Creator Message 真实转发 provider。 */
  private readonly _messageBridgeProvider: EditorApiHostMessageBridgeProvider;
  /** @description Creator Selection 真实读写 provider。 */
  private readonly _selectionBridgeProvider: EditorApiHostSelectionBridgeProvider;

  /**
   * @description 创建一个新的 3.8 阶段适配器。
   * @param creatorVersion 当前 Runtime 绑定的 Creator 版本字符串
   * @param hostState Creator 宿主内存状态
   * @param panelWindowProvider 可选 Editor API 面板宿主 provider
   * @param assetBridgeProvider 可选真实 Creator AssetDB 写入 provider
   * @param sceneBridgeProvider 可选真实 Creator 场景脚本 provider
   * @param hostGlobal 可选 Creator 主进程全局（Message / Selection）；默认 `globalThis`
   */
  public constructor(
    creatorVersion: string,
    hostState: CreatorHostState,
    panelWindowProvider?: IEditorApiPanelWindowProvider,
    assetBridgeProvider?: IEditorApiAssetBridgeProvider,
    sceneBridgeProvider?: EditorApiHostSceneBridgeProvider,
    hostGlobal?: Record<string, unknown>,
  ) {
    super("adapter-38", creatorVersion, hostState, ["editor-api"]);
    this._panelWindowProvider =
      panelWindowProvider ?? new DefaultEditorApiPanelWindowProvider();
    this._panelWindowLauncher = new EditorApiPanelWindowLauncher(
      this._panelWindowProvider,
    );
    this._assetBridgeProvider =
      assetBridgeProvider ?? new EditorApiHostAssetBridgeProvider(hostGlobal);
    this._sceneBridgeProvider = sceneBridgeProvider ?? null;
    this._messageBridgeProvider = new EditorApiHostMessageBridgeProvider(
      hostGlobal,
    );
    this._selectionBridgeProvider = new EditorApiHostSelectionBridgeProvider(
      hostGlobal,
    );
  }

  /**
   * @description 返回该适配器是否支持指定版本。
   * @param creatorVersion Cocos Creator 版本字符串
   * @returns 版本属于 3.6–3.8 稳定 Editor API 阶段时返回 `true`
   */
  public supports(creatorVersion: string): boolean {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ [
        majorPart,
        minorPart,
      ] = creatorVersion.trim().split(".");
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ major =
        Number(majorPart ?? "0");
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ minor =
        Number(minorPart ?? "0");
    return major === 3 && minor >= 6 && minor <= 8;
  }

  /**
   * @description 返回当前版本对应的场景脚本字段名。
   * @returns 3.8 阶段使用的场景脚本字段名
   */
  protected getSceneManifestField(): "contributions.scene.script" {
    return "contributions.scene.script";
  }

  /** @description 创建 AssetDB 桥接；真实 Creator 中优先通过受控宿主导出 Prefab。 */
  public createAssetBridge(): IAssetBridge {
    const memoryAssetBridge = super.createAssetBridge();
    if (!this._assetBridgeProvider.isAvailable()) {
      return memoryAssetBridge;
    }
    return {
      ...memoryAssetBridge,
      query: async (pathOrUuid: string): Promise<unknown | null> =>
        this._assetBridgeProvider.queryAsset(pathOrUuid),
      queryAssets: async (options?: {
        readonly pattern?: string;
        readonly importer?: string | readonly string[];
      }): Promise<readonly unknown[]> =>
        this._assetBridgeProvider.queryAssets(options),
      refresh: async (pathOrUuid: string): Promise<unknown | null> =>
        this._assetBridgeProvider.refreshAsset(pathOrUuid),
      writePrefab: async (
        relativePath: string,
        prefab: readonly Record<string, unknown>[],
      ): Promise<unknown> => {
        return this._assetBridgeProvider.writePrefab(relativePath, prefab);
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
      ): Promise<unknown> =>
        this._assetBridgeProvider.writeBinary(relativePath, content, mediaType),
      deleteAsset: async (relativePath: string): Promise<void> =>
        this._assetBridgeProvider.deleteAsset(relativePath),
    };
  }

  /**
   * @description 创建 Message 桥接；真实 Creator 中转发 `Editor.Message`，避免内存 echo。
   * @returns Message 桥接。
   */
  public createMessageBridge(): IMessageBridge {
    const memoryMessageBridge = super.createMessageBridge();
    if (!this._messageBridgeProvider.isAvailable()) {
      return memoryMessageBridge;
    }
    return {
      send: async (
        target: string,
        message: string,
        ...args: unknown[]
      ): Promise<void> => {
        await this._messageBridgeProvider.send(target, message, ...args);
      },
      request: async <TData = unknown>(
        target: string,
        message: string,
        ...args: unknown[]
      ): Promise<TData> => {
        return this._messageBridgeProvider.request<TData>(
          target,
          message,
          ...args,
        );
      },
      broadcast: async (message: string, ...args: unknown[]): Promise<void> => {
        await this._messageBridgeProvider.broadcast(message, ...args);
      },
    };
  }

  /**
   * @description 创建 Selection 桥接；真实 Creator 中读写 `Editor.Selection`。
   * @returns Selection 桥接。
   */
  public createSelectionBridge(): ISelectionBridge {
    const memorySelectionBridge = super.createSelectionBridge();
    if (!this._selectionBridgeProvider.isAvailable()) {
      return memorySelectionBridge;
    }
    return {
      getActiveIds: async (): Promise<readonly string[]> =>
        this._selectionBridgeProvider.getActiveIds(),
      setActiveIds: async (selectionIds: readonly string[]): Promise<void> => {
        await this._selectionBridgeProvider.setActiveIds(selectionIds);
        await memorySelectionBridge.setActiveIds(selectionIds);
      },
    };
  }

  /**
   * @description 创建 3.8 阶段的 Scene bridge；真实宿主仅通过官方场景脚本 IPC 读取或执行。
   * @returns 可用时返回真实 Creator 场景桥接，否则回退内存桥接。
   */
  public createSceneBridge(): ISceneBridge {
    const memorySceneBridge = super.createSceneBridge();
    const sceneBridgeProvider = this._sceneBridgeProvider;
    if (sceneBridgeProvider == null || !sceneBridgeProvider.isAvailable()) {
      return memorySceneBridge;
    }
    return {
      ...memorySceneBridge,
      getCurrent: async (): Promise<Record<string, unknown> | null> =>
        sceneBridgeProvider.getCurrent(),
      getHierarchy: async (options?: {
        includeEditorNodes?: boolean;
      }): Promise<readonly Record<string, unknown>[]> =>
        sceneBridgeProvider.getHierarchy(options),
      execute: async <TData = unknown>(
        packageName: string,
        method: string,
        args?: readonly unknown[],
      ): Promise<TData> => {
        return sceneBridgeProvider.execute<TData>(packageName, method, args);
      },
    };
  }

  /**
   * @description 创建 3.8 阶段的 Panel Host 桥接实例，并补充 Editor API 宿主窗口启动能力。
   * @returns Panel Host 桥接实例
   */
  public createPanelHostBridge(): IPanelHostBridge {
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelHostBridge =
        super.createPanelHostBridge();
    return {
      ...panelHostBridge,
      close: async (panelId: string): Promise<void> => {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ browserWindow =
            this._hostState.getPanelBrowserWindow(
              panelId,
            ) as IEditorApiPanelBrowserWindow | null;
        if (browserWindow != null) {
          await this._panelWindowLauncher.close(panelId, browserWindow);
        }
        await panelHostBridge.close(panelId);
      },
      focus: async (panelId: string): Promise<void> => {
        await panelHostBridge.focus(panelId);
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ browserWindow =
            this._hostState.getPanelBrowserWindow(
              panelId,
            ) as IEditorApiPanelBrowserWindow | null;
        if (browserWindow != null) {
          await this._panelWindowLauncher.focus(panelId, browserWindow);
        }
      },
      launchContainer: async (
        panelId: string,
        entry: string,
        bootstrapScript: string,
      ) => {
        // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
        const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ editorApiPanelBrowserWindow =
            await this._panelWindowLauncher.launch(
              this.id,
              panelId,
              entry,
              bootstrapScript,
            );
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        let /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ panelOpened = false;

        try {
          await panelHostBridge.open(panelId, entry);
          panelOpened = true;
          await panelHostBridge.setBootstrapScript(panelId, bootstrapScript);
          await panelHostBridge.attachBrowserWindow(
            panelId,
            editorApiPanelBrowserWindow,
          );
          // 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。
          const /* 保存异步操作的解析结果，供当前流程后续校验、转换或编排使用。 */ panelHostSessionSnapshot =
              await panelHostBridge.getSession(panelId);
          if (panelHostSessionSnapshot == null) {
            throw new Error(`Panel "${panelId}" is not currently open.`);
          }
          return {
            session: panelHostSessionSnapshot,
            browserWindow: editorApiPanelBrowserWindow,
          };
        } catch (/* 捕获当前操作失败的异常信息，用于生成失败结果或保留诊断上下文。 */ error) {
          if (panelOpened) {
            try {
              await panelHostBridge.close(panelId);
            } catch (/* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ rollbackError) {
              // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
              const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ launchErrorMessage =
                  error instanceof Error
                    ? error.message
                    : "unknown_panel_launch_error";
              // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
              const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ rollbackErrorMessage =
                  rollbackError instanceof Error
                    ? rollbackError.message
                    : "unknown_panel_launch_rollback_error";
              throw new Error(
                `Panel "${panelId}" launch failed: ${launchErrorMessage}; rollback failed: ${rollbackErrorMessage}.`,
              );
            }
          }

          throw error;
        }
      },
    };
  }
}
