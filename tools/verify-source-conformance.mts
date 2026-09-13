import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

/**
 * @description 可增长性门禁使用的历史代码质量基线。
 */
interface ICodeQualityBaseline {
    /**
     * @description 尚未迁移为 TypeScript 的脚本文件数量。
     */
    readonly legacyScriptFiles: number;

    /**
     * @description 尚未迁移为多行格式的单行 JSDoc 数量。
     */
    readonly singleLineJSDoc: number;

    /**
     * @description 生产源码中尚未迁移为类职责的导出自由函数数量。
     */
    readonly exportedFreeFunctions: number;

    /**
     * @description 生产源码中仍包含多个类的文件数量。
     */
    readonly multiClassSourceFiles: number;
}

/**
 * @description 扫描仓库源码并阻止已知规范旧债继续增长。
 */
class SourceConformanceVerifier {
    /**
     * @description 扫描时忽略的生成目录与外部依赖目录。
     */
    private readonly _ignoredDirectories = new Set([
        '.git',
        '.npm-cache',
        'dist',
        'evidence',
        'node_modules',
        'release',
    ]);

    /**
     * @description 仓库绝对根目录。
     */
    private readonly _repositoryRoot = resolve(import.meta.dirname, '..');

    /**
     * @description 执行规范基线核对并在增长时失败。
     * @returns 无返回值
     */
    public run(): void {
        this._assertAdapterBoundaries();
        const baseline = this._readBaseline();
        const current = this._scan();
        for (const metric of Object.keys(baseline) as Array<keyof ICodeQualityBaseline>) {
            if (current[metric] > baseline[metric]) {
                throw new Error(`source_conformance_regression:${metric}:${current[metric]}>${baseline[metric]}`);
            }
        }
        process.stdout.write(`${JSON.stringify({ ok: true, baseline, current }, null, 2)}\n`);
    }

    /**
     * @description 阻止版本适配器直接依赖其他版本目录，公共能力必须下沉到 core 或 shared。
     * @returns 无返回值
     */
    private _assertAdapterBoundaries(): void {
        const adaptersDirectory = join(
            this._repositoryRoot,
            'packages',
            'engine',
            'modules',
            'runtime',
            'src',
            'cocos',
            'adapters',
        );
        for (const adapterDirectoryName of ['adapter-24', 'adapter-35', 'adapter-38']) {
            const adapterDirectory = join(adaptersDirectory, adapterDirectoryName);
            for (const filePath of this._collectSourceFiles(adapterDirectory)) {
                const source = readFileSync(filePath, 'utf8');
                const siblingAdapterImport = source.match(/from\s+['"]\.\.\/adapter-(?:24|35|38)\//u)?.[0];
                if (siblingAdapterImport != null) {
                    throw new Error(`adapter_boundary_violation:${adapterDirectoryName}:${filePath}`);
                }
            }
        }
    }

    /**
     * @description 读取受版本控制的代码质量基线。
     * @returns 代码质量基线
     */
    private _readBaseline(): ICodeQualityBaseline {
        return JSON.parse(
            readFileSync(join(this._repositoryRoot, 'specs/code-quality-baseline.json'), 'utf8'),
        ) as ICodeQualityBaseline;
    }

    /**
     * @description 扫描当前仓库并计算受控旧债指标。
     * @returns 当前代码质量指标
     */
    private _scan(): ICodeQualityBaseline {
        const sourceFiles = this._collectSourceFiles(this._repositoryRoot);
        const legacyScriptFiles = sourceFiles.filter((filePath) => /\.(?:js|mjs|cjs)$/u.test(filePath)).length;
        let singleLineJSDoc = 0;
        let exportedFreeFunctions = 0;
        let multiClassSourceFiles = 0;

        for (const filePath of sourceFiles) {
            const source = readFileSync(filePath, 'utf8');
            singleLineJSDoc += source.match(/\/\*\* [^\r\n]*\*\//gu)?.length ?? 0;
            if (!filePath.includes(`${sep}src${sep}`)) {
                continue;
            }
            exportedFreeFunctions += source.match(/export\s+(?:async\s+)?function\s+/gu)?.length ?? 0;
            const classCount = source.match(/(?:^|\s)(?:export\s+)?(?:abstract\s+)?class\s+/gmu)?.length ?? 0;
            if (classCount > 1) {
                multiClassSourceFiles += 1;
            }
        }

        return {
            legacyScriptFiles,
            singleLineJSDoc,
            exportedFreeFunctions,
            multiClassSourceFiles,
        };
    }

    /**
     * @description 递归收集参与规范核对的源码与脚本文件。
     * @param directory 当前扫描目录
     * @returns 源码绝对路径列表
     */
    private _collectSourceFiles(directory: string): readonly string[] {
        const sourceFiles: string[] = [];
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            if (entry.isDirectory() && this._ignoredDirectories.has(entry.name)) {
                continue;
            }
            const absolutePath = join(directory, entry.name);
            if (entry.isDirectory()) {
                sourceFiles.push(...this._collectSourceFiles(absolutePath));
            } else if (/\.(?:ts|mts|cts|js|mjs|cjs)$/u.test(entry.name)) {
                sourceFiles.push(absolutePath);
            }
        }
        return sourceFiles;
    }
}

new SourceConformanceVerifier().run();
