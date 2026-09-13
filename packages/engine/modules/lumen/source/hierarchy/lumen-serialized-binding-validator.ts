import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { IAssetCatalogDocument, IAssetCatalogEntry } from '@peanut/pod-engine/assets';

import { LumenScriptPropertyExtractor } from './script-property-extractor';

/**
 * @description 序列化绑定图中的语义问题。
 */
export interface ILumenSerializedBindingIssue {
    readonly kind: 'danglingId' | 'wrongReferenceType' | 'brokenOwnership' | 'invalidClickEvent' | 'wrongAssetType';
    readonly nodePath: string;
    readonly componentType: string;
    readonly fieldHint: string;
    readonly uuid: string;
    readonly message: string;
}

/**
 * @description 校验 Prefab/Scene 的 `__id__` 图、节点组件归属、脚本引用字段和点击事件语义。
 */
export class LumenSerializedBindingValidator {
    /**
     * @description 执行序列化绑定图校验。
     * @param projectRoot Creator 工程根。
     * @param records Prefab/Scene 序列化条目。
     * @param catalog 工程资产目录。
     * @param pathByNodeIndex 节点下标到层级路径。
     * @returns 绑定问题列表。
     */
    public validate(
        projectRoot: string,
        records: readonly Record<string, unknown>[],
        catalog: IAssetCatalogDocument,
        pathByNodeIndex: ReadonlyMap<number, string>,
    ): readonly ILumenSerializedBindingIssue[] {
        const issues: ILumenSerializedBindingIssue[] = [];
        for (let index = 0; index < records.length; index += 1) {
            const record = records[index];
            if (record == null) {
                continue;
            }
            const componentType = typeof record.__type__ === 'string' ? record.__type__ : '';
            const hostNodeIndex = componentType === 'cc.Node' ? index : this._hostNodeIndex(records, index);
            const nodePath = hostNodeIndex == null ? '' : (pathByNodeIndex.get(hostNodeIndex) ?? '');
            this._collectDanglingIds(record, records.length, nodePath, componentType, '', issues);
            this._collectWrongAssetTypes(record, catalog, nodePath, componentType, '', issues);
            if (componentType === 'cc.Node') {
                this._validateNodeOwnership(records, index, nodePath, issues);
            }
            if (componentType === 'cc.ClickEvent') {
                this._validateClickEvent(records, record, nodePath, issues);
            }
        }
        this._validateScriptReferences(projectRoot, records, catalog, pathByNodeIndex, issues);
        return issues;
    }

    /**
     * @description 收集越界或非整数 `__id__`。
     * @param value 当前 JSON 值。
     * @param recordCount 条目总数。
     * @param nodePath 宿主节点路径。
     * @param componentType 宿主组件类型。
     * @param fieldPath 字段路径。
     * @param issues 输出列表。
     * @returns 无。
     */
    private _collectDanglingIds(
        value: unknown,
        recordCount: number,
        nodePath: string,
        componentType: string,
        fieldPath: string,
        issues: ILumenSerializedBindingIssue[],
    ): void {
        if (value == null || typeof value !== 'object') {
            return;
        }
        if (Array.isArray(value)) {
            for (let index = 0; index < value.length; index += 1) {
                this._collectDanglingIds(value[index], recordCount, nodePath, componentType, `${fieldPath}[${index}]`, issues);
            }
            return;
        }
        const record = value as Record<string, unknown>;
        if (Object.prototype.hasOwnProperty.call(record, '__id__')) {
            const id = record.__id__;
            if (typeof id !== 'number' || !Number.isInteger(id) || id < 0 || id >= recordCount) {
                issues.push({
                    kind: 'danglingId',
                    nodePath,
                    componentType,
                    fieldHint: fieldPath.length > 0 ? fieldPath : '__id__',
                    uuid: '',
                    message: `__id__ ${String(id)} is not an integer inside serialized entry range 0..${recordCount - 1}`,
                });
            }
            return;
        }
        for (const [key, child] of Object.entries(record)) {
            const nextPath = fieldPath.length > 0 ? `${fieldPath}.${key}` : key;
            this._collectDanglingIds(child, recordCount, nodePath, componentType, nextPath, issues);
        }
    }

