import { CompatibleUuid } from 'peanut-asset-catalog';

import type { PrefabEntry } from '../types';

/**
 * @description 最小可导入的空 `.scene` 条目（SceneAsset + Scene + 默认 SceneGlobals）。
 *
 * 层次基线不在此文件内嵌相机：由 `LumenSession.scaffoldPrefab` 在创建后立刻
 * `_seedSceneBaseline`（`Camera` → Main Camera、`light/Directional Light` → Main Light），
 * 与工程 `scene.scene` / Creator `default.scene` 对齐。Skybox 必须绑定内置 envmap；
 * `enabled` 且 envmap 为 null 时编辑器会渲成白雾。
 */
export class LumenSceneScaffold {
    /**
     * @description 生成空场景序列化数组。
     * @param rootName 场景根名（路径首段）
     * @returns 条目列表
     */
    public static createEntries(rootName: string): PrefabEntry[] {
        const name = rootName.trim().length > 0 ? rootName.trim() : 'scene';
        return [
            {
                __type__: 'cc.SceneAsset',
                _name: name,
                _objFlags: 0,
                __editorExtras__: {},
                _native: '',
                scene: { __id__: 1 },
            },
            {
                __type__: 'cc.Scene',
                _name: name,
                _objFlags: 0,
                __editorExtras__: {},
                _parent: null,
                _children: [],
                _active: true,
                _components: [],
                _prefab: null,
                _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
                _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
                _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
                _mobility: 0,
                _layer: 1073741824,
                _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
                autoReleaseAssets: false,
                _globals: { __id__: 2 },
                _id: CompatibleUuid.create(),
            },
            {
                __type__: 'cc.SceneGlobals',
                ambient: { __id__: 3 },
                shadows: { __id__: 4 },
                _skybox: { __id__: 5 },
                fog: { __id__: 6 },
                octree: { __id__: 7 },
                skin: { __id__: 8 },
                lightProbeInfo: { __id__: 9 },
                postSettings: { __id__: 10 },
                bakedWithStationaryMainLight: false,
                bakedWithHighpLightmap: false,
            },
            {
                __type__: 'cc.AmbientInfo',
                _skyColorHDR: { __type__: 'cc.Vec4', x: 0.2, y: 0.5, z: 0.8, w: 0.520833125 },
                _skyIllumHDR: 20000,
                _groundAlbedoHDR: { __type__: 'cc.Vec4', x: 0.2, y: 0.2, z: 0.2, w: 1 },
                _skyColorLDR: { __type__: 'cc.Vec4', x: 0.452588, y: 0.607642, z: 0.755699, w: 0 },
                _skyIllumLDR: 0.8,
                _groundAlbedoLDR: { __type__: 'cc.Vec4', x: 0.618555, y: 0.577848, z: 0.544564, w: 0 },
            },
            {
                __type__: 'cc.ShadowsInfo',
                _enabled: false,
                _type: 0,
                _normal: { __type__: 'cc.Vec3', x: 0, y: 1, z: 0 },
                _distance: 0,
                _planeBias: 1,
                _shadowColor: { __type__: 'cc.Color', r: 76, g: 76, b: 76, a: 255 },
                _maxReceived: 4,
                _size: { __type__: 'cc.Vec2', x: 1024, y: 1024 },
            },
            {
                __type__: 'cc.SkyboxInfo',
                _envLightingType: 0,
                // Creator default.scene / 工程 scene.scene 内置天空盒；envmap 为 null 且 enabled 时编辑器会渲成白雾。
                _envmapHDR: {
                    __uuid__: 'd032ac98-05e1-4090-88bb-eb640dcb5fc1@b47c0',
                    __expectedType__: 'cc.TextureCube',
                },
                _envmap: {
                    __uuid__: 'd032ac98-05e1-4090-88bb-eb640dcb5fc1@b47c0',
                    __expectedType__: 'cc.TextureCube',
                },
                _envmapLDR: {
                    __uuid__: '6f01cf7f-81bf-4a7e-bd5d-0afc19696480@b47c0',
                    __expectedType__: 'cc.TextureCube',
                },
                _diffuseMapHDR: null,
                _diffuseMapLDR: null,
                _enabled: true,
                _useHDR: true,
                _editableMaterial: null,
                _reflectionHDR: null,
                _reflectionLDR: null,
                _rotationAngle: 0,
            },
            {
                __type__: 'cc.FogInfo',
                _type: 0,
                _fogColor: { __type__: 'cc.Color', r: 200, g: 200, b: 200, a: 255 },
                _enabled: false,
                _fogDensity: 0.3,
                _fogStart: 0.5,
                _fogEnd: 300,
                _fogAtten: 5,
                _fogTop: 1.5,
                _fogRange: 1.2,
                _accurate: false,
            },
            {
                __type__: 'cc.OctreeInfo',
                _enabled: false,
                _minPos: { __type__: 'cc.Vec3', x: -1024, y: -1024, z: -1024 },
                _maxPos: { __type__: 'cc.Vec3', x: 1024, y: 1024, z: 1024 },
                _depth: 8,
            },
            {
                __type__: 'cc.SkinInfo',
                _enabled: true,
                _blurRadius: 0.01,
                _sssIntensity: 3,
            },
            {
                __type__: 'cc.LightProbeInfo',
                _giScale: 1,
                _giSamples: 1024,
                _bounces: 2,
                _reduceRinging: 0,
                _showProbe: true,
                _showWireframe: true,
                _showConvex: false,
                _data: null,
                _lightProbeSphereVolume: 1,
            },
            {
                __type__: 'cc.PostSettingsInfo',
                _toneMappingType: 0,
            },
        ];
    }
}
