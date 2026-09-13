/**
 * @description 通用最小运行时导出器：复制可运行文件、排除开发文件，并输出完整性与体积清单。
 */
import { createHash } from 'crypto';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'fs/promises';
import { dirname, relative, resolve, sep } from 'path';

/**
 * @description 最小运行时导出的单个输入目录规则。
 * @typedef {object} MinimalRuntimeSource
 * @property {string} sourceDirectory 要导出的构建目录
 * @property {string} targetDirectory 相对于导出根目录的目标目录
 * @property {(relativePath: string) => string | null} getSkipReason 返回跳过原因；返回 `null` 时保留文件
 */

/**
 * @description 最小运行时导出配置。
 * @typedef {object} MinimalRuntimeExportOptions
 * @property {string} outputDirectory 最终运行时目录；会以受控方式整体重建
 * @property {readonly MinimalRuntimeSource[]} sources 输入目录及其筛选规则
 * @property {Record<string, unknown>} [metadata] 写入清单的调用方元数据
 */

/**
 * @description 导出后的单文件完整性记录。
 * @typedef {object} MinimalRuntimeFileRecord
 * @property {string} path 相对于导出根目录的 POSIX 路径
 * @property {number} bytes 文件字节数
 * @property {string} digest SHA-256 十六进制摘要
 */

/**
 * @description 将多个构建目录导出为可审计的最小运行时目录。
 * @param {MinimalRuntimeExportOptions} options 输入目录、保留规则和输出目录
 * @returns {Promise<{ sourceBytes: number; outputBytes: number; savedBytes: number; files: readonly MinimalRuntimeFileRecord[] }>} 导出体积及文件清单
 */
export async function exportMinimalRuntime(options) {
    const outputDirectory = resolve(options.outputDirectory);
    assertExportOptions(outputDirectory, options.sources);
    const skippedFileSummary = new Map();
    let sourceBytes = 0;

    for (const source of options.sources) {
        const sourceDirectory = resolve(source.sourceDirectory);
        sourceBytes += await getDirectoryBytes(sourceDirectory);
    }

    await rm(outputDirectory, { recursive: true, force: true });
    await mkdir(outputDirectory, { recursive: true });
    for (const source of options.sources) {
        const sourceDirectory = resolve(source.sourceDirectory);
        const targetDirectory = resolve(outputDirectory, source.targetDirectory);
        await copySelectedFiles(sourceDirectory, targetDirectory, source.getSkipReason, skippedFileSummary);
    }

    const files = await listFileRecords(outputDirectory);
    const outputBytes = files.reduce((totalBytes, file) => totalBytes + file.bytes, 0);
    const manifest = {
        formatVersion: 1,
        sourceBytes,
        outputBytes,
        savedBytes: sourceBytes - outputBytes,
        skippedFiles: Object.fromEntries([...skippedFileSummary.entries()].sort(([left], [right]) => left.localeCompare(right))),
        metadata: options.metadata ?? {},
        files,
    };
    await writeFile(resolve(outputDirectory, 'runtime.manifest.json'), `${JSON.stringify(manifest, null, 4)}\n`, 'utf8');
    return { sourceBytes, outputBytes, savedBytes: sourceBytes - outputBytes, files };
}

/**
 * @description 验证输入目录和目标目录，避免导出过程删除源构建目录或越界写入。
 * @param outputDirectory 最终输出绝对路径
 * @param sources 调用方提供的输入目录规则
 * @returns 无返回值
 */
function assertExportOptions(outputDirectory, sources) {
    if (sources.length === 0) {
        throw new Error('minimal_runtime_sources_required');
    }
    for (const source of sources) {
        const sourceDirectory = resolve(source.sourceDirectory);
        if (source.targetDirectory.length === 0 || source.targetDirectory === '.' || !isPathWithinDirectory(outputDirectory, resolve(outputDirectory, source.targetDirectory))) {
            throw new Error(`minimal_runtime_target_invalid:${source.targetDirectory}`);
        }
        if (sourceDirectory === outputDirectory || isPathWithinDirectory(sourceDirectory, outputDirectory) || isPathWithinDirectory(outputDirectory, sourceDirectory)) {
            throw new Error(`minimal_runtime_source_output_overlap:${sourceDirectory}`);
        }
    }
}