    /**
     * @description 校验带 `__expectedType__` 的资源 UUID 类型。
     * @param value 当前 JSON 值。
     * @param catalog 资产目录。
     * @param nodePath 宿主节点路径。
     * @param componentType 宿主组件类型。
     * @param fieldPath 字段路径。
     * @param issues 输出列表。
     * @returns 无。
     */
    private _collectWrongAssetTypes(
        value: unknown,
        catalog: IAssetCatalogDocument,
        nodePath: string,
        componentType: string,
        fieldPath: string,
        issues: ILumenSerializedBindingIssue[],
    ): void {
        if (value == null || typeof value !== 'object') {
            return;
        }
        if (Array.isArray(value)) {
            for (let index = 0; index < value.length; index += 1) {
                this._collectWrongAssetTypes(value[index], catalog, nodePath, componentType, `${fieldPath}[${index}]`, issues);
            }
            return;
        }
        const record = value as Record<string, unknown>;
        const uuid = typeof record.__uuid__ === 'string' ? record.__uuid__ : '';
        const expectedType = typeof record.__expectedType__ === 'string' ? record.__expectedType__ : '';
        const entry = uuid.length > 0 ? this._findCatalogEntry(catalog, uuid) : null;
        const expectedBucket = this._expectedCatalogBucket(expectedType);
        if (entry != null && expectedBucket != null && entry.type !== expectedBucket) {
            issues.push({
                kind: 'wrongAssetType',
                nodePath,
                componentType,
                fieldHint: fieldPath.length > 0 ? fieldPath : '__uuid__',
                uuid,
                message: `asset ${uuid} is ${entry.type}, expected ${expectedType}`,
            });
        }
        for (const [key, child] of Object.entries(record)) {
            if (key === '__uuid__' || key === '__expectedType__') {
                continue;
            }
            const nextPath = fieldPath.length > 0 ? `${fieldPath}.${key}` : key;
            this._collectWrongAssetTypes(child, catalog, nodePath, componentType, nextPath, issues);
        }
    }

    /**
     * @description 校验节点父子关系和组件归属的双向一致性。
     * @param records 全部条目。
     * @param nodeIndex 当前节点下标。
     * @param nodePath 当前节点路径。
     * @param issues 输出列表。
     * @returns 无。
     */
    private _validateNodeOwnership(
        records: readonly Record<string, unknown>[],
        nodeIndex: number,
        nodePath: string,
        issues: ILumenSerializedBindingIssue[],
    ): void {
        const node = records[nodeIndex];
        if (node == null) {
            return;
        }
        const parentIndex = this._readId(node._parent);
        if (parentIndex != null && !this._nodeContainsRef(records[parentIndex]?._children, nodeIndex)) {
            this._pushOwnershipIssue(issues, nodePath, '_parent', `parent node ${parentIndex} does not own child ${nodeIndex}`);
        }
        if (Array.isArray(node._children)) {
            for (let index = 0; index < node._children.length; index += 1) {
                const childIndex = this._readId(node._children[index]);
                if (childIndex == null || records[childIndex]?.__type__ !== 'cc.Node') {
                    this._pushOwnershipIssue(issues, nodePath, `_children[${index}]`, 'child reference does not point to cc.Node');
                    continue;
                }
                if (this._readId(records[childIndex]?._parent) !== nodeIndex) {
                    this._pushOwnershipIssue(issues, nodePath, `_children[${index}]`, `child ${childIndex} does not point back to parent ${nodeIndex}`);
                }
            }
        }
        if (!Array.isArray(node._components)) {
            return;
        }
        for (let index = 0; index < node._components.length; index += 1) {
            const componentIndex = this._readId(node._components[index]);
            const component = componentIndex == null ? null : records[componentIndex];
            if (component == null || component.__type__ === 'cc.Node' || component.__type__ === 'cc.Prefab') {
                this._pushOwnershipIssue(issues, nodePath, `_components[${index}]`, 'component reference does not point to a component');
                continue;
            }
            if (this._readId(component.node) !== nodeIndex) {
                this._pushOwnershipIssue(
                    issues,
                    nodePath,
                    `_components[${index}]`,
                    `component ${componentIndex} does not point back to node ${nodeIndex}`,
                );
            }
        }
    }

