import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'fs';
import { join, resolve, sep } from 'path';

import { LumenPackageRoot } from '../package-root';

import type { ILumenPropertyFieldSpec } from './component-property';
import {
    LumenCuratedSchemaCodec,
    type ILumenAssetSchemaEntry,
    type ILumenCuratedAssetsDocument,
    type ILumenCuratedConventionsDocument,
    type ILumenCuratedDeprecatedBuiltin,
    type ILumenCuratedTypeDocument,
    type ILumenCuratedTypeLifecycle,
} from './codec';

/**
 * @description 从包内 `bundled/schema/` 加载策展白名单（一类型一 JSON）。
 */
export class LumenCuratedSchemaCatalog {
    /**
     * @description 进程内默认目录的单例。
     */
    private static _shared: LumenCuratedSchemaCatalog | null = null;

    /**
     * @description JSON 校验器。
     */
    private readonly _codec = new LumenCuratedSchemaCodec();

    /**
     * @description 组件类型 → 已展开字段。
     */
    private readonly _components = new Map<string, readonly ILumenPropertyFieldSpec[]>();

    /**
     * @description 内嵌类型 → 已展开字段。
     */
    private readonly _embedded = new Map<string, readonly ILumenPropertyFieldSpec[]>();

    /**
     * @description 节点字段。
     */
    private readonly _nodeFields: readonly ILumenPropertyFieldSpec[];

    /**
     * @description 废弃内置组件。
     */
    private readonly _deprecated: Readonly<Record<string, ILumenCuratedDeprecatedBuiltin>>;

    /**
     * @description Renderer 互斥族。
     */
    private readonly _rendererExclusive: ReadonlySet<string>;

    /**
     * @description 倾向 UI_2D 的组件。
     */
    private readonly _ui2dTypes: ReadonlySet<string>;

    /**
     * @description 倾向 DEFAULT 的组件。
     */
    private readonly _world3dTypes: ReadonlySet<string>;

    /**
     * @description 脚本 `@property(Type)` 简名 → 组件 `__type__`。
     */
    private readonly _scriptAliases: ReadonlyMap<string, string>;

    /**
     * @description 组件生命周期（省略表示无边界）。
     */
    private readonly _lifecycles = new Map<string, ILumenCuratedTypeLifecycle>();

    /**
     * @description 独立资产种类 → 登记。
     */
    private readonly _assets = new Map<string, ILumenAssetSchemaEntry>();

    /**
     * @description 路径扩展名（小写）→ 种类；按扩展名长度降序匹配。
     */
    private readonly _extensionOrder: readonly string[];

    /**
     * @description 扩展名 → 种类。
     */
    private readonly _kindByExtension = new Map<string, string>();

    /**
     * @description `.meta` importer → 种类。
     */
    private readonly _kindByImporter = new Map<string, string>();

