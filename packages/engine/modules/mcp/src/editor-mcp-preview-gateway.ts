import { createRequire } from "module";
import { spawnSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "fs";
import { dirname, join, resolve } from "path";
import { pathToFileURL } from "url";

import type {
  ContractPayload,
  EditorMcpThinLayerAvailability,
  IPreviewCaptureMcpInput,
  IPreviewQueryErrorsMcpInput,
  IPreviewQueryMcpInput,
  IPreviewRefreshMcpInput,
} from "@peanut/pod-protocol";
import type { IGrantedRuntimeClientSet } from "@peanut/pod-sdk";
import { AssetCatalogBuilder } from "@peanut/pod-engine/assets";
import { ProjectLogPostflightMonitor } from "@peanut/pod-engine/runtime";

import { EditorMcpThinLayerAvailabilityMapper } from "./editor-mcp-thin-layer-availability.js";
import type { IEditorMcpThinLayerAvailabilityInput } from "./editor-mcp-thin-layer-availability.js";
import { EditorMcpLumen24Bridge } from "./editor-mcp-lumen-24-bridge.js";

/**
 * @description 预览 MCP 结果（可能标记为不可用）。
 */
export interface IEditorMcpPreviewResult {
  /** @description 是否可用。 */
  readonly available: boolean;
  /** @description 说明。 */
  readonly message: string;
  /** @description Agent 可观测：live / fallback / refused。 */
  readonly availability: EditorMcpThinLayerAvailability;
  /** @description 数据来源。 */
  readonly source?:
    "live" | "fallback" | "project_log" | "playwright" | "message";
  /** @description 可选 URL。 */
  readonly url?: string;
  /** @description 可选端口。 */
  readonly port?: number;
  /** @description 可选启动场景 uuid / 配置原文。 */
  readonly startScene?: string;
  /** @description 启动场景工程相对路径（若可从 catalog 解析）。 */
  readonly startScenePath?: string;
  /** @description 启动场景 `db://` 路径。 */
  readonly startSceneDbPath?: string;
  /** @description 错误行。 */
  readonly errors?: readonly string[];
  /** @description 截图相对路径。 */
  readonly outputRelativePath?: string;
  /** @description 当前 project.log 字节偏移（供下次 sinceOffset）。 */
  readonly logOffset?: number;
  /** @description sinceOffset 模式下新增错误条数。 */
  readonly newErrorCount?: number;
  /** @description sinceOffset 模式下无新增错误时为 true。 */
  readonly verified?: boolean;
  /**
   * @description Agent 验收判定：`pass`/`fail` 仅在 sinceOffset 增量模式；无 sinceOffset 为 `observe`（历史观测，不算失败）。
   */
  readonly verdict?: "pass" | "fail" | "observe";
  /** @description 给 Agent 的下一步说明（勿把 observe 当失败重试）。 */
  readonly agentHint?: string;
  /** @description 可选下一步（跟 recommendedNext 习惯一致）。 */
  readonly recommendedNext?: {
    readonly operation: string;
    readonly input: Record<string, unknown>;
  };
  /** @description 本次截图前成功准备的场景工程相对路径。 */
  readonly preparedScenePath?: string;
  /** @description 本次截图前成功准备的场景 UUID。 */
  readonly preparedSceneUuid?: string;
  /** @description 场景准备方式（message / open-asset / open-scene）。 */
  readonly preparedVia?: string;
}

/** @description 预览网关内部草稿（finalize 前可无 availability）。 */
type IEditorMcpPreviewResultDraft = Omit<
  IEditorMcpPreviewResult,
  "availability"
>;

/**
 * @description 预览闭环网关：live message → 工程配置 fallback → project.log / playwright。
 */
export class EditorMcpPreviewGateway {
  /** @description 常见浏览器预览端口（多开 Creator 时常递增）。 */
  private static readonly _defaultPorts: readonly number[] = [
    7456, 7457, 7458, 7459, 7460, 8080,
  ];

  /** @description 授权 runtime。 */
  private readonly _runtime: IGrantedRuntimeClientSet;
  /** @description 解析工程根。 */
  private readonly _resolveProjectRoot: () => Promise<string | null>;
  /** @description project.log 监视器。 */
  private readonly _projectLog: ProjectLogPostflightMonitor;

  /**
   * @description 构造预览网关。
   * @param runtime 授权 runtime。
   * @param resolveProjectRoot 可选工程根解析。
   */
  public constructor(
    runtime: IGrantedRuntimeClientSet,
    resolveProjectRoot: () => Promise<string | null> = async () => null,
  ) {
    this._runtime = runtime;
    this._resolveProjectRoot = resolveProjectRoot;
    this._projectLog = new ProjectLogPostflightMonitor();
  }

  /**
   * @description 查询预览 URL / 端口。
   * @param input 可选平台提示。
   * @returns 预览信息。
   */
  public async query(
    input: IPreviewQueryMcpInput,
  ): Promise<IEditorMcpPreviewResult> {
    const liveTried: string[] = [];
    // Creator 2.4 无 3.x preview/builder IPC；盲探会刷 `sendToMain "…" failed, no response received`。
    if (EditorMcpLumen24Bridge.isCreator2x()) {
      liveTried.push("creator2x:skip_live_preview_ipc");
      const fallback2x = await this._queryFallbackFromProject();
      if (fallback2x != null) {
        return this._enrichStartScene({
          ...fallback2x,
          message: `${fallback2x.message};creator2x_port_or_settings`,
        });
      }
      return this._finalize({
        available: false,
        message:
          "preview_unavailable:creator2x:open_browser_preview_or_check_port_7456+",
      });
    }
    const message = this._runtime.message;
    if (message != null) {
      const live = await this._queryLivePreview(message, liveTried);
      if (live != null) {
        return this._enrichStartScene(live);
      }
      try {
        await message.request("preview", "start-preview", {
          platform: input.platform ?? "browser",
        });
        liveTried.push("preview.start-preview");
      } catch {
        // optional warm-up
      }
      const afterWarmup = await this._queryLivePreview(message, liveTried);
      if (afterWarmup != null) {
        return this._enrichStartScene(afterWarmup);
      }
    }
    const fallback = await this._queryFallbackFromProject();
    if (fallback != null) {
      return this._enrichStartScene({
        ...fallback,
        message:
          liveTried.length > 0
            ? `${fallback.message};live_tried=${liveTried.join(",")}`
            : fallback.message,
      });
    }
    return this._finalize({
      available: false,
      message:
        liveTried.length > 0
          ? `preview_unavailable:no_supported_message_or_fallback;live_tried=${liveTried.join(",")}`
          : "preview_unavailable:no_supported_message_or_fallback; open Browser Preview in Creator or check port 7456",
    });
  }

  /**
   * @description 尝试 Creator live message 查询预览信息。
   * @param message runtime message 客户端。
   * @param liveTried 已尝试的 message 名（输出）。
   * @returns live 结果；全部失败返回 null。
   */
  private async _queryLivePreview(
    message: NonNullable<IGrantedRuntimeClientSet["message"]>,
    liveTried: string[],
  ): Promise<IEditorMcpPreviewResultDraft | null> {
    const liveCandidates = [
      ["preview", "query-preview-url"] as const,
      ["preview", "query-port"] as const,
      ["preview", "get-preview-url"] as const,
      ["preview", "query-info"] as const,
      ["preview", "query-preview-info"] as const,
      ["preview", "query-settings"] as const,
      ["preview", "get-preview-settings"] as const,
      ["preview", "query-server"] as const,
      ["preview", "get-server"] as const,
      ["server", "query-port"] as const,
      ["server", "query-preview-url"] as const,
      ["server", "query-ip"] as const,
      ["server", "query-url"] as const,
      ["device-manager", "query-port"] as const,
      ["device-manager", "query-preview-url"] as const,
      ["builder", "get-preview-settings"] as const,
      ["builder", "query-preview-settings"] as const,
      ["builder", "query-preview-url"] as const,
      ["scene", "query-preview-url"] as const,
      ["programmer", "query-preview-url"] as const,
    ];
    for (const [target, name] of liveCandidates) {
      const key = `${target}.${name}`;
      for (const args of [[{}], []] as const) {
        try {
          const raw = await message.request(target, name, ...args);
          liveTried.push(args.length === 0 ? `${key}:noarg` : key);
          const parsed = this._parsePreviewPayload(raw, "live");
          if (parsed != null) {
            return {
              ...parsed,
              message: `${parsed.message}:${key}`,
            };
          }
        } catch {
          liveTried.push(
            args.length === 0 ? `${key}:noarg:fail` : `${key}:fail`,
          );
        }
      }
    }
    return null;
  }

  /**
   * @description 刷新预览（尽力而为）。
   * @param input 刷新选项。
   * @returns 结果。
   */
  public async refresh(
    input: IPreviewRefreshMcpInput,
  ): Promise<IEditorMcpPreviewResult> {
    // Creator 2.4：无 3.x preview message；刷 AssetDB 即刷新预览可用资产。
    const host = globalThis as {
      Editor?: {
        versions?: { CocosCreator?: string };
        assetdb?: {
          refresh?: (
            url: string,
            cb?: (error: Error | null, result?: unknown) => void,
          ) => void;
        };
      };
    };
    const cocos = host.Editor?.versions?.CocosCreator ?? "";
    if (/^2\./.test(cocos) && typeof host.Editor?.assetdb?.refresh === "function") {
      if (input.refreshAssets !== false) {
        await new Promise<void>((resolve) => {
          host.Editor!.assetdb!.refresh!("db://assets/", () => resolve());
        });
      }
      return this._finalize({
        available: true,
        source: "live",
        message: "preview_refresh_ok:creator2x_assetdb_refresh",
      });
    }
    const message = this._runtime.message;
    if (message == null) {
      return this._finalize({
        available: false,
        message: "preview_refresh_unavailable:runtime_message_missing",
      });
    }
    if (input.refreshAssets !== false) {
      try {
        // Creator 3.8 `refresh-asset` 只接受 db URL 字符串；传对象会误走导入路径并报「不支持目录导入」。
        await message.request("asset-db", "refresh-asset", "db://assets/");
      } catch {
        // continue
      }
    }
    for (const candidate of [
      "reload-terminal",
      "refresh",
      "reload",
      "refresh-preview",
      "reload-preview",
    ] as const) {
      try {
        await message.request("preview", candidate, {});
        return this._finalize({
          available: true,
          source: "live",
          message: `preview_refresh_ok:${candidate}`,
        });
      } catch {
        // try next
      }
    }
    return this._finalize({
      available: false,
      message: "preview_refresh_unavailable:no_supported_message",
    });
  }

  /**
   * @description 查询预览/编辑器错误；无 console message 时回退 project.log。
   * @param input 限制。
   * @returns 错误列表。
   */
  public async queryErrors(
    input: IPreviewQueryErrorsMcpInput,
  ): Promise<IEditorMcpPreviewResult> {
    const limit =
      typeof input.limit === "number" && input.limit > 0
        ? Math.min(input.limit, 200)
        : 50;
    const contains =
      typeof input.contains === "string"
        ? input.contains.trim().toLowerCase()
        : "";
    const sinceOffset =
      typeof input.sinceOffset === "number" &&
      Number.isFinite(input.sinceOffset) &&
      input.sinceOffset >= 0
        ? Math.floor(input.sinceOffset)
        : undefined;
    const filterLines = (errors: readonly string[]): string[] => {
      const withoutNoise = errors.filter(
        (line) =>
          !/^\s*at\s+/u.test(line) && !/\bconsole\.error\b/iu.test(line),
      );
      if (contains.length === 0) {
        return [...withoutNoise];
      }
      return withoutNoise.filter((line) =>
        line.toLowerCase().includes(contains),
      );
    };
    const projectRoot = await this._resolveProjectRoot();
    const logOffset =
      projectRoot != null
        ? this._projectLog.readCurrentOffset(projectRoot)
        : undefined;

    // 验收流水线优先：只看 sinceOffset 之后的 project.log 增量，避免历史噪声误判。
    if (sinceOffset != null && projectRoot != null) {
      const delta = this._projectLog.readDelta({
        path: this._projectLog.resolveLogPath(projectRoot),
        offset: sinceOffset,
      });
      const errors = filterLines(delta.newErrors).slice(-limit);
      const verified = delta.verified && errors.length === 0;
      return this._finalize(
        this._attachQueryErrorsAgentGuidance(
          {
            available: delta.logChecked,
            source: "project_log",
            message:
              contains.length > 0
                ? "preview_errors_ok:project_log:sinceOffset:contains"
                : "preview_errors_ok:project_log:sinceOffset",
            errors,
            url: delta.logPath,
            ...(logOffset != null ? { logOffset } : {}),
            newErrorCount: errors.length,
            verified,
          },
          "delta",
        ),
      );
    }

    const message = this._runtime.message;
    if (message != null && !EditorMcpLumen24Bridge.isCreator2x()) {
      for (const candidate of [
        "query-logs",
        "query-console",
        "query-errors",
      ] as const) {
        try {
          const raw = await message.request("console", candidate, { limit });
          const errors = filterLines(this._parseErrorLines(raw, limit));
          if (errors.length > 0 || raw != null) {
            return this._finalize(
              this._attachQueryErrorsAgentGuidance(
                {
                  available: true,
                  source: "live",
                  message:
                    contains.length > 0
                      ? `preview_errors_ok:${candidate}:contains`
                      : `preview_errors_ok:${candidate}`,
                  errors,
                  ...(logOffset != null ? { logOffset } : {}),
                },
                "snapshot",
              ),
            );
          }
        } catch {
          // try next
        }
      }
    }
    if (projectRoot != null) {
      const recent = this._projectLog.readRecentErrors(projectRoot, limit);
      if (recent.available) {
        return this._finalize(
          this._attachQueryErrorsAgentGuidance(
            {
              available: true,
              source: "project_log",
              message:
                contains.length > 0
                  ? "preview_errors_ok:project_log:contains"
                  : "preview_errors_ok:project_log",
              errors: filterLines(recent.errors),
              url: recent.logPath,
              ...(logOffset != null ? { logOffset } : {}),
            },
            "snapshot",
          ),
        );
      }
    }
    return this._finalize(
      this._attachQueryErrorsAgentGuidance(
        {
          available: false,
          message: "preview_errors_unavailable:no_console_or_project_log",
          errors: [],
          ...(logOffset != null ? { logOffset } : {}),
        },
        "snapshot",
      ),
    );
  }

  /**
   * @description 为 queryErrors 附加 Agent 可读判定（pass/fail 仅增量；无 sinceOffset 为 observe）。
   * @param draft 原始结果片段。
   * @param mode `delta`=sinceOffset 验收；`snapshot`=历史观测。
   * @returns 带 verdict / agentHint 的草稿。
   */
  private _attachQueryErrorsAgentGuidance(
    draft: IEditorMcpPreviewResultDraft,
    mode: "delta" | "snapshot",
  ): IEditorMcpPreviewResultDraft {
    const errors = draft.errors ?? [];
    if (mode === "delta") {
      const pass = draft.verified === true || errors.length === 0;
      return {
        ...draft,
        verdict: pass ? "pass" : "fail",
        agentHint: pass
          ? "Acceptance delta clean (verdict=pass). Optional preview.capture. Do not call scene.save/open for writing."
          : "New errors since sinceOffset (verdict=fail). Fix lumen/asset writes → lumen.commit → preview.refresh → queryErrors again with fresh logOffset.",
        recommendedNext: pass
          ? { operation: "preview.capture", input: {} }
          : { operation: "lumen.validateRefs", input: {} },
      };
    }
    return {
      ...draft,
      verdict: "observe",
      agentHint:
        "No sinceOffset: verdict=observe means historical observation only — NOT acceptance failure. Always pass sinceOffset from prior logOffset after writes. Ignore console.error / Sentry stack frames.",
      ...(draft.logOffset != null
        ? {
            recommendedNext: {
              operation: "preview.queryErrors",
              input: { sinceOffset: draft.logOffset },
            },
          }
        : {}),
    };
  }

  /**
   * @description 截取预览页（playwright 可选；或 Creator message）。
   * @param input 截图选项。
   * @returns 结果。
   */
  public async capture(
    input: IPreviewCaptureMcpInput,
  ): Promise<IEditorMcpPreviewResult> {
    const projectRoot = await this._resolveProjectRoot();
    if (projectRoot == null) {
      return this._finalize({
        available: false,
        message: "preview_capture_unavailable:project_path_missing",
      });
    }
    const outputRelativePath =
      typeof input.outputRelativePath === "string" &&
      input.outputRelativePath.trim().length > 0
        ? input.outputRelativePath.trim().replace(/\\/gu, "/")
        : ".peanut-ai/artifacts/preview-capture.png";
    if (
      outputRelativePath.includes("..") ||
      outputRelativePath.startsWith("/")
    ) {
      throw new Error("editor_mcp_preview_capture_path_invalid");
    }
    const absoluteOut = resolve(projectRoot, outputRelativePath);
    if (!absoluteOut.startsWith(resolve(projectRoot))) {
      throw new Error("editor_mcp_preview_capture_path_escaped");
    }
    mkdirSync(dirname(absoluteOut), { recursive: true });

    const scenePath = this._resolveCaptureScenePath(input);
    let prepared:
      | {
          readonly path: string;
          readonly uuid?: string;
          readonly via: string;
        }
      | undefined;
    if (scenePath != null) {
      const prep = await this._prepareSceneForCapture(projectRoot, scenePath);
      if (!prep.ok) {
        return this._finalize({
          available: false,
          message: prep.message,
          outputRelativePath,
          ...(prep.path != null ? { preparedScenePath: prep.path } : {}),
        });
      }
      prepared = { path: prep.path, uuid: prep.uuid, via: prep.via };
    }

    const preparedFields =
      prepared == null
        ? {}
        : {
            preparedScenePath: prepared.path,
            ...(prepared.uuid != null ? { preparedSceneUuid: prepared.uuid } : {}),
            preparedVia: prepared.via,
          };

    const message = this._runtime.message;
    if (message != null) {
      for (const candidate of [
        "capture-screenshot",
        "take-screenshot",
        "screenshot",
      ] as const) {
        try {
          const raw = await message.request("preview", candidate, {
            path: absoluteOut,
            url: input.url,
          });
          // Creator 可能返回 truthy 占位结果但不落盘；仅当目标文件真实存在（或可从 raw 还原）时才算 message 成功。
          this._materializeCapturePayload(raw, absoluteOut);
          if (this._isNonEmptyFile(absoluteOut)) {
            return this._finalize({
              available: true,
              source: "message",
              message: `preview_capture_ok:${candidate}`,
              outputRelativePath,
              url: input.url,
              ...preparedFields,
            });
          }
        } catch {
          // try next
        }
      }
    }

    let url =
      typeof input.url === "string" && input.url.trim().length > 0
        ? input.url.trim()
        : undefined;
    if (url == null) {
      const queried = await this.query({});
      url = queried.url;
      if (url == null && typeof queried.port === "number") {
        url = `http://127.0.0.1:${queried.port}`;
      }
    }
    if (url == null || url.length === 0) {
      return this._finalize({
        available: false,
        message: "preview_capture_unavailable:no_preview_url",
        outputRelativePath,
        ...preparedFields,
      });
    }

    const playwrightResult = await this._captureWithPlaywright(
      url,
      absoluteOut,
      input,
    );
    if (playwrightResult.ok) {
      return this._finalize({
        available: true,
        source: "playwright",
        message: "preview_capture_ok:playwright",
        url,
        outputRelativePath,
        ...preparedFields,
      });
    }
    return this._finalize({
      available: false,
      message: `preview_capture_unavailable:${playwrightResult.reason}; install playwright in workspace or open Browser Preview`,
      url,
      outputRelativePath,
      ...preparedFields,
    });
  }

  /**
   * @description 解析 query 输入。
   * @param input 未校验输入。
   * @returns 输入。
   */
  public readQueryInput(
    input: ContractPayload | undefined,
  ): IPreviewQueryMcpInput {
    if (input == null) {
      return {};
    }
    if (typeof input !== "object" || Array.isArray(input)) {
      throw new Error("editor_mcp_invalid_operation_input");
    }
    const record = input as Record<string, unknown>;
    return {
      platform:
        typeof record.platform === "string" ? record.platform : undefined,
    };
  }

  /**
   * @description 解析 refresh 输入。
   * @param input 未校验输入。
   * @returns 输入。
   */
  public readRefreshInput(
    input: ContractPayload | undefined,
  ): IPreviewRefreshMcpInput {
    if (input == null) {
      return {};
    }
    if (typeof input !== "object" || Array.isArray(input)) {
      throw new Error("editor_mcp_invalid_operation_input");
    }
    const record = input as Record<string, unknown>;
    return {
      refreshAssets: record.refreshAssets === false ? false : true,
    };
  }

  /**
   * @description 解析 errors 输入。
   * @param input 未校验输入。
   * @returns 输入。
   */
  public readErrorsInput(
    input: ContractPayload | undefined,
  ): IPreviewQueryErrorsMcpInput {
    if (input == null) {
      return {};
    }
    if (typeof input !== "object" || Array.isArray(input)) {
      throw new Error("editor_mcp_invalid_operation_input");
    }
    const record = input as Record<string, unknown>;
    return {
      limit: typeof record.limit === "number" ? record.limit : undefined,
      contains:
        typeof record.contains === "string" ? record.contains : undefined,
      sinceOffset:
        typeof record.sinceOffset === "number" &&
        Number.isFinite(record.sinceOffset) &&
        record.sinceOffset >= 0
          ? Math.floor(record.sinceOffset)
          : undefined,
    };
  }

  /**
   * @description 解析 capture 输入。
   * @param input 未校验输入。
   * @returns 输入。
   */
  public readCaptureInput(
    input: ContractPayload | undefined,
  ): IPreviewCaptureMcpInput {
    if (input == null) {
      return {};
    }
    if (typeof input !== "object" || Array.isArray(input)) {
      throw new Error("editor_mcp_invalid_operation_input");
    }
    const record = input as Record<string, unknown>;
    const scenePath =
      typeof record.scenePath === "string" && record.scenePath.trim().length > 0
        ? record.scenePath.trim().replace(/\\/gu, "/")
        : undefined;
    const assetRelativePath =
      typeof record.assetRelativePath === "string" &&
      record.assetRelativePath.trim().length > 0
        ? record.assetRelativePath.trim().replace(/\\/gu, "/")
        : undefined;
    return {
      url: typeof record.url === "string" ? record.url : undefined,
      outputRelativePath:
        typeof record.outputRelativePath === "string"
          ? record.outputRelativePath
          : undefined,
      width: typeof record.width === "number" ? record.width : undefined,
      height: typeof record.height === "number" ? record.height : undefined,
      waitMs: typeof record.waitMs === "number" ? record.waitMs : undefined,
      ...(scenePath != null ? { scenePath } : {}),
      ...(assetRelativePath != null ? { assetRelativePath } : {}),
    };
  }

  /**
   * @description 解析 capture 的可选场景路径（scenePath 优先于 assetRelativePath）。
   * @param input capture 输入。
   * @returns 规范化相对路径；未提供则 undefined。
   */
  private _resolveCaptureScenePath(
    input: IPreviewCaptureMcpInput,
  ): string | undefined {
    const raw =
      typeof input.scenePath === "string" && input.scenePath.trim().length > 0
        ? input.scenePath
        : typeof input.assetRelativePath === "string" &&
            input.assetRelativePath.trim().length > 0
          ? input.assetRelativePath
          : undefined;
    if (raw == null) {
      return undefined;
    }
    return raw.trim().replace(/^db:\/\//u, "").replace(/\\/gu, "/");
  }

  /**
   * @description 为指定场景准备预览截图：仅走无确认框 message / open-asset；失败则 refused。
   * 不调用 scene.save；不弹 UI confirm。
   * @param projectRoot 工程根。
   * @param scenePath 工程相对 .scene 路径。
   * @returns 准备结果。
   */
  private async _prepareSceneForCapture(
    projectRoot: string,
    scenePath: string,
  ): Promise<{
    readonly ok: boolean;
    readonly message: string;
    readonly path: string;
    readonly uuid?: string;
    readonly via: string;
  }> {
    const normalized = scenePath.replace(/^db:\/\//u, "").replace(/\\/gu, "/");
    if (
      normalized.includes("..") ||
      normalized.startsWith("/") ||
      !normalized.toLowerCase().endsWith(".scene")
    ) {
      return {
        ok: false,
        message: "preview_capture_refused:scene_path_invalid",
        path: normalized,
        via: "none",
      };
    }
    const absoluteScene = resolve(projectRoot, normalized);
    if (!absoluteScene.startsWith(resolve(projectRoot)) || !existsSync(absoluteScene)) {
      return {
        ok: false,
        message: "preview_capture_refused:scene_file_missing",
        path: normalized,
        via: "none",
      };
    }

    const uuid = this._resolveSceneUuidFromCatalog(projectRoot, normalized);
    const message = this._runtime.message;
    if (message == null) {
      return {
        ok: false,
        message:
          "preview_capture_refused:scene_prepare_unavailable:runtime_message_missing",
        path: normalized,
        ...(uuid != null ? { uuid } : {}),
        via: "none",
      };
    }

    // 优先：预览侧设置启动场景（无 UI）。Creator 未暴露则跳过。
    const previewPayloads: readonly unknown[] = [
      { startScene: uuid ?? normalized },
      { launchScene: uuid ?? normalized },
      { scene: uuid ?? normalized },
      uuid ?? normalized,
    ];
    for (const name of [
      "set-start-scene",
      "set-preview-scene",
      "set-launch-scene",
      "update-preview-settings",
      "set-preview-settings",
    ] as const) {
      for (const payload of previewPayloads) {
        try {
          await message.request("preview", name, payload);
          try {
            await message.request("preview", "reload-terminal", {});
          } catch {
            try {
              await message.request("preview", "refresh", {});
            } catch {
              // optional
            }
          }
          return {
            ok: true,
            message: `preview_capture_scene_prepared:preview:${name}`,
            path: normalized,
            ...(uuid != null ? { uuid } : {}),
            via: `preview:${name}`,
          };
        } catch {
          // try next
        }
      }
    }

    // 次选：无确认框 open-scene / open-asset(UUID)，再软刷新预览。禁止传 db:// 给 open-scene。
    if (uuid != null) {
      for (const [channel, name] of [
        ["scene", "open-scene"] as const,
        ["asset-db", "open-asset"] as const,
      ]) {
        try {
          await message.request(channel, name, uuid);
          for (const refreshName of [
            "reload-terminal",
            "refresh",
            "reload-preview",
          ] as const) {
            try {
              await message.request("preview", refreshName, {});
              break;
            } catch {
              // try next refresh
            }
          }
          return {
            ok: true,
            message: `preview_capture_scene_prepared:${channel}:${name}`,
            path: normalized,
            uuid,
            via: `${channel}:${name}`,
          };
        } catch {
          // try next
        }
      }
    }

    return {
      ok: false,
      message:
        uuid == null
          ? "preview_capture_refused:scene_prepare_unavailable:uuid_unresolved"
          : "preview_capture_refused:scene_prepare_unavailable:no_supported_message",
      path: normalized,
      ...(uuid != null ? { uuid } : {}),
      via: "none",
    };
  }

  /**
   * @description 从 asset catalog 解析场景 UUID。
   * @param projectRoot 工程根。
   * @param scenePath 工程相对路径。
   * @returns UUID 或 undefined。
   */
  private _resolveSceneUuidFromCatalog(
    projectRoot: string,
    scenePath: string,
  ): string | undefined {
    try {
      const catalog = new AssetCatalogBuilder().build(projectRoot);
      const normalized = scenePath.replace(/^db:\/\//u, "").replace(/\\/gu, "/");
      const hit = Object.values(catalog.uuidMap).find(
        (entry) =>
          entry.parentUuid.length === 0 &&
          (entry.path === normalized ||
            entry.path.replace(/\\/gu, "/") === normalized),
      );
      return hit?.uuid;
    } catch {
      return undefined;
    }
  }
  /**
   * @description 从工程配置 / 可达端口探测拼 fallback URL。
   * @returns fallback 结果。
   */
  private async _queryFallbackFromProject(): Promise<IEditorMcpPreviewResultDraft | null> {
    const projectRoot = await this._resolveProjectRoot();
    if (projectRoot == null) {
      return null;
    }
    const fromSettings = this._readPreviewSettings(projectRoot);
    const projectName = this._readProjectDisplayName(projectRoot);
    const candidatePorts = [
      ...new Set(
        [fromSettings.port, ...EditorMcpPreviewGateway._defaultPorts].filter(
          (port): port is number =>
            typeof port === "number" && Number.isFinite(port),
        ),
      ),
    ];
    /** @description 可达探测结果，优先标题命中本工程名。 */
    const reachable: Array<{
      port: number;
      url: string;
      titleMatched: boolean;
    }> = [];
    for (const port of candidatePorts) {
      const url = `http://127.0.0.1:${port}`;
      const probe = await this._probePreviewServer(url, projectName);
      if (probe.reachable) {
        reachable.push({ port, url, titleMatched: probe.titleMatched });
      }
    }
    const preferred =
      reachable.find((item) => item.titleMatched) ?? reachable[0] ?? null;
    if (preferred != null) {
      // 标题命中本工程 = Browser Preview 实机在跑，升为 live（不再标 fallback）。
      if (preferred.titleMatched) {
        return {
          available: true,
          source: "live",
          message: "preview_query_ok:live_http_title_match",
          url: preferred.url,
          port: preferred.port,
          startScene: fromSettings.startScene,
        };
      }
      return {
        available: true,
        source: "fallback",
        message: "preview_query_ok:fallback_settings_or_default_port",
        url: preferred.url,
        port: preferred.port,
        startScene: fromSettings.startScene,
      };
    }
    const port = fromSettings.port ?? EditorMcpPreviewGateway._defaultPorts[0];
    const url = `http://127.0.0.1:${port}`;
    return {
      available: false,
      source: "fallback",
      message: "preview_query_fallback_unreachable:start_browser_preview",
      url,
      port,
      startScene: fromSettings.startScene,
    };
  }

  /**
   * @description 补齐 startScene：设置缺失时读工程配置，并把 uuid 解析为 path。
   * @param result 预览结果。
   * @returns 增强后的结果。
   */
  private async _enrichStartScene(
    result: IEditorMcpPreviewResultDraft,
  ): Promise<IEditorMcpPreviewResult> {
    const projectRoot = await this._resolveProjectRoot();
    let startScene = result.startScene;
    if (
      (startScene == null || startScene.trim().length === 0) &&
      projectRoot != null
    ) {
      startScene = this._readPreviewSettings(projectRoot).startScene;
    }
    if (startScene == null || startScene.trim().length === 0) {
      return this._finalize(result);
    }
    const trimmed = startScene.trim();
    let startScenePath: string | undefined = result.startScenePath;
    let startSceneDbPath: string | undefined = result.startSceneDbPath;
    if (
      projectRoot != null &&
      (startScenePath == null || startSceneDbPath == null)
    ) {
      const resolved = this._resolveStartScenePath(projectRoot, trimmed);
      startScenePath = resolved.path ?? startScenePath;
      startSceneDbPath = resolved.dbPath ?? startSceneDbPath;
    }
    return this._finalize({
      ...result,
      startScene: trimmed,
      ...(startScenePath != null ? { startScenePath } : {}),
      ...(startSceneDbPath != null ? { startSceneDbPath } : {}),
    });
  }

  /**
   * @description 为预览薄层结果附加 availability。
   * @param result 原始结果片段。
   * @returns 完整预览结果。
   */
  private _finalize(
    result: IEditorMcpThinLayerAvailabilityInput &
      Partial<IEditorMcpPreviewResult>,
  ): IEditorMcpPreviewResult {
    return EditorMcpThinLayerAvailabilityMapper.attach(result);
  }

  /**
   * @description 将启动场景 uuid 解析为工程相对路径。
   * @param projectRoot 工程根。
   * @param startScene uuid 或路径。
   * @returns path / dbPath。
   */
  private _resolveStartScenePath(
    projectRoot: string,
    startScene: string,
  ): { readonly path?: string; readonly dbPath?: string } {
    const normalized = startScene.replace(/^db:\/\//, "").trim();
    if (normalized.toLowerCase().endsWith(".scene")) {
      return {
        path: normalized,
        dbPath: `db://${normalized}`,
      };
    }
    try {
      const catalog = new AssetCatalogBuilder().build(projectRoot);
      const hit = Object.values(catalog.uuidMap).find(
        (entry) =>
          entry.parentUuid.length === 0 &&
          (entry.uuid === normalized ||
            entry.compressedUuid === normalized ||
            entry.uuid === startScene ||
            entry.compressedUuid === startScene),
      );
      if (hit != null) {
        return {
          path: hit.path,
          dbPath: `db://${hit.path}`,
        };
      }
    } catch {
      // catalog optional
    }
    return {};
  }

  /**
   * @description 读取工程显示名（用于多开 Creator 时按预览页标题匹配）。
   * @param projectRoot 工程根。
   * @returns 工程名。
   */
  private _readProjectDisplayName(projectRoot: string): string {
    const packagePath = join(projectRoot, "package.json");
    if (existsSync(packagePath)) {
      try {
        const raw = JSON.parse(readFileSync(packagePath, "utf8")) as unknown;
        if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
          const name = (raw as Record<string, unknown>).name;
          if (typeof name === "string" && name.trim().length > 0) {
            return name.trim();
          }
        }
      } catch {
        // fall through
      }
    }
    const segments = projectRoot
      .replace(/\\/gu, "/")
      .split("/")
      .filter((part) => part.length > 0);
    return segments[segments.length - 1] ?? "project";
  }

  /**
   * @description 读取常见 preview / server 配置文件。
   * @param projectRoot 工程根。
   * @returns 端口与启动场景。
   */
  private _readPreviewSettings(projectRoot: string): {
    readonly port?: number;
    readonly startScene?: string;
  } {
    const candidates = [
      join(projectRoot, "profiles", "v2", "packages", "preview.json"),
      join(projectRoot, "profiles", "v2", "packages", "server.json"),
      join(projectRoot, "settings", "v2", "packages", "preview.json"),
      join(projectRoot, "settings", "v2", "packages", "project.json"),
    ];
    let port: number | undefined;
    let startScene: string | undefined;
    for (const filePath of candidates) {
      if (!existsSync(filePath)) {
        continue;
      }
      try {
        const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
        const found = this._extractPreviewSettings(raw);
        if (port == null && found.port != null) {
          port = found.port;
        }
        if (startScene == null && found.startScene != null) {
          startScene = found.startScene;
        }
      } catch {
        // try next
      }
    }
    return { port, startScene };
  }

  /**
   * @description 从配置 JSON（含嵌套 general）提取 port / startScene。
   * @param value 配置对象。
   * @returns 端口与启动场景。
   */
  private _extractPreviewSettings(value: unknown): {
    readonly port?: number;
    readonly startScene?: string;
  } {
    if (value == null || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }
    const record = value as Record<string, unknown>;
    let port: number | undefined;
    let startScene: string | undefined;
    const visit = (node: Record<string, unknown>, depth: number): void => {
      if (depth > 4) {
        return;
      }
      if (port == null) {
        if (typeof node.port === "number") {
          port = node.port;
        } else if (typeof node.previewPort === "number") {
          port = node.previewPort;
        } else if (typeof node.server_port === "number") {
          port = node.server_port;
        }
      }
      if (startScene == null) {
        if (
          typeof node.startScene === "string" &&
          node.startScene.trim().length > 0
        ) {
          startScene = node.startScene.trim();
        } else if (
          typeof node.launchScene === "string" &&
          node.launchScene.trim().length > 0
        ) {
          startScene = node.launchScene.trim();
        }
      }
      for (const child of Object.values(node)) {
        if (
          child != null &&
          typeof child === "object" &&
          !Array.isArray(child)
        ) {
          visit(child as Record<string, unknown>, depth + 1);
        }
      }
    };
    visit(record, 0);
    return { port, startScene };
  }

  /**
   * @description 探测预览页是否可达，并尽量用 HTML title 匹配工程名。
   * @param url 预览 URL。
   * @param projectName 工程显示名。
   * @returns 可达性与标题匹配。
   */
  private async _probePreviewServer(
    url: string,
    projectName: string,
  ): Promise<{ readonly reachable: boolean; readonly titleMatched: boolean }> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 800);
      try {
        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
        });
        if (!(response.ok || response.status < 500)) {
          return { reachable: false, titleMatched: false };
        }
        const text = await response.text();
        const titleMatch = /<title>([^<]*)<\/title>/iu.exec(text);
        const title = titleMatch?.[1] ?? "";
        const titleMatched =
          projectName.length > 0 &&
          title.toLowerCase().includes(projectName.toLowerCase());
        return { reachable: true, titleMatched };
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return { reachable: false, titleMatched: false };
    }
  }

  /**
   * @description 探测 URL 是否可连。
   * @param url URL。
   * @returns 是否可达。
   */
  private async _probeUrl(url: string): Promise<boolean> {
    const probe = await this._probePreviewServer(url, "");
    return probe.reachable;
  }

  /**
   * @description 判断路径是否为非空文件。
   * @param absolutePath 绝对路径。
   * @returns 是否存在且 size>0。
   */
  private _isNonEmptyFile(absolutePath: string): boolean {
    if (!existsSync(absolutePath)) {
      return false;
    }
    try {
      return statSync(absolutePath).size > 0;
    } catch {
      return false;
    }
  }

  /**
   * @description 若 Creator 截图 message 返回二进制/Base64 而未落盘，则写入目标路径。
   * @param raw message 原始返回。
   * @param absoluteOut 目标绝对路径。
   * @returns 无返回值。
   */
  private _materializeCapturePayload(raw: unknown, absoluteOut: string): void {
    if (this._isNonEmptyFile(absoluteOut) || raw == null) {
      return;
    }
    if (Buffer.isBuffer(raw)) {
      writeFileSync(absoluteOut, raw);
      return;
    }
    if (raw instanceof Uint8Array) {
      writeFileSync(absoluteOut, Buffer.from(raw));
      return;
    }
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed.startsWith("data:image/") && trimmed.includes(",")) {
        const base64 = trimmed.slice(trimmed.indexOf(",") + 1);
        writeFileSync(absoluteOut, Buffer.from(base64, "base64"));
        return;
      }
      // 纯 base64 PNG/JPEG 常见前缀。
      if (/^[A-Za-z0-9+/=\r\n]+$/u.test(trimmed) && trimmed.length > 64) {
        try {
          writeFileSync(absoluteOut, Buffer.from(trimmed, "base64"));
        } catch {
          // ignore invalid base64
        }
      }
      return;
    }
    if (typeof raw !== "object" || Array.isArray(raw)) {
      return;
    }
    const record = raw as Record<string, unknown>;
    const nested =
      record.data ??
      record.buffer ??
      record.bytes ??
      record.image ??
      record.payload ??
      record.content;
    if (nested != null && nested !== raw) {
      this._materializeCapturePayload(nested, absoluteOut);
    }
  }

  /**
   * @description 可选 playwright 截图。
   * @param url 预览 URL。
   * @param absoluteOut 输出绝对路径。
   * @param input 选项。
   * @returns 是否成功。
   */
  private async _captureWithPlaywright(
    url: string,
    absoluteOut: string,
    input: IPreviewCaptureMcpInput,
  ): Promise<{ readonly ok: boolean; readonly reason: string }> {
    const width =
      typeof input.width === "number" && Number.isFinite(input.width)
        ? Math.max(320, Math.floor(input.width))
        : 1280;
    const height =
      typeof input.height === "number" && Number.isFinite(input.height)
        ? Math.max(240, Math.floor(input.height))
        : 720;
    const waitMs =
      typeof input.waitMs === "number" && Number.isFinite(input.waitMs)
        ? Math.max(0, Math.min(10_000, Math.floor(input.waitMs)))
        : 500;

    // Creator/Electron 主进程常无法直接 load playwright；优先走系统 Node 子进程。
    const projectRoot = await this._resolveProjectRoot();
    const external = this._captureWithExternalNode(
      url,
      absoluteOut,
      width,
      height,
      waitMs,
      projectRoot,
    );
    if (external.ok) {
      return external;
    }

    try {
      const imported = await this._loadPlaywrightModule();
      if (imported == null || typeof imported !== "object") {
        return {
          ok: false,
          reason:
            external.reason !== "ok"
              ? external.reason
              : "playwright_not_installed",
        };
      }
      const chromium = (
        imported as {
          chromium?: {
            launch: (options?: { headless?: boolean }) => Promise<{
              newPage: () => Promise<{
                setViewportSize: (size: {
                  width: number;
                  height: number;
                }) => Promise<void>;
                goto: (
                  target: string,
                  options?: { waitUntil?: string; timeout?: number },
                ) => Promise<unknown>;
                waitForTimeout: (ms: number) => Promise<void>;
                screenshot: (options: {
                  path: string;
                  fullPage?: boolean;
                }) => Promise<Buffer>;
              }>;
              close: () => Promise<void>;
            }>;
          };
        }
      ).chromium;
      if (chromium == null) {
        return { ok: false, reason: "playwright_not_installed" };
      }
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage();
        await page.setViewportSize({ width, height });
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 15_000,
        });
        if (waitMs > 0) {
          await page.waitForTimeout(waitMs);
        }
        await page.screenshot({ path: absoluteOut, fullPage: false });
      } finally {
        await browser.close();
      }
      return this._isNonEmptyFile(absoluteOut)
        ? { ok: true, reason: "ok" }
        : { ok: false, reason: "screenshot_file_missing" };
    } catch (error: unknown) {
      return {
        ok: false,
        reason:
          error instanceof Error ? error.message : "playwright_capture_failed",
      };
    }
  }

  /**
   * @description 用系统 Node + 工程/邻近 playwright 子进程截图（绕过 Electron require 限制）。
   * @param url 预览 URL。
   * @param absoluteOut 输出路径。
   * @param width 视口宽。
   * @param height 视口高。
   * @param waitMs 等待毫秒。
   * @param projectRoot 可选工程根。
   * @returns 是否成功。
   */
  private _captureWithExternalNode(
    url: string,
    absoluteOut: string,
    width: number,
    height: number,
    waitMs: number,
    projectRoot: string | null,
  ): { readonly ok: boolean; readonly reason: string } {
    const playwrightEntry = this._findPlaywrightEntrySync(projectRoot);
    if (playwrightEntry == null) {
      return { ok: false, reason: "playwright_not_installed" };
    }
    const nodeBinary = this._findSystemNodeBinary();
    if (nodeBinary == null) {
      return { ok: false, reason: "system_node_not_found" };
    }
    const script = `
const { chromium } = require(${JSON.stringify(playwrightEntry)});
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: ${width}, height: ${height} });
    await page.goto(${JSON.stringify(url)}, { waitUntil: 'domcontentloaded', timeout: 15000 });
    if (${waitMs} > 0) await page.waitForTimeout(${waitMs});
    await page.screenshot({ path: ${JSON.stringify(absoluteOut)}, fullPage: false });
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
`;
    const result = spawnSync(nodeBinary, ["-e", script], {
      encoding: "utf8",
      timeout: 60_000,
      env: process.env,
    });
    if (result.status === 0 && this._isNonEmptyFile(absoluteOut)) {
      return { ok: true, reason: "ok" };
    }
    const detail = [result.stderr, result.stdout, result.error?.message]
      .filter((part) => typeof part === "string" && part.trim().length > 0)
      .join(" | ")
      .replace(/\s+/gu, " ")
      .slice(0, 240);
    return {
      ok: false,
      reason:
        detail.length > 0
          ? `external_node_capture_failed:${detail}`
          : "external_node_capture_failed",
    };
  }

  /**
   * @description 同步查找 playwright 的 CJS 入口。
   * @param projectRoot 可选工程根。
   * @returns index.js 绝对路径或 null。
   */
  private _findPlaywrightEntrySync(projectRoot: string | null): string | null {
    const moduleName = ["play", "wright"].join("");
    const searchRoots: string[] = [];
    if (projectRoot != null) {
      searchRoots.push(projectRoot);
      let cursor = projectRoot;
      for (let depth = 0; depth < 8; depth += 1) {
        const parent = dirname(cursor);
        if (parent === cursor) {
          break;
        }
        searchRoots.push(parent);
        searchRoots.push(join(parent, "products", "cocos", "editor"));
        cursor = parent;
      }
    }
    searchRoots.push(process.cwd());
    if (
      typeof process.env.PEANUT_PLAYWRIGHT_ROOT === "string" &&
      process.env.PEANUT_PLAYWRIGHT_ROOT.length > 0
    ) {
      searchRoots.push(process.env.PEANUT_PLAYWRIGHT_ROOT);
    }
    try {
      const bundleDir = typeof __dirname === "string" ? __dirname : null;
      if (bundleDir != null) {
        searchRoots.push(bundleDir);
        let cursor = bundleDir;
        for (let depth = 0; depth < 10; depth += 1) {
          const parent = dirname(cursor);
          if (parent === cursor) {
            break;
          }
          searchRoots.push(parent);
          searchRoots.push(join(parent, "products", "cocos", "editor"));
          cursor = parent;
        }
      }
    } catch {
      // ignore
    }
    for (const root of [...new Set(searchRoots)]) {
      const entry = join(root, "node_modules", moduleName, "index.js");
      if (existsSync(entry)) {
        return entry;
      }
    }
    return null;
  }

  /**
   * @description 查找可用于跑 playwright 的系统 Node 可执行文件（非 Electron）。
   * @returns 绝对路径或 null。
   */
  private _findSystemNodeBinary(): string | null {
    const candidates = [
      process.env.PEANUT_NODE_BINARY,
      "/opt/homebrew/bin/node",
      "/usr/local/bin/node",
      "/usr/bin/node",
    ].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }
    try {
      const which = spawnSync("/usr/bin/which", ["node"], { encoding: "utf8" });
      const resolved = which.stdout?.trim();
      if (resolved && existsSync(resolved) && !resolved.includes("Electron")) {
        return resolved;
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * @description 从 Creator 进程 / 工程 / 仓库邻近目录解析 playwright。
   * @returns playwright 模块或 null。
   */
  private async _loadPlaywrightModule(): Promise<unknown | null> {
    const moduleName = ["play", "wright"].join("");
    const load = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<unknown>;
    try {
      const imported = await load(moduleName);
      if (imported != null && typeof imported === "object") {
        return imported;
      }
    } catch {
      // fall through to path search
    }

    const searchRoots: string[] = [];
    const projectRoot = await this._resolveProjectRoot();
    if (projectRoot != null) {
      searchRoots.push(projectRoot);
      let cursor = projectRoot;
      for (let depth = 0; depth < 8; depth += 1) {
        const parent = dirname(cursor);
        if (parent === cursor) {
          break;
        }
        searchRoots.push(parent);
        searchRoots.push(join(parent, "products", "cocos", "editor"));
        cursor = parent;
      }
    }
    try {
      const bundleDir = typeof __dirname === "string" ? __dirname : null;
      if (bundleDir != null) {
        searchRoots.push(bundleDir);
        searchRoots.push(dirname(bundleDir));
      }
    } catch {
      // ignore
    }

    for (const root of searchRoots) {
      const packageJson = join(
        root,
        "node_modules",
        moduleName,
        "package.json",
      );
      const cjsEntry = join(root, "node_modules", moduleName, "index.js");
      if (!existsSync(packageJson) || !existsSync(cjsEntry)) {
        continue;
      }
      try {
        // 用目标包目录做 createRequire 基准，避免 Creator cwd 下的 resolve 失败。
        const requireFromPackage = createRequire(
          pathToFileURL(packageJson).href,
        );
        const loaded = requireFromPackage(cjsEntry);
        if (loaded != null && typeof loaded === "object") {
          return loaded;
        }
      } catch {
        try {
          const imported = await load(pathToFileURL(cjsEntry).href);
          if (imported != null && typeof imported === "object") {
            return imported;
          }
        } catch {
          // try next root
        }
      }
    }
    return null;
  }

  /**
   * @description 解析预览 payload。
   * @param raw 原始返回。
   * @param source 来源。
   * @returns 结构化结果。
   */
  private _parsePreviewPayload(
    raw: unknown,
    source: "live" | "fallback",
  ): IEditorMcpPreviewResultDraft | null {
    if (raw == null) {
      return null;
    }
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return {
        available: true,
        source,
        message: "preview_query_ok",
        port: raw,
        url: `http://127.0.0.1:${raw}`,
      };
    }
    if (typeof raw === "string" && raw.length > 0) {
      if (/^\d+$/.test(raw)) {
        const port = Number(raw);
        return {
          available: true,
          source,
          message: "preview_query_ok",
          port,
          url: `http://127.0.0.1:${port}`,
        };
      }
      return { available: true, source, message: "preview_query_ok", url: raw };
    }
    if (typeof raw !== "object" || Array.isArray(raw)) {
      return null;
    }
    const record = raw as Record<string, unknown>;
    const nestedCandidates = [record];
    for (const key of [
      "data",
      "result",
      "preview",
      "settings",
      "general",
    ] as const) {
      const child = record[key];
      if (child != null && typeof child === "object" && !Array.isArray(child)) {
        nestedCandidates.push(child as Record<string, unknown>);
      }
    }
    let url: string | undefined;
    let port: number | undefined;
    let startScene: string | undefined;
    for (const node of nestedCandidates) {
      if (url == null) {
        if (typeof node.url === "string" && node.url.trim().length > 0) {
          url = node.url.trim();
        } else if (
          typeof node.previewUrl === "string" &&
          node.previewUrl.trim().length > 0
        ) {
          url = node.previewUrl.trim();
        } else if (
          typeof node.previewURL === "string" &&
          node.previewURL.trim().length > 0
        ) {
          url = node.previewURL.trim();
        }
      }
      if (port == null) {
        if (typeof node.port === "number" && Number.isFinite(node.port)) {
          port = node.port;
        } else if (
          typeof node.previewPort === "number" &&
          Number.isFinite(node.previewPort)
        ) {
          port = node.previewPort;
        } else if (
          typeof node.port === "string" &&
          /^\d+$/.test(node.port.trim())
        ) {
          port = Number(node.port.trim());
        }
      }
      if (startScene == null) {
        if (
          typeof node.startScene === "string" &&
          node.startScene.trim().length > 0
        ) {
          startScene = node.startScene.trim();
        } else if (
          typeof node.scene === "string" &&
          node.scene.trim().length > 0
        ) {
          startScene = node.scene.trim();
        } else if (
          typeof node.launchScene === "string" &&
          node.launchScene.trim().length > 0
        ) {
          startScene = node.launchScene.trim();
        }
      }
    }
    if (url == null && port == null && startScene == null) {
      return null;
    }
    return {
      available: true,
      source,
      message: "preview_query_ok",
      url: url ?? (port != null ? `http://127.0.0.1:${port}` : undefined),
      port,
      startScene,
    };
  }

  /**
   * @description 解析错误行。
   * @param raw 原始返回。
   * @param limit 上限。
   * @returns 错误行。
   */
  private _parseErrorLines(raw: unknown, limit: number): readonly string[] {
    if (Array.isArray(raw)) {
      return raw
        .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
        .filter((item) => item.length > 0)
        .slice(0, limit);
    }
    if (typeof raw === "string" && raw.length > 0) {
      return raw
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0)
        .slice(0, limit);
    }
    if (raw != null && typeof raw === "object") {
      const record = raw as Record<string, unknown>;
      if (Array.isArray(record.logs)) {
        return this._parseErrorLines(record.logs, limit);
      }
      if (Array.isArray(record.errors)) {
        return this._parseErrorLines(record.errors, limit);
      }
    }
    return [];
  }
}
