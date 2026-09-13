#!/usr/bin/env node
/**
 * @description 打包 peanut-pod-35 为可复制到 Creator 3.0–3.5 `extensions/` 的目录包。
 */

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const extensionDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const releaseDirectory = resolve(extensionDirectory, 'release');

/**
 * @description 打包入口。
 * @returns {Promise<void>}
 */
async function main() {
    const packageJson = JSON.parse(await readFile(resolve(extensionDirectory, 'package.json'), 'utf8'));
    const packageName = String(packageJson.name);
    const version = String(packageJson.version);
    const outRoot = resolve(releaseDirectory, `${packageName}-${version}`);

    await rm(outRoot, { recursive: true, force: true });
    await mkdir(outRoot, { recursive: true });

    await build({
        bundle: true,
        entryPoints: [resolve(extensionDirectory, 'src/main.ts')],
        format: 'cjs',
        outfile: resolve(outRoot, 'dist/main.js'),
        platform: 'node',
        target: 'node16',
        legalComments: 'none',
    });

    // early3x 薄宿主无 scene 脚本；安装器对非 stable 线可不强制 scene.js。
    await writeFile(resolve(outRoot, 'dist/scene.js'), `'use strict';\nmodule.exports = {};\n`, 'utf8');
    await cp(resolve(extensionDirectory, 'panel'), resolve(outRoot, 'panel'), { recursive: true });

    const releaseManifest = {
        package_version: 2,
        name: packageName,
        version,
        description: packageJson.description,
        main: './dist/main.js',
        editor: packageJson.editor,
        panels: packageJson.panels,
        contributions: packageJson.contributions,
        peanut: packageJson.peanut,
    };
    await writeFile(resolve(outRoot, 'package.json'), `${JSON.stringify(releaseManifest, null, 4)}\n`, 'utf8');
    await writeFile(
        resolve(outRoot, 'README.md'),
        `# ${packageName}\n\n复制本目录到 Creator 3.0–3.5 工程 \`extensions/${packageName}/\` 后启用。\n`,
        'utf8',
    );

    process.stdout.write(`${JSON.stringify({ ok: true, outRoot, packageName, version }, null, 4)}\n`);
}

await main();
