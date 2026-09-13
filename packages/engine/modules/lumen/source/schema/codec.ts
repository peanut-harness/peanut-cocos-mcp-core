import type {
    ILumenEnumHint,
    ILumenPropertyFieldSpec,
    LumenPropertyValueKind,
} from './component-property';
import { LumenCocosVersion } from './cocos-version';

/**
 * @description 废弃内置组件登记。
 */
export interface ILumenCuratedDeprecatedBuiltin {
    /**
     * @description 自该版本起视为废弃。
     */
    readonly deprecatedSince: string;

    /**
     * @description 替代写法说明。
     */
    readonly useInstead: string;
}

/**
 * @description 类型生命周期（省略表示当前基线无边界）。
 */
export interface ILumenCuratedTypeLifecycle {
    /**
     * @description 自该版本起可挂载 / 可编辑（含）。
     */
    readonly since?: string;

    /**
     * @description 自该版本起废弃，禁止新挂载（含）。
     */
    readonly deprecatedSince?: string;

    /**
     * @description 自该版本起移除，不再出现在清单中（含）。
     */
    readonly removedSince?: string;

    /**
     * @description 废弃或移除后的替代说明。
     */
    readonly useInstead?: string;
}

/**
 * @description 组件 / 内嵌类型 / 节点 JSON 文档。
 */
export interface ILumenCuratedTypeDocument extends ILumenCuratedTypeLifecycle {
    /**
     * @description 引擎 `__type__` 或 `cc.Node`。
     */
    readonly type: string;

    /**
     * @description 文档种类。
     */
    readonly kind: 'component' | 'embedded' | 'node';

    /**
     * @description 可编辑字段；`typeRef` 尚未展开。
     */
    readonly fields: readonly ILumenPropertyFieldSpec[];
}

/**
 * @description 废弃组件 JSON 文档。
 */
export interface ILumenCuratedDeprecatedDocument {
    /**
     * @description 固定为 `deprecated`。
     */
    readonly kind: 'deprecated';

    /**
     * @description 组件类型 → 废弃说明。
     */
    readonly builtins: Readonly<Record<string, ILumenCuratedDeprecatedBuiltin>>;
}

/**
 * @description 挂载约定 JSON 文档（Renderer 互斥族与 Layer 类型表）。
 */
export interface ILumenCuratedConventionsDocument {
    /**
     * @description 固定为 `conventions`。
     */
    readonly kind: 'conventions';

    /**
     * @description 同节点互斥的 `cc.Renderer` 子类。
     */
    readonly rendererExclusive: readonly string[];

    /**
     * @description 倾向 `UI_2D` 的组件类型。
     */
    readonly ui2dTypes: readonly string[];

    /**
     * @description 倾向 `DEFAULT` 的组件类型。
     */
    readonly world3dTypes: readonly string[];
}

/**
 * @description 独立资产文档实现：旁路 `.meta`、源 JSON 对象，或仍走专用编解码。
 */
export type LumenAssetDocumentKind = 'sidecar-meta' | 'json-asset' | 'custom';

/**
 * @description 旁路 `.meta` / json-asset 字段值类型。`uuidArray` 检视为 uuid 字符串列表，写入 `{ __uuid__ }[]`。
 */
export type LumenSidecarFieldKind =
    | 'string'
    | 'number'
    | 'boolean'
    | 'enumNumber'
    | 'stringEnum'
    | 'numberMap'
    | 'booleanMap'
    | 'object'
    | 'subMetaList'
    | 'uuidArray'
    | 'compressSettings';

/**
 * @description 旁路 `.meta` 字段规格（`userData` / `subMetas`）。
 */
export interface ILumenSidecarFieldSpec {
    /**
     * @description Inspector / patch 字段名。
     */
    readonly apiName: string;

    /**
     * @description meta 内键名；`flatten` 对象写到父级 `userData`。
     */
    readonly serializedName: string;

    /**
     * @description 值类型。
     */
    readonly kind: LumenSidecarFieldKind;

    /**
     * @description 是否允许 `applyPatch`。
     */
    readonly writable: boolean;

    /**
     * @description 检视缺省；`nullable` 数字缺省为 `null`。
     */
    readonly default?: string | number | boolean;

    /**
     * @description 数字缺失时检视为 `null`。
     */
    readonly nullable?: boolean;

    /**
     * @description 数字下限（含）。
     */
    readonly min?: number;

    /**
     * @description 数字上限（含）。
     */
    readonly max?: number;

    /**
     * @description 写入时是否要求整数。
     */
    readonly integer?: boolean;

    /**
     * @description `enumNumber` 名 → 数值。
     */
    readonly aliases?: Readonly<Record<string, number>>;

    /**
     * @description `enumNumber` 允许的数值；省略则取 `aliases` 的值。
     */
    readonly values?: readonly number[];

    /**
     * @description 布尔 `true` 映射的数值（如 CubeMap `mipBakeMode`）。
     */
    readonly booleanTrue?: number;

    /**
     * @description 布尔 `false` 映射的数值。
     */
    readonly booleanFalse?: number;

    /**
     * @description 派生检视字段（如 `downloadModeName`）。
     */
    readonly nameField?: string;

    /**
     * @description `stringEnum` 允许值。
     */
    readonly enumValues?: readonly string[];

    /**
     * @description 空串是否从 `userData` 删除键。
     */
    readonly emptyDeletes?: boolean;

    /**
     * @description 对象检视分组，但字段落在父级 `userData`。
     */
    readonly flatten?: boolean;

    /**
     * @description 嵌套字段（`object`）。
     */
    readonly nestedFields?: readonly ILumenSidecarFieldSpec[];

