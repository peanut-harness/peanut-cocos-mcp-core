import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

import { CompatibleUuid } from './compatible-uuid.js';
import { SilentAssetPathGuard } from './silent-asset-path-guard.js';

/**
 * @description 静默建目录请求。
 */
export interface ISilentAssetCreateFolderRequest {
    /**
     * @description Creator 工程根。
     */
    readonly projectRoot: string;

    /**
     * @description 待创建文件夹相对路径（`assets/...`）；不得已存在。
     */
    readonly relativePath: string;
}

/**
 * @description 静默建目录结果。
 */
export interface ISilentAssetCreateFolderResult {
    /**
     * @description 规范化后的目标相对路径。
     */
    readonly path: string;

    /**
     * @description 新建的中间目录相对路径（含目标本身，按由浅到深排序）。
     */
    readonly createdDirectories: readonly string[];
}

/**
 * @description 静默新建资源文件夹：`mkdir -p` 并为每个缺失 `.meta` 的中间目录写入
 * 最小 `importer: "directory"` meta；不调用会弹窗的 AssetDB 建目录接口。
 */
export class SilentAssetCreateFolder {
    /** @description 路径校验。 */
    private readonly _pathGuard: SilentAssetPathGuard;

    /**
     * @description 创建建目录器。
     * @param pathGuard 可选路径校验器。
     */
    public constructor(pathGuard: SilentAssetPathGuard = new SilentAssetPathGuard()) {
        this._pathGuard = pathGuard;
    }

    /**
     * @description 执行静默建目录。
     * @param request 请求。
     * @returns 建目录结果。
     */
    public create(request: ISilentAssetCreateFolderRequest): ISilentAssetCreateFolderResult {
        const projectRoot = resolve(request.projectRoot);
        const targetPath = this._pathGuard.normalize(request.relativePath);
        const targetAbsolute = join(projectRoot, targetPath);
        if (existsSync(targetAbsolute)) {
            throw new Error(`silent_create_folder_target_exists:${targetPath}`);
        }

        mkdirSync(targetAbsolute, { recursive: true });

        const segments = targetPath.split('/');
        const createdDirectories: string[] = [];
        for (let index = 0; index < segments.length; index += 1) {
            const ancestorPath = segments.slice(0, index + 1).join('/');
            if (ancestorPath === 'assets') {
                continue;
            }
            const ancestorAbsolute = join(projectRoot, ancestorPath);
            const metaAbsolute = `${ancestorAbsolute}.meta`;
            if (existsSync(metaAbsolute)) {
                continue;
            }
            writeFileSync(metaAbsolute, `${JSON.stringify(this._minimalDirectoryMeta(), null, 2)}\n`, 'utf8');
            createdDirectories.push(ancestorPath);
        }

        return { path: targetPath, createdDirectories };
    }

    /**
     * @description 确保目录存在且缺失的祖先 `.meta` 已补齐；目录已存在时不报错。
     * @param request 请求。
     * @returns 本次新写入 meta 的目录相对路径。
     */
    public ensureDirectoryMetas(request: ISilentAssetCreateFolderRequest): ISilentAssetCreateFolderResult {
        const projectRoot = resolve(request.projectRoot);
        const targetPath = this._pathGuard.normalize(request.relativePath);
        const targetAbsolute = join(projectRoot, targetPath);
        mkdirSync(targetAbsolute, { recursive: true });

        const segments = targetPath.split('/');
        const createdDirectories: string[] = [];
        for (let index = 0; index < segments.length; index += 1) {
            const ancestorPath = segments.slice(0, index + 1).join('/');
            if (ancestorPath === 'assets') {
                continue;
            }
            const metaAbsolute = `${join(projectRoot, ancestorPath)}.meta`;
            if (existsSync(metaAbsolute)) {
                continue;
            }
            writeFileSync(metaAbsolute, `${JSON.stringify(this._minimalDirectoryMeta(), null, 2)}\n`, 'utf8');
            createdDirectories.push(ancestorPath);
        }

        return { path: targetPath, createdDirectories };
    }

    /**
     * @description 构造最小目录 meta 内容。
     * @returns meta 对象。
     */
    private _minimalDirectoryMeta(): Record<string, unknown> {
        return {
            ver: '1.2.0',
            importer: 'directory',
            // 与 prefab/scene 一致：先 false，等 AssetDB refresh 真正导入后再变 true。
            // 手写 imported:true 却未进库会导致 Assets 空壳目录。
            imported: false,
            uuid: CompatibleUuid.create(),
            files: [],
            subMetas: {},
            userData: {},
        };
    }
}
