import type { AssetCatalogBucket, IAssetCatalogEntry } from './catalog-types';

/**
 * @description 资产目录分桶清单与空计数，避免各处手写漏项。
 */
export class AssetCatalogBuckets {
    /**
     * @description 全部稳定分桶（含 `other`）。
     */
    public static readonly all: readonly AssetCatalogBucket[] = [
        'script',
        'image',
        'spriteFrame',
        'texture',
        'prefab',
        'scene',
        'config',
        'audio',
        'video',
        'spine',
        'dragonBones',
        'cubeMap',
        'tiledMap',
        'particle',
        'spriteAtlas',
        'autoAtlas',
        'font',
        'directory',
        'material',
        'animationClip',
        'animationGraph',
        'physicsMaterial',
        'terrain',
        'effect',
        'model',
        'mesh',
        'renderTexture',
        'renderPipeline',
        'renderFlow',
        'renderStage',
        'buffer',
        'other',
    ];

    /**
     * @description 各分桶计数归零。
     * @returns 空计数表
     */
    public static emptyCounts(): Record<AssetCatalogBucket, number> {
        return {
            script: 0,
            image: 0,
            spriteFrame: 0,
            texture: 0,
            prefab: 0,
            scene: 0,
            config: 0,
            audio: 0,
            video: 0,
            spine: 0,
            dragonBones: 0,
            cubeMap: 0,
            tiledMap: 0,
            particle: 0,
            spriteAtlas: 0,
            autoAtlas: 0,
            font: 0,
            directory: 0,
            material: 0,
            animationClip: 0,
            animationGraph: 0,
            physicsMaterial: 0,
            terrain: 0,
            effect: 0,
            model: 0,
            mesh: 0,
            renderTexture: 0,
            renderPipeline: 0,
            renderFlow: 0,
            renderStage: 0,
            buffer: 0,
            other: 0,
        };
    }

    /**
     * @description 各分桶空列表。
     * @returns 空分桶表
     */
    public static emptyByType(): Record<AssetCatalogBucket, IAssetCatalogEntry[]> {
        return {
            script: [],
            image: [],
            spriteFrame: [],
            texture: [],
            prefab: [],
            scene: [],
            config: [],
            audio: [],
            video: [],
            spine: [],
            dragonBones: [],
            cubeMap: [],
            tiledMap: [],
            particle: [],
            spriteAtlas: [],
            autoAtlas: [],
            font: [],
            directory: [],
            material: [],
            animationClip: [],
            animationGraph: [],
            physicsMaterial: [],
            terrain: [],
            effect: [],
            model: [],
            mesh: [],
            renderTexture: [],
            renderPipeline: [],
            renderFlow: [],
            renderStage: [],
            buffer: [],
            other: [],
        };
    }

    /**
     * @description 判断字符串是否为已知分桶。
     * @param value 待判断值
     * @returns 是否分桶
     */
    public static isBucket(value: string): value is AssetCatalogBucket {
        for (const bucket of AssetCatalogBuckets.all) {
            if (bucket === value) {
                return true;
            }
        }
        return false;
    }
}
