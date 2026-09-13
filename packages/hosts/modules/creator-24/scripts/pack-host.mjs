#!/usr/bin/env node
/**
 * @description 打包 peanut-pod-24 为可复制到 Creator 2.4 `packages/` 的目录包。
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
        target: 'node14',
        legalComments: 'none',
        packages: 'bundle',
        external: ['playwright', 'electron', 'canvas', '@napi-rs/canvas'],
        footer: {
            js: [
                'const __peanutPod24 = module.exports.default || module.exports;',
                'module.exports = {',
                '  load: __peanutPod24.load,',
                '  unload: __peanutPod24.unload,',
                '  messages: __peanutPod24.messages,',
                '};',
            ].join('\n'),
        },
    });

    await cp(resolve(extensionDirectory, 'panel'), resolve(outRoot, 'panel'), { recursive: true });
    await cp(resolve(extensionDirectory, 'scene-walker.js'), resolve(outRoot, 'scene-walker.js'));

    const releaseManifest = {
        name: packageName,
        version,
        description: packageJson.description,
        author: packageJson.author,
        main: 'main.js',
        editor: packageJson.editor,
        'scene-script': packageJson['scene-script'],
        'main-menu': packageJson['main-menu'],
        panel: packageJson.panel,
        peanut: packageJson.peanut,
    };
    await writeFile(resolve(outRoot, 'package.json'), `${JSON.stringify(releaseManifest, null, 4)}\n`, 'utf8');
    await writeFile(
        resolve(outRoot, 'main.js'),
        `'use strict';\n\nmodule.exports = require('./dist/main.js');\n`,
        'utf8',
    );
    await writeFile(
        resolve(outRoot, 'README.md'),
        `# ${packageName}\n\n复制本目录到 Creator 2.4 工程 \`packages/${packageName}/\` 后启用扩展。\n\nMVP：只读诊断；禁止写盘。\n`,
        'utf8',
    );

    process.stdout.write(`${JSON.stringify({ ok: true, outRoot, packageName, version }, null, 4)}\n`);
}

await main();