    /**
     * @description 从指定根目录加载并展开 `typeRef`。
     * @param schemaRoot 策展表根目录（含 `components/` / `types/` / `node.json` / `conventions.json` / `assets.json`）
     */
    public constructor(schemaRoot: string) {
        const root = this._assertSchemaRoot(schemaRoot);
        const embeddedDocs = this._readTypeDir(root, 'types', 'embedded');
        for (const doc of embeddedDocs) {
            if (this._embedded.has(doc.type)) {
                throw new Error(`lumen_curated_schema_duplicate:types:${doc.type}`);
            }
            this._embedded.set(doc.type, doc.fields);
        }
        const resolvedEmbedded = new Map<string, readonly ILumenPropertyFieldSpec[]>();
        for (const typeName of this._embedded.keys()) {
            resolvedEmbedded.set(typeName, this._resolveFields(this._embedded.get(typeName) ?? [], typeName, []));
        }
        this._embedded.clear();
        for (const [typeName, fields] of resolvedEmbedded) {
            this._embedded.set(typeName, fields);
        }
        const componentDocs = this._readTypeDir(root, 'components', 'component');
        for (const doc of componentDocs) {
            if (this._components.has(doc.type)) {
                throw new Error(`lumen_curated_schema_duplicate:components:${doc.type}`);
            }
            this._components.set(doc.type, this._resolveFields(doc.fields, doc.type, []));
            const lifecycle = LumenCuratedSchemaCatalog._lifecycleFromDoc(doc);
            if (lifecycle != null) {
                this._lifecycles.set(doc.type, lifecycle);
            }
        }
        const nodeDoc = this._readTypeFile(root, 'node.json', 'node');
        this._nodeFields = this._resolveFields(nodeDoc.fields, nodeDoc.type, []);
        this._deprecated = this._readDeprecated(root);
        this._assertLifecycleDeprecatedDistinct();
        const conventions = this._readConventions(root);
        this._rendererExclusive = new Set(conventions.rendererExclusive);
        this._ui2dTypes = new Set(conventions.ui2dTypes);
        this._world3dTypes = new Set(conventions.world3dTypes);
        this._scriptAliases = this._buildScriptAliases();
        const assets = this._readAssets(root);
        const extensionOrder: string[] = [];
        for (const entry of assets.entries) {
            this._assets.set(entry.assetKind, entry);
            for (const extension of entry.extensions) {
                this._kindByExtension.set(extension, entry.assetKind);
                extensionOrder.push(extension);
            }
            for (const importer of entry.importers) {
                this._kindByImporter.set(importer, entry.assetKind);
            }
        }
        extensionOrder.sort((left, right) => {
            if (right.length !== left.length) {
                return right.length - left.length;
            }
            return left.localeCompare(right);
        });
        this._extensionOrder = extensionOrder;
    }

    /**
     * @description 包内默认策展表（`bundled/schema/`）。
     * @param packageRoot lumen 包根
     * @returns 单例目录表
     */
    public static shared(packageRoot: string = LumenPackageRoot.resolve()): LumenCuratedSchemaCatalog {
        if (LumenCuratedSchemaCatalog._shared == null) {
            LumenCuratedSchemaCatalog._shared = new LumenCuratedSchemaCatalog(
                LumenCuratedSchemaCatalog.resolveBundledRoot(packageRoot),
            );
        }
        return LumenCuratedSchemaCatalog._shared;
    }

    /**
     * @description 丢弃策展表单例缓存（脚本重载 schema 后须调用）。
     */
    public static resetShared(): void {
        LumenCuratedSchemaCatalog._shared = null;
    }

    /**
     * @description 解析随包策展表根。
     * @param packageRoot lumen 包根
     * @returns 绝对路径
     */
    public static resolveBundledRoot(packageRoot: string = LumenPackageRoot.resolve()): string {
        return LumenPackageRoot.resolveSchema(packageRoot);
    }

    /**
     * @description 已登记的内置组件类型（排序）。
     * @returns 类型名
     */
    public listComponentTypes(): readonly string[] {
        return [...this._components.keys()].sort();
    }

    /**
     * @description 是否已登记该内置组件。
     * @param componentType 组件 `__type__`
     * @returns 是否在策展表
     */
    public hasComponent(componentType: string): boolean {
        return this._components.has(componentType);
    }

    /**
     * @description 读取组件已展开字段；未登记返回 `undefined`。
     * @param componentType 组件 `__type__`
     * @returns 字段列表
     */
    public componentFields(componentType: string): readonly ILumenPropertyFieldSpec[] | undefined {
        return this._components.get(componentType);
    }

    /**
     * @description 已登记的内嵌类型（排序）。
     * @returns 类型名
     */
    public listEmbeddedTypes(): readonly string[] {
        return [...this._embedded.keys()].sort();
    }

    /**
     * @description 读取组件或内嵌类型已展开字段；未登记返回 `undefined`。
     * @param typeName 类型名
     * @returns 字段列表
     */
    public curatedFieldsForType(typeName: string): readonly ILumenPropertyFieldSpec[] | undefined {
        return this._components.get(typeName) ?? this._embedded.get(typeName);
    }

    /**
     * @description 节点可编辑字段。
     * @returns 字段列表
     */
    public nodeFields(): readonly ILumenPropertyFieldSpec[] {
        return this._nodeFields;
    }

