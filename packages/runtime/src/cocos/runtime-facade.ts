import type {
  IAdapterProfile,
  ICreatorAdapter,
} from "./adapters/core/creator-adapter.js";
import type { ICocosRuntime } from "./runtime.js";

import { EditorApi24Adapter } from "./adapters/adapter-24/editor-api-24-adapter.js";
import { EditorApi35Adapter } from "./adapters/adapter-35/editor-api-35-adapter.js";
import { EditorApi38Adapter } from "./adapters/adapter-38/editor-api-38-adapter.js";
import { AdapterRegistry } from "./adapters/core/adapter-registry.js";
import { ExecutionRuntimeService } from "../execution/execution-runtime-service.js";
import { TaskIngress } from "../execution/ingress/task-ingress.js";
import { TaskLedger } from "../execution/ledger/task-ledger.js";
import { ResourceLockManager } from "../execution/locks/resource-lock-manager.js";
import { TaskMerger } from "../execution/merge/task-merger.js";
import { TaskScheduler } from "../execution/scheduler/task-scheduler.js";
import { TaskSnapshotInspector } from "../execution/snapshot/task-snapshot-inspector.js";
import { TracePipeline } from "../execution/trace/trace-pipeline.js";
import { TimeoutAndCancelController } from "../execution/timeout/timeout-and-cancel-controller.js";
import { WorkerPool } from "../execution/workers/worker-pool.js";
import { AssetRuntimeService } from "./foundation/asset/asset-runtime-service.js";
import { MessageRuntimeService } from "./foundation/message/message-runtime-service.js";
import { PanelHostRuntimeService } from "./foundation/panel-host/panel-host-runtime-service.js";
import { ProjectRuntimeService } from "./foundation/project/project-runtime-service.js";
import { SceneRuntimeService } from "./foundation/scene/scene-runtime-service.js";
import { SelectionRuntimeService } from "./foundation/selection/selection-runtime-service.js";
import { CreatorHostState } from "./shared/host-state.js";
import { VersionResolver } from "./version/version-resolver.js";
import { BatchCommitCoordinator } from "../execution/commit/batch-commit-coordinator.js";
import { RuntimeTaskCommitDispatcher } from "../execution/commit/runtime-task-commit-dispatcher.js";
import type { IEditorApiPanelHostGlobal } from "./adapters/adapter-38/editor-api-host-panel-window-provider.js";
import { EditorApiHostPanelWindowProvider } from "./adapters/adapter-38/editor-api-host-panel-window-provider.js";
import type { IEditorApiPanelWindowProvider } from "./adapters/adapter-38/editor-api-panel-window-launcher.js";
import type { IEditorApiAssetBridgeProvider } from "./adapters/adapter-38/editor-api-host-asset-bridge-provider.js";
import { EditorApiHostSceneBridgeProvider } from "./adapters/adapter-38/editor-api-host-scene-bridge-provider.js";

/**
 * @description Runtime 门面可选装配参数。
 */
export interface IRuntimeFacadeOptions {
  /**
   * @description 可选 Editor API 面板宿主 provider。
   */
  readonly editorApiPanelWindowProvider?: IEditorApiPanelWindowProvider;

  /**
   * @description 可选真实 Editor API 面板宿主全局对象；省略时使用 `globalThis`。
   */
  readonly editorApiHostGlobal?: IEditorApiPanelHostGlobal;

  /**
   * @description 测试场景下是否允许 3.8.7 面板宿主退回内存 skeleton provider；默认 `false`。
   */
  readonly allowMemoryPanelWindowProviderFallback?: boolean;

  /** @description 可选真实 Editor API AssetDB 写入 provider。 */
  readonly editorApiAssetBridgeProvider?: IEditorApiAssetBridgeProvider;

  /** @description 可选真实 Editor API 场景脚本 provider。 */
  readonly editorApiSceneBridgeProvider?: EditorApiHostSceneBridgeProvider;
}

/**
 * @description Runtime 主门面实现，负责装配版本解析器、适配器注册中心、基础子域服务和执行管线。
 */
