import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

import type { IAssetImportMessagePort } from "./asset-import-batch-executor";

/** @description Cocos SpriteFrame 子资源稳定 class id；子资源 UUID 形如 `<imageUuid>@f9941`。 */
const SPRITE_FRAME_SUB_ASSET_CLASS_ID = "f9941";

/** @description Cocos Texture 子资源稳定 class id。 */
const TEXTURE_SUB_ASSET_CLASS_ID = "6c48a";

/** @description 等待 SpriteFrame 子资源就绪的最大轮询次数。 */
const SPRITE_FRAME_READY_ATTEMPTS = 40;

/** @description 每次轮询间隔（毫秒）。 */
const SPRITE_FRAME_READY_DELAY_MS = 250;

/**
 * @description 单项 SpriteFrame 提升结果状态。
 */
export type SpriteFrameEnsureStatus =
  | "already"
  | "ensured"
  | "failed"
  | "skipped";

/**
 * @description 单项 SpriteFrame 提升结果。
 */
export interface ISpriteFrameEnsureItemResult {
  /** @description 入参路径（原样回传）。 */
  readonly dbPath: string;
  /** @description 规范化后的 `db://assets/...` URL。 */
  readonly dbUrl: string;
  /** @description 提升状态。 */
  readonly status: SpriteFrameEnsureStatus;
  /** @description 成功时的 SpriteFrame UUID。 */
  readonly spriteFrameUuid?: string;
  /** @description 失败原因。 */
  readonly error?: string;
}

/**
 * @description 批量 SpriteFrame 提升结果。
 */
export interface IEnsureSpriteFramesBatchResult {
  /** @description 已有 SpriteFrame、无需改写的数量。 */
  readonly already: number;
  /** @description 本次经 `save-asset-meta` 提升成功的数量。 */
  readonly ensured: number;
  /** @description 失败数量。 */
  readonly errors: number;
  /** @description 跳过（非 PNG / 非 image）数量。 */
  readonly skipped: number;
  /** @description 逐项结果。 */
  readonly items: readonly ISpriteFrameEnsureItemResult[];
}

/**
 * @description 批量提升请求。
 */
export interface IEnsureSpriteFramesBatchRequest {
  /** @description Creator 工程根目录。 */
  readonly projectRoot: string;
  /** @description `db://assets/...` 或 `assets/...` 路径列表。 */
  readonly dbPaths: readonly string[];
  /** @description 可选批量刷新根（最后一次 `refresh-asset`）；省略则逐项刷新。 */
  readonly refreshRoot?: string;
}

/**
 * @description 从已有 image meta 与 PNG 尺寸构造含 `@f9941` 的 SpriteFrame meta（与 host bridge 同构）。
 */
export class SpriteFrameMetaBuilder {
  /**
   * @description 判断未知值是否为普通记录。
   * @param value 未经信任的输入。
   * @returns 可读取字符串键时返回 true。
   */
  public static isRecord(
    value: unknown,
  ): value is Record<string, unknown> {
    return typeof value === "object" && value != null && !Array.isArray(value);
  }

  /**
   * @description 从 Creator AssetDB / meta 响应中提取可选 uuid。
   * @param value 资源或 meta。
   * @returns uuid；缺失时为 null。
   */
  public static readAssetUuid(value: unknown): string | null {
    if (!SpriteFrameMetaBuilder.isRecord(value)) {
      return null;
    }
    if (typeof value.uuid === "string" && value.uuid.length > 0) {
      return value.uuid;
    }
    return SpriteFrameMetaBuilder.readAssetUuid(value.asset);
  }

