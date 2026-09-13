import type { PrefabEntry } from '../types';
import { LumenCuratedSchemaCatalog } from '../schema/catalog';
import { LumenSidecarMetaIo } from '../io/sidecar-meta';

/**
 * @description 打开文档的资产种类。
 */
export type LumenAssetKind =
    | 'prefab'
    | 'scene'
    | 'material'
    | 'animationClip'
    | 'physicsMaterial'
    | 'terrain'
    | 'image'
    | 'effect'
    | 'effectChunk'
    | 'model'
    | 'autoAtlas'
    | 'labelAtlas'
    | 'animationGraph'
    | 'animationGraphVariant'
    | 'animationMask'
    | 'renderTexture'
    | 'renderPipeline'
    | 'renderFlow'
    | 'renderStage'
    | 'audio'
    | 'video'
    | 'ttfFont'
    | 'bitmapFont'
    | 'spine'
    | 'dragonBones'
    | 'dragonBonesAtlas'
    | 'cubeMap'
    | 'tiledMap'
    | 'directory'
    | 'particle'
    | 'spriteAtlas'
    | 'json'
    | 'text'
    | 'buffer'
    | 'script'
    | 'javascript'
    | 'mesh'
    | 'skeleton'
    | 'instantiationAnimation'
    | 'instantiationMaterial';

/**
 * @description 非层次（独立文档）资产种类。
 */
export type LumenStandaloneAssetKind = Exclude<LumenAssetKind, 'prefab' | 'scene'>;

/**
 * @description Prefab / Scene 共用的层次节点判定（`cc.Node` 与场景根 `cc.Scene`）。
 */
export class LumenHierarchyEntry {
    /**
     * @description 判断条目是否可作为层次树节点。
     * @param entry 序列化条目
     * @returns 是否为 `cc.Node` 或 `cc.Scene`
     */
    public static isNodeOrScene(entry: PrefabEntry | undefined): boolean {
        const typeName = entry?.__type__;
        return typeName === 'cc.Node' || typeName === 'cc.Scene';
    }

    /**
     * @description 判断是否为可挂组件的 `cc.Node`（场景根不可挂）。
     * @param entry 序列化条目
     * @returns 是否为节点
     */
    public static isNode(entry: PrefabEntry | undefined): boolean {
        return entry?.__type__ === 'cc.Node';
    }

    /**
     * @description 判断是否为场景根。
     * @param entry 序列化条目
     * @returns 是否为 `cc.Scene`
     */
    public static isScene(entry: PrefabEntry | undefined): boolean {
        return entry?.__type__ === 'cc.Scene';
    }

    /**
     * @description 由文件头判断资产种类。
     * @param header 数组首项
     * @returns `prefab` 或 `scene`
     */
    public static assetKindFromHeader(header: PrefabEntry | undefined): LumenAssetKind {
        return header?.__type__ === 'cc.SceneAsset' ? 'scene' : 'prefab';
    }

    /**
     * @description 由相对路径扩展名判断资产种类。独立资产扩展名来自 `bundled/schema/assets.json`。
     * @param relativePath 项目相对路径
     * @returns `scene` / 已登记独立资产 / 默认 `prefab`
     */
    public static assetKindFromPath(relativePath: string): LumenAssetKind {
        const lower = relativePath.toLowerCase();
        if (lower.endsWith('.scene')) {
            return 'scene';
        }
        const mapped = LumenCuratedSchemaCatalog.shared().kindFromExclusiveExtension(relativePath);
        if (mapped != null) {
            return LumenHierarchyEntry._asAssetKind(mapped);
        }
        return 'prefab';
    }

    /**
     * @description 由扩展名与旁路 `.meta` importer 判断资产种类。`.json` 可能是 Spine / DragonBones / 普通配置；`.plist` 可能是粒子或 Sprite Atlas；无扩展名路径可能是文件夹。
     * @param projectRoot 项目根
     * @param relativePath 项目相对路径
     * @returns 资产种类
     */
    public static resolveAssetKind(projectRoot: string, relativePath: string): LumenAssetKind {
        const pathKind = LumenHierarchyEntry.assetKindFromPath(relativePath);
        if (pathKind !== 'prefab') {
            return pathKind;
        }
        const importer = new LumenSidecarMetaIo().peekImporter(projectRoot, relativePath);
        if (importer == null) {
            return pathKind;
        }
        const mapped = LumenCuratedSchemaCatalog.shared().kindFromImporter(importer);
        if (mapped != null) {
            return LumenHierarchyEntry._asAssetKind(mapped);
        }
        return pathKind;
    }

    /**
     * @description 定位层次根下标（Prefab `data` 或 SceneAsset `scene`）。
     * @param entries 序列化数组
     * @returns 根下标
     */
    public static rootIndex(entries: readonly PrefabEntry[]): number {
        const header = entries[0];
        if (header != null && header.__type__ === 'cc.SceneAsset') {
            const sceneId = LumenHierarchyEntry._refId(header.scene);
            if (sceneId != null && LumenHierarchyEntry.isNodeOrScene(entries[sceneId])) {
                return sceneId;
            }
        }
        if (header != null && header.__type__ === 'cc.Prefab') {
            const dataId = LumenHierarchyEntry._refId(header.data);
            if (dataId != null && LumenHierarchyEntry.isNodeOrScene(entries[dataId])) {
                return dataId;
            }
        }
        for (let index = 0; index < entries.length; index += 1) {
            if (LumenHierarchyEntry.isNodeOrScene(entries[index])) {
                return index;
            }
        }
        throw new Error('lumen_inspect_root_missing');
    }

    /**
     * @description 把策展表返回的种类字符串收成 `LumenAssetKind`。
     * @param value 种类
     * @returns 资产种类
     */
    private static _asAssetKind(value: string): LumenAssetKind {
        switch (value) {
            case 'prefab':
            case 'scene':
            case 'material':
            case 'animationClip':
            case 'physicsMaterial':
            case 'terrain':
            case 'image':
            case 'effect':
            case 'effectChunk':
            case 'model':
            case 'autoAtlas':
            case 'labelAtlas':
            case 'animationGraph':
            case 'animationGraphVariant':
            case 'animationMask':
            case 'renderTexture':
            case 'renderPipeline':
            case 'renderFlow':
            case 'renderStage':
            case 'audio':
            case 'video':
            case 'ttfFont':
            case 'bitmapFont':
            case 'spine':
            case 'dragonBones':
            case 'dragonBonesAtlas':
            case 'cubeMap':
            case 'tiledMap':
            case 'directory':
            case 'particle':
            case 'spriteAtlas':
            case 'json':
            case 'text':
            case 'buffer':
            case 'script':
            case 'javascript':
            case 'mesh':
            case 'skeleton':
            case 'instantiationAnimation':
            case 'instantiationMaterial':
                return value;
            default:
                throw new Error(`lumen_not_standalone_asset:${value}`);
        }
    }

    /**
     * @description 读取 `{ __id__ }`。
     * @param value 引用对象
     * @returns 下标或 `null`
     */
    private static _refId(value: unknown): number | null {
        if (value == null || typeof value !== 'object') {
            return null;
        }
        const id = (value as { __id__?: unknown }).__id__;
        return typeof id === 'number' ? id : null;
    }
}