/**
 * @description 判断候选路径是否严格位于父目录内，兼容不同平台的路径分隔符。
 * @param directoryPath 父目录绝对路径
 * @param candidatePath 候选绝对路径
 * @returns 严格位于父目录内时返回 `true`
 */
function isPathWithinDirectory(directoryPath, candidatePath) {
    const relativePath = relative(directoryPath, candidatePath);
    return relativePath !== '' && !relativePath.startsWith('..') && !relativePath.includes(`..${sep}`);
}

/**
 * @description 递归复制满足调用方筛选规则的普通文件。
 * @param sourceDirectory 当前源目录
 * @param targetDirectory 当前目标目录
 * @param getSkipReason 根据相对路径返回跳过原因的函数
 * @param skippedFileSummary 被跳过文件的按原因计数表
 * @returns Promise 在当前目录复制完成后结束
 */
async function copySelectedFiles(sourceDirectory, targetDirectory, getSkipReason, skippedFileSummary) {
    const entries = await readdir(sourceDirectory, { withFileTypes: true });
    for (const entry of entries) {
        const sourcePath = resolve(sourceDirectory, entry.name);
        const relativePath = relative(sourceDirectory, sourcePath).replaceAll('\\', '/');
        if (entry.isDirectory()) {
            await copySelectedFiles(sourcePath, resolve(targetDirectory, entry.name), (nestedPath) => getSkipReason(`${relativePath}/${nestedPath}`), skippedFileSummary);
            continue;
        }
        if (!entry.isFile()) {
            continue;
        }
        const reason = getSkipReason(relativePath);
        if (reason !== null) {
            skippedFileSummary.set(reason, (skippedFileSummary.get(reason) ?? 0) + 1);
            continue;
        }
        const targetPath = resolve(targetDirectory, relativePath);
        await mkdir(dirname(targetPath), { recursive: true });
        await copyFile(sourcePath, targetPath);
    }
}

/**
 * @description 列出发布目录中的文件及其摘要。
 * @param directoryPath 发布根目录
 * @returns Promise 返回按路径排序的完整性记录
 */
async function listFileRecords(directoryPath) {
    const records = [];
    async function visit(currentDirectory) {
        const entries = await readdir(currentDirectory, { withFileTypes: true });
        for (const entry of entries) {
            const entryPath = resolve(currentDirectory, entry.name);
            if (entry.isDirectory()) {
                await visit(entryPath);
                continue;
            }
            if (!entry.isFile()) {
                continue;
            }
            const content = await readFile(entryPath);
            const fileStats = await stat(entryPath);
            records.push({
                path: relative(directoryPath, entryPath).replaceAll('\\', '/'),
                bytes: fileStats.size,
                digest: createHash('sha256').update(content).digest('hex'),
            });
        }
    }
    await visit(directoryPath);
    return records.sort((left, right) => left.path.localeCompare(right.path));
}

/**
 * @description 计算目录内所有普通文件的总字节数。
 * @param directoryPath 目标目录
 * @returns Promise 返回目录原始文件总字节数
 */
async function getDirectoryBytes(directoryPath) {
    let totalBytes = 0;
    async function visit(currentDirectory) {
        const entries = await readdir(currentDirectory, { withFileTypes: true });
        for (const entry of entries) {
            const entryPath = resolve(currentDirectory, entry.name);
            if (entry.isDirectory()) {
                await visit(entryPath);
                continue;
            }
            if (entry.isFile()) {
                totalBytes += (await stat(entryPath)).size;
            }
        }
    }
    await visit(directoryPath);
    return totalBytes;
}