  /**
   * @description 从 AssetDB 信息或 meta 中提取 SpriteFrame 子资源 UUID。
   * @param value query-asset-info / query-asset-meta 返回值。
   * @returns SpriteFrame UUID；缺失时为 null。
   */
  public static readSpriteFrameUuid(value: unknown): string | null {
    if (!SpriteFrameMetaBuilder.isRecord(value)) {
      return null;
    }
    if (
      typeof value.spriteFrameUuid === "string" &&
      value.spriteFrameUuid.length > 0
    ) {
      return value.spriteFrameUuid;
    }
    for (const collectionKey of ["subMetas", "subAssets"] as const) {
      const collection = value[collectionKey];
      if (!SpriteFrameMetaBuilder.isRecord(collection)) {
        continue;
      }
      for (const [key, item] of Object.entries(collection)) {
        const uuid = SpriteFrameMetaBuilder.readAssetUuid(item);
        if (
          uuid != null &&
          uuid.endsWith(`@${SPRITE_FRAME_SUB_ASSET_CLASS_ID}`)
        ) {
          return uuid;
        }
        if (
          key.toLowerCase().includes("spriteframe") ||
          SpriteFrameMetaBuilder._subAssetDisplayNameContainsSpriteFrame(item)
        ) {
          const resolved = SpriteFrameMetaBuilder.readAssetUuid(item);
          if (resolved != null) {
            return resolved;
          }
        }
      }
    }
    return SpriteFrameMetaBuilder.readSpriteFrameUuid(value.asset);
  }

  /**
   * @description 读取 PNG IHDR 中的像素尺寸。
   * @param content PNG 二进制内容。
   * @returns 图片宽高。
   */
  public static readPngDimensions(
    content: Uint8Array,
  ): Readonly<{ width: number; height: number }> {
    if (
      content.byteLength < 24 ||
      content[0] !== 137 ||
      content[1] !== 80 ||
      content[2] !== 78 ||
      content[3] !== 71
    ) {
      throw new Error("lumen_sprite_frame_png_invalid");
    }
    const view = new DataView(
      content.buffer,
      content.byteOffset,
      content.byteLength,
    );
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    if (width === 0 || height === 0) {
      throw new Error("lumen_sprite_frame_png_invalid");
    }
    return { width, height };
  }

  /**
   * @description 构造含 texture + sprite-frame 子资源的下一版 image meta。
   * @param meta 现有 meta（须含 uuid）。
   * @param dbUrl `db://assets/.../*.png`。
   * @param content PNG 内容（用于尺寸）。
   * @returns 可交给 `save-asset-meta` 的完整 meta 对象。
   */
  public static buildNextMeta(
    meta: Record<string, unknown>,
    dbUrl: string,
    content: Uint8Array,
  ): Record<string, unknown> {
    const { width, height } =
      SpriteFrameMetaBuilder.readPngDimensions(content);
    const imageUuid = SpriteFrameMetaBuilder.readAssetUuid(meta);
    if (imageUuid == null) {
      throw new Error("lumen_sprite_frame_meta_uuid_missing");
    }
    const textureUuid = `${imageUuid}@${TEXTURE_SUB_ASSET_CLASS_ID}`;
    const spriteFrameUuid = `${imageUuid}@${SPRITE_FRAME_SUB_ASSET_CLASS_ID}`;
    const displayName = dbUrl.slice(dbUrl.lastIndexOf("/") + 1).replace(/\.png$/i, "");
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const subMetas = SpriteFrameMetaBuilder.isRecord(meta.subMetas)
      ? meta.subMetas
      : {};
    const userData = SpriteFrameMetaBuilder.isRecord(meta.userData)
      ? meta.userData
      : {};
    const existingTexture = subMetas[TEXTURE_SUB_ASSET_CLASS_ID];
    return {
      ...meta,
      importer: "image",
      imported: true,
      uuid: imageUuid,
      files: Array.isArray(meta.files) ? meta.files : [".json", ".png"],
      subMetas: {
        ...subMetas,
        [TEXTURE_SUB_ASSET_CLASS_ID]: SpriteFrameMetaBuilder.isRecord(
          existingTexture,
        )
          ? existingTexture
          : {
              importer: "texture",
              uuid: textureUuid,
              displayName,
              id: TEXTURE_SUB_ASSET_CLASS_ID,
              name: "texture",
              userData: {
                wrapModeS: "repeat",
                wrapModeT: "repeat",
                minfilter: "linear",
                magfilter: "linear",
                mipfilter: "none",
                anisotropy: 0,
                isUuid: true,
                imageUuidOrDatabaseUri: imageUuid,
                visible: false,
              },
              ver: "1.0.22",
              imported: true,
              files: [".json"],
              subMetas: {},
            },
        [SPRITE_FRAME_SUB_ASSET_CLASS_ID]: {
          importer: "sprite-frame",
          uuid: spriteFrameUuid,
          displayName,
          id: SPRITE_FRAME_SUB_ASSET_CLASS_ID,
          name: "spriteFrame",
          userData: {
            trimType: "auto",
            trimThreshold: 1,
            rotated: false,
            offsetX: 0,
            offsetY: 0,
            trimX: 0,
            trimY: 0,
            width,
            height,
            rawWidth: width,
            rawHeight: height,
            borderTop: 0,
            borderBottom: 0,
            borderLeft: 0,
            borderRight: 0,
            packable: true,
            pixelsToUnit: 100,
            pivotX: 0.5,
            pivotY: 0.5,
            meshType: 0,
            vertices: {
              rawPosition: [
                -halfWidth,
                -halfHeight,
                0,
                halfWidth,
                -halfHeight,
                0,
                -halfWidth,
                halfHeight,
                0,
                halfWidth,
                halfHeight,
                0,
              ],
              indexes: [0, 1, 2, 2, 1, 3],
              uv: [0, height, width, height, 0, 0, width, 0],
              nuv: [0, 0, 1, 0, 0, 1, 1, 1],
              minPos: [-halfWidth, -halfHeight, 0],
              maxPos: [halfWidth, halfHeight, 0],
            },
            isUuid: true,
            imageUuidOrDatabaseUri: textureUuid,
            atlasUuid: "",
          },
          ver: "1.0.12",
          imported: true,
          files: [".json"],
          subMetas: {},
        },
      },
      userData: {
        ...userData,
        type: "sprite-frame",
        redirect: textureUuid,
      },
    };
  }

