/**
 * @description 从 Cocos 脚本源码半自动提取 `@property` 字段规格（轻量文本解析，非完整 TS AST）。
 *
 * 覆盖常见写法：无参 `@property`、`@property(Type)`、`@property({ type })`、数组 `type: [T]`，
 * 以及 TypeScript 注解兜底（`string` / `number` / `Node` / `Label[]` 等）。
 * 不支持：完整类型系统、跨文件类型别名、泛型推断、运行时装饰器反射。
 */

import type { ILumenPropertyFieldSpec, LumenPropertyValueKind } from '../schema/component-property';
import { LumenCuratedSchemaCatalog } from '../schema/catalog';

/**
 * @description 跳过字段的原因记录。
 */
export interface ILumenScriptPropertySkip {
    /** @description 属性名（能解析时）或片段摘要。 */
    readonly name: string;
    /** @description 跳过原因码。 */
    readonly reason: string;
}

/**
 * @description 脚本属性提取选项。
 */
export interface ILumenScriptPropertyExtractOptions {
    /**
     * @description 将工程内自定义组件类名解析为 Prefab `__type__`（compressedUuid）。
     */
    readonly resolveCustomComponentType?: (simpleName: string) => string | undefined;
}

/**
 * @description 单次脚本属性发现结果。
 */
export interface ILumenScriptPropertyExtractResult {
    /** @description `@ccclass('X')` 类名；未解析到时为 `null`。 */
    readonly className: string | null;
    /** @description 可注册字段规格。 */
    readonly fields: readonly ILumenPropertyFieldSpec[];
    /** @description 未能映射的 `@property`。 */
    readonly skipped: readonly ILumenScriptPropertySkip[];
    /** @description 解析器能力说明（给 Agent / schema）。 */
    readonly discovery: {
        readonly mode: 'lightweight_text';
        readonly rules: readonly string[];
    };
}

/**
 * @description 资源类型名 → uuid kind（单值）。
 */
const ASSET_TYPE_NAMES: ReadonlySet<string> = new Set([
    'SpriteFrame',
    'Texture2D',
    'Material',
    'Prefab',
    'AudioClip',
    'Font',
    'BitmapFont',
    'Asset',
    'JsonAsset',
    'TextAsset',
    'EffectAsset',
    'Mesh',
    'Skeleton',
    'AnimationClip',
]);

/**
 * @description 标量包装类型。
 */
const SCALAR_WRAPPERS: Readonly<Record<string, LumenPropertyValueKind>> = {
    CCInteger: 'number',
    CCFloat: 'number',
    CCBoolean: 'boolean',
    CCString: 'string',
};

/**
 * @description 轻量 `@property` 提取器。
 */
export class LumenScriptPropertyExtractor {
    /**
     * @description Agent 可见的发现能力摘要。
     * @returns 规则与模式
     */
    public static describeDiscovery(): ILumenScriptPropertyExtractResult['discovery'] {
        return {
            mode: 'lightweight_text',
            rules: [
                'parses_at_property_decorators_in_ts_source',
                'maps_cc_builtins_and_common_asset_types',
                'array_type_brackets_become_list_kinds',
                'serializable_false_is_skipped',
                'unknown_custom_types_are_skipped',
                'custom_component_refs_when_resolver_provided',
                'not_a_full_typescript_ast',
            ],
        };
    }

