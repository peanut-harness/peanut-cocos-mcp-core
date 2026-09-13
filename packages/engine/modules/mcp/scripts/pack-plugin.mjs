import { existsSync, readFileSync } from 'fs';
import { cp, readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

import { packDirectoryPlugin } from '../../../../../scripts/pack-directory-plugin.mjs';

const pluginRoot = fileURLToPath(new URL('..', import.meta.url));
const lumenPackageRoot = resolve(pluginRoot, '../lumen');
const lumen24PackageRoot = resolve(pluginRoot, '../lumen-24');
const manifest = JSON.parse(readFileSync(resolve(pluginRoot, 'peanut.editor-mcp.manifest.json'), 'utf8'));

await packDirectoryPlugin({
    pluginRoot,
    sourceManifestName: 'peanut.editor-mcp.manifest.json',
    bundleFileName: 'peanut.editor-mcp.bundle.js',
    releaseDirectoryName: `peanut.editor-mcp-${manifest.version}`,
    keepPaths: ['libs'],
    /**
     * @description 打入 lumen 3.x bundled + lumen-24 default_prefab_24。
     * @param {{ stagingDirectory: string }} context
     * @returns {Promise<void>}
     */
    async prepareStaging(context) {
        const bundledSource = resolve(lumenPackageRoot, 'bundled');
        if (!existsSync(bundledSource)) {
            throw new Error(`lumen_bundled_missing:${bundledSource}`);
        }
        await cp(bundledSource, resolve(context.stagingDirectory, 'bundled'), { recursive: true });
        const prefab24 = resolve(lumen24PackageRoot, 'bundled', 'default_prefab_24');
        if (!existsSync(prefab24)) {
            throw new Error(`lumen24_default_prefab_missing:${prefab24}`);
        }
        await cp(prefab24, resolve(context.stagingDirectory, 'bundled', 'default_prefab_24'), { recursive: true });
    },
});
