import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * @description 2.4 可经 `lumen.assetSet` / `lumen.inspect` 处理的独立资产种类。
 * 对照 cocos-docs `versions/2.4/zh/asset-workflow` 与 Creator 2.4.11 template/default-assets。
 */
export type Lumen24StandaloneKind =
    | 'texture'
    | 'json'
    | 'text'
    | 'javascript'
    | 'typescript'
    | 'directory'
    | 'autoAtlas'
    | 'labelAtlas'
    | 'animationClip'
    | 'material'
    | 'effect'
    | 'physicsMaterial'
    | 'audio'
    | 'video'
    | 'ttfFont'
    | 'bitmapFont'
    | 'particle'
    | 'spriteAtlas'
    | 'spine'
    | 'dragonBones'
    | 'tiledMap'
    | 'model';

/**
 * @description 3.x 有而 2.4 无对等磁盘格式的种类（诚实拒绝）。
 */
export const LUMEN24_STANDALONE_REFUSED_KINDS = [
    'animationGraph',
    'animationGraphVariant',
    'animationMask',
    'terrain',
    'renderPipeline',
    'renderFlow',
    'renderStage',
    'instantiationAnimation',
    'instantiationMaterial',
    'mesh',
    'skeleton',
    'cubeMap',
    'renderTexture',
] as const;

/**
 * @description Creator 2.4 独立资产读写（磁盘为真源）。
 */
export class Lumen24StandaloneAsset {
    /**
     * @description 由路径推断 2.4 资产种类。
     * @param relativePath 工程相对路径
     * @returns 种类
     */
    public static detectKind(relativePath: string): Lumen24StandaloneKind {
        const normalized = relativePath.replace(/\\/g, '/').toLowerCase();
        if (/\.(png|jpe?g|webp|bmp|tga|gif)$/u.test(normalized)) {
            return 'texture';
        }
        if (normalized.endsWith('.pac')) {
            return 'autoAtlas';
        }
        if (normalized.endsWith('.labelatlas')) {
            return 'labelAtlas';
        }
        if (normalized.endsWith('.anim')) {
            return 'animationClip';
        }
        if (normalized.endsWith('.mtl')) {
            return 'material';
        }
        if (normalized.endsWith('.effect') || normalized.endsWith('.chunk')) {
            return 'effect';
        }
        if (normalized.endsWith('.pmtl')) {
            return 'physicsMaterial';
        }
        if (/\.(mp3|wav|ogg|m4a|aac)$/u.test(normalized)) {
            return 'audio';
        }
        if (/\.(mp4|avi|mov|mkv|webm)$/u.test(normalized)) {
            return 'video';
        }
        if (/\.(ttf|otf)$/u.test(normalized)) {
            return 'ttfFont';
        }
        if (normalized.endsWith('.fnt')) {
            return 'bitmapFont';
        }
        if (normalized.endsWith('.tmx')) {
            return 'tiledMap';
        }
        if (/\.(fbx|gltf|glb)$/u.test(normalized)) {
            return 'model';
        }
        if (normalized.endsWith('.skel')) {
            return 'spine';
        }
        if (normalized.endsWith('.dbbin')) {
            return 'dragonBones';
        }
        if (normalized.endsWith('.plist')) {
            return 'particle';
        }
        if (normalized.endsWith('.json')) {
            return 'json';
        }
        if (
            normalized.endsWith('.txt') ||
            normalized.endsWith('.md') ||
            normalized.endsWith('.xml') ||
            normalized.endsWith('.html') ||
            normalized.endsWith('.css') ||
            normalized.endsWith('.yaml') ||
            normalized.endsWith('.csv')
        ) {
            return 'text';
        }
        if (normalized.endsWith('.js')) {
            return 'javascript';
        }
        if (normalized.endsWith('.ts')) {
            return 'typescript';
        }
        if (!normalized.includes('.') || /\/[^./]+$/u.test(normalized)) {
            return 'directory';
        }
        const ext = normalized.includes('.') ? normalized.slice(normalized.lastIndexOf('.') + 1) : '';
        throw new Error(
            `lumen_24_asset_kind_unsupported:${ext || 'unknown'}:refused_3x=${LUMEN24_STANDALONE_REFUSED_KINDS.join(',')}`,
        );
    }