    /**
     * @description 从脚本源码提取字段规格。
     * @param source `.ts` 文本
     * @param options 可选解析器（工程内自定义 `@property(CustomComp)`）
     * @returns 提取结果
     */
    public static extractFromSource(
        source: string,
        options?: ILumenScriptPropertyExtractOptions,
    ): ILumenScriptPropertyExtractResult {
        if (typeof source !== 'string') {
            throw new Error('lumen_script_extract_source_invalid');
        }
        const className = LumenScriptPropertyExtractor._extractClassName(source);
        const fields: ILumenPropertyFieldSpec[] = [];
        const skipped: ILumenScriptPropertySkip[] = [];
        const seen = new Set<string>();
        const pattern =
            /@property(?:\s*\(([\s\S]*?)\))?\s*(?:public|private|protected)?\s*(?:readonly\s+)?([A-Za-z_][\w]*)\s*(?::\s*([^=;{]+))?/g;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(source)) != null) {
            const decoratorArgs = (match[1] ?? '').trim();
            const apiName = match[2] ?? '';
            const tsType = (match[3] ?? '').trim();
            if (apiName.length === 0) {
                continue;
            }
            if (seen.has(apiName)) {
                skipped.push({ name: apiName, reason: 'duplicate_property' });
                continue;
            }
            if (LumenScriptPropertyExtractor._isNonSerializable(decoratorArgs)) {
                skipped.push({ name: apiName, reason: 'serializable_false' });
                continue;
            }
            const mapped = LumenScriptPropertyExtractor._mapField(apiName, decoratorArgs, tsType, options);
            if (mapped == null) {
                skipped.push({ name: apiName, reason: 'unsupported_type' });
                continue;
            }
            seen.add(apiName);
            fields.push(mapped);
        }
        return {
            className,
            fields,
            skipped,
            discovery: LumenScriptPropertyExtractor.describeDiscovery(),
        };
    }

    /**
     * @description 解析 `@ccclass('Name')`。
     * @param source 源码
     * @returns 类名或 `null`
     */
    private static _extractClassName(source: string): string | null {
        const match = /@ccclass\s*\(\s*['"]([^'"]+)['"]\s*\)/.exec(source);
        if (match == null || match[1] == null || match[1].trim().length === 0) {
            return null;
        }
        return match[1].trim();
    }

    /**
     * @description 是否显式 `serializable: false`。
     * @param decoratorArgs 装饰器括号内容
     * @returns 是否跳过
     */
    private static _isNonSerializable(decoratorArgs: string): boolean {
        return /serializable\s*:\s*false\b/.test(decoratorArgs);
    }

    /**
     * @description 将装饰器参数与 TS 注解映射为字段规格。
     * @param apiName 属性名
     * @param decoratorArgs 装饰器参数
     * @param tsType TS 注解
     * @returns 规格或 `null`
     */
    private static _mapField(
        apiName: string,
        decoratorArgs: string,
        tsType: string,
        options?: ILumenScriptPropertyExtractOptions,
    ): ILumenPropertyFieldSpec | null {
        const fromDecorator = LumenScriptPropertyExtractor._typeFromDecoratorArgs(decoratorArgs);
        const typeToken = fromDecorator ?? LumenScriptPropertyExtractor._normalizeTsType(tsType);
        if (typeToken == null || typeToken.length === 0) {
            return null;
        }
        return LumenScriptPropertyExtractor._specFromTypeToken(apiName, typeToken, options);
    }

    /**
     * @description 从 `@property(...)` 参数提取类型记号。
     * @param decoratorArgs 参数文本
     * @returns 如 `Node`、`[CCInteger]`、`Label`；无则 `null`
     */
    private static _typeFromDecoratorArgs(decoratorArgs: string): string | null {
        if (decoratorArgs.length === 0) {
            return null;
        }
        const typeProp = /(?:^|[,{]\s*)type\s*:\s*(\[[^\]]+\]|[A-Za-z_][\w.]*)/.exec(decoratorArgs);
        if (typeProp != null && typeProp[1] != null) {
            return typeProp[1].replace(/\s+/g, '');
        }
        const bare = decoratorArgs.replace(/\s+/g, '');
        if (/^[A-Za-z_][\w.]*$/.test(bare) || /^\[[A-Za-z_][\w.]*\]$/.test(bare)) {
            return bare;
        }
        return null;
    }

    /**
     * @description 规范化 TS 注解为类型记号。
     * @param tsType 注解文本
     * @returns 记号或 `null`
     */
    private static _normalizeTsType(tsType: string): string | null {
        if (tsType.length === 0) {
            return null;
        }
        let text = tsType.replace(/\s+/g, ' ').trim();
        text = text.replace(/\s*\|\s*null\b/g, '').replace(/\s*\|\s*undefined\b/g, '').trim();
        const arrayMatch = /^([A-Za-z_][\w.]*)\s*\[\s*\]$/.exec(text);
        if (arrayMatch != null && arrayMatch[1] != null) {
            return `[${arrayMatch[1]}]`;
        }
        const genericArray = /^Array\s*<\s*([A-Za-z_][\w.]*)\s*>$/.exec(text);
        if (genericArray != null && genericArray[1] != null) {
            return `[${genericArray[1]}]`;
        }
        if (/^[A-Za-z_][\w.]*$/.test(text)) {
            return text;
        }
        return null;
    }

    /**
     * @description 类型记号 → 字段规格。
     * @param apiName 属性名
     * @param typeToken 类型记号
     * @returns 规格或 `null`
     */
    private static _specFromTypeToken(
        apiName: string,
        typeToken: string,
        options?: ILumenScriptPropertyExtractOptions,
    ): ILumenPropertyFieldSpec | null {
        const isArray = typeToken.startsWith('[') && typeToken.endsWith(']');
        const inner = isArray ? typeToken.slice(1, -1) : typeToken;
        const simple = inner.includes('.') ? (inner.split('.').pop() ?? inner) : inner;

        if (simple === 'string') {
            return {
                apiName,
                serializedName: apiName,
                kind: isArray ? 'stringList' : 'string',
            };
        }
        if (simple === 'number' || simple === 'Number') {
            return {
                apiName,
                serializedName: apiName,
                kind: isArray ? 'numberList' : 'number',
            };
        }
        if (simple === 'boolean' || simple === 'Boolean') {
            return {
                apiName,
                serializedName: apiName,
                kind: 'boolean',
            };
        }
        const wrapper = SCALAR_WRAPPERS[simple];
        if (wrapper != null) {
            if (isArray) {
                if (wrapper === 'number') {
                    return { apiName, serializedName: apiName, kind: 'numberList' };
                }
                if (wrapper === 'string') {
                    return { apiName, serializedName: apiName, kind: 'stringList' };
                }
                return null;
            }
            return {
                apiName,
                serializedName: apiName,
                kind: wrapper,
            };
        }
        if (simple === 'Color') {
            return isArray ? null : { apiName, serializedName: apiName, kind: 'color' };
        }
        if (simple === 'Vec2' || simple === 'math.Vec2') {
            return {
                apiName,
                serializedName: apiName,
                kind: isArray ? 'vec2List' : 'vec2',
            };
        }
        if (simple === 'Vec3' || simple === 'math.Vec3') {
            return {
                apiName,
                serializedName: apiName,
                kind: isArray ? 'vec3List' : 'vec3',
            };
        }
        if (simple === 'Size' || simple === 'math.Size') {
            return isArray ? null : { apiName, serializedName: apiName, kind: 'size' };
        }
        if (simple === 'Rect' || simple === 'math.Rect') {
            return isArray ? null : { apiName, serializedName: apiName, kind: 'rect' };
        }
        if (simple === 'Node') {
            return {
                apiName,
                serializedName: apiName,
                kind: isArray ? 'nodeRefList' : 'nodeRef',
            };
        }
        if (ASSET_TYPE_NAMES.has(simple)) {
            return {
                apiName,
                serializedName: apiName,
                kind: isArray ? 'uuidList' : 'uuid',
            };
        }
        const componentType = LumenCuratedSchemaCatalog.shared().scriptComponentType(simple);
        if (componentType != null) {
            return {
                apiName,
                serializedName: apiName,
                kind: isArray ? 'componentRefList' : 'componentRef',
                refComponentType: componentType,
            };
        }
        const customComponentType = options?.resolveCustomComponentType?.(simple);
        if (customComponentType != null && customComponentType.trim().length > 0) {
            return {
                apiName,
                serializedName: apiName,
                kind: isArray ? 'componentRefList' : 'componentRef',
                refComponentType: customComponentType.trim(),
            };
        }
        return null;
    }
}