  /**
   * @description 将路径规范为 `db://...` URL。
   * @param pathOrUrl `db://` 或项目相对路径。
   * @returns 规范化 URL。
   */
  public static toDbUrl(pathOrUrl: string): string {
    const trimmed = pathOrUrl.trim();
    if (trimmed.length === 0) {
      throw new Error("lumen_sprite_frame_path_empty");
    }
    if (trimmed.startsWith("db://")) {
      return trimmed;
    }
    return `db://${trimmed.replace(/^\/+/, "")}`;
  }

  /**
   * @description 从 `db://` URL 得到工程相对路径。
   * @param dbUrl 已规范化 URL。
   * @returns 相对工程根的路径（POSIX）。
   */
  public static toProjectRelative(dbUrl: string): string {
    return dbUrl.replace(/^db:\/\//, "").split("\\").join("/");
  }

  /**
   * @description 判断子资源条目的人类可读名是否指示 SpriteFrame。
   * @param item AssetDB 子资源条目。
   * @returns `name`/`displayName` 含 spriteframe 时为 true。
   */
  private static _subAssetDisplayNameContainsSpriteFrame(
    item: unknown,
  ): boolean {
    if (!SpriteFrameMetaBuilder.isRecord(item)) {
      return false;
    }
    const name = typeof item.name === "string" ? item.name : "";
    const displayName =
      typeof item.displayName === "string" ? item.displayName : "";
    return (
      name.toLowerCase().includes("spriteframe") ||
      displayName.toLowerCase().includes("spriteframe")
    );
  }
}

/**
 * @description 经 AssetDB `save-asset-meta` 批量把已导入 PNG 提升为含 `@f9941` 的 SpriteFrame。
 * 优先走宿主 API，避免直接改盘 `.meta` 后再 reimport 引发的 UI 竞态。
 */
export class EnsureSpriteFramesBatchService {
  /** @description Creator 消息端口。 */
  private readonly _message: IAssetImportMessagePort;

