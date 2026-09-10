import { execFile } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';

import { REPOSITORY_ROOT } from './workspaces.mjs';

/** @description Node 风格回调命令的 Promise 封装。 */
const execFileAsync = promisify(execFile);

/**
 * @description 调用 workspace 内 esbuild CLI（兼容 JS wrapper 与原生二进制）。
 */
export class EsbuildCliRunner {
    /** @description `esbuild/bin/esbuild` 入口路径。 */
    #entryPath;

    /**
     * @description 绑定到当前包、cwd 或 Lite 仓库根下的 esbuild CLI。
     * @param {string} [repositoryRoot] 含 `node_modules/esbuild` 的根目录
     */
    constructor(repositoryRoot = resolveEsbuildRoot()) {
        this.#entryPath = resolve(repositoryRoot, 'node_modules/esbuild/bin/esbuild');
    }

    /**
     * @description 执行 esbuild CLI 参数；失败时抛出子进程错误。
     * @param {readonly string[]} args esbuild CLI 参数
     * @returns {Promise<void>}
     */
    async run(args) {
        if (!existsSync(this.#entryPath)) {
            throw new Error(`esbuild_cli_missing:${this.#entryPath}`);
        }
        if (isJavaScriptCliEntry(this.#entryPath)) {
            await execFileAsync(process.execPath, [this.#entryPath, ...args]);
            return;
        }
        await execFileAsync(this.#entryPath, [...args]);
    }
}

/**
 * @description 依次尝试 cwd、传入根、Lite 仓库根下的 esbuild。
 * @param {string} [explicitRoot] 显式根目录
 * @returns {string} 含 `node_modules/esbuild` 的根目录
 */
function resolveEsbuildRoot(explicitRoot) {
    const candidates = [
        explicitRoot,
        process.cwd(),
        REPOSITORY_ROOT,
    ].filter((value) => typeof value === 'string' && value.length > 0);
    for (const root of candidates) {
        if (existsSync(resolve(root, 'node_modules/esbuild/bin/esbuild'))) {
            return root;
        }
    }
    return candidates[0] ?? process.cwd();
}

/**
 * @description 判断 esbuild CLI 入口是否为可被 Node 加载的 JS wrapper。
 * @param {string} entryPath CLI 入口绝对路径。
 * @returns {boolean} 为 JS 文本入口时返回 true。
 */
function isJavaScriptCliEntry(entryPath) {
    try {
        const header = readFileSync(entryPath).subarray(0, 64).toString('utf8');
        return (
            header.startsWith('#!') ||
            header.startsWith("'use ") ||
            header.startsWith('"use ') ||
            header.startsWith('//') ||
            header.includes('require(')
        );
    } catch {
        return false;
    }
}
