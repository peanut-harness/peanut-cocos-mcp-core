import { existsSync, readFileSync, readdirSync, rmSync, statSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';

import { FileAssetDependencyIndex } from './file-asset-dependency-index.js';
import { SilentAssetPathGuard } from './silent-asset-path-guard.js';

/**
 * @description 静默删除请求。
 */
export interface ISilentAssetDeleteRequest {
    /**
     * @description Creator 工程根。
     */
    readonly projectRoot: string;

    /**
     * @description 待删除资源相对路径列表（文件或文件夹，可递归）。
     */
    readonly relativePaths: readonly string[];
}

/**
 * @description 单条删除结果。
 */
export interface ISilentAssetDeleteItem {
    /**
     * @description 相对路径。
     */
    readonly path: string;

    /**
     * @description 主 uuid；无 meta 时为空串。
     */
    readonly uuid: string;

    /**
     * @description 是否为文件夹。
     */
    readonly isDirectory: boolean;
}

/**
 * @description 静默删除结果。
 */
export interface ISilentAssetDeleteResult {
    /**
     * @description 已删除条目（含递归展开的子文件/子目录）。
     */
    readonly deleted: readonly ISilentAssetDeleteItem[];
}

/**
 * @description 静默删除资源：先用磁盘依赖图校验删除集合外是否仍被引用，
 * 无外部依赖方才真正 `unlink`（含 `.meta`）；不调用会弹出回收站确认的
 * AssetDB `delete-asset`。
 */
export class SilentAssetDelete {
    /** @description 依赖图。 */
    private readonly _dependencyIndex: FileAssetDependencyIndex;

    /** @description 路径校验。 */
    private readonly _pathGuard: SilentAssetPathGuard;

    /**
     * @description 创建删除器。
     * @param dependencyIndex 可选依赖索引。
     * @param pathGuard 可选路径校验器。
     */
    public constructor(
        dependencyIndex: FileAssetDependencyIndex = new FileAssetDependencyIndex(),
        pathGuard: SilentAssetPathGuard = new SilentAssetPathGuard(),
    ) {
        this._dependencyIndex = dependencyIndex;
        this._pathGuard = pathGuard;
    }

    /**
     * @description 执行静默删除。
     * @param request 请求。
     * @returns 删除结果。
     */
    public delete(request: ISilentAssetDeleteRequest): ISilentAssetDeleteResult {
        const projectRoot = resolve(request.projectRoot);
        if (request.relativePaths.length === 0) {
            throw new Error('silent_delete_paths_required');
        }
        const requestedPaths = request.relativePaths.map((pathValue) => this._pathGuard.normalize(pathValue));
        for (const requestedPath of requestedPaths) {
            if (!existsSync(join(projectRoot, requestedPath))) {
                throw new Error(`silent_delete_source_missing:${requestedPath}`);
            }
        }

        const expanded = new Map<string, ISilentAssetDeleteItem>();
        for (const requestedPath of requestedPaths) {
            this._expand(projectRoot, requestedPath, expanded);
        }
        const deletionSet = new Set(expanded.keys());

        FileAssetDependencyIndex.invalidate(projectRoot);
        const blockers: string[] = [];
        for (const item of expanded.values()) {
            if (item.isDirectory || item.uuid.length === 0) {
                continue;
            }
            let dependents: readonly { readonly dbPath: string }[];
            try {
                dependents = this._dependencyIndex.query(projectRoot, {
                    dbPath: `db://${item.path}`,
                    direction: 'dependents',
                    refreshIndex: false,
                }).dependents;
            } catch {
                continue;
            }
            for (const dependent of dependents) {
                const dependentPath = dependent.dbPath.replace(/^db:\/\//u, '');
                if (!deletionSet.has(dependentPath)) {
                    blockers.push(`${item.path}<-${dependentPath}`);
                }
            }
        }
        if (blockers.length > 0) {
            throw new Error(`silent_asset_delete_blocked_by_dependents:${[...new Set(blockers)].sort().join(';')}`);
        }

        for (const requestedPath of requestedPaths.slice().sort((left, right) => right.length - left.length)) {
            if (!existsSync(join(projectRoot, requestedPath))) {
                continue;
            }
            const absolutePath = join(projectRoot, requestedPath);
            const metaAbsolute = `${absolutePath}.meta`;
            if (expanded.get(requestedPath)?.isDirectory === true) {
                rmSync(absolutePath, { recursive: true, force: true });
            } else {
                unlinkSync(absolutePath);
            }
            if (existsSync(metaAbsolute)) {
                unlinkSync(metaAbsolute);
            }
        }

        return { deleted: [...expanded.values()].sort((left, right) => left.path.localeCompare(right.path)) };
    }

    /**
     * @description 展开单条请求路径为文件+子目录集合，并记录 uuid。
     * @param projectRoot 工程根。
     * @param relativePath 相对路径。
     * @param output 输出集合（path → 条目）。
     * @returns 无。
     */
    private _expand(
        projectRoot: string,
        relativePath: string,
        output: Map<string, ISilentAssetDeleteItem>,
    ): void {
        if (output.has(relativePath)) {
            return;
        }
        const absolutePath = join(projectRoot, relativePath);
        const isDirectory = statSync(absolutePath).isDirectory();
        output.set(relativePath, { path: relativePath, uuid: this._readMetaUuid(absolutePath), isDirectory });
        if (!isDirectory) {
            return;
        }
        for (const entry of readdirSync(absolutePath, { withFileTypes: true })) {
            if (entry.name.endsWith('.meta') || entry.name === '.git' || entry.name === 'node_modules') {
                continue;
            }
            this._expand(projectRoot, `${relativePath}/${entry.name}`, output);
        }
    }

    /**
     * @description 读取资源 `.meta` 中的主 uuid。
     * @param absolutePath 资源绝对路径（不含 `.meta`）。
     * @returns uuid 或空串。
     */
    private _readMetaUuid(absolutePath: string): string {
        const metaAbsolute = `${absolutePath}.meta`;
        if (!existsSync(metaAbsolute)) {
            return '';
        }
        try {
            const parsed = JSON.parse(readFileSync(metaAbsolute, 'utf8')) as unknown;
            if (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) {
                const uuid = (parsed as Record<string, unknown>).uuid;
                return typeof uuid === 'string' ? uuid : '';
            }
        } catch {
            // 非 JSON 或格式异常时忽略。
        }
        return '';
    }
}