  /**
   * @description 构造批量提升服务。
   * @param message AssetDB 消息端口。
   */
  public constructor(message: IAssetImportMessagePort) {
    this._message = message;
  }

  /**
   * @description 批量确保 PNG 具备 SpriteFrame 子资源。
   * @param request 工程根与路径列表。
   * @returns 汇总与逐项结果。
   */
  public async ensureBatch(
    request: IEnsureSpriteFramesBatchRequest,
  ): Promise<IEnsureSpriteFramesBatchResult> {
    const projectRoot = resolve(request.projectRoot);
    if (!existsSync(projectRoot)) {
      throw new Error(`lumen_sprite_frame_project_missing:${projectRoot}`);
    }
    if (!Array.isArray(request.dbPaths) || request.dbPaths.length === 0) {
      throw new Error("lumen_sprite_frame_db_paths_required");
    }
    const refreshRoot =
      typeof request.refreshRoot === "string" &&
      request.refreshRoot.trim().length > 0
        ? SpriteFrameMetaBuilder.toDbUrl(request.refreshRoot)
        : null;
    const items: ISpriteFrameEnsureItemResult[] = [];
    let already = 0;
    let ensured = 0;
    let errors = 0;
    let skipped = 0;
    for (const rawPath of request.dbPaths) {
      if (typeof rawPath !== "string" || rawPath.trim().length === 0) {
        items.push({
          dbPath: String(rawPath),
          dbUrl: "",
          status: "failed",
          error: "lumen_sprite_frame_path_empty",
        });
        errors += 1;
        continue;
      }
      const item = await this._ensureOne(
        projectRoot,
        rawPath.trim(),
        refreshRoot == null,
      );
      items.push(item);
      if (item.status === "already") {
        already += 1;
      } else if (item.status === "ensured") {
        ensured += 1;
      } else if (item.status === "skipped") {
        skipped += 1;
      } else {
        errors += 1;
      }
    }
    if (refreshRoot != null && ensured > 0) {
      await this._refreshAsset(refreshRoot);
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (item == null || item.status !== "ensured") {
          continue;
        }
        const waited = await this._waitForSpriteFrame(item.dbUrl);
        const uuid = SpriteFrameMetaBuilder.readSpriteFrameUuid(waited);
        if (uuid != null) {
          items[index] = { ...item, spriteFrameUuid: uuid };
        }
      }
    }
    return { already, ensured, errors, skipped, items };
  }

