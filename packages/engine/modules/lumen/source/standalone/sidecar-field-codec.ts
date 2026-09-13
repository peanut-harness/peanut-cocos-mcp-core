import type { ILumenAssetSchemaEntry, ILumenSidecarFieldSpec } from '../schema/codec';
import { LumenSidecarMetaIo } from '../io/sidecar-meta';
import type { ILumenSpriteAtlasFrameInspect } from './sidecar-inspect';
import { LumenCompressSettingsCodec } from './compress-settings';
import { LumenTextureFilterModeCodec } from './texture-filter-mode';

/**
 * @description 按 `bundled/schema/assets.json` 字段规格读写旁路 `.meta` 的 `userData` / `subMetas`。
 */
export class LumenSidecarFieldCodec {
    /**
     * @description meta 辅助读写。
     */
    private readonly _io: LumenSidecarMetaIo;

    /**
     * @description 压缩纹理编解码。
     */
    private readonly _compressSettings = new LumenCompressSettingsCodec();

    /**
     * @description 绑定 IO。
     * @param io 旁路 meta IO
     */
    public constructor(io: LumenSidecarMetaIo = new LumenSidecarMetaIo()) {
        this._io = io;
    }

    /**
     * @description 组装 Inspector 快照（含 path / kind / uuid / importer）。
     * @param entry 资产登记
     * @param relativePath 项目相对路径
     * @param meta Creator meta
     * @returns 快照记录
     */
    public inspect(
        entry: ILumenAssetSchemaEntry,
        relativePath: string,
        meta: Readonly<Record<string, unknown>>,
    ): Record<string, unknown> {
        const prefix = this._errorPrefix(entry);
        const userData = this._io.readOptionalRecord(meta.userData);
        const snapshot: Record<string, unknown> = {
            path: relativePath,
            kind: entry.assetKind,
            uuid: this._io.readRequiredString(meta.uuid, `${prefix}_property_type:uuid:string`),
            importer: this._io.readRequiredString(meta.importer, `${prefix}_property_type:importer:string`),
        };
        for (const field of entry.fields) {
            snapshot[field.apiName] = this._inspectField(field, userData, meta, prefix, field.apiName);
            if (field.nameField != null) {
                snapshot[field.nameField] = this._enumName(field, snapshot[field.apiName]);
            }
        }
        return snapshot;
    }

    /**
     * @description 组装源 JSON 对象资产快照（仅 path / kind + 字段）。
     * @param entry 资产登记
     * @param relativePath 项目相对路径
     * @param record 源 JSON 记录
     * @returns 快照记录
     */
    public inspectRecord(
        entry: ILumenAssetSchemaEntry,
        relativePath: string,
        record: Readonly<Record<string, unknown>>,
    ): Record<string, unknown> {
        const prefix = this._errorPrefix(entry);
        const snapshot: Record<string, unknown> = {
            path: relativePath,
            kind: entry.assetKind,
        };
        for (const field of entry.fields) {
            snapshot[field.apiName] = this._inspectField(field, record, record, prefix, field.apiName);
            if (field.nameField != null) {
                snapshot[field.nameField] = this._enumName(field, snapshot[field.apiName]);
            }
        }
        return snapshot;
    }

    /**
     * @description 按可写字段写入补丁并返回新 meta。
     * @param entry 资产登记
     * @param meta 当前 meta
     * @param patch Inspector 补丁
     * @returns 克隆后的 meta
     */
    public applyPatch(
        entry: ILumenAssetSchemaEntry,
        meta: Readonly<Record<string, unknown>>,
        patch: Readonly<Record<string, unknown>>,
    ): Record<string, unknown> {
        this._assertWritablePatch(entry, patch);
        const next = this._io.cloneRecord(meta);
        const userData = this._io.ensureUserData(next);
        this._applyWritableFields(entry, userData, patch);
        return next;
    }

    /**
     * @description 按可写字段写入补丁并返回新的源 JSON 记录。
     * @param entry 资产登记
     * @param record 当前源记录
     * @param patch Inspector 补丁
     * @returns 克隆后的记录
     */
    public applyPatchToRecord(
        entry: ILumenAssetSchemaEntry,
        record: Readonly<Record<string, unknown>>,
        patch: Readonly<Record<string, unknown>>,
    ): Record<string, unknown> {
        this._assertWritablePatch(entry, patch);
        const next = this._io.cloneRecord(record);
        this._applyWritableFields(entry, next, patch);
        return next;
    }