    /**
     * @description 读取废弃说明。
     * @param componentType 组件 `__type__`
     * @returns 说明或 `undefined`
     */
    public deprecatedBuiltin(componentType: string): ILumenCuratedDeprecatedBuiltin | undefined {
        return this._deprecated[componentType];
    }

    /**
     * @description 读取组件生命周期；无边界时返回 `undefined`。
     * @param componentType 组件 `__type__`
     * @returns 生命周期
     */
    public componentLifecycle(componentType: string): ILumenCuratedTypeLifecycle | undefined {
        return this._lifecycles.get(componentType);
    }

    /**
     * @description 判断是否属于 Renderer 互斥族。
     * @param componentType 组件 `__type__`
     * @returns 是否互斥成员
     */
    public isRendererExclusive(componentType: string): boolean {
        return this._rendererExclusive.has(componentType);
    }

    /**
     * @description 推断组件倾向的 Layer 角色。
     * @param componentType 组件类型
     * @returns `ui2d` / `world3d` / `null`
     */
    public layerRoleForComponent(componentType: string): 'ui2d' | 'world3d' | null {
        if (this._world3dTypes.has(componentType)) {
            return 'world3d';
        }
        if (this._ui2dTypes.has(componentType)) {
            return 'ui2d';
        }
        return null;
    }

    /**
     * @description Agent / MCP 可见的挂载约定类型表。
     * @returns 互斥族与 Layer 类型
     */
    public describeConventions(): {
        readonly rendererExclusive: readonly string[];
        readonly ui2dTypes: readonly string[];
        readonly world3dTypes: readonly string[];
    } {
        return {
            rendererExclusive: [...this._rendererExclusive].sort(),
            ui2dTypes: [...this._ui2dTypes].sort(),
            world3dTypes: [...this._world3dTypes].sort(),
        };
    }

    /**
     * @description 由脚本装饰器简名解析组件 `__type__`（如 `Label` → `cc.Label`）。
     * @param simpleName `cc` / `sp` / `dragonBones` 导出名
     * @returns 组件类型或 `undefined`
     */
    public scriptComponentType(simpleName: string): string | undefined {
        return this._scriptAliases.get(simpleName);
    }

    /**
     * @description 读取独立资产登记。
     * @param assetKind 公开 kind
     * @returns 条目或 `undefined`
     */
    public assetEntry(assetKind: string): ILumenAssetSchemaEntry | undefined {
        return this._assets.get(assetKind);
    }

    /**
     * @description 读取源 JSON 对象资产登记。
     * @param assetKind 公开 kind
     * @returns json-asset 条目或 `undefined`
     */
    public jsonAssetEntry(assetKind: string): ILumenAssetSchemaEntry | undefined {
        const entry = this._assets.get(assetKind);
        if (entry == null || entry.document !== 'json-asset') {
            return undefined;
        }
        return entry;
    }

    /**
     * @description 判断是否为独立资产种类（非 Prefab / Scene）。
     * @param assetKind 种类
     * @returns 是否已登记
     */
    public isStandaloneKind(assetKind: string): boolean {
        return this._assets.has(assetKind);
    }

    /**
     * @description 读取旁路 `.meta` 登记。
     * @param assetKind 公开 kind
     * @returns sidecar 条目或 `undefined`
     */
    public sidecarEntry(assetKind: string): ILumenAssetSchemaEntry | undefined {
        const entry = this._assets.get(assetKind);
        if (entry == null || entry.document !== 'sidecar-meta') {
            return undefined;
        }
        return entry;
    }

    /**
     * @description 由唯一扩展名判断独立资产种类。
     * @param relativePath 项目相对路径
     * @returns 种类或 `undefined`（交回 Prefab / Scene）
     */
    public kindFromExclusiveExtension(relativePath: string): string | undefined {
        const lower = relativePath.toLowerCase();
        for (const extension of this._extensionOrder) {
            if (lower.endsWith(extension)) {
                return this._kindByExtension.get(extension);
            }
        }
        return undefined;
    }

