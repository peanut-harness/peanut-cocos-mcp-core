import { existsSync, statSync } from 'fs';
import { join } from 'path';

/**
 * @description lumen 包根。源码在 `source/`、tsc 在 `dist/` 时取上一级；插件 fat bundle 落在包根时取本目录（与 `bundled/` 同级）。本文件必须留在 `source/` 根。
 */
export class LumenPackageRoot {
    /**
     * @description 随包数据目录名（策展 JSON + default_prefab）。
     */
    public static readonly BUNDLED_DIR = 'bundled';

    /**
     * @description 随包策展 JSON 子目录名。
     */
    public static readonly SCHEMA_DIR = 'schema';

    /**
     * @description 目录下是否已有 `bundled/schema`。
     * @param packageRoot 候选包根
     * @returns 存在且为目录时为 true
     */
    public static hasBundledSchema(packageRoot: string): boolean {
        const schemaRoot = join(packageRoot, LumenPackageRoot.BUNDLED_DIR, LumenPackageRoot.SCHEMA_DIR);
        return existsSync(schemaRoot) && statSync(schemaRoot).isDirectory();
    }

    /**
     * @description 从模块所在目录解析包根：优先本目录，其次上一级。
     * @param moduleDirectory `__dirname` 或等价路径
     * @returns 含 `bundled/schema` 的包根；都不存在时回退上一级（由调用方报缺失）
     */
    public static resolveFromDirectory(moduleDirectory: string): string {
        if (LumenPackageRoot.hasBundledSchema(moduleDirectory)) {
            return moduleDirectory;
        }
        const parentDirectory = join(moduleDirectory, '..');
        if (LumenPackageRoot.hasBundledSchema(parentDirectory)) {
            return parentDirectory;
        }
        return parentDirectory;
    }

    /**
     * @description 解析包根绝对路径。
     * @returns 包根
     */
    public static resolve(): string {
        return LumenPackageRoot.resolveFromDirectory(__dirname);
    }

    /**
     * @description 随包数据根（`bundled/`）。
     * @param packageRoot lumen 包根
     * @returns 绝对路径
     */
    public static resolveBundled(packageRoot: string = LumenPackageRoot.resolve()): string {
        return join(packageRoot, LumenPackageRoot.BUNDLED_DIR);
    }

    /**
     * @description 随包策展表根（`bundled/schema/`）。
     * @param packageRoot lumen 包根
     * @returns 绝对路径
     */
    public static resolveSchema(packageRoot: string = LumenPackageRoot.resolve()): string {
        return join(LumenPackageRoot.resolveBundled(packageRoot), LumenPackageRoot.SCHEMA_DIR);
    }
}
