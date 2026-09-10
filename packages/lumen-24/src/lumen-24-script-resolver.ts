import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

import { Lumen24UuidCodec } from './lumen-24-uuid-codec.js';

/**
 * @description 脚本解析结果。
 */
export interface ILumen24ResolvedScript {
    /**
     * @description 标准 UUID。
     */
    readonly uuid: string;
    /**
     * @description Prefab `__type__` / ClickEvent `_componentId`。
     */
    readonly compressedUuid: string;
    /**
     * @description 资源相对路径（若有）。
     */
    readonly relativePath: string | null;
    /**
     * @description 展示用类名/文件名。
     */
    readonly displayName: string;
}

/**
 * @description 从工程 assets meta 解析脚本 UUID（2.4 `.js` / `.ts`）。
 */
export class Lumen24ScriptResolver {
    /** @description 工程根。 */
    private readonly _projectRoot: string;
    /** @description UUID 编解码。 */
    private readonly _codec = new Lumen24UuidCodec();

    /**
     * @description 创建解析器。
     * @param projectRoot 工程根
     */
    public constructor(projectRoot: string) {
        this._projectRoot = projectRoot;
    }

    /**
     * @description 解析 scriptName（路径 / 文件名 / 压缩 UUID / 标准 UUID）。
     * @param scriptName 查询
     * @returns 解析结果
     */
    public resolve(scriptName: string): ILumen24ResolvedScript {
        const query = scriptName.trim();
        if (query.length === 0) {
            throw new Error('lumen_24_script_name_empty');
        }
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query)) {
            return {
                uuid: query.toLowerCase(),
                compressedUuid: this._codec.compress(query),
                relativePath: null,
                displayName: query,
            };
        }
        if (/^[0-9a-f]{5}[A-Za-z0-9+/]{17,}$/.test(query) && !query.includes('/') && !query.includes('.')) {
            return {
                uuid: '',
                compressedUuid: query,
                relativePath: null,
                displayName: query,
            };
        }
        const normalized = query.replace(/\\/g, '/').replace(/^\/+/, '');
        const candidates = this._listScriptMetas();
        const byPath = candidates.filter((entry) => {
            const path = entry.relativePath;
            if (path == null) {
                return false;
            }
            return (
                path === normalized ||
                path === `assets/${normalized}` ||
                path.endsWith(`/${normalized}`)
            );
        });
        if (byPath.length === 1) {
            return byPath[0]!;
        }
        if (byPath.length > 1) {
            throw new Error(`lumen_24_script_ambiguous_path:${query}`);
        }
        const bare = basename(normalized).replace(/\.(js|ts)$/i, '');
        const byName = candidates.filter((entry) => entry.displayName === bare);
        if (byName.length === 1) {
            return byName[0]!;
        }
        if (byName.length > 1) {
            throw new Error(`lumen_24_script_ambiguous_name:${bare}`);
        }
        throw new Error(`lumen_24_script_not_found:${query}`);
    }

    /**
     * @description 枚举 assets 下脚本 meta。
     * @returns 候选
     */
    private _listScriptMetas(): ILumen24ResolvedScript[] {
        const assetsRoot = join(this._projectRoot, 'assets');
        if (!existsSync(assetsRoot)) {
            return [];
        }
        const results: ILumen24ResolvedScript[] = [];
        const walk = (dir: string): void => {
            for (const name of readdirSync(dir)) {
                const absolute = join(dir, name);
                const st = statSync(absolute);
                if (st.isDirectory()) {
                    walk(absolute);
                    continue;
                }
                if (!name.endsWith('.js.meta') && !name.endsWith('.ts.meta')) {
                    continue;
                }
                let parsed: { uuid?: unknown; importer?: unknown };
                try {
                    parsed = JSON.parse(readFileSync(absolute, 'utf8')) as { uuid?: unknown; importer?: unknown };
                } catch {
                    continue;
                }
                if (typeof parsed.uuid !== 'string' || parsed.uuid.trim().length === 0) {
                    continue;
                }
                const importer = typeof parsed.importer === 'string' ? parsed.importer : '';
                if (
                    importer.length > 0 &&
                    importer !== 'javascript' &&
                    importer !== 'typescript' &&
                    importer !== 'js' &&
                    importer !== 'ts'
                ) {
                    continue;
                }
                const scriptPath = absolute.replace(/\.meta$/i, '');
                const relativePath = scriptPath.slice(this._projectRoot.length + 1).replace(/\\/g, '/');
                const displayName = basename(scriptPath).replace(/\.(js|ts)$/i, '');
                results.push({
                    uuid: parsed.uuid,
                    compressedUuid: this._codec.compress(parsed.uuid),
                    relativePath,
                    displayName,
                });
            }
        };
        walk(assetsRoot);
        return results;
    }
}