    /**
     * @description 检视独立资产。
     * @param projectRoot 工程根
     * @param relativePath 相对路径
     * @returns 快照
     */
    public static inspect(
        projectRoot: string,
        relativePath: string,
    ): Readonly<Record<string, unknown>> {
        const kind = Lumen24StandaloneAsset.detectKind(relativePath);
        const absolutePath = join(projectRoot, relativePath);
        if (!existsSync(absolutePath)) {
            throw new Error(`lumen_24_asset_missing:${relativePath}`);
        }
        if (kind === 'texture') {
            return Lumen24StandaloneAsset._inspectTexture(relativePath, absolutePath);
        }
        if (kind === 'effect' || kind === 'text' || kind === 'javascript' || kind === 'typescript') {
            return {
                path: relativePath,
                kind,
                source: readFileSync(absolutePath, 'utf8'),
                meta: Lumen24StandaloneAsset._readMeta(absolutePath),
            };
        }
        if (
            kind === 'json' ||
            kind === 'animationClip' ||
            kind === 'material' ||
            kind === 'physicsMaterial' ||
            kind === 'autoAtlas' ||
            kind === 'labelAtlas'
        ) {
            const raw = JSON.parse(readFileSync(absolutePath, 'utf8')) as unknown;
            return {
                path: relativePath,
                kind,
                json: raw,
                meta: Lumen24StandaloneAsset._readMeta(absolutePath),
            };
        }
        return {
            path: relativePath,
            kind,
            meta: Lumen24StandaloneAsset._readMeta(absolutePath),
        };
    }

    /**
     * @description 写独立资产（磁盘为真源）。
     * @param projectRoot 工程根
     * @param relativePath 相对路径
     * @param props 补丁
     * @returns 写结果
     */
    public static assetSet(
        projectRoot: string,
        relativePath: string,
        props: Readonly<Record<string, unknown>>,
    ): Readonly<{
        readonly path: string;
        readonly kind: Lumen24StandaloneKind;
        readonly patched: readonly string[];
    }> {
        const kind = Lumen24StandaloneAsset.detectKind(relativePath);
        const absolutePath = join(projectRoot, relativePath);
        if (!existsSync(absolutePath)) {
            Lumen24StandaloneAsset._ensureCreatableAsset(absolutePath, relativePath, kind);
        }
        if (kind === 'texture') {
            return Lumen24StandaloneAsset._patchTexture(relativePath, absolutePath, props);
        }
        if (kind === 'json') {
            return Lumen24StandaloneAsset._writeJsonBody(relativePath, absolutePath, kind, props);
        }
        if (kind === 'text' || kind === 'javascript' || kind === 'typescript' || kind === 'effect') {
            const source =
                typeof props.source === 'string'
                    ? props.source
                    : typeof props.text === 'string'
                      ? props.text
                      : typeof props.content === 'string'
                        ? props.content
                        : null;
            if (source == null) {
                throw new Error(`lumen_24_assetSet_${kind}_requires_source_or_text`);
            }
            writeFileSync(absolutePath, source, 'utf8');
            return { path: relativePath, kind, patched: ['source'] };
        }
        if (
            kind === 'animationClip' ||
            kind === 'material' ||
            kind === 'physicsMaterial'
        ) {
            if ('json' in props || 'data' in props) {
                return Lumen24StandaloneAsset._writeJsonBody(relativePath, absolutePath, kind, props);
            }
            return Lumen24StandaloneAsset._patchJsonFields(relativePath, absolutePath, kind, props);
        }
        if (kind === 'labelAtlas') {
            if ('json' in props || 'data' in props) {
                return Lumen24StandaloneAsset._writeJsonBody(relativePath, absolutePath, kind, props);
            }
            return Lumen24StandaloneAsset._patchMetaFields(relativePath, absolutePath, kind, props, [
                'itemWidth',
                'itemHeight',
                'startChar',
                'fontSize',
                'rawTextureUuid',
            ]);
        }
        if (kind === 'autoAtlas') {
            // 2.4 AutoAtlas 配置主要在 .meta（example AutoAtlas.pac.meta），.pac 本体多为空 SpriteAtlas。
            if ('json' in props || 'data' in props) {
                return Lumen24StandaloneAsset._writeJsonBody(relativePath, absolutePath, kind, props);
            }
            return Lumen24StandaloneAsset._patchMetaFields(relativePath, absolutePath, kind, props, [
                'maxWidth',
                'maxHeight',
                'padding',
                'allowRotation',
                'forceSquared',
                'powerOfTwo',
                'algorithm',
                'format',
                'quality',
                'contourBleed',
                'paddingBleed',
                'filterUnused',
                'packable',
                'premultiplyAlpha',
                'filterMode',
            ]);
        }
        if (
            kind === 'audio' ||
            kind === 'video' ||
            kind === 'ttfFont' ||
            kind === 'bitmapFont' ||
            kind === 'particle' ||
            kind === 'spriteAtlas' ||
            kind === 'spine' ||
            kind === 'dragonBones' ||
            kind === 'tiledMap' ||
            kind === 'model' ||
            kind === 'directory'
        ) {
            if (kind === 'directory' && Object.keys(props).length === 0) {
                throw new Error('lumen_24_assetSet_directory_meta_only:use_asset.createFolder');
            }
            return Lumen24StandaloneAsset._patchMetaFields(
                relativePath,
                absolutePath,
                kind,
                props,
                Object.keys(props),
            );
        }
        throw new Error(`lumen_24_assetSet_unsupported_kind:${kind}`);
    }

