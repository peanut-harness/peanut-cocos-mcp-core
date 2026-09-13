import { randomBytes } from 'node:crypto';

import type { Lumen24PrefabEntry } from './lumen-24-prefab-document.js';

/**
 * @description Creator 2.4 `.fire` 最小可导入脚手架（对齐安装包 `static/template/new-scene.fire`）。
 *
 * 禁止复用 3.x `cc.SceneGlobals` / `.scene` 形状。
 */
export class Lumen24SceneScaffold {
    /**
     * @description 生成空场景序列化数组（SceneAsset + Scene + Canvas + Main Camera）。
     * @param rootName 场景根显示名（写入 `cc.Scene._name`，供路径 API 使用）
     * @returns 条目列表
     */
    public static createEntries(rootName: string): Lumen24PrefabEntry[] {
        const name = rootName.trim().length > 0 ? rootName.trim() : 'New Node';
        const sceneId = Lumen24SceneScaffold._createUuid();
        return [
            {
                __type__: 'cc.SceneAsset',
                _name: '',
                _objFlags: 0,
                _native: '',
                scene: { __id__: 1 },
            },
            {
                __type__: 'cc.Scene',
                _name: name,
                _objFlags: 0,
                _parent: null,
                _children: [{ __id__: 2 }],
                _active: true,
                _components: [],
                _prefab: null,
                _opacity: 255,
                _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
                _contentSize: { __type__: 'cc.Size', width: 0, height: 0 },
                _anchorPoint: { __type__: 'cc.Vec2', x: 0, y: 0 },
                _trs: {
                    __type__: 'TypedArray',
                    ctor: 'Float64Array',
                    array: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1],
                },
                _is3DNode: true,
                _groupIndex: 0,
                groupIndex: 0,
                autoReleaseAssets: false,
                _id: sceneId,
            },
            Lumen24SceneScaffold._createNode('Canvas', 1, [{ __id__: 3 }], [{ __id__: 5 }, { __id__: 6 }], {
                width: 960,
                height: 640,
                x: 480,
                y: 320,
            }),
            Lumen24SceneScaffold._createNode('Main Camera', 2, [], [{ __id__: 4 }], {
                width: 960,
                height: 640,
                x: 0,
                y: 0,
            }),
            {
                __type__: 'cc.Camera',
                _name: '',
                _objFlags: 0,
                node: { __id__: 3 },
                _enabled: true,
                _cullingMask: 4294967295,
                _clearFlags: 7,
                _backgroundColor: { __type__: 'cc.Color', r: 0, g: 0, b: 0, a: 255 },
                _depth: -1,
                _zoomRatio: 1,
                _targetTexture: null,
                _fov: 60,
                _orthoSize: 10,
                _nearClip: 1,
                _farClip: 4096,
                _ortho: true,
                _rect: { __type__: 'cc.Rect', x: 0, y: 0, width: 1, height: 1 },
                _renderStages: 1,
                _alignWithScreen: true,
                _id: Lumen24SceneScaffold._createShortId(),
            },
            {
                __type__: 'cc.Canvas',
                _name: '',
                _objFlags: 0,
                node: { __id__: 2 },
                _enabled: true,
                _designResolution: { __type__: 'cc.Size', width: 960, height: 640 },
                _fitWidth: false,
                _fitHeight: true,
                _id: Lumen24SceneScaffold._createShortId(),
            },
            {
                __type__: 'cc.Widget',
                _name: '',
                _objFlags: 0,
                node: { __id__: 2 },
                _enabled: true,
                alignMode: 1,
                _target: null,
                _alignFlags: 45,
                _left: 0,
                _right: 0,
                _top: 0,
                _bottom: 0,
                _verticalCenter: 0,
                _horizontalCenter: 0,
                _isAbsLeft: true,
                _isAbsRight: true,
                _isAbsTop: true,
                _isAbsBottom: true,
                _isAbsHorizontalCenter: true,
                _isAbsVerticalCenter: true,
                _originalWidth: 0,
                _originalHeight: 0,
                _id: Lumen24SceneScaffold._createShortId(),
            },
        ];
    }

    /**
     * @description 创建场景内普通节点（无 PrefabInfo）。
     * @param name 节点名
     * @param parentIndex 父下标
     * @returns 节点条目
     */
    public static createChildNode(name: string, parentIndex: number): Lumen24PrefabEntry {
        return Lumen24SceneScaffold._createNode(name, parentIndex, [], [], {
            width: 0,
            height: 0,
            x: 0,
            y: 0,
        });
    }

    /**
     * @description 构造带尺寸/位移的节点。
     * @param name 名
     * @param parentIndex 父
     * @param children 子引用
     * @param components 组件引用
     * @param layout 尺寸与位置
     * @returns 节点
     */
    private static _createNode(
        name: string,
        parentIndex: number,
        children: readonly { readonly __id__: number }[],
        components: readonly { readonly __id__: number }[],
        layout: {
            readonly width: number;
            readonly height: number;
            readonly x: number;
            readonly y: number;
        },
    ): Lumen24PrefabEntry {
        return {
            __type__: 'cc.Node',
            _name: name,
            _objFlags: 0,
            _parent: { __id__: parentIndex },
            _children: [...children],
            _active: true,
            _components: [...components],
            _prefab: null,
            _opacity: 255,
            _color: { __type__: 'cc.Color', r: 255, g: 255, b: 255, a: 255 },
            _contentSize: { __type__: 'cc.Size', width: layout.width, height: layout.height },
            _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 },
            _trs: {
                __type__: 'TypedArray',
                ctor: 'Float64Array',
                array: [layout.x, layout.y, 0, 0, 0, 0, 1, 1, 1, 1],
            },
            _eulerAngles: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
            _skewX: 0,
            _skewY: 0,
            _is3DNode: false,
            _groupIndex: 0,
            groupIndex: 0,
            _id: Lumen24SceneScaffold._createShortId(),
        };
    }

    /**
     * @description 生成 UUID（兼容 Creator 2.4 宿主旧 Node，不用 `randomUUID`）。
     * @returns uuid
     */
    private static _createUuid(): string {
        const bytes = randomBytes(16);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = bytes.toString('hex');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }

    /**
     * @description 生成 2.4 风格短 `_id`。
     * @returns 短 id
     */
    private static _createShortId(): string {
        return randomBytes(16).toString('base64').replace(/[+/=]/g, 'x').slice(0, 22);
    }
}
