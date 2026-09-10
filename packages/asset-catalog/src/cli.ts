#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join } from 'path';

import { AssetCatalogRefreshService } from './asset-catalog-refresh-service';

const [command, ...argumentsList] = process.argv.slice(2);
const service = new AssetCatalogRefreshService();

void main();

/**
 * @description CLI 主流程。
 * @oopException CLI 入口无领域对象归属。
 */
async function main(): Promise<void> {
    try {
        if (command === '--help' || command === '-h' || command === 'help' || command == null) {
            printUsage();
        } else if (command === '--version' || command === '-V') {
            process.stdout.write(`${readVersion()}\n`);
        } else if (command === 'generate' || command === 'refresh') {
            assertKnownFlags(argumentsList, ['--project', '--out']);
            const projectPath = readRequiredFlag(argumentsList, '--project');
            const outputPath = readFlag(argumentsList, '--out');
            const result = service.refresh(projectPath, outputPath, process.cwd());
            process.stdout.write(`${JSON.stringify({
                summaryPath: result.catalogPath,
                generatedAt: result.summary.generatedAt,
                counts: result.summary.counts,
                conflictCount: result.summary.conflictCount,
                conflicts: result.summary.conflicts,
                shards: result.summary.shards,
            }, null, 2)}\n`);
        } else if (command === 'summary') {
            assertKnownFlags(argumentsList, ['--project', '--out']);
            const projectPath = readRequiredFlag(argumentsList, '--project');
            const outputPath = readFlag(argumentsList, '--out');
            process.stdout.write(`${JSON.stringify(service.summary(projectPath, outputPath, process.cwd()), null, 2)}\n`);
        } else if (command === 'query') {
            assertKnownFlags(argumentsList, ['--project', '--out', '--uuid', '--type', '--path', '--name', '--limit']);
            const projectPath = readRequiredFlag(argumentsList, '--project');
            const outputPath = readFlag(argumentsList, '--out');
            const limitRaw = readFlag(argumentsList, '--limit');
            const hits = service.query(projectPath, outputPath, process.cwd(), {
                uuid: readFlag(argumentsList, '--uuid'),
                type: readFlag(argumentsList, '--type'),
                pathContains: readFlag(argumentsList, '--path'),
                nameContains: readFlag(argumentsList, '--name'),
                limit: limitRaw == null ? 20 : Number.parseInt(limitRaw, 10),
            });
            process.stdout.write(`${JSON.stringify({ count: hits.length, hits }, null, 2)}\n`);
        } else if (command === 'serve') {
            assertKnownFlags(argumentsList, ['--project', '--out', '--port']);
            const projectPath = readRequiredFlag(argumentsList, '--project');
            const outputPath = readFlag(argumentsList, '--out');
            const portRaw = readFlag(argumentsList, '--port') ?? '8787';
            const listening = await service.serve(projectPath, outputPath, process.cwd(), Number.parseInt(portRaw, 10));
            process.stdout.write(`${JSON.stringify({
                host: listening.host,
                port: listening.port,
                endpoints: [
                    `http://${listening.host}:${listening.port}/health`,
                    `http://${listening.host}:${listening.port}/summary`,
                    `http://${listening.host}:${listening.port}/query?type=script&name=SeatItem&limit=5`,
                ],
            }, null, 2)}\n`);
            await new Promise<void>(() => {
                // 阻塞直到进程被外部终止。
            });
        } else {
            printUsage(process.stderr);
            process.exitCode = 1;
        }
    } catch (error) {
        process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
        process.exitCode = 1;
    }
}

/**
 * @description 打印 CLI 用法。
 * @param stream 输出流。
 * @oopException CLI 入口辅助，无稳定领域对象可归属。
 */
function printUsage(stream: NodeJS.WritableStream = process.stdout): void {
    stream.write(`Usage:
  cac generate --project <creator-project> [--out <dir>]
  cac refresh  --project <creator-project> [--out <dir>]
  cac summary  --project <creator-project> [--out <dir>]
  cac query    --project <creator-project> [--out <dir>] [--uuid <id>] [--type <bucket>] [--path <substr>] [--name <substr>] [--limit <n>]
  cac serve    --project <creator-project> [--out <dir>] [--port 8787]

AI 应调用 query/serve，不要直接读 catalog.json。
Default output: <project>/.peanut-ai/asset-catalog/
Buckets: script|image|spriteFrame|texture|prefab|scene|config|audio|video|spine|dragonBones|cubeMap|tiledMap|particle|spriteAtlas|autoAtlas|font|directory|material|animationClip|animationGraph|physicsMaterial|terrain|effect|model|mesh|renderTexture|renderPipeline|renderFlow|renderStage|buffer|other
`);
}

/**
 * @description 读取包版本号。
 * @returns 版本字符串。
 * @oopException CLI 入口辅助，无稳定领域对象可归属。
 */
function readVersion(): string {
    const packagePath = join(__dirname, '..', 'package.json');
    const parsed = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: unknown };
    if (typeof parsed.version !== 'string') {
        throw new Error('package_version_missing');
    }
    return parsed.version;
}

/**
 * @description 读取可选 flag。
 * @param argumentsList 参数列表。
 * @param name flag 名。
 * @returns 取值或 undefined。
 * @oopException CLI 参数解析辅助。
 */
function readFlag(argumentsList: readonly string[], name: string): string | undefined {
    const index = argumentsList.indexOf(name);
    if (index === -1) {
        return undefined;
    }
    if (argumentsList.indexOf(name, index + 1) !== -1) {
        throw new Error(`参数不能重复: ${name}`);
    }
    const value = argumentsList[index + 1];
    if (value == null || value.startsWith('--')) {
        throw new Error(`参数缺少取值: ${name}`);
    }
    return value;
}

/**
 * @description 读取必填 flag。
 * @param argumentsList 参数列表。
 * @param name flag 名。
 * @returns 取值。
 * @oopException CLI 参数解析辅助。
 */
function readRequiredFlag(argumentsList: readonly string[], name: string): string {
    const value = readFlag(argumentsList, name);
    if (value == null) {
        throw new Error(`缺少参数: ${name}`);
    }
    return value;
}

/**
 * @description 断言只出现已知 flag。
 * @param argumentsList 参数列表。
 * @param allowed 允许的 flag。
 * @oopException CLI 参数解析辅助。
 */
function assertKnownFlags(argumentsList: readonly string[], allowed: readonly string[]): void {
    const allowedSet = new Set(allowed);
    for (let index = 0; index < argumentsList.length; index += 1) {
        const token = argumentsList[index];
        if (token == null || !token.startsWith('--')) {
            if (token != null && !token.startsWith('--')) {
                throw new Error(`未知位置参数: ${token}`);
            }
            continue;
        }
        if (!allowedSet.has(token)) {
            throw new Error(`未知参数: ${token}`);
        }
        index += 1;
    }
}