    /**
     * @description 可经 assetSet 新建的正文类资产（不含贴图/音视频等二进制）。
     * @param kind 种类
     * @returns 是否可创建
     */
    private static _isBodyCreatable(kind: Lumen24StandaloneKind): boolean {
        return (
            kind === 'json' ||
            kind === 'text' ||
            kind === 'javascript' ||
            kind === 'typescript' ||
            kind === 'effect' ||
            kind === 'animationClip' ||
            kind === 'material' ||
            kind === 'physicsMaterial' ||
            kind === 'autoAtlas' ||
            kind === 'labelAtlas'
        );
    }

    /**
     * @description 缺失时写入可导入的最小种子文件，便于 assetSet 创建+覆写。
     * @param absolutePath 绝对路径
     * @param relativePath 相对路径（错误信息）
     * @param kind 种类
     * @returns void
     */
    private static _ensureCreatableAsset(
        absolutePath: string,
        relativePath: string,
        kind: Lumen24StandaloneKind,
    ): void {
        if (!Lumen24StandaloneAsset._isBodyCreatable(kind)) {
            throw new Error(`lumen_24_asset_missing:${relativePath}`);
        }
        mkdirSync(dirname(absolutePath), { recursive: true });
        if (kind === 'text' || kind === 'javascript' || kind === 'typescript' || kind === 'effect') {
            writeFileSync(absolutePath, kind === 'effect' ? 'CCEffect %{ techniques: [] }%\n' : '\n', 'utf8');
            return;
        }
        if (kind === 'autoAtlas') {
            writeFileSync(
                absolutePath,
                `${JSON.stringify({ __type__: 'cc.SpriteAtlas' }, null, 2)}\n`,
                'utf8',
            );
            return;
        }
        writeFileSync(absolutePath, '{}\n', 'utf8');
    }

    /**
     * @description 读取旁路 meta（若存在）。
     * @param absolutePath 资源绝对路径
     * @returns meta 或 null
     */
    private static _readMeta(absolutePath: string): Record<string, unknown> | null {
        const metaPath = `${absolutePath}.meta`;
        if (!existsSync(metaPath)) {
            return null;
        }
        return JSON.parse(readFileSync(metaPath, 'utf8')) as Record<string, unknown>;
    }

    /**
     * @description 整文件覆写 JSON 资产。
     * @param relativePath 相对路径
     * @param absolutePath 绝对路径
     * @param kind 种类
     * @param props 补丁
     * @returns 结果
     */
    private static _writeJsonBody(
        relativePath: string,
        absolutePath: string,
        kind: Lumen24StandaloneKind,
        props: Readonly<Record<string, unknown>>,
    ): Readonly<{
        readonly path: string;
        readonly kind: Lumen24StandaloneKind;
        readonly patched: readonly string[];
    }> {
        if (!('json' in props) && !('data' in props)) {
            throw new Error(`lumen_24_assetSet_${kind}_requires_json_or_data`);
        }
        const value = 'json' in props ? props.json : props.data;
        writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
        return { path: relativePath, kind, patched: ['json'] };
    }

