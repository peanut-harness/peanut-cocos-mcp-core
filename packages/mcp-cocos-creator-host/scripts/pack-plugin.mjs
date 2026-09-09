import { fileURLToPath } from 'url';
import { resolve } from 'path';

const pluginRoot = fileURLToPath(new URL('..', import.meta.url));
const editorRoot = process.env.PEANUT_COCOS_EDITOR_ROOT;
if (typeof editorRoot !== 'string' || editorRoot.length === 0) {
    throw new Error('peanut_cocos_editor_root_required');
}
const { packDirectoryPlugin } = await import(resolve(editorRoot, 'scripts', 'pack-directory-plugin.mjs'));
await packDirectoryPlugin({
    pluginRoot,
    sourceManifestName: 'peanut.cocos-mcp-core.manifest.json',
    bundleFileName: 'peanut.cocos-mcp-core.bundle.js',
    releaseDirectoryName: 'peanut.cocos-mcp-core-0.1.0',
    keepPaths: ['libs'],
});
