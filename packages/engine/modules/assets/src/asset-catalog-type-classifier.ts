import type { AssetCatalogBucket } from './catalog-types';

/**
 * @description 将 Creator meta importer 映射到资产目录分桶。
 */
export class AssetCatalogTypeClassifier {
    /**
     * @description 根据 importer 与可选子资源名解析分桶。
     * @param importer meta 中的 importer 字段。
     * @param subImporter 子资源 importer；非子资源时传空字符串。
     * @returns 目录分桶。
     */
    public classify(importer: string, subImporter = ''): AssetCatalogBucket {
        if (subImporter === 'sprite-frame' || subImporter === 'rt-sprite-frame') {
            return 'spriteFrame';
        }
        if (subImporter === 'texture') {
            return 'texture';
        }
        if (subImporter === 'erp-texture-cube' || subImporter === 'texture-cube-face') {
            return 'cubeMap';
        }
        if (subImporter === 'mesh' || subImporter === 'gltf-mesh') {
            return 'mesh';
        }
        if (subImporter === 'animation-clip' || subImporter === 'gltf-animation') {
            return 'animationClip';
        }
        if (subImporter === 'material' || subImporter === 'gltf-material') {
            return 'material';
        }
        if (subImporter === 'prefab') {
            return 'prefab';
        }
        switch (importer) {
            case 'typescript':
            case 'javascript':
                return 'script';
            case 'image':
                return 'image';
            case 'prefab':
                return 'prefab';
            case 'scene':
                return 'scene';
            case 'json':
            case 'text':
                return 'config';
            case 'audio-clip':
                return 'audio';
            case 'video-clip':
                return 'video';
            case 'spine-data':
                return 'spine';
            case 'dragonbones':
            case 'dragonbones-atlas':
                return 'dragonBones';
            case 'texture-cube':
            case 'erp-texture-cube':
                return 'cubeMap';
            case 'tiled-map':
                return 'tiledMap';
            case 'particle':
                return 'particle';
            case 'sprite-atlas':
                return 'spriteAtlas';
            case 'auto-atlas':
                return 'autoAtlas';
            case 'bitmap-font':
            case 'label-atlas':
            case 'ttf-font':
                return 'font';
            case 'directory':
            case 'folder':
                // Creator 2.4 目录 meta 使用 importer:"folder"；3.x 为 "directory"。
                return 'directory';
            case 'material':
                return 'material';
            case 'animation-clip':
                return 'animationClip';
            case 'animation-graph':
            case 'animation-graph-variant':
            case 'animation-mask':
                return 'animationGraph';
            case 'render-texture':
                return 'renderTexture';
            case 'render-pipeline':
                return 'renderPipeline';
            case 'render-flow':
                return 'renderFlow';
            case 'render-stage':
                return 'renderStage';
            case 'instantiation-mesh':
                return 'mesh';
            case 'instantiation-material':
                return 'material';
            case 'instantiation-animation':
                return 'animationClip';
            case 'buffer':
                return 'buffer';
            case 'physics-material':
                return 'physicsMaterial';
            case 'terrain':
                return 'terrain';
            case 'effect':
            case 'chunk':
                return 'effect';
            case 'fbx':
            case 'gltf':
            case 'glb':
                return 'model';
            default:
                return 'other';
        }
    }
}