    /**
     * @description 合并补丁到 JSON 资产顶层字段。
     * @param relativePath 相对路径
     * @param absolutePath 绝对路径
     * @param kind 种类
     * @param props 补丁
     * @returns 结果
     */
    private static _patchJsonFields(
        relativePath: string,
        absolutePath: string,
        kind: Lumen24StandaloneKind,
        props: Readonly<Record<string, unknown>>,
    ): Readonly<{
        readonly path: string;
        readonly kind: Lumen24StandaloneKind;
        readonly patched: readonly string[];
    }> {
        const raw = JSON.parse(readFileSync(absolutePath, 'utf8')) as Record<string, unknown>;
        const patched: string[] = [];
        for (const [key, value] of Object.entries(props)) {
            if (key === 'meta' && value != null && typeof value === 'object' && !Array.isArray(value)) {
                Lumen24StandaloneAsset._writeMetaPatch(
                    absolutePath,
                    value as Readonly<Record<string, unknown>>,
                    patched,
                );
                continue;
            }
            raw[key] = value;
            patched.push(key);
        }
        if (patched.length === 0) {
            throw new Error(`lumen_24_assetSet_${kind}_props_empty`);
        }
        writeFileSync(absolutePath, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
        return { path: relativePath, kind, patched };
    }

    /**
     * @description 只写 .meta 字段。
     * @param relativePath 相对路径
     * @param absolutePath 绝对路径
     * @param kind 种类
     * @param props 补丁
     * @param allowed 允许字段；空则拒绝
     * @returns 结果
     */
    private static _patchMetaFields(
        relativePath: string,
        absolutePath: string,
        kind: Lumen24StandaloneKind,
        props: Readonly<Record<string, unknown>>,
        allowed: readonly string[],
    ): Readonly<{
        readonly path: string;
        readonly kind: Lumen24StandaloneKind;
        readonly patched: readonly string[];
    }> {
        const metaProps =
            props.meta != null && typeof props.meta === 'object' && !Array.isArray(props.meta)
                ? (props.meta as Readonly<Record<string, unknown>>)
                : props;
        const allowSet = new Set(allowed);
        const filtered: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(metaProps)) {
            if (key === 'meta') {
                continue;
            }
            if (allowSet.size > 0 && !allowSet.has(key)) {
                continue;
            }
            filtered[key] = value;
        }
        const patched: string[] = [];
        Lumen24StandaloneAsset._writeMetaPatch(absolutePath, filtered, patched);
        if (patched.length === 0) {
            throw new Error(
                `lumen_24_assetSet_${kind}_meta_props_empty:allowed=${allowed.join(',') || '*'}`,
            );
        }
        return { path: relativePath, kind, patched };
    }

    /**
     * @description 写入 / 合并 .meta。
     * @param absolutePath 资源绝对路径
     * @param patch 字段
     * @param patched 输出已写字段名
     */
    private static _writeMetaPatch(
        absolutePath: string,
        patch: Readonly<Record<string, unknown>>,
        patched: string[],
    ): void {
        const metaPath = `${absolutePath}.meta`;
        const meta = existsSync(metaPath)
            ? (JSON.parse(readFileSync(metaPath, 'utf8')) as Record<string, unknown>)
            : {};
        for (const [key, value] of Object.entries(patch)) {
            meta[key] = value;
            patched.push(`meta.${key}`);
        }
        writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
    }

