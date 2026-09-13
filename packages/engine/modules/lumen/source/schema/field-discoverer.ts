/**
 * @description 从 Prefab 实例 JSON 发现可编辑字段（标量 / 向量 / 颜色 / uuid / `__id__` 引用 / 嵌套对象）。
 *
 * 策展规格优先；发现结果只补缺口。
 */

import type { ILumenPropertyFieldSpec, LumenPropertyValueKind } from './component-property';
import { LumenPropertyDenyList } from './deny-list';

/**
 * @description 从序列化值推断出的 kind 与可选嵌入/引用类型。
 */
interface ILumenInferredSpec {
    /**
     * @description 值类型。
     */
    readonly kind: LumenPropertyValueKind;

    /**
     * @description 内嵌 `__type__`。
     */
    readonly embeddedType?: string;

    /**
     * @description `componentRef` 目标类型。
     */
    readonly refComponentType?: string;
}

/**
 * @description 条目下标 → 序列化对象。
 */
export type LumenSerializedEntryResolver = (entryIndex: number) => Record<string, unknown> | null;

/**
 * @description 从序列化对象推断并生成发现规格。
 */
export class LumenSerializedFieldDiscoverer {
    /**
     * @description 扫描对象键，生成不与已占用 api/序列化名冲突的规格。
     * @param record 组件或内嵌模块 JSON
     * @param occupiedApiNames 已有公开名
     * @param occupiedSerializedNames 已有序列化名
     * @param resolveEntry 解析 `__id__` 指向的条目
     * @returns 发现规格（`origin=discovered`）
     */
    public static discover(
        record: Readonly<Record<string, unknown>>,
        occupiedApiNames: ReadonlySet<string>,
        occupiedSerializedNames: ReadonlySet<string>,
        resolveEntry?: LumenSerializedEntryResolver,
    ): readonly ILumenPropertyFieldSpec[] {
        const underscoreKeys: string[] = [];
        const plainKeys: string[] = [];
        for (const key of Object.keys(record)) {
            if (LumenPropertyDenyList.isStructuralKey(key) || occupiedSerializedNames.has(key)) {
                continue;
            }
            if (key.startsWith('_') && key.length > 1) {
                underscoreKeys.push(key);
            } else {
                plainKeys.push(key);
            }
        }
        const specs: ILumenPropertyFieldSpec[] = [];
        const usedApi = new Set(occupiedApiNames);
        for (const serializedName of [...underscoreKeys, ...plainKeys]) {
            const apiName = this._apiNameFromSerialized(serializedName);
            if (usedApi.has(apiName)) {
                continue;
            }
            const inferred = this.inferSpec(record[serializedName], resolveEntry);
            if (inferred == null) {
                continue;
            }
            usedApi.add(apiName);
            specs.push(this._toFieldSpec(apiName, serializedName, inferred));
        }
        return specs;
    }

    /**
     * @description 为一次写入解析规格：已有键优先，否则仅对标量新建 `_${apiName}`。
     * @param record 当前对象
     * @param apiName 公开属性名
     * @param rawValue 待写入值
     * @param occupiedApiNames 策展已占用名（命中则不要走发现）
     * @param resolveEntry 解析 `__id__`
     * @returns 规格；无法安全映射时为 `null`
     */
    public static resolveWriteSpec(
        record: Readonly<Record<string, unknown>>,
        apiName: string,
        rawValue: unknown,
        occupiedApiNames: ReadonlySet<string>,
        resolveEntry?: LumenSerializedEntryResolver,
    ): ILumenPropertyFieldSpec | null {
        if (occupiedApiNames.has(apiName)) {
            return null;
        }
        const underscored = `_${apiName}`;
        if (Object.prototype.hasOwnProperty.call(record, underscored)) {
            const inferred =
                this.inferSpec(record[underscored], resolveEntry) ?? this.inferSpec(rawValue, resolveEntry);
            if (inferred == null) {
                return null;
            }
            return this._toFieldSpec(apiName, underscored, inferred);
        }
        if (Object.prototype.hasOwnProperty.call(record, apiName)) {
            const inferred = this.inferSpec(record[apiName], resolveEntry) ?? this.inferSpec(rawValue, resolveEntry);
            if (inferred == null) {
                return null;
            }
            return this._toFieldSpec(apiName, apiName, inferred);
        }
        const createdKind = this._scalarKind(rawValue);
        if (createdKind == null) {
            return null;
        }
        return {
            apiName,
            serializedName: underscored,
            kind: createdKind,
            origin: 'discovered',
        };
    }

    /**
     * @description 从已有 JSON 值推断可安全编解码的 kind。
     * @param value 序列化值
     * @param resolveEntry 解析 `__id__`
     * @returns kind；无法推断时为 `null`
     */
    public static inferKind(value: unknown, resolveEntry?: LumenSerializedEntryResolver): LumenPropertyValueKind | null {
        return this.inferSpec(value, resolveEntry)?.kind ?? null;
    }