    /**
     * @description 由 `.meta` importer 判断种类。
     * @param importer importer 名
     * @returns 种类或 `undefined`
     */
    public kindFromImporter(importer: string): string | undefined {
        return this._kindByImporter.get(importer);
    }

    /**
     * @description 展开字段上的 `typeRef`，并递归处理嵌套。
     * @param fields 原始字段
     * @param ownerKey 错误定位
     * @param stack 正在展开的类型栈（环检测）
     * @returns 运行时规格
     */
    private _resolveFields(
        fields: readonly ILumenPropertyFieldSpec[],
        ownerKey: string,
        stack: readonly string[],
    ): readonly ILumenPropertyFieldSpec[] {
        return fields.map((field) => this._resolveField(field, `${ownerKey}.${field.apiName}`, stack));
    }

    /**
     * @description 展开单字段。
     * @param field 原始字段
     * @param sourceLabel 错误定位
     * @param stack 类型栈
     * @returns 运行时规格
     */
    private _resolveField(
        field: ILumenPropertyFieldSpec,
        sourceLabel: string,
        stack: readonly string[],
    ): ILumenPropertyFieldSpec {
        const nestedResolved =
            field.nestedFields != null ? this._resolveFields(field.nestedFields, sourceLabel, stack) : undefined;
        const typeRef = this._codec.readTypeRef(field);
        if (typeRef == null) {
            const stripped = this._codec.omitTypeRef(field);
            if (nestedResolved == null) {
                return stripped;
            }
            return { ...stripped, nestedFields: nestedResolved };
        }
        if (stack.includes(typeRef)) {
            throw new Error(`lumen_curated_schema_type_ref_cycle:${sourceLabel}:${typeRef}`);
        }
        const referenced = this._embedded.get(typeRef);
        if (referenced == null) {
            throw new Error(`lumen_curated_schema_type_ref_missing:${sourceLabel}:${typeRef}`);
        }
        const resolvedTypeFields = this._resolveFields(referenced, typeRef, [...stack, typeRef]);
        return this._codec.withResolvedNested(field, resolvedTypeFields, typeRef);
    }

    /**
     * @description 读取 `components/` 或 `types/`。
     * @param root 策展根
     * @param directoryName 子目录名
     * @param expectedKind 期望 kind
     * @returns 文档列表
     */
    private _readTypeDir(
        root: string,
        directoryName: string,
        expectedKind: 'component' | 'embedded',
    ): readonly ILumenCuratedTypeDocument[] {
        const directory = this._childPath(root, directoryName);
        if (!existsSync(directory) || !statSync(directory).isDirectory()) {
            throw new Error(`lumen_curated_schema_root_missing:${directoryName}`);
        }
        const names = readdirSync(directory).filter((name) => name.endsWith('.json') && !name.startsWith('.'));
        names.sort();
        return names.map((fileName) => this._readTypeFile(directory, fileName, expectedKind, root));
    }

    /**
     * @description 读取单个类型文档并校验文件名与 `type` 一致。
     * @param directory 文件所在目录
     * @param fileName 文件名
     * @param expectedKind 期望 kind
     * @param rootForLabel 用于拼相对路径的根；省略则目录即根
     * @returns 文档
     */
    private _readTypeFile(
        directory: string,
        fileName: string,
        expectedKind: 'component' | 'embedded' | 'node',
        rootForLabel?: string,
    ): ILumenCuratedTypeDocument {
        this._assertFileName(fileName);
        const absolutePath = this._childPath(directory, fileName);
        const relativeLabel = this._relativeLabel(rootForLabel ?? directory, absolutePath);
        const parsed = this._codec.parseTypeDocument(this._readJson(absolutePath, relativeLabel), relativeLabel);
        if (parsed.kind !== expectedKind) {
            throw new Error(`lumen_curated_schema_kind:${relativeLabel}:${parsed.kind}`);
        }
        if (expectedKind === 'node') {
            if (fileName !== 'node.json' || parsed.type !== 'cc.Node') {
                throw new Error(`lumen_curated_schema_type_mismatch:${relativeLabel}:${parsed.type}`);
            }
        } else if (parsed.type !== fileName.slice(0, -'.json'.length)) {
            throw new Error(`lumen_curated_schema_type_mismatch:${relativeLabel}:${parsed.type}`);
        }
        return parsed;
    }