export class RuntimeFacade implements ICocosRuntime {
  /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
  public readonly version: VersionResolver;
  /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
  public readonly message: MessageRuntimeService;
  /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
  public readonly asset: AssetRuntimeService;
  /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
  public readonly scene: SceneRuntimeService;
  /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
  public readonly panelHost: PanelHostRuntimeService;
  /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
  public readonly selection: SelectionRuntimeService;
  /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
  public readonly project: ProjectRuntimeService;
  /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
  public readonly execution: ExecutionRuntimeService;

  /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
  private readonly _adapterRegistry: AdapterRegistry;

  /**
   * @description 创建一个新的 Runtime 门面实例。
   * @param creatorVersion 当前宿主绑定的 Creator 版本字符串
   * @param options Runtime 可选装配参数
   */
  public constructor(creatorVersion: string, options?: IRuntimeFacadeOptions) {
    this.version = new VersionResolver(creatorVersion);
    this._adapterRegistry = new AdapterRegistry();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const creatorHostState = new CreatorHostState();
    creatorHostState.setAsset("assets/example.prefab", {
      path: "assets/example.prefab",
      uuid: "example-prefab-uuid",
      type: "prefab",
    });
    creatorHostState.setAsset("assets/example-2.prefab", {
      path: "assets/example-2.prefab",
      uuid: "example-2-prefab-uuid",
      type: "prefab",
    });
    creatorHostState.setSceneNode("root-node", {
      nodeId: "root-node",
      enabled: false,
      name: "Root Node",
    });

    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskLedger = new TaskLedger();
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskScheduler = new TaskScheduler(taskLedger);
    // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
    const taskSnapshotInspector = new TaskSnapshotInspector(creatorHostState);

    this.message = new MessageRuntimeService(
      this._adapterRegistry,
      this.version,
    );
    this.asset = new AssetRuntimeService(this._adapterRegistry, this.version);
    this.scene = new SceneRuntimeService(this._adapterRegistry, this.version);
    this.panelHost = new PanelHostRuntimeService(
      this._adapterRegistry,
      this.version,
    );
    this.selection = new SelectionRuntimeService(
      this._adapterRegistry,
      this.version,
    );
    this.project = new ProjectRuntimeService(
      this._adapterRegistry,
      this.version,
    );
    this.execution = new ExecutionRuntimeService(
      new TaskIngress(),
      taskScheduler,
      taskLedger,
      new WorkerPool(taskSnapshotInspector),
      new TaskMerger(),
      new ResourceLockManager(),
      new BatchCommitCoordinator(
        new RuntimeTaskCommitDispatcher(this.asset, this.scene),
        taskSnapshotInspector,
      ),
      new TracePipeline(),
      new TimeoutAndCancelController(),
    );

    this.registerAdapter(
      new EditorApi38Adapter(
        creatorVersion,
        creatorHostState,
        options?.editorApiPanelWindowProvider ??
          new EditorApiHostPanelWindowProvider(
            undefined,
            options?.editorApiHostGlobal,
            {
              allowFallbackProvider:
                options?.allowMemoryPanelWindowProviderFallback === true,
            },
          ),
        options?.editorApiAssetBridgeProvider,
        options?.editorApiSceneBridgeProvider,
        options?.editorApiHostGlobal,
      ),
    );
    this.registerAdapter(
      new EditorApi35Adapter(
        creatorVersion,
        creatorHostState,
        options?.editorApiHostGlobal,
      ),
    );
    this.registerAdapter(
      new EditorApi24Adapter(
        creatorVersion,
        creatorHostState,
        options?.editorApiHostGlobal,
      ),
    );

    const activeAdapter = this._adapterRegistry.resolve(creatorVersion);
    if (activeAdapter == null) {
      const phase = this.version.getCurrentVersion().phase;
      throw new Error(`adapter_unavailable_for_phase:${phase}:${creatorVersion}`);
    }
  }

  /**
   * @description 注册一个 Creator 版本适配器。
   * @param adapter 要注册的适配器实例
   * @returns 当前 Runtime 门面实例，便于链式配置
   */
  public registerAdapter(adapter: ICreatorAdapter): RuntimeFacade {
    this._adapterRegistry.register(adapter);
    return this;
  }

  /**
   * @description 返回当前版本命中的适配器诊断快照。
   * @returns 命中时返回适配器诊断，否则返回 `null`
   */
  public getActiveAdapterProfile(): IAdapterProfile | null {
    return this._adapterRegistry.getActiveProfile(
      this.version.getCurrentVersion().raw,
    );
  }
}
