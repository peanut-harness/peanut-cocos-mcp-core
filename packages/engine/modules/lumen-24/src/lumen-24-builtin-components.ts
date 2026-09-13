import { LUMEN24_DEFAULT_COMPONENTS } from './lumen-24-default-components-data.js';

/**
 * @description Creator 2.4 内置组件骨架（对齐官方 default-assets/prefab，无 CompPrefabInfo）。
 */
export class Lumen24BuiltinComponents {
    /**
     * @description 当前支持的 builtin 白名单（含 Wave E UI 组件）。
     */
    public static readonly supported = [
        'cc.Sprite',
        'cc.Label',
        'cc.LabelOutline',
        'cc.Button',
        'cc.Widget',
        'cc.Layout',
        'cc.Mask',
        'cc.Graphics',
        'cc.BlockInputEvents',
        'cc.RichText',
        'cc.EditBox',
        'cc.ScrollView',
        'cc.ProgressBar',
        'cc.Toggle',
        'cc.ToggleContainer',
        'cc.Slider',
        'cc.PageView',
        'cc.PageViewIndicator',
        'cc.Canvas',
        'cc.ParticleSystem',
        'cc.VideoPlayer',
        'cc.WebView',
        'cc.TiledMap',
        'cc.Camera',
    ] as const;

    /**
     * @description 规范化为 `cc.X` 形式。
     * @param type 用户输入
     * @returns 规范类型
     */
    public static normalizeType(type: string): string {
        const trimmed = type.trim();
        if (trimmed.length === 0) {
            throw new Error('lumen_24_component_type_empty');
        }
        if (trimmed === 'UITransform' || trimmed === 'cc.UITransform') {
            throw new Error('lumen_24_uitransform_not_on_creator2x:size_lives_on_cc_Node');
        }
        return trimmed.startsWith('cc.') ? trimmed : `cc.${trimmed}`;
    }

    /**
     * @description 是否在白名单。
     * @param type 规范类型
     * @returns 是否支持
     */
    public static isSupported(type: string): boolean {
        return (Lumen24BuiltinComponents.supported as readonly string[]).includes(type);
    }

    /**
     * @description 创建内置组件条目（不含 CompPrefabInfo）。
     * @param componentType 规范类型
     * @param nodeIndex 所属节点
     * @returns 组件条目
     */
    public static create(componentType: string, nodeIndex: number): Record<string, unknown> {
        const type = Lumen24BuiltinComponents.normalizeType(componentType);
        if (!Lumen24BuiltinComponents.isSupported(type)) {
            throw new Error(
                `lumen_24_builtin_unsupported:${type}:allow=${Lumen24BuiltinComponents.supported.join(',')}`,
            );
        }
        const template = LUMEN24_DEFAULT_COMPONENTS[type];
        if (template != null) {
            const clone = JSON.parse(JSON.stringify(template)) as Record<string, unknown>;
            clone.__type__ = type;
            clone.node = { __id__: nodeIndex };
            Lumen24BuiltinComponents._rewireStandaloneRefs(clone, nodeIndex);
            return clone;
        }
        return Lumen24BuiltinComponents._legacyCreate(type, nodeIndex);
    }

    /**
     * @description 官方 default prefab 模板里的 `{__id__:N}` 指向同文件兄弟节点/组件；单独挂到空节点时
     *   那些下标常落到 PrefabInfo，编辑器调度会抛 `target.getComponent is not a function`。
     *   挂载时：Button/Toggle 的 target 改绑本节点，其余孤儿 id 引用清空。
     * @param clone 组件条目
     * @param nodeIndex 所属节点下标
     * @returns void
     */
    private static _rewireStandaloneRefs(clone: Record<string, unknown>, nodeIndex: number): void {
        const selfNodeKeys = new Set(['_N$target', 'target']);
        for (const [key, value] of Object.entries(clone)) {
            if (key === 'node') {
                continue;
            }
            if (!Lumen24BuiltinComponents._isLocalIdRef(value)) {
                continue;
            }
            clone[key] = selfNodeKeys.has(key) ? { __id__: nodeIndex } : null;
        }
    }

    /**
     * @description 是否为本地条目引用 `{ __id__: number }`（非 uuid）。
     * @param value 字段值
     * @returns 是否本地 id 引用
     */
    private static _isLocalIdRef(value: unknown): value is { readonly __id__: number } {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            return false;
        }
        const record = value as Record<string, unknown>;
        const keys = Object.keys(record);
        return keys.length === 1 && keys[0] === '__id__' && typeof record.__id__ === 'number';
    }

    /**
     * @description 无模板时的最小骨架（Sprite/Label/Button）。
     * @param type 规范类型
     * @param nodeIndex 节点
     * @returns 组件
     */
    private static _legacyCreate(type: string, nodeIndex: number): Record<string, unknown> {
        const base = {
            __type__: type,
            _name: '',
            _objFlags: 0,
            node: { __id__: nodeIndex },
            _enabled: true,
        };
        if (type === 'cc.Sprite') {
            return {
                ...base,
                _spriteFrame: null,
                _type: 0,
                _sizeMode: 1,
                _fillType: 0,
                _fillCenter: { __type__: 'cc.Vec2', x: 0, y: 0 },
                _fillStart: 0,
                _fillRange: 0,
                _isTrimmedMode: true,
                _srcBlendFactor: 770,
                _dstBlendFactor: 771,
                _atlas: null,
            };
        }
        if (type === 'cc.Label') {
            return {
                ...base,
                _useOriginalSize: false,
                _fontSize: 40,
                _lineHeight: 40,
                _enableWrapText: true,
                _isSystemFontUsed: true,
                _N$string: 'Label',
                _N$horizontalAlign: 1,
                _N$verticalAlign: 1,
                _N$overflow: 0,
            };
        }
        if (type === 'cc.Button') {
            return {
                ...base,
                duration: 0.1,
                zoomScale: 1.2,
                clickEvents: [],
                _N$interactable: true,
                _N$enableAutoGrayEffect: false,
                _N$transition: 0,
                transition: 0,
                _N$target: { __id__: nodeIndex },
            };
        }
        throw new Error(`lumen_24_builtin_template_missing:${type}`);
    }
}
