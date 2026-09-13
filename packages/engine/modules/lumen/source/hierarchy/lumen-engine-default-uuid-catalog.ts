import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

import { LumenDefaultTemplateRoot } from "../templates/default-root.js";

/**
 * @description 引擎 / default_prefab 内置资源 uuid 目录（用于 validateRefs 降噪）。
 */
export class LumenEngineDefaultUuidCatalog {
  /** @description 进程内缓存：模板根 → uuid 集合。 */
  private static readonly _cache = new Map<string, ReadonlySet<string>>();

  /** @description `LumenSceneScaffold` 使用的 Creator 内置天空盒资源。 */
  private static readonly _sceneBuiltinUuids = [
    "d032ac98-05e1-4090-88bb-eb640dcb5fc1@b47c0",
    "6f01cf7f-81bf-4a7e-bd5d-0afc19696480@b47c0",
  ] as const;

  /**
   * @description 判断 uuid（可含 `@sub`）是否为引擎 / 内置模板默认资源。
   * @param uuid 标准或压缩 uuid；可含 `@` 子资源后缀。
   * @param templateRoot 可选 default_prefab 根；省略则解析随包模板。
   * @returns 是否为内置默认。
   */
  public static isEngineDefault(uuid: string, templateRoot?: string): boolean {
    const trimmed = uuid.trim();
    if (trimmed.length === 0) {
      return false;
    }
    const known = this.load(templateRoot);
    if (known.has(trimmed)) {
      return true;
    }
    const base = trimmed.includes("@")
      ? trimmed.slice(0, trimmed.indexOf("@"))
      : trimmed;
    return known.has(base);
  }

  /**
   * @description 加载（并缓存）内置 uuid 集合。
   * @param templateRoot 可选模板根。
   * @returns uuid 集合。
   */
  public static load(templateRoot?: string): ReadonlySet<string> {
    let root: string;
    try {
      root = templateRoot?.trim() || LumenDefaultTemplateRoot.resolveBundled();
    } catch {
      return new Set();
    }
    const cached = this._cache.get(root);
    if (cached != null) {
      return cached;
    }
    const uuids = new Set<string>();
    for (const uuid of this._sceneBuiltinUuids) {
      this._addUuid(uuid, uuids);
    }
    this._scanDirectory(root, uuids);
    this._cache.set(root, uuids);
    return uuids;
  }

  /**
   * @description 测试用：清空缓存。
   * @returns 无。
   */
  public static clearCacheForTests(): void {
    this._cache.clear();
  }

  /**
   * @description 递归扫描 prefab / scene / meta 中的 uuid。
   * @param directory 目录。
   * @param uuids 输出集合。
   * @returns 无。
   */
  private static _scanDirectory(directory: string, uuids: Set<string>): void {
    if (!existsSync(directory)) {
      return;
    }
    let entries: string[];
    try {
      entries = readdirSync(directory);
    } catch {
      return;
    }
    for (const name of entries) {
      const absolute = join(directory, name);
      let isDirectory = false;
      try {
        isDirectory = statSync(absolute).isDirectory();
      } catch {
        continue;
      }
      if (isDirectory) {
        this._scanDirectory(absolute, uuids);
        continue;
      }
      const lower = name.toLowerCase();
      if (lower.endsWith(".prefab") || lower.endsWith(".scene")) {
        this._harvestFromText(readFileSafe(absolute), uuids);
        continue;
      }
      if (lower.endsWith(".meta")) {
        this._harvestFromMeta(readFileSafe(absolute), uuids);
      }
    }
  }

  /**
   * @description 从序列化文本收获 `__uuid__`。
   * @param text 文件内容。
   * @param uuids 输出。
   * @returns 无。
   */
  private static _harvestFromText(text: string, uuids: Set<string>): void {
    const pattern = /"__uuid__"\s*:\s*"([^"]+)"/g;
    let match: RegExpExecArray | null = pattern.exec(text);
    while (match != null) {
      this._addUuid(match[1] ?? "", uuids);
      match = pattern.exec(text);
    }
  }

  /**
   * @description 从 `.meta` JSON 收获 uuid / subMetas。
   * @param text meta 文本。
   * @param uuids 输出。
   * @returns 无。
   */
  private static _harvestFromMeta(text: string, uuids: Set<string>): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return;
    }
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return;
    }
    const record = parsed as Record<string, unknown>;
    if (typeof record.uuid === "string") {
      this._addUuid(record.uuid, uuids);
    }
    const subMetas = record.subMetas;
    if (
      subMetas != null &&
      typeof subMetas === "object" &&
      !Array.isArray(subMetas)
    ) {
      for (const value of Object.values(subMetas as Record<string, unknown>)) {
        if (
          value != null &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          const uuid = (value as { uuid?: unknown }).uuid;
          if (typeof uuid === "string") {
            this._addUuid(uuid, uuids);
          }
        }
      }
    }
  }

  /**
   * @description 写入完整 uuid 与去掉 `@sub` 的基 uuid。
   * @param uuid 原始。
   * @param uuids 输出。
   * @returns 无。
   */
  private static _addUuid(uuid: string, uuids: Set<string>): void {
    const trimmed = uuid.trim();
    if (trimmed.length === 0) {
      return;
    }
    uuids.add(trimmed);
    if (trimmed.includes("@")) {
      uuids.add(trimmed.slice(0, trimmed.indexOf("@")));
    }
  }
}

/**
 * @description 安全读文本；失败返回空串。
 * @param absolutePath 绝对路径。
 * @returns 文本。
 * @oopException 纯 IO 辅助。
 */
function readFileSafe(absolutePath: string): string {
  try {
    return readFileSync(absolutePath, "utf8");
  } catch {
    return "";
  }
}