    /**
     * @description 检视 2.4 texture / sprite-frame meta。
     * @param relativePath 相对路径
     * @param absolutePath 绝对路径
     * @returns 快照
     */
    private static _inspectTexture(
        relativePath: string,
        absolutePath: string,
    ): Readonly<Record<string, unknown>> {
        const metaPath = `${absolutePath}.meta`;
        if (!existsSync(metaPath)) {
            throw new Error(`lumen_24_texture_meta_missing:${relativePath}`);
        }
        const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as Record<string, unknown>;
        if (meta.importer !== 'texture' && meta.importer !== 'raw' && meta.importer != null) {
            throw new Error(`lumen_24_texture_meta_importer_unexpected:${String(meta.importer)}`);
        }
        const subMetas =
            meta.subMetas != null && typeof meta.subMetas === 'object' && !Array.isArray(meta.subMetas)
                ? (meta.subMetas as Record<string, Record<string, unknown>>)
                : {};
        const spriteFrame = Object.values(subMetas).find((entry) => entry?.importer === 'sprite-frame') ?? null;
        return {
            path: relativePath,
            kind: 'texture',
            uuid: meta.uuid ?? null,
            type: meta.type ?? null,
            wrapMode: meta.wrapMode ?? null,
            filterMode: meta.filterMode ?? null,
            premultiplyAlpha: meta.premultiplyAlpha ?? null,
            genMipmaps: meta.genMipmaps ?? null,
            packable: meta.packable ?? null,
            platformSettings: meta.platformSettings ?? null,
            width: meta.width ?? null,
            height: meta.height ?? null,
            spriteFrame: spriteFrame == null
                ? null
                : {
                      uuid: spriteFrame.uuid ?? null,
                      trimType: spriteFrame.trimType ?? null,
                      trimX: spriteFrame.trimX ?? null,
                      trimY: spriteFrame.trimY ?? null,
                      width: spriteFrame.width ?? null,
                      height: spriteFrame.height ?? null,
                      borderTop: spriteFrame.borderTop ?? null,
                      borderBottom: spriteFrame.borderBottom ?? null,
                      borderLeft: spriteFrame.borderLeft ?? null,
                      borderRight: spriteFrame.borderRight ?? null,
                  },
        };
    }

    /**
     * @description 写 2.4 texture meta / sprite-frame 子 meta。
     * @param relativePath 相对路径
     * @param absolutePath 绝对路径
     * @param props 补丁
     * @returns 写结果
     */
    private static _patchTexture(
        relativePath: string,
        absolutePath: string,
        props: Readonly<Record<string, unknown>>,
    ): Readonly<{ readonly path: string; readonly kind: 'texture'; readonly patched: readonly string[] }> {
        const metaPath = `${absolutePath}.meta`;
        if (!existsSync(metaPath)) {
            throw new Error(`lumen_24_texture_meta_missing:${relativePath}`);
        }
        const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as Record<string, unknown>;
        const patched: string[] = [];
        const textureKeys = [
            'type',
            'wrapMode',
            'filterMode',
            'premultiplyAlpha',
            'genMipmaps',
            'packable',
            'platformSettings',
        ] as const;
        for (const key of textureKeys) {
            if (key in props) {
                meta[key] = props[key];
                patched.push(key);
            }
        }
        if (props.spriteFrame != null && typeof props.spriteFrame === 'object' && !Array.isArray(props.spriteFrame)) {
            const subMetas =
                meta.subMetas != null && typeof meta.subMetas === 'object' && !Array.isArray(meta.subMetas)
                    ? (meta.subMetas as Record<string, Record<string, unknown>>)
                    : {};
            const spriteKey = Object.keys(subMetas).find((key) => subMetas[key]?.importer === 'sprite-frame');
            if (spriteKey == null) {
                throw new Error(`lumen_24_texture_sprite_frame_missing:${relativePath}`);
            }
            const sprite = { ...subMetas[spriteKey] };
            const spritePatch = props.spriteFrame as Record<string, unknown>;
            for (const [field, value] of Object.entries(spritePatch)) {
                sprite[field] = value;
                patched.push(`spriteFrame.${field}`);
            }
            subMetas[spriteKey] = sprite;
            meta.subMetas = subMetas;
        }
        if (patched.length === 0) {
            throw new Error(
                'lumen_24_assetSet_texture_props_empty:allowed=type,wrapMode,filterMode,premultiplyAlpha,genMipmaps,packable,platformSettings,spriteFrame.*',
            );
        }
        writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
        return { path: relativePath, kind: 'texture', patched };
    }
}