    /**
     * @description 推断 kind 及嵌入/引用类型。
     * @param value 序列化值
     * @param resolveEntry 解析 `__id__`
     * @returns 推断结果；无法推断时为 `null`
     */
    public static inferSpec(
        value: unknown,
        resolveEntry?: LumenSerializedEntryResolver,
    ): ILumenInferredSpec | null {
        if (typeof value === 'boolean') {
            return { kind: 'boolean' };
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            return { kind: 'number' };
        }
        if (typeof value === 'string') {
            return { kind: 'string' };
        }
        if (Array.isArray(value)) {
            const listKind = this._inferListKind(value, resolveEntry);
            return listKind == null ? null : { kind: listKind };
        }
        if (value == null || typeof value !== 'object') {
            return null;
        }
        const record = this._asRecord(value);
        if (record == null) {
            return null;
        }
        if ('__id__' in record) {
            const id = record.__id__;
            if (typeof id !== 'number' || resolveEntry == null) {
                return null;
            }
            const target = resolveEntry(id);
            return target == null ? null : this._inferFromTypedRecord(target);
        }
        if (typeof record.__uuid__ === 'string') {
            return { kind: 'uuid' };
        }
        return this._inferFromTypedRecord(record);
    }

    /**
     * @description 序列化键转公开名：`_string` → `string`。
     * @param serializedName Prefab 键
     * @returns 公开名
     */
    private static _apiNameFromSerialized(serializedName: string): string {
        if (serializedName.startsWith('_') && serializedName.length > 1 && serializedName[1] !== '_') {
            return serializedName.slice(1);
        }
        return serializedName;
    }

    /**
     * @description 仅 number / boolean / string 可作为新建字段。
     * @param value 待写入值
     * @returns kind 或 `null`
     */
    private static _scalarKind(value: unknown): LumenPropertyValueKind | null {
        if (typeof value === 'boolean') {
            return 'boolean';
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            return 'number';
        }
        if (typeof value === 'string') {
            return 'string';
        }
        return null;
    }

    /**
     * @description 推断数组 kind。
     * @param value 数组
     * @param resolveEntry 解析 `__id__`
     * @returns kind 或 `null`
     */
    private static _inferListKind(
        value: readonly unknown[],
        resolveEntry?: LumenSerializedEntryResolver,
    ): LumenPropertyValueKind | null {
        if (value.length === 0) {
            return null;
        }
        if (value.every((item) => typeof item === 'number' && Number.isFinite(item))) {
            return 'numberList';
        }
        const itemKinds = value.map((item) => this.inferKind(item, resolveEntry));
        if (itemKinds.every((kind) => kind === 'vec2')) {
            return 'vec2List';
        }
        if (itemKinds.every((kind) => kind === 'vec3')) {
            return 'vec3List';
        }
        if (itemKinds.every((kind) => kind === 'uuid')) {
            return 'uuidList';
        }
        if (itemKinds.every((kind) => kind === 'nodeRef')) {
            return 'nodeRefList';
        }
        if (itemKinds.every((kind) => kind === 'componentRef')) {
            return 'componentRefList';
        }
        if (value.every((item) => typeof item === 'string')) {
            return 'stringList';
        }
        return null;
    }

    /**
     * @description 按 `__type__` 或组件形态推断。
     * @param record 带类型的对象
     * @returns 推断结果
     */
    private static _inferFromTypedRecord(record: Readonly<Record<string, unknown>>): ILumenInferredSpec | null {
        const typeName = typeof record.__type__ === 'string' ? record.__type__ : '';
        if (typeName === 'cc.Color') {
            return { kind: 'color' };
        }
        if (typeName === 'cc.Vec2') {
            return { kind: 'vec2' };
        }
        if (typeName === 'cc.Vec3') {
            return { kind: 'vec3' };
        }
        if (typeName === 'cc.Size') {
            return { kind: 'size' };
        }
        if (typeName === 'cc.Rect') {
            return { kind: 'rect' };
        }
        if (typeName === 'cc.CurveRange') {
            return { kind: 'curveRange', embeddedType: typeName };
        }
        if (typeName === 'cc.GradientRange') {
            return { kind: 'gradientRange', embeddedType: typeName };
        }
        if (typeName === 'cc.Node' || typeName === 'cc.Scene') {
            return { kind: 'nodeRef' };
        }
        if (typeName.length > 0 && record.node != null && typeof record.node === 'object') {
            return { kind: 'componentRef', refComponentType: typeName };
        }
        if (typeName.length > 0) {
            return { kind: 'objectPatch', embeddedType: typeName };
        }
        return null;
    }

    /**
     * @description 推断结果转发现规格。
     * @param apiName 公开名
     * @param serializedName 序列化名
     * @param inferred 推断
     * @returns 规格
     */
    private static _toFieldSpec(
        apiName: string,
        serializedName: string,
        inferred: ILumenInferredSpec,
    ): ILumenPropertyFieldSpec {
        return {
            apiName,
            serializedName,
            kind: inferred.kind,
            origin: 'discovered',
            ...(inferred.embeddedType != null ? { embeddedType: inferred.embeddedType } : {}),
            ...(inferred.refComponentType != null ? { refComponentType: inferred.refComponentType } : {}),
        };
    }

    /**
     * @description 将未知值收窄为记录。
     * @param value 未知对象
     * @returns 记录或 `null`
     */
    private static _asRecord(value: object): Readonly<Record<string, unknown>> | null {
        if (Array.isArray(value)) {
            return null;
        }
        const record: Record<string, unknown> = {};
        for (const [key, nested] of Object.entries(value)) {
            record[key] = nested;
        }
        return record;
    }
}