    /**
     * @description 校验 ClickEvent 目标节点确实挂载 `_componentId` 指定的脚本组件。
     * @param records 全部条目。
     * @param event ClickEvent 条目。
     * @param nodePath Button 宿主节点路径。
     * @param issues 输出列表。
     * @returns 无。
     */
    private _validateClickEvent(
        records: readonly Record<string, unknown>[],
        event: Readonly<Record<string, unknown>>,
        nodePath: string,
        issues: ILumenSerializedBindingIssue[],
    ): void {
        const targetIndex = this._readId(event.target);
        const componentId = typeof event._componentId === 'string' ? event._componentId.trim() : '';
        const handler = typeof event.handler === 'string' ? event.handler.trim() : '';
        const target = targetIndex == null ? null : records[targetIndex];
        const targetHasComponent =
            target?.__type__ === 'cc.Node' &&
            Array.isArray(target._components) &&
            target._components.some((reference) => {
                const componentIndex = this._readId(reference);
                return componentIndex != null && records[componentIndex]?.__type__ === componentId;
            });
        if (target?.__type__ !== 'cc.Node' || componentId.length === 0 || handler.length === 0 || !targetHasComponent) {
            issues.push({
                kind: 'invalidClickEvent',
                nodePath,
                componentType: 'cc.ClickEvent',
                fieldHint: 'target/_componentId/handler',
                uuid: '',
                message: 'ClickEvent target must own the serialized script component and a non-empty handler',
            });
        }
    }

    /**
     * @description 按脚本 `@property` 声明验证节点/组件引用字段的目标类型。
     * @param projectRoot Creator 工程根。
     * @param records 全部条目。
     * @param catalog 资产目录。
     * @param pathByNodeIndex 节点路径表。
     * @param issues 输出列表。
     * @returns 无。
     */
    private _validateScriptReferences(
        projectRoot: string,
        records: readonly Record<string, unknown>[],
        catalog: IAssetCatalogDocument,
        pathByNodeIndex: ReadonlyMap<number, string>,
        issues: ILumenSerializedBindingIssue[],
    ): void {
        const scripts = new Map(catalog.byType.script.map((entry) => [entry.compressedUuid, entry]));
        for (let index = 0; index < records.length; index += 1) {
            const component = records[index];
            const componentType = typeof component?.__type__ === 'string' ? component.__type__ : '';
            const script = scripts.get(componentType);
            if (component == null || script == null) {
                continue;
            }
            const sourcePath = resolve(projectRoot, script.path);
            if (!existsSync(sourcePath)) {
                continue;
            }
            const extracted = LumenScriptPropertyExtractor.extractFromSource(readFileSync(sourcePath, 'utf8'));
            const hostNodeIndex = this._hostNodeIndex(records, index);
            const nodePath = hostNodeIndex == null ? '' : (pathByNodeIndex.get(hostNodeIndex) ?? '');
            for (const field of extracted.fields) {
                if (!(field.serializedName in component) || component[field.serializedName] == null) {
                    continue;
                }
                if (field.kind === 'nodeRef') {
                    this._validateTypedReference(records, component[field.serializedName], 'cc.Node', nodePath, componentType, field.serializedName, issues);
                } else if (field.kind === 'componentRef' && field.refComponentType != null) {
                    this._validateTypedReference(
                        records,
                        component[field.serializedName],
                        field.refComponentType,
                        nodePath,
                        componentType,
                        field.serializedName,
                        issues,
                    );
                } else if (field.kind === 'nodeRefList' && Array.isArray(component[field.serializedName])) {
                    this._validateTypedReferenceList(
                        records,
                        component[field.serializedName] as readonly unknown[],
                        'cc.Node',
                        nodePath,
                        componentType,
                        field.serializedName,
                        issues,
                    );
                } else if (field.kind === 'componentRefList' && field.refComponentType != null && Array.isArray(component[field.serializedName])) {
                    this._validateTypedReferenceList(
                        records,
                        component[field.serializedName] as readonly unknown[],
                        field.refComponentType,
                        nodePath,
                        componentType,
                        field.serializedName,
                        issues,
                    );
                }
            }
        }
    }