    /**
     * @description 读取单字段。
     * @param field 规格
     * @param userData userData
     * @param meta meta 根
     * @param prefix 错误前缀
     * @param fieldPath 错误路径
     * @returns 检视值
     */
    private _inspectField(
        field: ILumenSidecarFieldSpec,
        userData: Readonly<Record<string, unknown>>,
        meta: Readonly<Record<string, unknown>>,
        prefix: string,
        fieldPath: string,
    ): unknown {
        if (field.kind === 'object') {
            return this._inspectObject(field, userData, meta, prefix, fieldPath);
        }
        if (field.kind === 'subMetaList') {
            return this._inspectSubMetaList(field, meta);
        }
        if (field.kind === 'compressSettings') {
            return this._compressSettings.inspect(userData);
        }
        return this._inspectScalar(field, userData[field.serializedName], fieldPath);
    }

    /**
     * @description 读取对象分组。
     * @param field 对象字段
     * @param userData userData
     * @param meta meta 根
     * @param prefix 错误前缀
     * @param fieldPath 错误路径
     * @returns 分组对象
     */
    private _inspectObject(
        field: ILumenSidecarFieldSpec,
        userData: Readonly<Record<string, unknown>>,
        meta: Readonly<Record<string, unknown>>,
        prefix: string,
        fieldPath: string,
    ): Record<string, unknown> {
        const nested = field.nestedFields ?? [];
        const source = field.flatten === true ? userData : this._io.readOptionalRecord(userData[field.serializedName]);
        const group: Record<string, unknown> = {};
        for (const child of nested) {
            group[child.apiName] = this._inspectField(
                child,
                source,
                meta,
                prefix,
                `${fieldPath}.${child.apiName}`,
            );
        }
        this._attachTextureFilterModeAlias(group, nested);
        return group;
    }

    /**
     * @description 若对象分组含 filter 三元组，附加 Creator 面板别名 `filterMode`。
     * @param group 分组快照
     * @param nested 嵌套字段
     */
    private _attachTextureFilterModeAlias(
        group: Record<string, unknown>,
        nested: readonly ILumenSidecarFieldSpec[],
    ): void {
        const names = new Set(nested.map((field) => field.apiName));
        if (!names.has('minfilter') || !names.has('magfilter') || !names.has('mipfilter')) {
            return;
        }
        const minfilter = group.minfilter;
        const magfilter = group.magfilter;
        const mipfilter = group.mipfilter;
        if (typeof minfilter !== 'string' || typeof magfilter !== 'string' || typeof mipfilter !== 'string') {
            return;
        }
        group.filterMode = LumenTextureFilterModeCodec.inferFilterMode({ minfilter, magfilter, mipfilter });
    }

    /**
     * @description 读取标量 / 映射。
     * @param field 规格
     * @param raw userData 值
     * @param fieldPath 错误路径
     * @returns 检视值
     */
    private _inspectScalar(field: ILumenSidecarFieldSpec, raw: unknown, fieldPath: string): unknown {
        void fieldPath;
        if (field.kind === 'boolean') {
            return typeof raw === 'boolean' ? raw : field.default === true;
        }
        if (field.kind === 'number' || field.kind === 'enumNumber') {
            if (typeof raw === 'number' && Number.isFinite(raw)) {
                return raw;
            }
            if (field.nullable === true) {
                return null;
            }
            return field.default ?? 0;
        }
        if (field.kind === 'string' || field.kind === 'stringEnum') {
            if (typeof raw === 'string' && (raw.length > 0 || field.kind === 'string')) {
                if (field.kind === 'stringEnum' && raw.length === 0) {
                    return field.default ?? '';
                }
                return raw;
            }
            return field.default ?? '';
        }
        if (field.kind === 'numberMap') {
            return this._readNumberMap(raw);
        }
        if (field.kind === 'booleanMap') {
            return this._readBooleanMap(raw);
        }
        if (field.kind === 'uuidArray') {
            return this._readUuidArray(raw);
        }
        return field.default ?? null;
    }

