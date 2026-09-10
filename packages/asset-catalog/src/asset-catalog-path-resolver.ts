import { existsSync, mkdirSync, statSync } from 'fs';
import { isAbsolute, join, resolve } from 'path';

/**
 * @description 解析 Creator 项目根与目录输出路径。
 */
export class AssetCatalogPathResolver {
    /** @description 默认输出相对项目根的目录。 */
    public static readonly defaultOutputRelativePath = '.peanut-ai/asset-catalog';

    /**
     * @description 解析并校验项目根目录。
     * @param projectPath 用户输入的项目路径。
     * @param cwd 当前工作目录。
     * @returns 绝对项目根路径。
     */
    public resolveProjectRoot(projectPath: string, cwd: string): string {
        const absolute = isAbsolute(projectPath) ? projectPath : resolve(cwd, projectPath);
        if (!existsSync(absolute) || !statSync(absolute).isDirectory()) {
            throw new Error(`project_root_missing:${absolute}`);
        }
        const assetsPath = join(absolute, 'assets');
        if (!existsSync(assetsPath) || !statSync(assetsPath).isDirectory()) {
            throw new Error(`assets_directory_missing:${assetsPath}`);
        }
        return absolute;
    }

    /**
     * @description 解析目录输出目录；缺省时使用 `.peanut-ai/asset-catalog`。
     * @param projectRoot 项目根。
     * @param outputPath 可选输出路径。
     * @param cwd 当前工作目录。
     * @returns 绝对输出目录。
     */
    public resolveOutputDirectory(projectRoot: string, outputPath: string | undefined, cwd: string): string {
        if (outputPath == null || outputPath.trim().length === 0) {
            const defaultPath = join(projectRoot, AssetCatalogPathResolver.defaultOutputRelativePath);
            mkdirSync(defaultPath, { recursive: true });
            return defaultPath;
        }
        const absolute = isAbsolute(outputPath) ? outputPath : resolve(cwd, outputPath);
        mkdirSync(absolute, { recursive: true });
        return absolute;
    }
}