    /**
     * @description `subMetaList` 过滤的子资源 importer。
     */
    readonly subMetaImporter?: string;

    /**
     * @description 枚举写入失败用 `property_range` 还是 `property_type`。
     */
    readonly errorStyle?: 'range' | 'type';

    /**
     * @description 枚举错误提示（`0|1|WEB_AUDIO|DOM_AUDIO`）。
     */
    readonly errorHint?: string;
}

/**
 * @description `bundled/schema/assets.json` 中的一种独立资产。
 */
export interface ILumenAssetSchemaEntry {
    /**
     * @description 公开 `kind` 字符串。
     */
    readonly assetKind: string;

    /**
     * @description 文档实现。
     */
    readonly document: LumenAssetDocumentKind;

    /**
     * @description 是否允许 scaffold 空文档。
     */
    readonly scaffold: boolean;

    /**
     * @description 路径唯一扩展名（小写，含点）；省略表示只靠 importer。
     */
    readonly extensions: readonly string[];

    /**
     * @description 允许的 `.meta` importer。
     */
    readonly importers: readonly string[];

    /**
     * @description 错误码前缀（sidecar 必填）。
     */
    readonly errorPrefix?: string;

    /**
     * @description sidecar / json-asset 公开字段。
     */
    readonly fields: readonly ILumenSidecarFieldSpec[];

    /**
     * @description 保存时是否连同源文件一起写（LabelAtlas / Auto Atlas）。
     */
    readonly writeSource?: boolean;

    /**
     * @description scaffold 时写入的源文本；省略且 `writeSource` 时为空串。
     */
    readonly sourceText?: string;

    /**
     * @description sidecar scaffold 的 `.meta` 模板；字符串 `$uuid` 在实例化时替换。
     */
    readonly metaScaffold?: Readonly<Record<string, unknown>>;

    /**
     * @description json-asset 允许的源 `__type__`。
     */
    readonly allowedTypes?: readonly string[];

    /**
     * @description json-asset scaffold 源模板；字符串 `$name` 在实例化时替换。
     */
    readonly scaffoldRecord?: Readonly<Record<string, unknown>>;

    /**
     * @description 类型错误前缀（默认与 `errorPrefix` 相同；物理材质为 `lumen`）。
     */
    readonly propertyTypePrefix?: string;

    /**
     * @description 不可写错误是否夹 `assetKind`；省略则 sidecar 为 true、json-asset 为 false。
     */
    readonly notEditableIncludesKind?: boolean;
}

/**
 * @description 独立资产种类表。
 */
export interface ILumenCuratedAssetsDocument {
    /**
     * @description 固定为 `assets`。
     */
    readonly kind: 'assets';

    /**
     * @description 种类条目。
     */
    readonly entries: readonly ILumenAssetSchemaEntry[];
}

/**
 * @description 把策展 JSON 校验成字段规格（`typeRef` 仍保留在 `embeddedType` 展开前的临时字段里）。
 */
export class LumenCuratedSchemaCodec {
    /**
     * @description 允许的 `kind` 取值。
     */
    private static readonly _valueKinds: ReadonlySet<string> = new Set([
        'string',
        'number',
        'boolean',
        'enum',
        'size',
        'vec2',
        'vec3',
        'rect',
        'color',
        'uuid',
        'uuidList',
        'vec2List',
        'vec3List',
        'stringList',
        'numberList',
        'nodeRef',
        'componentRef',
        'nodeRefList',
        'componentRefList',
        'curveRange',
        'gradientRange',
        'objectPatch',
        'objectList',
        'eventHandlerList',
    ]);

    /**
     * @description 嵌套字段最大深度。
     */
    private static readonly _maxFieldDepth = 8;

    /**
     * @description `assets.json` 允许的独立资产 `kind`。
     */
    private static readonly _standaloneAssetKinds: ReadonlySet<string> = new Set([
        'material',
        'animationClip',
        'physicsMaterial',
        'terrain',
        'image',
        'effect',
        'effectChunk',
        'model',
        'autoAtlas',
        'labelAtlas',
        'animationGraph',
        'animationGraphVariant',
        'animationMask',
        'renderTexture',
        'renderPipeline',
        'renderFlow',
        'renderStage',
        'audio',
        'video',
        'ttfFont',
        'bitmapFont',
        'spine',
        'dragonBones',
        'dragonBonesAtlas',
        'cubeMap',
        'tiledMap',
        'directory',
        'particle',
        'spriteAtlas',
        'json',
        'text',
        'buffer',
        'script',
        'javascript',
        'mesh',
        'skeleton',
        'instantiationAnimation',
        'instantiationMaterial',
    ]);

    /**
     * @description 旁路 `.meta` 字段 `kind`。
     */
    private static readonly _sidecarFieldKinds: ReadonlySet<string> = new Set([
        'string',
        'number',
        'boolean',
        'enumNumber',
        'stringEnum',
        'numberMap',
        'booleanMap',
        'object',
        'subMetaList',
        'uuidArray',
        'compressSettings',
    ]);

    /**
     * @description 旁路字段最大嵌套深度。
     */
    private static readonly _maxSidecarFieldDepth = 4;

