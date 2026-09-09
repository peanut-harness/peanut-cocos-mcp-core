import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const editorRoot = process.env.PEANUT_COCOS_EDITOR_ROOT;
if (typeof editorRoot !== 'string' || editorRoot.length === 0) {
    throw new Error('peanut_cocos_editor_root_required');
}
const { build } = await import(pathToFileURL(resolve(editorRoot, 'node_modules/esbuild/lib/main.js')).href);
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
});
await writeFile(resolve(outputDirectory, 'dist/scene.js'), "'use strict';\nmodule.exports = {};\n", 'utf8');
await cp(resolve(extensionRoot, 'package.json'), resolve(outputDirectory, 'package.json'));
await writeFile(
    resolve(outputDirectory, 'README.md'),
    '# Peanut Pod Lite Host\n\nInstall this extension before the Lite directory package.\n',
    'utf8',
);
process.stdout.write(`${JSON.stringify({ ok: true, outputDirectory }, null, 2)}\n`);