    /**
     * @description 从 subMetas 收集指定 importer 的子资源。
     * @param field 规格
     * @param meta meta 根
     * @returns 按名称排序的列表
     */
    private _inspectSubMetaList(
        field: ILumenSidecarFieldSpec,
        meta: Readonly<Record<string, unknown>>,
    ): readonly ILumenSpriteAtlasFrameInspect[] {
        const subMetas = this._io.readOptionalRecord(meta.subMetas);
        const importer = field.subMetaImporter ?? '';
        const frames: ILumenSpriteAtlasFrameInspect[] = [];
        for (const name of Object.keys(subMetas).sort()) {
            const raw = subMetas[name];
            if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
                continue;
            }
            const record = this._io.readOptionalRecord(raw);
            if (record.importer !== importer) {
                continue;
            }
            const uuid = typeof record.uuid === 'string' ? record.uuid : '';
            const displayName =
                typeof record.displayName === 'string' && record.displayName.length > 0
                    ? record.displayName
                    : name;
            frames.push({ name, uuid, displayName });
        }
        return frames;
    }

    /**
     * @description 拒绝不可写补丁键。
     * @param entry 登记
     * @param patch Inspector 补丁
     */
    private _assertWritablePatch(
        entry: ILumenAssetSchemaEntry,
        patch: Readonly<Record<string, unknown>>,
    ): void {
        const prefix = this._errorPrefix(entry);
        const allowed = entry.fields.filter((field) => field.writable).map((field) => field.apiName);
        const includeKind = entry.notEditableIncludesKind ?? entry.document !== 'json-asset';
        const notEditable = includeKind
            ? `${prefix}_property_not_editable:${entry.assetKind}`
            : `${prefix}_property_not_editable`;
        this._io.assertOnlyFields(patch, allowed, notEditable);
    }

    /**
     * @description 把已校验补丁写到目标记录。
     * @param entry 登记
     * @param target userData 或源 JSON
     * @param patch Inspector 补丁
     */
    private _applyWritableFields(
        entry: ILumenAssetSchemaEntry,
        target: Record<string, unknown>,
        patch: Readonly<Record<string, unknown>>,
    ): void {
        const prefix = this._errorPrefix(entry);
        for (const field of entry.fields) {
            if (!field.writable || patch[field.apiName] === undefined) {
                continue;
            }
            this._applyField(entry, field, target, patch[field.apiName], prefix, field.apiName);
        }
    }

    /**
     * @description 写入单字段。
     * @param entry 登记
     * @param field 规格
     * @param userData 可写 userData
     * @param value 补丁值
     * @param prefix 错误前缀
     * @param fieldPath 错误路径
     */
    private _applyField(
        entry: ILumenAssetSchemaEntry,
        field: ILumenSidecarFieldSpec,
        userData: Record<string, unknown>,
        value: unknown,
        prefix: string,
        fieldPath: string,
    ): void {
        if (field.kind === 'object') {
            this._applyObject(entry, field, userData, value, prefix, fieldPath);
            return;
        }
        if (field.kind === 'compressSettings') {
            this._compressSettings.applyPatch(
                userData,
                this._requireRecord(value, this._propertyTypePrefix(entry), fieldPath),
                this._errorPrefix(entry),
            );
            return;
        }
        this._applyScalar(entry, field, userData, value, prefix, fieldPath);
    }

    /**
     * @description 写入对象分组。
     * @param entry 登记
     * @param field 对象字段
     * @param userData 父级 userData
     * @param value 分组补丁
     * @param prefix 错误前缀
     * @param fieldPath 错误路径
     */
    private _applyObject(
        entry: ILumenAssetSchemaEntry,
        field: ILumenSidecarFieldSpec,
        userData: Record<string, unknown>,
        value: unknown,
        prefix: string,
        fieldPath: string,
    ): void {
        const patchRaw = this._requireRecord(value, this._propertyTypePrefix(entry), fieldPath);
        const patch = this._expandTextureFilterModePatch(patchRaw, field.nestedFields ?? []);
        const nested = field.nestedFields ?? [];
        this._io.assertOnlyFields(
            patch,
            [...nested.map((child) => child.apiName), ...(this._textureFilterModeAllowed(nested) ? ['filterMode'] : [])],
            `${prefix}_property_not_editable:${field.apiName}`,
        );
        const target =
            field.flatten === true ? userData : this._ensureNestedRecord(userData, field.serializedName);
        for (const child of nested) {
            if (patch[child.apiName] === undefined) {
                continue;
            }
            this._applyField(
                entry,
                child,
                target,
                patch[child.apiName],
                prefix,
                `${fieldPath}.${child.apiName}`,
            );
        }
    }

    /**
     * @description 写入标量 / 映射到 userData。
     * @param entry 登记
     * @param field 规格
     * @param userData 可写对象
     * @param value 补丁值
     * @param prefix 错误前缀
     * @param fieldPath 错误路径
     */
    private _applyScalar(
        entry: ILumenAssetSchemaEntry,
        field: ILumenSidecarFieldSpec,
        userData: Record<string, unknown>,
        value: unknown,
        prefix: string,
        fieldPath: string,
    ): void {
        const key = field.serializedName;
        const typePrefix = this._propertyTypePrefix(entry);
        if (field.kind === 'string') {
            if (typeof value !== 'string') {
                throw new Error(`${typePrefix}_property_type:${fieldPath}:string`);
            }
            if (field.emptyDeletes === true && value.length === 0) {
                delete userData[key];
                return;
            }
            userData[key] = value;
            return;
        }
        if (field.kind === 'boolean') {
            if (typeof value !== 'boolean') {
                throw new Error(`${typePrefix}_property_type:${fieldPath}:boolean`);
            }
            userData[key] = value;
            return;
        }
        if (field.kind === 'number') {
            userData[key] = this._requireNumber(entry, field, value, fieldPath);
            return;
        }
        if (field.kind === 'enumNumber') {
            userData[key] = this._encodeEnumNumber(entry, field, value, prefix, fieldPath);
            return;
        }
        if (field.kind === 'stringEnum') {
            userData[key] = this._requireStringEnum(entry, field, value, prefix, fieldPath);
            return;
        }
        if (field.kind === 'numberMap') {
            userData[key] = this._requireNumberMap(value, typePrefix, fieldPath, field);
            return;
        }
        if (field.kind === 'booleanMap') {
            userData[key] = this._requireBooleanMap(value, typePrefix, fieldPath);
            return;
        }
        if (field.kind === 'uuidArray') {
            userData[key] = this._requireUuidArray(value, typePrefix, fieldPath);
        }
    }

    /**
     * @description 校验数字；`errorStyle: type` 时走类型错误码。
     * @param entry 登记
     * @param field 规格
     * @param value 未受信值
     * @param fieldPath 错误路径
     * @returns 数字
     */
    private _requireNumber(
        entry: ILumenAssetSchemaEntry,
        field: ILumenSidecarFieldSpec,
        value: unknown,
        fieldPath: string,
    ): number {
        const minimum = field.min ?? Number.NEGATIVE_INFINITY;
        const maximum = field.max ?? Number.POSITIVE_INFINITY;
        const integer = field.integer === true;
        const valid =
            typeof value === 'number' &&
            Number.isFinite(value) &&
            value >= minimum &&
            value <= maximum &&
            (!integer || Number.isInteger(value));
        if (valid && typeof value === 'number') {
            return value;
        }
        if (field.errorStyle === 'type') {
            const hint = field.errorHint ?? 'number';
            throw new Error(`${this._propertyTypePrefix(entry)}_property_type:${fieldPath}:${hint}`);
        }
        return this._io.requireRange(
            value,
            fieldPath,
            minimum,
            maximum,
            integer,
            `${this._errorPrefix(entry)}_property_range`,
        );
    }

    /**
     * @description 编码数值枚举（可含名与布尔）。
     * @param entry 登记
     * @param field 规格
     * @param value 未受信值
     * @param prefix 错误前缀
     * @param fieldPath 错误路径
     * @returns 数值
     */
    private _encodeEnumNumber(
        entry: ILumenAssetSchemaEntry,
        field: ILumenSidecarFieldSpec,
        value: unknown,
        prefix: string,
        fieldPath: string,
    ): number {
        const allowed = this._enumValues(field);
        if (value === true && field.booleanTrue != null) {
            return field.booleanTrue;
        }
        if (value === false && field.booleanFalse != null) {
            return field.booleanFalse;
        }
        if (typeof value === 'number' && allowed.includes(value)) {
            return value;
        }
        if (typeof value === 'string' && field.aliases != null) {
            const mapped = field.aliases[value.trim().toUpperCase()];
            if (mapped != null) {
                return mapped;
            }
        }
        const hint = field.errorHint ?? allowed.join('|');
        if (field.errorStyle === 'type') {
            throw new Error(`${this._propertyTypePrefix(entry)}_property_type:${fieldPath}:${hint}`);
        }
        throw new Error(`${prefix}_property_range:${fieldPath}:${hint}`);
    }

    /**
     * @description 编码字符串枚举。
     * @param entry 登记
     * @param field 规格
     * @param value 未受信值
     * @param prefix 错误前缀
     * @param fieldPath 错误路径
     * @returns 字符串
     */
    private _requireStringEnum(
        entry: ILumenAssetSchemaEntry,
        field: ILumenSidecarFieldSpec,
        value: unknown,
        prefix: string,
        fieldPath: string,
    ): string {
        const allowed = field.enumValues ?? [];
        if (typeof value === 'string' && allowed.includes(value)) {
            return value;
        }
        const hint = field.errorHint ?? allowed.join('|');
        if (field.errorStyle === 'range') {
            throw new Error(`${prefix}_property_range:${fieldPath}:${hint}`);
        }
        throw new Error(`${this._propertyTypePrefix(entry)}_property_type:${fieldPath}:${hint}`);
    }

    /**
     * @description 枚举数值列表。
     * @param field 规格
     * @returns 允许值
     */
    private _enumValues(field: ILumenSidecarFieldSpec): readonly number[] {
        if (field.values != null) {
            return field.values;
        }
        if (field.aliases != null) {
            return Object.values(field.aliases);
        }
        return [];
    }

    /**
     * @description 数值转枚举名。
     * @param field 规格
     * @param value 检视值
     * @returns 名或 `null`
     */
    private _enumName(field: ILumenSidecarFieldSpec, value: unknown): string | null {
        if (typeof value !== 'number' || field.aliases == null) {
            return null;
        }
        for (const [name, mapped] of Object.entries(field.aliases)) {
            if (mapped === value) {
                return name;
            }
        }
        return null;
    }

    /**
     * @description 读取 uuid 引用数组；忽略内嵌 dump（`__id__` / 对象体）。
     * @param value 未受信值
     * @returns uuid 列表
     */
    private _readUuidArray(value: unknown): readonly string[] {
        if (!Array.isArray(value)) {
            return [];
        }
        const uuids: string[] = [];
        for (const item of value) {
            const uuid = this._readUuid(item);
            if (uuid != null) {
                uuids.push(uuid);
            }
        }
        return uuids;
    }

    /**
     * @description 校验并编码 uuid 引用数组。
     * @param value 未受信值
     * @param prefix 错误前缀
     * @param fieldPath 字段名
     * @returns `{ __uuid__ }` 列表
     */
    private _requireUuidArray(
        value: unknown,
        prefix: string,
        fieldPath: string,
    ): Array<Record<string, unknown>> {
        if (!Array.isArray(value)) {
            throw new Error(`${prefix}_property_type:${fieldPath}:uuid[]`);
        }
        const encoded: Array<Record<string, unknown>> = [];
        for (let index = 0; index < value.length; index += 1) {
            const uuid = this._readUuid(value[index]);
            if (uuid == null) {
                throw new Error(`${prefix}_property_type:${fieldPath}[${index}]:uuid`);
            }
            encoded.push({ __uuid__: uuid });
        }
        return encoded;
    }

    /**
     * @description 解析 `{ __uuid__ }` 或非空字符串 uuid。
     * @param value 序列化值
     * @returns uuid 或 `null`
     */
    private _readUuid(value: unknown): string | null {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : null;
        }
        if (value != null && typeof value === 'object' && !Array.isArray(value)) {
            const uuid = this._io.readOptionalRecord(value).__uuid__;
            if (typeof uuid === 'string') {
                const trimmed = uuid.trim();
                return trimmed.length > 0 ? trimmed : null;
            }
        }
        return null;
    }

    /**
     * @description 读取分平台数字表。
     * @param value 未受信值
     * @returns 数字表
     */
    private _readNumberMap(value: unknown): Record<string, number> {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            return {};
        }
        const result: Record<string, number> = {};
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            if (typeof item === 'number' && Number.isFinite(item)) {
                result[key] = item;
            }
        }
        return result;
    }

    /**
     * @description 读取分平台布尔表。
     * @param value 未受信值
     * @returns 布尔表
     */
    private _readBooleanMap(value: unknown): Record<string, boolean> {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            return {};
        }
        const result: Record<string, boolean> = {};
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            if (typeof item === 'boolean') {
                result[key] = item;
            }
        }
        return result;
    }

    /**
     * @description 校验分平台数字表。
     * @param value 未受信值
     * @param prefix 错误前缀
     * @param fieldPath 字段名
     * @param field 规格
     * @returns 数字表
     */
    private _requireNumberMap(
        value: unknown,
        prefix: string,
        fieldPath: string,
        field: ILumenSidecarFieldSpec,
    ): Record<string, number> {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`${prefix}_property_type:${fieldPath}:object`);
        }
        const minimum = field.min ?? 0;
        const maximum = field.max ?? Number.POSITIVE_INFINITY;
        const result: Record<string, number> = {};
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            if (
                typeof item !== 'number' ||
                !Number.isFinite(item) ||
                item < minimum ||
                item > maximum ||
                (field.integer === true && !Number.isInteger(item))
            ) {
                throw new Error(`${prefix}_property_type:${fieldPath}.${key}:${minimum}..${maximum}`);
            }
            result[key] = item;
        }
        return result;
    }

    /**
     * @description 校验分平台布尔表。
     * @param value 未受信值
     * @param prefix 错误前缀
     * @param fieldPath 字段名
     * @returns 布尔表
     */
    private _requireBooleanMap(
        value: unknown,
        prefix: string,
        fieldPath: string,
    ): Record<string, boolean> {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`${prefix}_property_type:${fieldPath}:object`);
        }
        const result: Record<string, boolean> = {};
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            if (typeof item !== 'boolean') {
                throw new Error(`${prefix}_property_type:${fieldPath}.${key}:boolean`);
            }
            result[key] = item;
        }
        return result;
    }

    /**
     * @description 读取对象补丁。
     * @param value 未受信值
     * @param prefix 错误前缀
     * @param fieldPath 字段名
     * @returns 对象
     */
    private _requireRecord(value: unknown, prefix: string, fieldPath: string): Record<string, unknown> {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`${prefix}_property_type:${fieldPath}:object`);
        }
        const record: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(value)) {
            record[key] = item;
        }
        return record;
    }

    /**
     * @description 确保嵌套对象存在。
     * @param userData 父对象
     * @param key 键
     * @returns 嵌套对象
     */
    private _ensureNestedRecord(userData: Record<string, unknown>, key: string): Record<string, unknown> {
        const existing = userData[key];
        if (existing != null && typeof existing === 'object' && !Array.isArray(existing)) {
            const record: Record<string, unknown> = {};
            for (const [childKey, item] of Object.entries(existing)) {
                record[childKey] = item;
            }
            userData[key] = record;
            return record;
        }
        const created: Record<string, unknown> = {};
        userData[key] = created;
        return created;
    }

    /**
     * @description 判断嵌套分组是否支持 `filterMode` 面板别名。
     * @param nested 嵌套字段
     * @returns 是否支持
     */
    private _textureFilterModeAllowed(nested: readonly ILumenSidecarFieldSpec[]): boolean {
        const names = new Set(nested.map((field) => field.apiName));
        return names.has('minfilter') && names.has('magfilter') && names.has('mipfilter');
    }

    /**
     * @description 展开 texture 分组内的 `filterMode` 别名。
     * @param patch 原始补丁
     * @param nested 嵌套字段
     * @returns 展开后的补丁
     */
    private _expandTextureFilterModePatch(
        patch: Readonly<Record<string, unknown>>,
        nested: readonly ILumenSidecarFieldSpec[],
    ): Record<string, unknown> {
        if (!this._textureFilterModeAllowed(nested) || patch.filterMode === undefined) {
            return { ...patch };
        }
        return LumenTextureFilterModeCodec.expandPatch(patch);
    }

    /**
     * @description sidecar 错误前缀。
     * @param entry 登记
     * @returns 前缀
     */
    private _errorPrefix(entry: ILumenAssetSchemaEntry): string {
        if (entry.errorPrefix == null || entry.errorPrefix.length === 0) {
            throw new Error(`lumen_curated_schema_corrupt:assets.json:${entry.assetKind}:errorPrefix`);
        }
        return entry.errorPrefix;
    }

    /**
     * @description 类型错误前缀；默认与 `errorPrefix` 相同。
     * @param entry 登记
     * @returns 前缀
     */
    private _propertyTypePrefix(entry: ILumenAssetSchemaEntry): string {
        if (entry.propertyTypePrefix != null && entry.propertyTypePrefix.length > 0) {
            return entry.propertyTypePrefix;
        }
        return this._errorPrefix(entry);
    }
}