    /**
     * @description 校验单个 `__id__` 引用的目标序列化类型。
     * @param records 全部条目。
     * @param reference 引用值。
     * @param expectedType 期望 `__type__`。
     * @param nodePath 宿主节点路径。
     * @param componentType 宿主组件类型。
     * @param fieldHint 字段名。
     * @param issues 输出列表。
     * @returns 无。
     */
    private _validateTypedReference(
        records: readonly Record<string, unknown>[],
        reference: unknown,
        expectedType: string,
        nodePath: string,
        componentType: string,
        fieldHint: string,
        issues: ILumenSerializedBindingIssue[],
    ): void {
        const targetIndex = this._readId(reference);
        if (targetIndex != null && records[targetIndex]?.__type__ === expectedType) {
            return;
        }
        issues.push({
            kind: 'wrongReferenceType',
            nodePath,
            componentType,
            fieldHint,
            uuid: '',
            message: `${fieldHint} must reference ${expectedType}, got ${targetIndex == null ? 'invalid __id__' : String(records[targetIndex]?.__type__)}`,
        });
    }

    /**
     * @description 校验 `__id__` 引用列表的每一项目标类型。
     * @param records 全部条目。
     * @param references 引用列表。
     * @param expectedType 期望类型。
     * @param nodePath 宿主节点路径。
     * @param componentType 宿主组件类型。
     * @param fieldHint 字段名。
     * @param issues 输出列表。
     * @returns 无。
     */
    private _validateTypedReferenceList(
        records: readonly Record<string, unknown>[],
        references: readonly unknown[],
        expectedType: string,
        nodePath: string,
        componentType: string,
        fieldHint: string,
        issues: ILumenSerializedBindingIssue[],
    ): void {
        for (let index = 0; index < references.length; index += 1) {
            this._validateTypedReference(records, references[index], expectedType, nodePath, componentType, `${fieldHint}[${index}]`, issues);
        }
    }

    /**
     * @description 添加归属错误。
     * @param issues 输出列表。
     * @param nodePath 节点路径。
     * @param fieldHint 字段名。
     * @param message 说明。
     * @returns 无。
     */
    private _pushOwnershipIssue(
        issues: ILumenSerializedBindingIssue[],
        nodePath: string,
        fieldHint: string,
        message: string,
    ): void {
        issues.push({ kind: 'brokenOwnership', nodePath, componentType: 'cc.Node', fieldHint, uuid: '', message });
    }

    /**
     * @description 从常见资源类型名映射到资产目录分桶。
     * @param expectedType Creator 期望类型。
     * @returns 资产目录分桶或 null。
     */
    private _expectedCatalogBucket(expectedType: string): IAssetCatalogEntry['type'] | null {
        const mapping: Readonly<Record<string, IAssetCatalogEntry['type']>> = {
            'cc.SpriteFrame': 'spriteFrame',
            'cc.Texture2D': 'texture',
            'cc.ImageAsset': 'image',
            'cc.Prefab': 'prefab',
            'cc.Material': 'material',
            'cc.AnimationClip': 'animationClip',
        };
        return mapping[expectedType] ?? null;
    }

    /**
     * @description 按标准或压缩 UUID 查找资产目录条目。
     * @param catalog 资产目录。
     * @param uuid 标准或压缩 UUID。
     * @returns 目录条目或 null。
     */
    private _findCatalogEntry(catalog: IAssetCatalogDocument, uuid: string): IAssetCatalogEntry | null {
        const direct = catalog.uuidMap[uuid];
        if (direct != null) {
            return direct;
        }
        return Object.values(catalog.uuidMap).find((entry) => entry.compressedUuid === uuid) ?? null;
    }

    /**
     * @description 读取 `{ __id__ }`。
     * @param value 候选引用。
     * @returns 整数下标或 null。
     */
    private _readId(value: unknown): number | null {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }
        const id = (value as { readonly __id__?: unknown }).__id__;
        return typeof id === 'number' && Number.isInteger(id) ? id : null;
    }

    /**
     * @description 判断引用列表是否包含指定条目。
     * @param value 引用列表。
     * @param expectedId 目标下标。
     * @returns 是否包含。
     */
    private _nodeContainsRef(value: unknown, expectedId: number): boolean {
        return Array.isArray(value) && value.some((item) => this._readId(item) === expectedId);
    }

    /**
     * @description 查找组件所属节点。
     * @param records 全部条目。
     * @param componentIndex 组件下标。
     * @returns 节点下标或 null。
     */
    private _hostNodeIndex(records: readonly Record<string, unknown>[], componentIndex: number): number | null {
        for (let index = 0; index < records.length; index += 1) {
            const node = records[index];
            if (node?.__type__ === 'cc.Node' && this._nodeContainsRef(node._components, componentIndex)) {
                return index;
            }
        }
        return null;
    }
}
