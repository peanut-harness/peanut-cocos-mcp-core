import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packagesRoot = resolve(extensionRoot, '..');
const manifest = JSON.parse(await readFile(resolve(extensionRoot, 'package.json'), 'utf8'));
const outputDirectory = resolve(extensionRoot, 'release', `${manifest.name}-${manifest.version}`);
await rm(outputDirectory, { recursive: true, force: true });
await mkdir(resolve(outputDirectory, 'dist'), { recursive: true });
await build({
    bundle: true,
    entryPoints: [resolve(extensionRoot, 'src/main.js')],
    format: 'cjs',
    platform: 'node',
    target: 'node16',
    outfile: resolve(outputDirectory, 'dist/main.js'),
    legalComments: 'none',
    // peanut-plugin-panel is ESM-only in package exports; alias to dist for bundling.
    alias: {
        'peanut-plugin-panel': resolve(packagesRoot, 'plugin-panel/dist/index.js'),
        'peanut-plugin-core': resolve(packagesRoot, 'plugin-core/dist/index.js'),
        'peanut-runtime': resolve(packagesRoot, 'runtime/dist/index.js'),
        'peanut-packaging': resolve(packagesRoot, 'packaging/dist/index.js'),
        'peanut-contracts': resolve(packagesRoot, 'contracts/dist/index.js'),
        'peanut-plugin-sdk': resolve(packagesRoot, 'plugin-sdk/dist/index.js'),
        'peanut-asset-catalog': resolve(packagesRoot, 'asset-catalog/dist/index.js'),
    },
    // Creator Electron provides electron; keep it external.
    external: ['electron', 'canvas'],
});
await writeFile(resolve(outputDirectory, 'dist/scene.js'), "'use strict';\nmodule.exports = {};\n", 'utf8');
await cp(resolve(extensionRoot, 'package.json'), resolve(outputDirectory, 'package.json'));
await cp(resolve(extensionRoot, 'panel'), resolve(outputDirectory, 'panel'), { recursive: true });
// Static Plugin Manager UI assets (same layout as peanut-agents host pack).
await cp(resolve(packagesRoot, 'plugin-panel/panels'), resolve(outputDirectory, 'panels'), { recursive: true });
await writeFile(
    resolve(outputDirectory, 'README.md'),
    '# Peanut Pod Lite Host\n\nInstall this extension before the Lite directory package.\n\n- Extension > Cocos Plugin Manager\n- Extension > Peanut Account\n',
    'utf8',
);
process.stdout.write(`${JSON.stringify({ ok: true, outputDirectory }, null, 2)}\n`);
