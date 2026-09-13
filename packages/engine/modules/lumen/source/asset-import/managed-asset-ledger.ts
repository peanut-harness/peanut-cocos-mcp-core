import { createHash, randomBytes } from 'crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { spawnSync } from 'child_process';

/**
 * @description 生成 UUID v4（兼容 Creator 2.4 旧 Node，不用 `crypto.randomUUID`）。
 * @returns uuid
 */
function createUuidV4(): string {
    const bytes = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * @description 受管导入账本模式：关闭 / 仅新资产 / 严格。
 */
export type ManagedAssetsMode = 'off' | 'new-assets' | 'strict';

/**
 * @description 导入计划票据。
 */
export interface IManagedImportPlanTicket {
    /** @description 票据 id。 */
    readonly id: string;
    /** @description 源闭包指纹。 */
    readonly fingerprint: string;
    /** @description 规范化后的源路径列表。 */
    readonly sources: readonly string[];
    /** @description 创建时间（ISO）。 */
    readonly createdAt: string;
}

/**
 * @description 账本中单条已导入资产。
 */
export interface IManagedAssetEntry {
    /** @description 源文件绝对路径。 */
    readonly source: string;
    /** @description 源内容哈希。 */
    readonly sourceHash: string;
    /** @description 目标 `db://assets/...` 路径。 */
    readonly target: string;
    /** @description 导入时记录的 AssetDB uuid。 */
    readonly uuid?: string;
    /** @description 关联 plan id。 */
    readonly planId: string;
    /** @description 导入时间（ISO）。 */
    readonly importedAt: string;
    /** @description 导入时 AssetDB 是否已 ready。 */
    readonly assetDbReady: boolean;
}

/**
 * @description 非受管写盘审计条目。
 */
export interface IUnmanagedAssetWriteHit {
    /** @description `db://assets/...` 目标。 */
    readonly target: string;
    /** @description 工程相对路径。 */
    readonly relativePath: string;
    /** @description 最近修改时间 ISO。 */
    readonly modifiedAt: string;
    /** @description 是否在账本中（false=完全未登记）。 */
    readonly managed: boolean;
    /** @description 失败原因。 */
    readonly reason: 'UNMANAGED_ASSET' | 'RESOURCE_CHANGED_OUTSIDE_MCP' | 'IMPORT_NOT_VERIFIED';
}

/**
 * @description 非受管写盘审计结果。
 */
export interface IUnmanagedAssetWriteAudit {
    /** @description 当前模式。 */
    readonly mode: ManagedAssetsMode;
    /** @description 命中条目。 */
    readonly hits: readonly IUnmanagedAssetWriteHit[];
    /** @description 是否截断。 */
    readonly truncated: boolean;
    /** @description 可选 git porcelain 行。 */
    readonly gitStatus?: readonly string[];
}

/**
 * @description 单目标受管状态。
 */
export interface IManagedAssetStatus {
    /** @description 目标路径。 */
    readonly target: string;
    /** @description 当前模式。 */
    readonly mode: ManagedAssetsMode;
    /** @description 是否在账本中。 */
    readonly managed: boolean;
    /** @description 是否按启用时间祖父化（new-assets 下旧文件）。 */
    readonly grandfathered: boolean;
    /** @description 是否通过校验。 */
    readonly verified: boolean;
    /** @description uuid 是否与账本一致。 */
    readonly uuidMatched: boolean;
    /** @description 源是否相对导入时已变。 */
    readonly sourceChanged: boolean;
    /** @description 失败原因码。 */
    readonly reason?: string;
    /** @description 账本条目。 */
    readonly entry?: IManagedAssetEntry;
}

/**
 * @description 账本磁盘文档。
 */
interface IManagedAssetLedgerDocument {
    /** @description schema 版本。 */
    readonly schemaVersion: 1;
    /** @description 账本启用时间。 */
    readonly enabledAt: string;
    /** @description 当前模式。 */
    mode: ManagedAssetsMode;
    /** @description 近期计划票据。 */
    plans: IManagedImportPlanTicket[];
    /** @description 目标路径 → 条目。 */
    assets: Record<string, IManagedAssetEntry>;
}

/** @description 计划票据默认存活时间（10 分钟）。 */
const PLAN_TTL_MS = 10 * 60_000;

/**
 * @description MCP 导入账本：plan 票据、导入记录与受管校验（补 L3 旁路检疫）。
 */
export class ManagedAssetLedger {
    /** @description 工程根绝对路径。 */
    private readonly _projectRoot: string;

    /**
     * @description 绑定工程根。
     * @param projectRoot 工程根绝对路径。
     */
    public constructor(projectRoot: string) {
        this._projectRoot = resolve(projectRoot);
    }

    /**
     * @description 读取当前模式。
     * @returns 模式。
     */
    public mode(): ManagedAssetsMode {
        return this._read().mode;
    }

    /**
     * @description 更新模式并落盘。
     * @param mode 新模式。
     * @returns 无。
     */
    public setMode(mode: ManagedAssetsMode): void {
        const document = this._read();
        document.mode = mode;
        this._write(document);
    }

    /**
     * @description 记录导入计划并返回票据。
     * @param sources 源路径列表。
     * @returns 票据。
     */
    public recordPlan(sources: readonly string[]): IManagedImportPlanTicket {
        const document = this._read();
        const normalized = normalizeSources(this._projectRoot, sources);
        const ticket: IManagedImportPlanTicket = {
            id: createUuidV4(),
            fingerprint: fingerprint(normalized),
            sources: normalized,
            createdAt: new Date().toISOString(),
        };
        const cutoff = Date.now() - PLAN_TTL_MS;
        document.plans = document.plans
            .filter((plan) => Date.parse(plan.createdAt) >= cutoff)
            .concat(ticket)
            .slice(-100);
        this._write(document);
        return ticket;
    }

    /**
     * @description 要求存在匹配近期计划的票据。
     * @param sources 源闭包。
     * @param explicitPlanId 可选显式 planId。
     * @returns 票据。
     */
    public requireRecentPlan(sources: readonly string[], explicitPlanId?: string): IManagedImportPlanTicket {
        const document = this._read();
        const expected = fingerprint(normalizeSources(this._projectRoot, sources));
        const now = Date.now();
        const ticket = [...document.plans].reverse().find(
            (plan) =>
                plan.fingerprint === expected &&
                (explicitPlanId == null || plan.id === explicitPlanId) &&
                now - Date.parse(plan.createdAt) <= PLAN_TTL_MS,
        );
        if (ticket == null) {
            throw new Error(
                'IMPORT_PLAN_REQUIRED: call asset.importPlan for the same dependency closure before asset.import.',
            );
        }
        return ticket;
    }

    /**
     * @description 记录一次成功导入。
     * @param input 导入结果字段。
     * @returns 账本条目。
     */
    public recordImport(input: {
        source: string;
        target: string;
        uuid?: string;
        planId: string;
        assetDbReady: boolean;
    }): IManagedAssetEntry {
        const document = this._read();
        const absoluteSource = resolve(this._projectRoot, input.source);
        const entry: IManagedAssetEntry = {
            source: absoluteSource,
            sourceHash: existsSync(absoluteSource) ? hashFile(absoluteSource) : 'missing',
            target: input.target,
            uuid: input.uuid,
            planId: input.planId,
            importedAt: new Date().toISOString(),
            assetDbReady: input.assetDbReady,
        };
        document.assets[input.target] = entry;
        this._write(document);
        return entry;
    }

    /**
     * @description 查询目标受管状态。
     * @param target `db://assets/...` 或相对 assets 路径。
     * @param resolveUuid 可选：查询 AssetDB 当前 uuid。
     * @returns 状态。
     */
    public async status(
        target: string,
        resolveUuid?: (dbPath: string) => Promise<string | undefined>,
    ): Promise<IManagedAssetStatus> {
        const document = this._read();
        const mode = document.mode;
        const normalizedTarget = normalizeTarget(target);
        const entry = document.assets[normalizedTarget];
        const targetFsPath = dbPathToFsPath(this._projectRoot, normalizedTarget);
        if (entry == null) {
            const grandfathered = mode === 'new-assets' && isOlderThan(targetFsPath, document.enabledAt);
            return {
                target: normalizedTarget,
                mode,
                managed: false,
                grandfathered,
                verified: mode === 'off' || grandfathered,
                uuidMatched: false,
                sourceChanged: false,
                reason: mode === 'strict' || !grandfathered ? 'UNMANAGED_ASSET' : undefined,
            };
        }
        const sourceChanged =
            !existsSync(entry.source) ||
            (entry.sourceHash !== 'missing' && hashFile(entry.source) !== entry.sourceHash);
        let actualUuid: string | undefined;
        if (resolveUuid != null) {
            try {
                actualUuid = await resolveUuid(normalizedTarget);
            } catch {
                actualUuid = undefined;
            }
        }
        const uuidMatched =
            resolveUuid == null
                ? entry.uuid == null || entry.uuid.length === 0
                    ? true
                    : Boolean(entry.uuid)
                : Boolean(entry.uuid && actualUuid === entry.uuid);
        const verified = entry.assetDbReady && uuidMatched && !sourceChanged;
        return {
            target: normalizedTarget,
            mode,
            managed: true,
            grandfathered: false,
            verified,
            uuidMatched,
            sourceChanged,
            reason: verified ? undefined : sourceChanged ? 'RESOURCE_CHANGED_OUTSIDE_MCP' : 'IMPORT_NOT_VERIFIED',
            entry,
        };
    }

    /**
     * @description 断言目标均已受管且校验通过。
     * @param targets 目标列表。
     * @param resolveUuid 可选 uuid 解析。
     * @returns 无。
     */
    public async assertManaged(
        targets: readonly string[],
        resolveUuid?: (dbPath: string) => Promise<string | undefined>,
    ): Promise<void> {
        for (const target of [...new Set(targets)]) {
            const item = await this.status(target, resolveUuid);
            if (!item.verified) {
                throw new Error(`${item.reason ?? 'UNMANAGED_ASSET'}: ${target}`);
            }
        }
    }

    /**
     * @description 扫描 `assets/` 中相对账本的非受管或账外变更文件。
     * @param options 过滤与限额。
     * @returns 审计结果。
     */
    public auditUnmanagedWrites(options?: {
        readonly pathContains?: string;
        readonly modifiedSince?: string;
        readonly limit?: number;
        readonly includeGit?: boolean;
    }): IUnmanagedAssetWriteAudit {
        const document = this._read();
        const mode = document.mode;
        const limit =
            typeof options?.limit === 'number' && Number.isFinite(options.limit)
                ? Math.min(200, Math.max(1, Math.floor(options.limit)))
                : 50;
        const pathContains = options?.pathContains?.trim().toLowerCase();
        const sinceMs =
            typeof options?.modifiedSince === 'string' && options.modifiedSince.trim().length > 0
                ? Date.parse(options.modifiedSince)
                : Number.NaN;
        const assetsRoot = join(this._projectRoot, 'assets');
        const hits: IUnmanagedAssetWriteHit[] = [];
        let truncated = false;
        if (existsSync(assetsRoot)) {
            const files = listAssetFiles(assetsRoot);
            for (const absolute of files) {
                const relativePath = relative(this._projectRoot, absolute).replace(/\\/gu, '/');
                if (pathContains != null && pathContains.length > 0) {
                    if (!relativePath.toLowerCase().includes(pathContains)) {
                        continue;
                    }
                }
                let mtimeMs = 0;
                try {
                    mtimeMs = statSync(absolute).mtimeMs;
                } catch {
                    continue;
                }
                if (Number.isFinite(sinceMs) && mtimeMs < sinceMs) {
                    continue;
                }
                const target = normalizeTarget(relativePath);
                const entry = document.assets[target];
                let reason: IUnmanagedAssetWriteHit['reason'] | undefined;
                let managed = false;
                if (entry == null) {
                    const grandfathered =
                        mode === 'new-assets' && isOlderThan(absolute, document.enabledAt);
                    if (mode === 'off' || grandfathered) {
                        continue;
                    }
                    reason = 'UNMANAGED_ASSET';
                } else {
                    managed = true;
                    const sourceChanged =
                        !existsSync(entry.source) ||
                        (entry.sourceHash !== 'missing' && hashFile(entry.source) !== entry.sourceHash);
                    if (sourceChanged) {
                        reason = 'RESOURCE_CHANGED_OUTSIDE_MCP';
                    } else if (!entry.assetDbReady) {
                        reason = 'IMPORT_NOT_VERIFIED';
                    } else {
                        continue;
                    }
                }
                hits.push({
                    target,
                    relativePath,
                    modifiedAt: new Date(mtimeMs).toISOString(),
                    managed,
                    reason,
                });
                if (hits.length >= limit) {
                    truncated = true;
                    break;
                }
            }
        }
        const result: IUnmanagedAssetWriteAudit = {
            mode,
            hits,
            truncated,
        };
        if (options?.includeGit === true) {
            return {
                ...result,
                gitStatus: readGitAssetsStatus(this._projectRoot),
            };
        }
        return result;
    }

    /**
     * @description 读取账本文档。
     * @returns 文档。
     */
    private _read(): IManagedAssetLedgerDocument {
        const filePath = this._filePath();
        try {
            const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as Partial<IManagedAssetLedgerDocument>;
            if (parsed.schemaVersion === 1 && typeof parsed.enabledAt === 'string') {
                return {
                    schemaVersion: 1,
                    enabledAt: parsed.enabledAt,
                    mode:
                        parsed.mode === 'off' || parsed.mode === 'strict' || parsed.mode === 'new-assets'
                            ? parsed.mode
                            : 'new-assets',
                    plans: Array.isArray(parsed.plans) ? parsed.plans : [],
                    assets: parsed.assets != null && typeof parsed.assets === 'object' ? parsed.assets : {},
                };
            }
        } catch {
            // 首次使用时创建基线文档。
        }
        return {
            schemaVersion: 1,
            enabledAt: new Date().toISOString(),
            mode: 'new-assets',
            plans: [],
            assets: {},
        };
    }

    /**
     * @description 原子写入账本。
     * @param document 文档。
     * @returns 无。
     */
    private _write(document: IManagedAssetLedgerDocument): void {
        const filePath = this._filePath();
        mkdirSync(dirname(filePath), { recursive: true });
        const temporary = `${filePath}.${process.pid}.tmp`;
        writeFileSync(temporary, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
        renameSync(temporary, filePath);
    }

    /**
     * @description 账本文件路径。
     * @returns 绝对路径。
     */
    private _filePath(): string {
        return join(this._projectRoot, '.peanut-ai', 'import-ledger.json');
    }
}

/**
 * @description 规范化源路径列表。
 * @param sources 源路径。
 * @returns 排序去重后的绝对路径。
 * @oopException 纯值级路径规范化，无状态归属。
 */
function normalizeSources(projectRoot: string, sources: readonly string[]): string[] {
    return [...new Set(sources.map((source) => resolve(projectRoot, source)))].sort();
}

/**
 * @description 计算源闭包指纹。
 * @param sources 已规范化源路径。
 * @returns sha256 hex。
 * @oopException 纯值级哈希。
 */
function fingerprint(sources: readonly string[]): string {
    return createHash('sha256').update(sources.join('\0')).digest('hex');
}

/**
 * @description 计算文件内容哈希。
 * @param filePath 文件路径。
 * @returns 带前缀的 sha256。
 * @oopException 纯值级哈希。
 */
function hashFile(filePath: string): string {
    return `sha256:${createHash('sha256').update(readFileSync(filePath)).digest('hex')}`;
}

/**
 * @description 规范化目标为 `db://assets/...`。
 * @param target 输入目标。
 * @returns 规范化路径。
 * @oopException 纯值级路径规范化。
 */
function normalizeTarget(target: string): string {
    const trimmed = target.trim();
    if (trimmed.startsWith('db://')) {
        return trimmed;
    }
    const withoutSlash = trimmed.replace(/^\/+/, '');
    return withoutSlash.startsWith('assets/') ? `db://${withoutSlash}` : `db://assets/${withoutSlash}`;
}

/**
 * @description db 路径转工程内文件路径。
 * @param projectRoot 工程根。
 * @param dbPath db 路径。
 * @returns 文件系统路径或 undefined。
 * @oopException 纯值级路径换算。
 */
function dbPathToFsPath(projectRoot: string, dbPath: string): string | undefined {
    const prefix = 'db://assets/';
    return dbPath.startsWith(prefix) ? join(projectRoot, 'assets', dbPath.slice(prefix.length)) : undefined;
}

/**
 * @description 判断文件 mtime 是否不晚于时间戳。
 * @param filePath 文件路径。
 * @param timestamp ISO 时间。
 * @returns 是否更旧或同时。
 * @oopException 纯值级 fs 探针。
 */
function isOlderThan(filePath: string | undefined, timestamp: string): boolean {
    if (filePath == null || !existsSync(filePath)) {
        return false;
    }
    try {
        return statSync(filePath).mtimeMs <= Date.parse(timestamp);
    } catch {
        return false;
    }
}

/**
 * @description 递归列出 `assets/` 下非 meta 文件。
 * @param assetsRoot assets 根目录。
 * @returns 绝对路径列表。
 * @oopException 纯值级目录遍历。
 */
function listAssetFiles(assetsRoot: string): string[] {
    const results: string[] = [];
    const stack = [assetsRoot];
    while (stack.length > 0) {
        const current = stack.pop();
        if (current == null) {
            continue;
        }
        let names: readonly string[] = [];
        try {
            names = readdirSync(current, { encoding: 'utf8' });
        } catch {
            continue;
        }
        for (const name of names) {
            const full = join(current, name);
            let isDirectory = false;
            try {
                isDirectory = statSync(full).isDirectory();
            } catch {
                continue;
            }
            if (isDirectory) {
                stack.push(full);
                continue;
            }
            if (!name.endsWith('.meta')) {
                results.push(full);
            }
        }
    }
    return results.sort();
}

/**
 * @description 尽力读取 assets 的 git 状态行。
 * @param projectRoot 工程根。
 * @returns porcelain 行；失败为空数组。
 * @oopException 纯值级 git 探针。
 */
function readGitAssetsStatus(projectRoot: string): readonly string[] {
    try {
        const result = spawnSync('git', ['status', '--porcelain', '--', 'assets'], {
            cwd: projectRoot,
            encoding: 'utf8',
            timeout: 5_000,
        });
        if (result.status !== 0 || typeof result.stdout !== 'string') {
            return [];
        }
        return result.stdout
            .split('\n')
            .map((line) => line.trimEnd())
            .filter((line) => line.length > 0)
            .slice(0, 200);
    } catch {
        return [];
    }
}