    /**
     * @description 读取 `deprecated.json`。
     * @param root 策展根
     * @returns 废弃表
     */
    private _readDeprecated(root: string): Readonly<Record<string, ILumenCuratedDeprecatedBuiltin>> {
        const absolutePath = this._childPath(root, 'deprecated.json');
        const parsed = this._codec.parseDeprecatedDocument(
            this._readJson(absolutePath, 'deprecated.json'),
            'deprecated.json',
        );
        return parsed.builtins;
    }

    /**
     * @description 禁止同一类型同时出现在 `deprecated.json` 与组件 `deprecatedSince`。
     */
    private _assertLifecycleDeprecatedDistinct(): void {
        for (const typeName of this._lifecycles.keys()) {
            const lifecycle = this._lifecycles.get(typeName);
            if (lifecycle?.deprecatedSince == null) {
                continue;
            }
            if (this._deprecated[typeName] != null) {
                throw new Error(`lumen_curated_schema_deprecated_duplicate:${typeName}`);
            }
        }
    }

    /**
     * @description 文档中的生命周期；全空则省略。
     * @param doc 类型文档
     * @returns 生命周期或 `undefined`
     */
    private static _lifecycleFromDoc(doc: ILumenCuratedTypeDocument): ILumenCuratedTypeLifecycle | undefined {
        if (
            doc.since == null &&
            doc.deprecatedSince == null &&
            doc.removedSince == null &&
            doc.useInstead == null
        ) {
            return undefined;
        }
        return {
            ...(doc.since != null ? { since: doc.since } : {}),
            ...(doc.deprecatedSince != null ? { deprecatedSince: doc.deprecatedSince } : {}),
            ...(doc.removedSince != null ? { removedSince: doc.removedSince } : {}),
            ...(doc.useInstead != null ? { useInstead: doc.useInstead } : {}),
        };
    }

    /**
     * @description 读取 `conventions.json` 并校验类型已在 `components/` 登记。
     * @param root 策展根
     * @returns 约定文档
     */
    private _readConventions(root: string): ILumenCuratedConventionsDocument {
        const absolutePath = this._childPath(root, 'conventions.json');
        const parsed = this._codec.parseConventionsDocument(
            this._readJson(absolutePath, 'conventions.json'),
            'conventions.json',
        );
        this._assertConventionTypes(parsed.rendererExclusive, 'rendererExclusive');
        this._assertConventionTypes(parsed.ui2dTypes, 'ui2dTypes');
        this._assertConventionTypes(parsed.world3dTypes, 'world3dTypes');
        return parsed;
    }

    /**
     * @description 读取 `assets.json`。
     * @param root 策展根
     * @returns 资产种类表
     */
    private _readAssets(root: string): ILumenCuratedAssetsDocument {
        const absolutePath = this._childPath(root, 'assets.json');
        return this._codec.parseAssetsDocument(this._readJson(absolutePath, 'assets.json'), 'assets.json');
    }

    /**
     * @description 断言约定表中的类型都有组件 JSON。
     * @param types 类型名
     * @param listName 列表字段名
     */
    private _assertConventionTypes(types: readonly string[], listName: string): void {
        for (const typeName of types) {
            if (!this._components.has(typeName)) {
                throw new Error(`lumen_curated_schema_conventions_unknown:${listName}:${typeName}`);
            }
        }
    }

    /**
     * @description 由组件 `__type__` 末段生成脚本简名映射；撞名则失败。
     * @returns 简名 → 类型
     */
    private _buildScriptAliases(): ReadonlyMap<string, string> {
        const aliases = new Map<string, string>();
        for (const typeName of this._components.keys()) {
            const simpleName = LumenCuratedSchemaCatalog._simpleTypeName(typeName);
            const existing = aliases.get(simpleName);
            if (existing != null && existing !== typeName) {
                throw new Error(`lumen_curated_schema_script_alias_duplicate:${simpleName}:${existing}+${typeName}`);
            }
            aliases.set(simpleName, typeName);
        }
        return aliases;
    }