    /**
     * @description 解析组件 / 内嵌 / 节点文档。
     * @param value 未受信 JSON
     * @param sourceLabel 错误定位（相对路径）
     * @returns 文档
     */
    public parseTypeDocument(value: unknown, sourceLabel: string): ILumenCuratedTypeDocument {
        const record = this._asObject(value, sourceLabel);
        const typeName = this._requiredString(record, 'type', sourceLabel);
        const kind = this._requiredString(record, 'kind', sourceLabel);
        if (kind !== 'component' && kind !== 'embedded' && kind !== 'node') {
            throw new Error(`lumen_curated_schema_kind:${sourceLabel}:${kind}`);
        }
        const fieldsRaw = record.fields;
        if (!Array.isArray(fieldsRaw)) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:fields`);
        }
        const fields = fieldsRaw.map((item, index) =>
            this.parseField(item, `${sourceLabel}:fields[${index}]`, 0),
        );
        this._assertUniqueApiNames(fields, sourceLabel);
        const lifecycle = this._parseLifecycle(record, sourceLabel);
        return { type: typeName, kind, fields, ...lifecycle };
    }

    /**
     * @description 解析废弃组件文档。
     * @param value 未受信 JSON
     * @param sourceLabel 错误定位
     * @returns 文档
     */
    public parseDeprecatedDocument(value: unknown, sourceLabel: string): ILumenCuratedDeprecatedDocument {
        const record = this._asObject(value, sourceLabel);
        const kind = this._requiredString(record, 'kind', sourceLabel);
        if (kind !== 'deprecated') {
            throw new Error(`lumen_curated_schema_kind:${sourceLabel}:${kind}`);
        }
        const builtinsRaw = record.builtins;
        const builtinsObject = this._asObject(builtinsRaw, `${sourceLabel}:builtins`);
        const builtins: Record<string, ILumenCuratedDeprecatedBuiltin> = {};
        for (const [componentType, specRaw] of Object.entries(builtinsObject)) {
            if (componentType.trim().length === 0) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:empty_type`);
            }
            const spec = this._asObject(specRaw, `${sourceLabel}:builtins.${componentType}`);
            const deprecatedSince = this._requiredVersion(
                spec,
                'deprecatedSince',
                `${sourceLabel}:${componentType}`,
            );
            builtins[componentType] = {
                deprecatedSince,
                useInstead: this._requiredString(spec, 'useInstead', `${sourceLabel}:${componentType}`),
            };
        }
        return { kind: 'deprecated', builtins };
    }

    /**
     * @description 解析挂载约定文档。
     * @param value 未受信 JSON
     * @param sourceLabel 错误定位
     * @returns 文档
     */
    public parseConventionsDocument(value: unknown, sourceLabel: string): ILumenCuratedConventionsDocument {
        const record = this._asObject(value, sourceLabel);
        const kind = this._requiredString(record, 'kind', sourceLabel);
        if (kind !== 'conventions') {
            throw new Error(`lumen_curated_schema_kind:${sourceLabel}:${kind}`);
        }
        const rendererExclusive = this._parseUniqueTypeList(
            record.rendererExclusive,
            `${sourceLabel}:rendererExclusive`,
        );
        const ui2dTypes = this._parseUniqueTypeList(record.ui2dTypes, `${sourceLabel}:ui2dTypes`);
        const world3dTypes = this._parseUniqueTypeList(record.world3dTypes, `${sourceLabel}:world3dTypes`);
        for (const typeName of ui2dTypes) {
            if (world3dTypes.includes(typeName)) {
                throw new Error(`lumen_curated_schema_layer_overlap:${sourceLabel}:${typeName}`);
            }
        }
        return { kind: 'conventions', rendererExclusive, ui2dTypes, world3dTypes };
    }

    /**
     * @description 解析独立资产种类表。
     * @param value 未受信 JSON
     * @param sourceLabel 错误定位
     * @returns 资产文档
     */
    public parseAssetsDocument(value: unknown, sourceLabel: string): ILumenCuratedAssetsDocument {
        const record = this._asObject(value, sourceLabel);
        const kind = this._requiredString(record, 'kind', sourceLabel);
        if (kind !== 'assets') {
            throw new Error(`lumen_curated_schema_kind:${sourceLabel}:${kind}`);
        }
        if (!Array.isArray(record.entries)) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:entries`);
        }
        const entries = record.entries.map((item, index) =>
            this._parseAssetEntry(item, `${sourceLabel}:entries[${index}]`),
        );
        this._assertUniqueAssetKinds(entries, sourceLabel);
        this._assertUniqueExtensions(entries, sourceLabel);
        this._assertUniqueImporters(entries, sourceLabel);
        return { kind: 'assets', entries };
    }

    /**
     * @description 解析单条字段（可含未展开的 `typeRef`）。
     * @param value 未受信字段
     * @param sourceLabel 错误定位
     * @param depth 当前嵌套深度
     * @returns 字段规格；`typeRef` 暂存在 `origin` 之外的运行期扩展字段中
     */
    public parseField(value: unknown, sourceLabel: string, depth: number): ILumenPropertyFieldSpec {
        if (depth > LumenCuratedSchemaCodec._maxFieldDepth) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:depth`);
        }
        const record = this._asObject(value, sourceLabel);
        const apiName = this._requiredString(record, 'apiName', sourceLabel);
        const serializedName = this._requiredString(record, 'serializedName', sourceLabel);
        const kindRaw = this._requiredString(record, 'kind', sourceLabel);
        if (!this._isValueKind(kindRaw)) {
            throw new Error(`lumen_curated_schema_kind:${sourceLabel}:${kindRaw}`);
        }
        const typeRef = this._optionalString(record, 'typeRef', sourceLabel);
        const nestedRaw = record.nestedFields;
        if (typeRef != null && nestedRaw !== undefined) {
            throw new Error(`lumen_curated_schema_nested_and_ref:${sourceLabel}`);
        }
        const nestedFields =
            nestedRaw === undefined
                ? undefined
                : this._parseNestedFields(nestedRaw, sourceLabel, depth);
        const spec: ILumenPropertyFieldSpec = {
            apiName,
            serializedName,
            kind: kindRaw,
            ...(this._optionalString(record, 'refComponentType', sourceLabel) != null
                ? { refComponentType: this._optionalString(record, 'refComponentType', sourceLabel) }
                : {}),
            ...(this._optionalString(record, 'embeddedType', sourceLabel) != null
                ? { embeddedType: this._optionalString(record, 'embeddedType', sourceLabel) }
                : {}),
            ...(typeRef != null ? { typeRef } : {}),
            ...(nestedFields != null ? { nestedFields } : {}),
            ...(record.inlineItems === true ? { inlineItems: true } : {}),
            ...(this._optionalVersion(record, 'since', sourceLabel) != null
                ? { since: this._optionalVersion(record, 'since', sourceLabel) }
                : {}),
            ...(this._optionalVersion(record, 'until', sourceLabel) != null
                ? { until: this._optionalVersion(record, 'until', sourceLabel) }
                : {}),
            ...(this._parseEnumHints(record.enumHints, sourceLabel) != null
                ? { enumHints: this._parseEnumHints(record.enumHints, sourceLabel) }
                : {}),
            ...(record.example !== undefined ? { example: record.example } : {}),
        };
        return spec;
    }

    /**
     * @description 读取字段上的 `typeRef`（校验阶段写入）。
     * @param spec 字段
     * @returns 类型名或 `undefined`
     */
    public readTypeRef(spec: ILumenPropertyFieldSpec): string | undefined {
        if (!('typeRef' in spec)) {
            return undefined;
        }
        const typeRef = spec.typeRef;
        return typeof typeRef === 'string' && typeRef.length > 0 ? typeRef : undefined;
    }

    /**
     * @description 去掉 JSON 阶段的 `typeRef`。
     * @param spec 原字段
     * @returns 不含 `typeRef` 的规格
     */
    public omitTypeRef(spec: ILumenPropertyFieldSpec): ILumenPropertyFieldSpec {
        if (this.readTypeRef(spec) == null) {
            return spec;
        }
        const { typeRef: _ignored, ...rest } = spec;
        return rest;
    }

    /**
     * @description 去掉 `typeRef` 并写入已展开的 `nestedFields`。
     * @param spec 原字段
     * @param nestedFields 展开后的嵌套字段
     * @param embeddedType 内嵌 `__type__`
     * @returns 运行时规格
     */
    public withResolvedNested(
        spec: ILumenPropertyFieldSpec,
        nestedFields: readonly ILumenPropertyFieldSpec[],
        embeddedType: string,
    ): ILumenPropertyFieldSpec {
        return {
            ...this.omitTypeRef(spec),
            embeddedType: spec.embeddedType ?? embeddedType,
            nestedFields,
        };
    }

    /**
     * @description 解析嵌套字段数组。
     * @param value 未受信数组
     * @param sourceLabel 错误定位
     * @param depth 当前深度
     * @returns 嵌套规格
     */
    private _parseNestedFields(
        value: unknown,
        sourceLabel: string,
        depth: number,
    ): readonly ILumenPropertyFieldSpec[] {
        if (!Array.isArray(value)) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:nestedFields`);
        }
        const fields = value.map((item, index) =>
            this.parseField(item, `${sourceLabel}.nestedFields[${index}]`, depth + 1),
        );
        this._assertUniqueApiNames(fields, `${sourceLabel}.nestedFields`);
        return fields;
    }

    /**
     * @description 解析枚举提示。
     * @param value 未受信值
     * @param sourceLabel 错误定位
     * @returns 提示列表或省略
     */
    private _parseEnumHints(value: unknown, sourceLabel: string): readonly ILumenEnumHint[] | undefined {
        if (value === undefined) {
            return undefined;
        }
        if (!Array.isArray(value) || value.length === 0) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:enumHints`);
        }
        return value.map((item, index) => {
            const record = this._asObject(item, `${sourceLabel}:enumHints[${index}]`);
            const name = this._requiredString(record, 'name', `${sourceLabel}:enumHints[${index}]`);
            const rawValue = record.value;
            if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:enumHints[${index}].value`);
            }
            return { name, value: rawValue };
        });
    }

    /**
     * @description 解析去重的组件类型列表。
     * @param value 未受信数组
     * @param sourceLabel 错误定位
     * @returns 类型名
     */
    private _parseUniqueTypeList(value: unknown, sourceLabel: string): readonly string[] {
        if (!Array.isArray(value)) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}`);
        }
        const types: string[] = [];
        const seen = new Set<string>();
        for (let index = 0; index < value.length; index += 1) {
            const item = value[index];
            if (typeof item !== 'string' || item.trim().length === 0) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}[${index}]`);
            }
            if (seen.has(item)) {
                throw new Error(`lumen_curated_schema_duplicate:${sourceLabel}:${item}`);
            }
            seen.add(item);
            types.push(item);
        }
        return types;
    }

    /**
     * @description 断言同层 `apiName` 不重复。
     * @param fields 字段
     * @param sourceLabel 错误定位
     */
    private _assertUniqueApiNames(fields: readonly ILumenPropertyFieldSpec[], sourceLabel: string): void {
        const seen = new Set<string>();
        for (const field of fields) {
            if (seen.has(field.apiName)) {
                throw new Error(`lumen_curated_schema_duplicate:${sourceLabel}:${field.apiName}`);
            }
            seen.add(field.apiName);
        }
    }

    /**
     * @description 判断是否为已知值类型。
     * @param value 字符串
     * @returns 是否合法 kind
     */
    private _isValueKind(value: string): value is LumenPropertyValueKind {
        return LumenCuratedSchemaCodec._valueKinds.has(value);
    }

    /**
     * @description 把未知值收成普通对象。
     * @param value 未受信值
     * @param sourceLabel 错误定位
     * @returns 对象
     */
    private _asObject(value: unknown, sourceLabel: string): Record<string, unknown> {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:object`);
        }
        const record: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value)) {
            record[key] = item;
        }
        return record;
    }

    /**
     * @description 读取必填字符串。
     * @param record 对象
     * @param key 键
     * @param sourceLabel 错误定位
     * @returns 非空字符串
     */
    private _requiredString(record: Readonly<Record<string, unknown>>, key: string, sourceLabel: string): string {
        const value = record[key];
        if (typeof value !== 'string' || value.trim().length === 0) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:${key}`);
        }
        return value;
    }

    /**
     * @description 读取可选字符串。
     * @param record 对象
     * @param key 键
     * @param sourceLabel 错误定位
     * @returns 字符串或 `undefined`
     */
    private _optionalString(
        record: Readonly<Record<string, unknown>>,
        key: string,
        sourceLabel: string,
    ): string | undefined {
        const value = record[key];
        if (value === undefined) {
            return undefined;
        }
        if (typeof value !== 'string' || value.trim().length === 0) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:${key}`);
        }
        return value;
    }

    /**
     * @description 读取可选布尔。
     * @param record 对象
     * @param key 键
     * @param sourceLabel 错误定位
     * @returns 布尔或 `undefined`
     */
    private _optionalBoolean(
        record: Readonly<Record<string, unknown>>,
        key: string,
        sourceLabel: string,
    ): boolean | undefined {
        const value = record[key];
        if (value === undefined) {
            return undefined;
        }
        if (typeof value !== 'boolean') {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:${key}`);
        }
        return value;
    }

    /**
     * @description 读取可选字符串，允许空串（sidecar `sourceText`）。
     * @param record 对象
     * @param key 键
     * @param sourceLabel 错误定位
     * @returns 字符串或 `undefined`
     */
    private _optionalRawString(
        record: Readonly<Record<string, unknown>>,
        key: string,
        sourceLabel: string,
    ): string | undefined {
        const value = record[key];
        if (value === undefined) {
            return undefined;
        }
        if (typeof value !== 'string') {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:${key}`);
        }
        return value;
    }

    /**
     * @description 读取可选 JSON 对象（scaffold 模板）。
     * @param value 未受信值
     * @param sourceLabel 错误定位
     * @returns 对象或 `undefined`
     */
    private _optionalJsonRecord(
        value: unknown,
        sourceLabel: string,
    ): Readonly<Record<string, unknown>> | undefined {
        if (value === undefined) {
            return undefined;
        }
        return this._asObject(value, sourceLabel);
    }

    /**
     * @description 解析类型生命周期并校验版本顺序。
     * @param record 文档对象
     * @param sourceLabel 错误定位
     * @returns 生命周期字段
     */
    private _parseLifecycle(
        record: Readonly<Record<string, unknown>>,
        sourceLabel: string,
    ): ILumenCuratedTypeLifecycle {
        const since = this._optionalVersion(record, 'since', sourceLabel);
        const deprecatedSince = this._optionalVersion(record, 'deprecatedSince', sourceLabel);
        const removedSince = this._optionalVersion(record, 'removedSince', sourceLabel);
        const useInstead = this._optionalString(record, 'useInstead', sourceLabel);
        if ((deprecatedSince != null || removedSince != null) && useInstead == null) {
            throw new Error(`lumen_curated_schema_lifecycle_hint:${sourceLabel}`);
        }
        this._assertVersionOrder(since, deprecatedSince, `${sourceLabel}:since<=deprecatedSince`);
        this._assertVersionOrder(deprecatedSince, removedSince, `${sourceLabel}:deprecatedSince<=removedSince`);
        this._assertVersionOrder(since, removedSince, `${sourceLabel}:since<=removedSince`);
        return {
            ...(since != null ? { since } : {}),
            ...(deprecatedSince != null ? { deprecatedSince } : {}),
            ...(removedSince != null ? { removedSince } : {}),
            ...(useInstead != null ? { useInstead } : {}),
        };
    }

    /**
     * @description 断言左版本不晚于右版本。
     * @param earlier 较早版本；省略则跳过
     * @param later 较晚版本；省略则跳过
     * @param sourceLabel 错误定位
     */
    private _assertVersionOrder(earlier: string | undefined, later: string | undefined, sourceLabel: string): void {
        if (earlier == null || later == null) {
            return;
        }
        if (LumenCocosVersion.parse(later).compare(LumenCocosVersion.parse(earlier)) < 0) {
            throw new Error(`lumen_curated_schema_lifecycle_order:${sourceLabel}`);
        }
    }

    /**
     * @description 读取必填版本字符串。
     * @param record 对象
     * @param key 键
     * @param sourceLabel 错误定位
     * @returns 规范化版本
     */
    private _requiredVersion(
        record: Readonly<Record<string, unknown>>,
        key: string,
        sourceLabel: string,
    ): string {
        return LumenCocosVersion.parse(this._requiredString(record, key, sourceLabel)).toString();
    }

    /**
     * @description 读取可选版本字符串。
     * @param record 对象
     * @param key 键
     * @param sourceLabel 错误定位
     * @returns 规范化版本或 `undefined`
     */
    private _optionalVersion(
        record: Readonly<Record<string, unknown>>,
        key: string,
        sourceLabel: string,
    ): string | undefined {
        const raw = this._optionalString(record, key, sourceLabel);
        if (raw == null) {
            return undefined;
        }
        try {
            return LumenCocosVersion.parse(raw).toString();
        } catch {
            throw new Error(`lumen_curated_schema_version:${sourceLabel}:${key}`);
        }
    }

    /**
     * @description 解析一条独立资产登记。
     * @param value 未受信条目
     * @param sourceLabel 错误定位
     * @returns 条目
     */
    private _parseAssetEntry(value: unknown, sourceLabel: string): ILumenAssetSchemaEntry {
        const record = this._asObject(value, sourceLabel);
        const assetKind = this._requiredString(record, 'assetKind', sourceLabel);
        if (!LumenCuratedSchemaCodec._standaloneAssetKinds.has(assetKind)) {
            throw new Error(`lumen_curated_schema_kind:${sourceLabel}:assetKind:${assetKind}`);
        }
        const documentRaw = this._requiredString(record, 'document', sourceLabel);
        const document = this._asAssetDocumentKind(documentRaw, sourceLabel);
        const scaffold = this._requiredBoolean(record, 'scaffold', sourceLabel);
        const extensions = this._parseExtensionList(record.extensions, `${sourceLabel}:extensions`);
        const importers = this._parseImporterList(record.importers, `${sourceLabel}:importers`);
        const errorPrefix = this._optionalString(record, 'errorPrefix', sourceLabel);
        const propertyTypePrefix = this._optionalString(record, 'propertyTypePrefix', sourceLabel);
        const notEditableIncludesKind = this._optionalBoolean(record, 'notEditableIncludesKind', sourceLabel);
        const writeSource = record.writeSource === true;
        const sourceText = this._optionalRawString(record, 'sourceText', sourceLabel);
        const metaScaffold = this._optionalJsonRecord(record.metaScaffold, `${sourceLabel}:metaScaffold`);
        const scaffoldRecord = this._optionalJsonRecord(record.scaffoldRecord, `${sourceLabel}:scaffoldRecord`);
        const allowedTypes = this._parseUniqueStringList(record.allowedTypes, `${sourceLabel}:allowedTypes`);
        const fields =
            record.fields === undefined
                ? []
                : this._parseSidecarFields(record.fields, `${sourceLabel}:fields`, 0);
        if (document === 'sidecar-meta') {
            if (errorPrefix == null) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:errorPrefix`);
            }
            if (importers.length === 0) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:importers`);
            }
            if (scaffold && metaScaffold == null) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:metaScaffold`);
            }
            if (allowedTypes != null || scaffoldRecord != null) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:json-asset`);
            }
        } else if (document === 'json-asset') {
            if (errorPrefix == null) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:errorPrefix`);
            }
            if (importers.length === 0) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:importers`);
            }
            if (allowedTypes == null || allowedTypes.length === 0) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:allowedTypes`);
            }
            if (scaffold && scaffoldRecord == null) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:scaffoldRecord`);
            }
            if (writeSource || sourceText != null || metaScaffold != null) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:sidecar`);
            }
        } else if (fields.length > 0 || writeSource || sourceText != null || metaScaffold != null) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:fields`);
        } else if (allowedTypes != null || scaffoldRecord != null) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:json-asset`);
        }
        return {
            assetKind,
            document,
            scaffold,
            extensions,
            importers,
            fields,
            ...(errorPrefix != null ? { errorPrefix } : {}),
            ...(writeSource ? { writeSource: true } : {}),
            ...(sourceText != null ? { sourceText } : {}),
            ...(metaScaffold != null ? { metaScaffold } : {}),
            ...(allowedTypes != null ? { allowedTypes } : {}),
            ...(scaffoldRecord != null ? { scaffoldRecord } : {}),
            ...(propertyTypePrefix != null ? { propertyTypePrefix } : {}),
            ...(notEditableIncludesKind != null ? { notEditableIncludesKind } : {}),
        };
    }

    /**
     * @description 解析旁路字段列表。
     * @param value 未受信数组
     * @param sourceLabel 错误定位
     * @param depth 嵌套深度
     * @returns 字段
     */
    private _parseSidecarFields(value: unknown, sourceLabel: string, depth: number): readonly ILumenSidecarFieldSpec[] {
        if (!Array.isArray(value)) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}`);
        }
        const fields = value.map((item, index) =>
            this._parseSidecarField(item, `${sourceLabel}[${index}]`, depth),
        );
        const seen = new Set<string>();
        for (const field of fields) {
            if (seen.has(field.apiName)) {
                throw new Error(`lumen_curated_schema_duplicate:${sourceLabel}:${field.apiName}`);
            }
            seen.add(field.apiName);
        }
        return fields;
    }

    /**
     * @description 解析旁路字段。
     * @param value 未受信字段
     * @param sourceLabel 错误定位
     * @param depth 嵌套深度
     * @returns 字段规格
     */
    private _parseSidecarField(value: unknown, sourceLabel: string, depth: number): ILumenSidecarFieldSpec {
        if (depth > LumenCuratedSchemaCodec._maxSidecarFieldDepth) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:depth`);
        }
        const record = this._asObject(value, sourceLabel);
        const apiName = this._requiredString(record, 'apiName', sourceLabel);
        const serializedName = this._requiredString(record, 'serializedName', sourceLabel);
        const kindRaw = this._requiredString(record, 'kind', sourceLabel);
        if (!LumenCuratedSchemaCodec._sidecarFieldKinds.has(kindRaw)) {
            throw new Error(`lumen_curated_schema_kind:${sourceLabel}:${kindRaw}`);
        }
        const kind = this._asSidecarFieldKind(kindRaw, sourceLabel);
        const writable = this._requiredBoolean(record, 'writable', sourceLabel);
        const nestedFields =
            record.nestedFields === undefined
                ? undefined
                : this._parseSidecarFields(record.nestedFields, `${sourceLabel}:nestedFields`, depth + 1);
        const aliases = this._parseNumberAliasMap(record.aliases, `${sourceLabel}:aliases`);
        const values = this._parseNumberList(record.values, `${sourceLabel}:values`);
        const enumValues = this._parseUniqueStringList(record.enumValues, `${sourceLabel}:enumValues`);
        const defaultValue = this._optionalDefault(record.default, kind, sourceLabel);
        const min = this._optionalFiniteNumber(record, 'min', sourceLabel);
        const max = this._optionalFiniteNumber(record, 'max', sourceLabel);
        const booleanTrue = this._optionalFiniteNumber(record, 'booleanTrue', sourceLabel);
        const booleanFalse = this._optionalFiniteNumber(record, 'booleanFalse', sourceLabel);
        const nameField = this._optionalString(record, 'nameField', sourceLabel);
        const subMetaImporter = this._optionalString(record, 'subMetaImporter', sourceLabel);
        const errorStyle = this._optionalErrorStyle(record, sourceLabel);
        const errorHint = this._optionalString(record, 'errorHint', sourceLabel);
        const spec: ILumenSidecarFieldSpec = {
            apiName,
            serializedName,
            kind,
            writable,
            ...(defaultValue !== undefined ? { default: defaultValue } : {}),
            ...(record.nullable === true ? { nullable: true } : {}),
            ...(min != null ? { min } : {}),
            ...(max != null ? { max } : {}),
            ...(record.integer === true ? { integer: true } : {}),
            ...(aliases != null ? { aliases } : {}),
            ...(values != null ? { values } : {}),
            ...(booleanTrue != null ? { booleanTrue } : {}),
            ...(booleanFalse != null ? { booleanFalse } : {}),
            ...(nameField != null ? { nameField } : {}),
            ...(enumValues != null ? { enumValues } : {}),
            ...(record.emptyDeletes === true ? { emptyDeletes: true } : {}),
            ...(record.flatten === true ? { flatten: true } : {}),
            ...(nestedFields != null ? { nestedFields } : {}),
            ...(subMetaImporter != null ? { subMetaImporter } : {}),
            ...(errorStyle != null ? { errorStyle } : {}),
            ...(errorHint != null ? { errorHint } : {}),
        };
        this._assertSidecarFieldShape(spec, sourceLabel);
        return spec;
    }

    /**
     * @description 把已校验的字段 kind 收成联合类型。
     * @param kindRaw 已在集合内的字符串
     * @param sourceLabel 错误定位
     * @returns 字段 kind
     */
    private _asSidecarFieldKind(kindRaw: string, sourceLabel: string): LumenSidecarFieldKind {
        switch (kindRaw) {
            case 'string':
            case 'number':
            case 'boolean':
            case 'enumNumber':
            case 'stringEnum':
            case 'numberMap':
            case 'booleanMap':
            case 'object':
            case 'subMetaList':
            case 'uuidArray':
            case 'compressSettings':
                return kindRaw;
            default:
                throw new Error(`lumen_curated_schema_kind:${sourceLabel}:${kindRaw}`);
        }
    }

    /**
     * @description 把已校验的文档实现收成联合类型。
     * @param documentRaw 文档实现字符串
     * @param sourceLabel 错误定位
     * @returns 文档实现
     */
    private _asAssetDocumentKind(documentRaw: string, sourceLabel: string): LumenAssetDocumentKind {
        switch (documentRaw) {
            case 'sidecar-meta':
            case 'json-asset':
            case 'custom':
                return documentRaw;
            default:
                throw new Error(`lumen_curated_schema_kind:${sourceLabel}:document:${documentRaw}`);
        }
    }

    /**
     * @description 校验字段形状与 `kind` 匹配。
     * @param spec 字段
     * @param sourceLabel 错误定位
     */
    private _assertSidecarFieldShape(spec: ILumenSidecarFieldSpec, sourceLabel: string): void {
        if (spec.kind === 'object') {
            if (spec.nestedFields == null || spec.nestedFields.length === 0) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:nestedFields`);
            }
        } else if (spec.nestedFields != null || spec.flatten === true) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:nestedFields`);
        }
        if (spec.kind === 'enumNumber') {
            const values = spec.values ?? (spec.aliases != null ? Object.values(spec.aliases) : []);
            if (values.length === 0) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:values`);
            }
        } else if (spec.aliases != null || spec.values != null || spec.nameField != null) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:enumNumber`);
        }
        if (spec.kind === 'stringEnum') {
            if (spec.enumValues == null || spec.enumValues.length === 0) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:enumValues`);
            }
        } else if (spec.enumValues != null) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:enumValues`);
        }
        if (spec.kind === 'subMetaList') {
            if (spec.subMetaImporter == null) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:subMetaImporter`);
            }
            if (spec.writable) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:writable`);
            }
        } else if (spec.subMetaImporter != null) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:subMetaImporter`);
        }
        if (spec.emptyDeletes === true && spec.kind !== 'string') {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:emptyDeletes`);
        }
        if (spec.nullable === true && spec.kind !== 'number') {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:nullable`);
        }
    }

    /**
     * @description 断言 `assetKind` 不重复。
     * @param entries 条目
     * @param sourceLabel 错误定位
     */
    private _assertUniqueAssetKinds(entries: readonly ILumenAssetSchemaEntry[], sourceLabel: string): void {
        const seen = new Set<string>();
        for (const entry of entries) {
            if (seen.has(entry.assetKind)) {
                throw new Error(`lumen_curated_schema_duplicate:${sourceLabel}:${entry.assetKind}`);
            }
            seen.add(entry.assetKind);
        }
    }

    /**
     * @description 断言路径扩展名不重复。
     * @param entries 条目
     * @param sourceLabel 错误定位
     */
    private _assertUniqueExtensions(entries: readonly ILumenAssetSchemaEntry[], sourceLabel: string): void {
        const seen = new Set<string>();
        for (const entry of entries) {
            for (const extension of entry.extensions) {
                if (seen.has(extension)) {
                    throw new Error(`lumen_curated_schema_duplicate:${sourceLabel}:extension:${extension}`);
                }
                seen.add(extension);
            }
        }
    }

    /**
     * @description 断言 importer 不重复。
     * @param entries 条目
     * @param sourceLabel 错误定位
     */
    private _assertUniqueImporters(entries: readonly ILumenAssetSchemaEntry[], sourceLabel: string): void {
        const seen = new Set<string>();
        for (const entry of entries) {
            for (const importer of entry.importers) {
                if (seen.has(importer)) {
                    throw new Error(`lumen_curated_schema_duplicate:${sourceLabel}:importer:${importer}`);
                }
                seen.add(importer);
            }
        }
    }

    /**
     * @description 解析扩展名列表。
     * @param value 未受信值
     * @param sourceLabel 错误定位
     * @returns 小写扩展名
     */
    private _parseExtensionList(value: unknown, sourceLabel: string): readonly string[] {
        if (value === undefined) {
            return [];
        }
        const items = this._parseUniqueStringList(value, sourceLabel);
        if (items == null) {
            return [];
        }
        return items.map((item, index) => {
            const lower = item.toLowerCase();
            if (!/^\.[a-z0-9]+$/.test(lower)) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}[${index}]`);
            }
            return lower;
        });
    }

    /**
     * @description 解析 importer 列表。
     * @param value 未受信值
     * @param sourceLabel 错误定位
     * @returns importer
     */
    private _parseImporterList(value: unknown, sourceLabel: string): readonly string[] {
        if (value === undefined) {
            return [];
        }
        return this._parseUniqueStringList(value, sourceLabel) ?? [];
    }

    /**
     * @description 解析去重字符串列表；省略则 `undefined`。
     * @param value 未受信值
     * @param sourceLabel 错误定位
     * @returns 字符串
     */
    private _parseUniqueStringList(value: unknown, sourceLabel: string): readonly string[] | undefined {
        if (value === undefined) {
            return undefined;
        }
        return this._parseUniqueTypeList(value, sourceLabel);
    }

    /**
     * @description 解析名 → 数值表。
     * @param value 未受信值
     * @param sourceLabel 错误定位
     * @returns 别名表
     */
    private _parseNumberAliasMap(
        value: unknown,
        sourceLabel: string,
    ): Readonly<Record<string, number>> | undefined {
        if (value === undefined) {
            return undefined;
        }
        const record = this._asObject(value, sourceLabel);
        const aliases: Record<string, number> = {};
        for (const [name, raw] of Object.entries(record)) {
            if (name.trim().length === 0 || typeof raw !== 'number' || !Number.isFinite(raw)) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:${name}`);
            }
            aliases[name] = raw;
        }
        return aliases;
    }

    /**
     * @description 解析有限数字列表。
     * @param value 未受信值
     * @param sourceLabel 错误定位
     * @returns 数字
     */
    private _parseNumberList(value: unknown, sourceLabel: string): readonly number[] | undefined {
        if (value === undefined) {
            return undefined;
        }
        if (!Array.isArray(value) || value.length === 0) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}`);
        }
        return value.map((item, index) => {
            if (typeof item !== 'number' || !Number.isFinite(item)) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}[${index}]`);
            }
            return item;
        });
    }

    /**
     * @description 读取必填布尔。
     * @param record 对象
     * @param key 键
     * @param sourceLabel 错误定位
     * @returns 布尔
     */
    private _requiredBoolean(
        record: Readonly<Record<string, unknown>>,
        key: string,
        sourceLabel: string,
    ): boolean {
        const value = record[key];
        if (typeof value !== 'boolean') {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:${key}`);
        }
        return value;
    }

    /**
     * @description 读取可选有限数字。
     * @param record 对象
     * @param key 键
     * @param sourceLabel 错误定位
     * @returns 数字或 `undefined`
     */
    private _optionalFiniteNumber(
        record: Readonly<Record<string, unknown>>,
        key: string,
        sourceLabel: string,
    ): number | undefined {
        const value = record[key];
        if (value === undefined) {
            return undefined;
        }
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:${key}`);
        }
        return value;
    }

    /**
     * @description 读取与字段 `kind` 匹配的缺省值。
     * @param value 未受信值
     * @param kind 字段类型
     * @param sourceLabel 错误定位
     * @returns 缺省值
     */
    private _optionalDefault(
        value: unknown,
        kind: LumenSidecarFieldKind,
        sourceLabel: string,
    ): string | number | boolean | undefined {
        if (value === undefined) {
            return undefined;
        }
        if (kind === 'string' || kind === 'stringEnum') {
            if (typeof value !== 'string') {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:default`);
            }
            return value;
        }
        if (kind === 'number' || kind === 'enumNumber') {
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:default`);
            }
            return value;
        }
        if (kind === 'boolean') {
            if (typeof value !== 'boolean') {
                throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:default`);
            }
            return value;
        }
        throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:default`);
    }

    /**
     * @description 读取枚举错误风格。
     * @param record 对象
     * @param sourceLabel 错误定位
     * @returns 风格
     */
    private _optionalErrorStyle(
        record: Readonly<Record<string, unknown>>,
        sourceLabel: string,
    ): 'range' | 'type' | undefined {
        const value = record.errorStyle;
        if (value === undefined) {
            return undefined;
        }
        if (value !== 'range' && value !== 'type') {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:errorStyle`);
        }
        return value;
    }
}