  /**
   * @description 提升单项 PNG。
   * @param projectRoot 工程根。
   * @param rawPath 入参路径。
   * @param refreshInline 是否在本项内 refresh+wait。
   * @returns 单项结果。
   */
  private async _ensureOne(
    projectRoot: string,
    rawPath: string,
    refreshInline: boolean,
  ): Promise<ISpriteFrameEnsureItemResult> {
    let dbUrl: string;
    try {
      dbUrl = SpriteFrameMetaBuilder.toDbUrl(rawPath);
    } catch (error) {
      return {
        dbPath: rawPath,
        dbUrl: "",
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
    if (!dbUrl.toLowerCase().endsWith(".png")) {
      return {
        dbPath: rawPath,
        dbUrl,
        status: "skipped",
        error: "lumen_sprite_frame_not_png",
      };
    }
    const relative = SpriteFrameMetaBuilder.toProjectRelative(dbUrl);
    const absolute = resolve(join(projectRoot, ...relative.split("/")));
    if (
      absolute !== projectRoot &&
      !absolute.startsWith(`${projectRoot}/`) &&
      !absolute.startsWith(`${projectRoot}\\`)
    ) {
      return {
        dbPath: rawPath,
        dbUrl,
        status: "failed",
        error: "lumen_sprite_frame_path_escape",
      };
    }
    if (!existsSync(absolute)) {
      return {
        dbPath: rawPath,
        dbUrl,
        status: "failed",
        error: "lumen_sprite_frame_file_missing",
      };
    }
    try {
      const meta = await this._queryAssetMeta(dbUrl);
      const info = await this._queryAssetInfo(dbUrl);
      const existing =
        SpriteFrameMetaBuilder.readSpriteFrameUuid(meta) ??
        SpriteFrameMetaBuilder.readSpriteFrameUuid(info);
      if (existing != null) {
        return {
          dbPath: rawPath,
          dbUrl,
          status: "already",
          spriteFrameUuid: existing,
        };
      }
      if (
        meta == null ||
        !SpriteFrameMetaBuilder.isRecord(meta) ||
        meta.importer !== "image"
      ) {
        return {
          dbPath: rawPath,
          dbUrl,
          status: "failed",
          error: "lumen_sprite_frame_not_image_importer",
        };
      }
      const content = new Uint8Array(readFileSync(absolute));
      const nextMeta = SpriteFrameMetaBuilder.buildNextMeta(
        meta,
        dbUrl,
        content,
      );
      await this._message.request(
        "asset-db",
        "save-asset-meta",
        dbUrl,
        JSON.stringify(nextMeta, null, 4),
      );
      let spriteFrameUuid =
        SpriteFrameMetaBuilder.readSpriteFrameUuid(nextMeta) ?? undefined;
      if (refreshInline) {
        await this._refreshAsset(dbUrl);
        const waited = await this._waitForSpriteFrame(dbUrl);
        spriteFrameUuid =
          SpriteFrameMetaBuilder.readSpriteFrameUuid(waited) ??
          spriteFrameUuid;
      }
      if (spriteFrameUuid == null) {
        return {
          dbPath: rawPath,
          dbUrl,
          status: "failed",
          error: "lumen_sprite_frame_not_ready",
        };
      }
      return {
        dbPath: rawPath,
        dbUrl,
        status: "ensured",
        spriteFrameUuid,
      };
    } catch (error) {
      return {
        dbPath: rawPath,
        dbUrl,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * @description 查询资源 meta。
   * @param dbUrl `db://` URL。
   * @returns meta 或 null。
   */
  private async _queryAssetMeta(
    dbUrl: string,
  ): Promise<Record<string, unknown> | null> {
    for (const message of ["query-asset-meta", "query-meta"] as const) {
      try {
        const value = await this._message.request("asset-db", message, dbUrl);
        if (SpriteFrameMetaBuilder.isRecord(value)) {
          return value;
        }
      } catch {
        // try next
      }
    }
    return null;
  }

  /**
   * @description 查询资源 info。
   * @param dbUrl `db://` URL。
   * @returns info 或 null。
   */
  private async _queryAssetInfo(dbUrl: string): Promise<unknown | null> {
    try {
      return await this._message.request("asset-db", "query-asset-info", dbUrl);
    } catch {
      return null;
    }
  }

  /**
   * @description 刷新资源。
   * @param dbUrl `db://` URL。
   * @returns 无。
   */
  private async _refreshAsset(dbUrl: string): Promise<void> {
    await this._message.request("asset-db", "refresh-asset", dbUrl);
  }

  /**
   * @description 等待 SpriteFrame 子资源出现在 AssetDB。
   * @param dbUrl `db://` URL。
   * @returns 最后一次 query-asset-info 快照。
   */
  private async _waitForSpriteFrame(dbUrl: string): Promise<unknown | null> {
    let last: unknown | null = null;
    for (let attempt = 0; attempt < SPRITE_FRAME_READY_ATTEMPTS; attempt += 1) {
      last = await this._queryAssetInfo(dbUrl);
      if (SpriteFrameMetaBuilder.readSpriteFrameUuid(last) != null) {
        return last;
      }
      if (attempt < SPRITE_FRAME_READY_ATTEMPTS - 1) {
        await EnsureSpriteFramesBatchService._delay(
          SPRITE_FRAME_READY_DELAY_MS,
        );
      }
    }
    return last;
  }

  /**
   * @description 等待指定毫秒。
   * @param milliseconds 时长。
   * @returns 无。
   */
  private static async _delay(milliseconds: number): Promise<void> {
    await new Promise<void>((resolveDelay) => {
      setTimeout(resolveDelay, milliseconds);
    });
  }
}
