import { existsSync, mkdirSync, renameSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';

import { SilentAssetPathGuard } from './silent-asset-path-guard.js';

/**
 * @description 静默移动/重命名请求（磁盘为真源，不调用会弹窗的 AssetDB 移动接口）。
 */
export interface ISilentAssetMoveRenameRequest {
    /**
     * @description Creator 工程根。
     */
    readonly projectRoot: string;

    /**
     * @description 源相对路径（`assets/...`，文件或文件夹）。
     */
    readonly fromRelativePath: string;

    /**
     * @description 目标相对路径（`assets/...`）；不得已存在。
     */
    readonly toRelativePath: string;
}

/**
 * @description 静默移动/重命名结果。
 */
export interface ISilentAssetMoveRenameResult {
    /**
     * @description 规范化后的源相对路径。
     */
    readonly fromPath: string;

    /**
     * @description 规范化后的目标相对路径。
     */
    readonly toPath: string;

    /**
     * @description 是否为文件夹。
     */
    readonly isDirectory: boolean;

    /**
     * @description 是否随同移动了 `.meta`。
     */
    readonly movedMeta: boolean;
}

/**
 * @description 静默移动/重命名资源：仅搬迁磁盘路径（含 `.meta`），保持 uuid 与 `imported` 不变。
 *
 * 文件夹移动依赖 `fs.rename` 的整树搬迁语义，内部资源相对路径随之改变但 uuid 与
 * meta 内容不受影响；不调用会弹窗的 AssetDB 移动/重命名接口，移动完成后由上层
 * 自行触发对齐（图片 sidecar 优先 watcher，禁止立刻 `refresh-asset`）。
 *
 * 禁止在搬迁后把 sidecar `imported` 打成 `false`：那会强迫 AssetDB 全量 reimport，
 * 与 Assets 面板 `tree-data.changed` 竞态，稳定打出
 * 「Can not change the asset … original asset is not exist」。
 */
export class SilentAssetMoveRename {
    /** @description 路径校验。 */
    private readonly _pathGuard: SilentAssetPathGuard;

    /**
     * @description 创建移动/重命名器。
     * @param pathGuard 可选路径校验器。
     */
    public constructor(pathGuard: SilentAssetPathGuard = new SilentAssetPathGuard()) {
        this._pathGuard = pathGuard;
    }

    /**
     * @description 执行静默移动/重命名。
     * @param request 请求。
     * @returns 移动结果。
     */
    public moveOrRename(request: ISilentAssetMoveRenameRequest): ISilentAssetMoveRenameResult {
        const projectRoot = resolve(request.projectRoot);
        const fromPath = this._pathGuard.normalize(request.fromRelativePath);
        const toPath = this._pathGuard.normalize(request.toRelativePath);
        if (fromPath === toPath) {
            throw new Error(`silent_move_rename_noop:${fromPath}`);
        }

        const fromAbsolute = join(projectRoot, fromPath);
        const toAbsolute = join(projectRoot, toPath);
        if (!existsSync(fromAbsolute)) {
            throw new Error(`silent_move_rename_source_missing:${fromPath}`);
        }
        if (existsSync(toAbsolute)) {
            throw new Error(`silent_move_rename_target_exists:${toPath}`);
        }

        const isDirectory = this._isDirectory(fromAbsolute);
        const fromMetaAbsolute = `${fromAbsolute}.meta`;
        const toMetaAbsolute = `${toAbsolute}.meta`;
        const hasMeta = existsSync(fromMetaAbsolute);
        if (hasMeta && existsSync(toMetaAbsolute)) {
            throw new Error(`silent_move_rename_target_meta_exists:${toPath}`);
        }

        mkdirSync(dirname(toAbsolute), { recursive: true });
        renameSync(fromAbsolute, toAbsolute);
        if (hasMeta) {
            renameSync(fromMetaAbsolute, toMetaAbsolute);
        }

        return { fromPath, toPath, isDirectory, movedMeta: hasMeta };
    }

    /**
     * @description 判断绝对路径是否为文件夹。
     * @param absolutePath 绝对路径。
     * @returns 是否文件夹。
     */
    private _isDirectory(absolutePath: string): boolean {
        try {
            return statSync(absolutePath).isDirectory();
        } catch {
            return false;
        }
    }
}