    /**
     * @description 取 `__type__` 最后一段（`cc.Label` → `Label`）。
     * @param componentType 组件类型
     * @returns 简名
     */
    private static _simpleTypeName(componentType: string): string {
        const dot = componentType.lastIndexOf('.');
        return dot >= 0 ? componentType.slice(dot + 1) : componentType;
    }

    /**
     * @description 读取 JSON 文本。
     * @param absolutePath 绝对路径
     * @param sourceLabel 错误定位
     * @returns 解析值
     */
    private _readJson(absolutePath: string, sourceLabel: string): unknown {
        if (!existsSync(absolutePath)) {
            throw new Error(`lumen_curated_schema_root_missing:${sourceLabel}`);
        }
        try {
            return JSON.parse(readFileSync(absolutePath, 'utf8'));
        } catch {
            throw new Error(`lumen_curated_schema_corrupt:${sourceLabel}:json`);
        }
    }

    /**
     * @description 校验策展根存在且为目录。
     * @param schemaRoot 根路径
     * @returns 规范化绝对路径
     */
    private _assertSchemaRoot(schemaRoot: string): string {
        const root = resolve(schemaRoot);
        if (!existsSync(root) || !statSync(root).isDirectory()) {
            throw new Error(`lumen_curated_schema_root_missing:${root}`);
        }
        return root;
    }

    /**
     * @description 拼接子路径并拒绝逃出根目录。
     * @param root 根
     * @param child 子名（单段）
     * @returns 绝对路径
     */
    private _childPath(root: string, child: string): string {
        this._assertFileName(child);
        const absolutePath = resolve(join(root, child));
        this._assertInside(root, absolutePath);
        return absolutePath;
    }

    /**
     * @description 拒绝路径穿越文件名。
     * @param fileName 文件或目录名
     */
    private _assertFileName(fileName: string): void {
        if (
            fileName.length === 0 ||
            fileName.includes('/') ||
            fileName.includes('\\') ||
            fileName.includes('\0') ||
            fileName === '.' ||
            fileName === '..'
        ) {
            throw new Error(`lumen_curated_schema_path:${fileName}`);
        }
    }

    /**
     * @description 断言候选路径落在根内。
     * @param root 根
     * @param candidate 候选
     */
    private _assertInside(root: string, candidate: string): void {
        const resolvedRoot = resolve(root);
        const resolvedCandidate = resolve(candidate);
        const prefix = resolvedRoot.endsWith(sep) ? resolvedRoot : `${resolvedRoot}${sep}`;
        if (resolvedCandidate !== resolvedRoot && !resolvedCandidate.startsWith(prefix)) {
            throw new Error(`lumen_curated_schema_path:${candidate}`);
        }
        if (!existsSync(resolvedCandidate)) {
            return;
        }
        let realRoot = resolvedRoot;
        let realCandidate = resolvedCandidate;
        try {
            realRoot = realpathSync(resolvedRoot);
            realCandidate = realpathSync(resolvedCandidate);
        } catch {
            throw new Error(`lumen_curated_schema_path:${candidate}`);
        }
        const realPrefix = realRoot.endsWith(sep) ? realRoot : `${realRoot}${sep}`;
        if (realCandidate !== realRoot && !realCandidate.startsWith(realPrefix)) {
            throw new Error(`lumen_curated_schema_path:${candidate}`);
        }
    }

    /**
     * @description 生成相对错误标签。
     * @param root 根
     * @param absolutePath 文件
     * @returns 相对路径（`/`）
     */
    private _relativeLabel(root: string, absolutePath: string): string {
        const resolvedRoot = resolve(root);
        const resolvedPath = resolve(absolutePath);
        if (resolvedPath === resolvedRoot) {
            return '.';
        }
        const prefix = resolvedRoot.endsWith(sep) ? resolvedRoot : `${resolvedRoot}${sep}`;
        if (!resolvedPath.startsWith(prefix)) {
            return resolvedPath.split(sep).join('/');
        }
        return resolvedPath.slice(prefix.length).split(sep).join('/');
    }
}
