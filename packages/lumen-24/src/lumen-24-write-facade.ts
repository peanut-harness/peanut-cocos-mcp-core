import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { Lumen24EditorAssetDb } from './lumen-24-editor-assetdb.js';
import type { ILumen24CreateFolderResult } from './lumen-24-editor-assetdb.js';
import { Lumen24BuiltinComponents } from './lumen-24-builtin-components.js';
import { Lumen24ControllerBinder } from './lumen-24-controller-binder.js';
import type { ILumen24ControllerBindOptions } from './lumen-24-controller-binder.js';
import type { ILumen24InspectNode, ILumen24NodePropsPatch, ILumen24TreeNode } from './lumen-24-prefab-document.js';
import { Lumen24ScriptResolver } from './lumen-24-script-resolver.js';
import { Lumen24Session } from './lumen-24-session.js';
import type { ILumen24ScaffoldOptions } from './lumen-24-session.js';
import { Lumen24SpriteFrameGuard } from './lumen-24-sprite-frame-guard.js';
import { Lumen24StandaloneAsset } from './lumen-24-standalone-asset.js';
import { Lumen24RecipeMemoryCompiler } from './lumen-24-recipe-memory-compiler.js';
import type { ILumen24NodeRecipe } from './lumen-24-recipe-types.js';
import { Lumen24Templates } from './lumen-24-templates.js';
import { Lumen24DefaultTemplateRoot } from './lumen-24-template-catalog.js';
import { Lumen24UuidCodec } from './lumen-24-uuid-codec.js';
import { Lumen24ValidateRefs } from './lumen-24-validate-refs.js';
import { Lumen24WriteGate } from './lumen-24-write-gate.js';

/**
 * @description scaffold 门面输入。
 */
export interface ILumen24FacadeScaffoldInput {
    /**
     * @description Prefab 相对路径。
     */
    readonly prefabRelativePath: string;
    /**
     * @description 根节点名。
     */
    readonly rootName?: string;
    /**
     * @description 模板；`empty` / `sprite` / `label` / `button`。
     */
    readonly template?: string;
    /**
     * @description 已存在时是否重置。
     */
    readonly reset?: boolean;
}

/**
 * @description Creator 2.4 写盘唯一对外门面（日后抽 `peanut.lumen-24` 的稳定边界）。
 */
export class Lumen24WriteFacade {
    /** @description 工程根。 */
    private readonly _projectRoot: string;
    /** @description AssetDB 封装。 */
    private readonly _assetDb: Lumen24EditorAssetDb;
    /** @description 会话。 */
    private readonly _session: Lumen24Session;

    /**
     * @description 创建门面。
     * @param projectRoot 工程根
     * @param assetDb AssetDB；缺省从宿主读取
     */
    public constructor(projectRoot: string, assetDb: Lumen24EditorAssetDb = Lumen24EditorAssetDb.fromGlobalThis()) {
        this._projectRoot = projectRoot;
        this._assetDb = assetDb;
        Lumen24DefaultTemplateRoot.ensureForProject(projectRoot);
        this._session = new Lumen24Session(projectRoot, assetDb.createRefreshAdapter(projectRoot));
    }

    /**
     * @description 是否 Creator 2.x。
     * @param cocosVersion 可选显式版本
     * @param hostGlobal 宿主全局
     * @returns 是 2.x 时 true
     */
    public static isCreator2x(
        cocosVersion?: string,
        hostGlobal: {
            Editor?: { versions?: { CocosCreator?: unknown }; App?: { version?: unknown } };
        } = globalThis as {
            Editor?: { versions?: { CocosCreator?: unknown }; App?: { version?: unknown } };
        },
    ): boolean {
        const explicit = (cocosVersion ?? '').trim();
        if (explicit.length > 0) {
            return Number(explicit.split('.')[0] ?? '0') === 2;
        }
        const fromVersions = hostGlobal.Editor?.versions?.CocosCreator;
        if (typeof fromVersions === 'string' && fromVersions.trim().length > 0) {
            return Number(fromVersions.trim().split('.')[0] ?? '0') === 2;
        }
        const fromApp = hostGlobal.Editor?.App?.version;
        if (typeof fromApp === 'string' && fromApp.trim().length > 0) {
            return Number(fromApp.trim().split('.')[0] ?? '0') === 2;
        }
        return false;
    }

    /**
     * @description 读取宿主 Creator 版本。
     * @param hostGlobal 宿主全局
     * @returns 版本或 null
     */
    public static readHostCreatorVersion(
        hostGlobal: {
            Editor?: { versions?: { CocosCreator?: unknown }; App?: { version?: unknown } };
        } = globalThis as {
            Editor?: { versions?: { CocosCreator?: unknown }; App?: { version?: unknown } };
        },
    ): string | null {
        const fromVersions = hostGlobal.Editor?.versions?.CocosCreator;
        if (typeof fromVersions === 'string' && fromVersions.trim().length > 0) {
            return fromVersions.trim();
        }
        const fromApp = hostGlobal.Editor?.App?.version;
        if (typeof fromApp === 'string' && fromApp.trim().length > 0) {
            return fromApp.trim();
        }
        return null;
    }

    /**
     * @description 门禁快照。
     * @returns 状态
     */
    public static status(): ReturnType<typeof Lumen24WriteGate.status> {
        return Lumen24WriteGate.status();
    }

    /**
     * @description 工程根。
     * @returns 路径
     */
    public get projectRoot(): string {
        return this._projectRoot;
    }

    /**
     * @description 空 Prefab scaffold + refresh。
     * @param input scaffold 输入
     * @returns 结果
     */
    public async scaffoldPrefab(input: ILumen24FacadeScaffoldInput): Promise<{
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly cocos: string;
        readonly kind: 'prefab' | 'scene';
        readonly template: string;
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
        readonly lumen24: ReturnType<typeof Lumen24WriteGate.status>;
    }> {
        Lumen24WriteGate.assertReady('scaffoldPrefab');
        const isFire = input.prefabRelativePath.toLowerCase().endsWith('.fire');
        if (isFire) {
            Lumen24WriteGate.assertReady('scaffoldScene');
        }
        const templateId = Lumen24Templates.normalize(input.template);
        const options: ILumen24ScaffoldOptions = {
            prefabRelativePath: input.prefabRelativePath,
            rootName: input.rootName ?? (isFire ? 'New Node' : 'Root'),
            ...(input.reset === true ? { reset: true } : {}),
        };
        const prefab = this._session.scaffoldPrefab(options, isFire ? 'empty' : templateId);
        const refresh = await this._session.requestEditorRefresh([prefab]);
        const kind = isFire ? 'scene' : 'prefab';
        return {
            phase: 'creator_2x',
            prefab,
            cocos: Lumen24WriteFacade.readHostCreatorVersion() ?? '2.4.0',
            kind,
            refresh,
            lumen24: Lumen24WriteGate.status(),
            template: isFire ? 'scene/new-scene' : templateId,
        };
    }

    /**
     * @description 打开并返回层次树。
     * @param prefabRelativePath Prefab / `.fire` 路径
     * @returns 树结果
     */
    public tree(prefabRelativePath: string): {
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly kind: 'prefab' | 'scene';
        readonly tree: ILumen24TreeNode;
        readonly cocos: string;
    } {
        Lumen24WriteGate.assertReady('inspectTree');
        const document = this._session.openPrefab(prefabRelativePath);
        return {
            phase: 'creator_2x',
            prefab: prefabRelativePath,
            kind: document.kind,
            tree: this._session.inspectTree(),
            cocos: Lumen24WriteFacade.readHostCreatorVersion() ?? '2.4.0',
        };
    }

    /**
     * @description 检视节点。
     * @param prefabRelativePath Prefab / `.fire` 路径
     * @param nodePath 可选节点路径
     * @returns 检视结果
     */
    public inspect(
        prefabRelativePath: string,
        nodePath?: string,
    ): {
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly kind: string;
        readonly node: ILumen24InspectNode | null;
        readonly asset?: Readonly<Record<string, unknown>>;
        readonly cocos: string;
    } {
        Lumen24WriteGate.assertReady('inspectNode');
        const lower = prefabRelativePath.replace(/\\/g, '/').toLowerCase();
        if (!lower.endsWith('.prefab') && !lower.endsWith('.fire')) {
            const asset = Lumen24StandaloneAsset.inspect(this._projectRoot, prefabRelativePath);
            return {
                phase: 'creator_2x',
                prefab: prefabRelativePath,
                kind: String(asset.kind),
                node: null,
                asset,
                cocos: Lumen24WriteFacade.readHostCreatorVersion() ?? '2.4.0',
            };
        }
        const document = this._session.openPrefab(prefabRelativePath);
        return {
            phase: 'creator_2x',
            prefab: prefabRelativePath,
            kind: document.kind,
            node: this._session.inspectNode(nodePath),
            cocos: Lumen24WriteFacade.readHostCreatorVersion() ?? '2.4.0',
        };
    }

    /**
     * @description 追加空子节点并 refresh。
     * @param prefabRelativePath Prefab
     * @param parentPath 父路径
     * @param name 子名
     * @param template 模板（仅 empty）
     * @returns 写结果
     */
    public async nodeAdd(
        prefabRelativePath: string,
        parentPath: string,
        name: string,
        template?: string,
    ): Promise<{
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly path: string;
        readonly template: string;
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('addEmptyChild');
        const templateId = Lumen24Templates.normalize(template);
        this._session.openPrefab(prefabRelativePath);
        const path = this._session.addChild(parentPath, name, templateId);
        const refresh = await this._session.requestEditorRefresh([prefabRelativePath]);
        return { phase: 'creator_2x', prefab: prefabRelativePath, path, template: templateId, refresh };
    }

    /**
     * @description 删除节点并 refresh。
     * @param prefabRelativePath Prefab
     * @param nodePath 节点路径
     * @returns 写结果
     */
    public async nodeRm(
        prefabRelativePath: string,
        nodePath: string,
    ): Promise<{
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly removed: string;
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('removeNode');
        this._session.openPrefab(prefabRelativePath);
        this._session.removeNode(nodePath);
        const refresh = await this._session.requestEditorRefresh([prefabRelativePath]);
        return { phase: 'creator_2x', prefab: prefabRelativePath, removed: nodePath, refresh };
    }

    /**
     * @description 重命名并 refresh。
     * @param prefabRelativePath Prefab
     * @param nodePath 节点路径
     * @param name 新名
     * @returns 写结果
     */
    public async nodeRename(
        prefabRelativePath: string,
        nodePath: string,
        name: string,
    ): Promise<{
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly path: string;
        readonly name: string;
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('renameNode');
        this._session.openPrefab(prefabRelativePath);
        const path = this._session.renameNode(nodePath, name);
        const refresh = await this._session.requestEditorRefresh([prefabRelativePath]);
        return { phase: 'creator_2x', prefab: prefabRelativePath, path, name, refresh };
    }

    /**
     * @description 重排子节点并 refresh。
     * @param prefabRelativePath Prefab
     * @param parentPath 父路径
     * @param childName 子名
     * @param index 目标下标
     * @returns 写结果
     */
    public async nodeReorder(
        prefabRelativePath: string,
        parentPath: string,
        childName: string,
        index: number,
    ): Promise<{
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly parent: string;
        readonly child: string;
        readonly index: number;
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('reorderChild');
        this._session.openPrefab(prefabRelativePath);
        this._session.reorderChild(parentPath, childName, index);
        const refresh = await this._session.requestEditorRefresh([prefabRelativePath]);
        return {
            phase: 'creator_2x',
            prefab: prefabRelativePath,
            parent: parentPath,
            child: childName,
            index,
            refresh,
        };
    }

    /**
     * @description 写节点属性并 refresh。
     * @param prefabRelativePath Prefab
     * @param nodePath 节点路径
     * @param props 补丁
     * @returns 写结果
     */
    public async nodeSet(
        prefabRelativePath: string,
        nodePath: string,
        props: ILumen24NodePropsPatch,
    ): Promise<{
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly node: ILumen24InspectNode;
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('setNodeProps');
        this._session.openPrefab(prefabRelativePath);
        const node = this._session.setNodeProps(nodePath, props);
        const refresh = await this._session.requestEditorRefresh([prefabRelativePath]);
        return { phase: 'creator_2x', prefab: prefabRelativePath, node, refresh };
    }

    /**
     * @description 挂载内置组件并 refresh。
     * @param prefabRelativePath Prefab
     * @param nodePath 节点
     * @param builtinType 类型
     * @param scriptName 脚本（Wave B 未支持）
     * @returns 写结果
     */
    public async compAdd(
        prefabRelativePath: string,
        nodePath: string,
        builtinType?: string,
        scriptName?: string,
    ): Promise<{
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly componentIndex: number;
        readonly componentType: string;
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('attachBuiltinComponent');
        const hasBuiltin = builtinType != null && builtinType.trim().length > 0;
        const hasScript = scriptName != null && scriptName.trim().length > 0;
        if (hasBuiltin === hasScript) {
            throw new Error('lumen_24_compAdd_requires_exactly_one_of_builtinType_or_scriptName');
        }
        this._session.openPrefab(prefabRelativePath);
        let componentIndex: number;
        let componentType: string;
        if (hasScript) {
            Lumen24WriteGate.assertReady('attachScriptComponent');
            const resolved = new Lumen24ScriptResolver(this._projectRoot).resolve(scriptName!);
            componentIndex = this._session.attachScriptComponent(nodePath, resolved.compressedUuid);
            componentType = resolved.compressedUuid;
        } else {
            componentIndex = this._session.attachBuiltinComponent(nodePath, builtinType!);
            componentType = builtinType!.startsWith('cc.') ? builtinType! : `cc.${builtinType!}`;
        }
        const refresh = await this._session.requestEditorRefresh([prefabRelativePath]);
        return {
            phase: 'creator_2x',
            prefab: prefabRelativePath,
            componentIndex,
            componentType,
            refresh,
        };
    }

    /**
     * @description 移除组件并 refresh。
     * @param prefabRelativePath Prefab
     * @param nodePath 节点
     * @param componentType 类型
     * @returns 写结果
     */
    public async compRm(
        prefabRelativePath: string,
        nodePath: string,
        componentType: string,
    ): Promise<{
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly removed: string;
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('removeComponent');
        this._session.openPrefab(prefabRelativePath);
        this._session.removeComponent(nodePath, componentType);
        const refresh = await this._session.requestEditorRefresh([prefabRelativePath]);
        return { phase: 'creator_2x', prefab: prefabRelativePath, removed: componentType, refresh };
    }

    /**
     * @description 写组件属性并 refresh。
     * @param prefabRelativePath Prefab
     * @param nodePath 节点
     * @param componentType 类型
     * @param props 补丁
     * @returns 写结果
     */
    public async compSet(
        prefabRelativePath: string,
        nodePath: string,
        componentType: string,
        props: Readonly<Record<string, unknown>>,
    ): Promise<{
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly nodePath: string;
        readonly componentType: string;
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('setComponentProps');
        this._session.openPrefab(prefabRelativePath);
        this._session.setComponentProps(nodePath, componentType, props);
        const refresh = await this._session.requestEditorRefresh([prefabRelativePath]);
        return {
            phase: 'creator_2x',
            prefab: prefabRelativePath,
            nodePath,
            componentType,
            refresh,
        };
    }

    /**
     * @description 绑定 SpriteFrame 并 refresh。
     * @param prefabRelativePath Prefab
     * @param nodePath 节点
     * @param spriteFrameUuid uuid
     * @returns 写结果
     */
    public async bindSprite(
        prefabRelativePath: string,
        nodePath: string,
        spriteFrameUuid: string,
    ): Promise<{
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly nodePath: string;
        readonly spriteFrameUuid: string;
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('bindSpriteFrame');
        Lumen24SpriteFrameGuard.assertExists(this._projectRoot, spriteFrameUuid);
        this._session.openPrefab(prefabRelativePath);
        this._session.bindSpriteFrame(nodePath, spriteFrameUuid);
        const refresh = await this._session.requestEditorRefresh([prefabRelativePath]);
        return {
            phase: 'creator_2x',
            prefab: prefabRelativePath,
            nodePath,
            spriteFrameUuid,
            refresh,
        };
    }

    /**
     * @description 绑定 Button 点击事件并 refresh。
     * @param prefabRelativePath Prefab
     * @param buttonNodePath 按钮节点
     * @param targetNodePath 目标节点
     * @param component 脚本路径/名/压缩 UUID
     * @param handler 方法名
     * @param customEventData 自定义数据
     * @returns 写结果
     */
    public async bindClick(
        prefabRelativePath: string,
        buttonNodePath: string,
        targetNodePath: string,
        component: string,
        handler: string,
        customEventData = '',
    ): Promise<{
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly buttonNodePath: string;
        readonly targetNodePath: string;
        readonly componentId: string;
        readonly handler: string;
        readonly clickEventIndex: number;
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('bindClickEvent');
        const resolved = new Lumen24ScriptResolver(this._projectRoot).resolve(component);
        this._session.openPrefab(prefabRelativePath);
        const clickEventIndex = this._session.bindClickEvent(
            buttonNodePath,
            targetNodePath,
            resolved.displayName,
            handler,
            customEventData,
            resolved.compressedUuid,
        );
        const refresh = await this._session.requestEditorRefresh([prefabRelativePath]);
        return {
            phase: 'creator_2x',
            prefab: prefabRelativePath,
            buttonNodePath,
            targetNodePath,
            componentId: resolved.compressedUuid,
            handler,
            clickEventIndex,
            refresh,
        };
    }

    /**
     * @description 绑定节点/组件引用并 refresh。
     * @param prefabRelativePath Prefab
     * @param nodePath 持有组件的节点
     * @param componentType 组件
     * @param field 字段
     * @param nodeRef 节点路径
     * @param componentRef 组件引用
     * @returns 写结果
     */
    public async bindRef(
        prefabRelativePath: string,
        nodePath: string,
        componentType: string,
        field: string,
        nodeRef?: string,
        componentRef?: Readonly<{ readonly nodePath: string; readonly type: string }>,
    ): Promise<{
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly nodePath: string;
        readonly field: string;
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('bindRef');
        const hasNode = nodeRef != null && nodeRef.trim().length > 0;
        const hasComp = componentRef != null;
        if (hasNode === hasComp) {
            throw new Error('lumen_24_bindRef_node_or_component_required');
        }
        const document = this._session.openPrefab(prefabRelativePath);
        let ref: { kind: 'node' | 'component'; index: number };
        if (hasNode) {
            ref = { kind: 'node', index: document.findNodeIndex(nodeRef!) };
        } else {
            const wanted = componentRef!.type.trim();
            const normalizedWanted =
                wanted.startsWith('cc.') || ['Sprite', 'Label', 'Button'].includes(wanted)
                    ? wanted.startsWith('cc.')
                        ? wanted
                        : `cc.${wanted}`
                    : wanted;
            const targetNode = document.findNodeIndex(componentRef!.nodePath);
            const node = document.entries[targetNode];
            const components = Array.isArray(node?._components) ? node!._components : [];
            let componentIndex: number | null = null;
            for (const item of components) {
                if (item == null || typeof item !== 'object') {
                    continue;
                }
                const id = (item as { __id__?: unknown }).__id__;
                if (typeof id !== 'number') {
                    continue;
                }
                const type = document.entries[id]?.__type__;
                if (type === normalizedWanted || type === wanted) {
                    componentIndex = id;
                    break;
                }
            }
            if (componentIndex == null) {
                throw new Error(`lumen_24_bindRef_component_missing:${wanted}`);
            }
            ref = { kind: 'component', index: componentIndex };
        }
        this._session.bindRef(nodePath, componentType, field, ref);
        const refresh = await this._session.requestEditorRefresh([prefabRelativePath]);
        return { phase: 'creator_2x', prefab: prefabRelativePath, nodePath, field, refresh };
    }

    /**
     * @description 按配方构建子树并 refresh。
     * @param prefabRelativePath Prefab
     * @param parentPath 父路径
     * @param recipe 配方
     * @returns 写结果
     */
    public async structure(
        prefabRelativePath: string,
        parentPath: string,
        recipe: ILumen24NodeRecipe | readonly ILumen24NodeRecipe[],
    ): Promise<{
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly created: readonly string[];
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('structure');
        this._session.openPrefab(prefabRelativePath);
        const created = this._session.buildFromRecipe(parentPath, recipe);
        const refresh = await this._session.requestEditorRefresh([prefabRelativePath]);
        return { phase: 'creator_2x', prefab: prefabRelativePath, created, refresh };
    }

    /**
     * @description 内存编译配方（不写盘）。
     * @param input 编译输入
     * @returns entries
     */
    public compileRecipe(input: {
        readonly prefabRelativePath: string;
        readonly rootName: string;
        readonly mode: 'replaceRoot' | 'appendChildren';
        readonly recipe?: ILumen24NodeRecipe;
        readonly recipes?: readonly ILumen24NodeRecipe[];
    }): {
        readonly phase: 'creator_2x';
        readonly prefabRelativePath: string;
        readonly entries: readonly unknown[];
        readonly entryCount: number;
    } {
        Lumen24WriteGate.assertReady('compileRecipe');
        const compiled = new Lumen24RecipeMemoryCompiler().compile(input);
        return {
            phase: 'creator_2x',
            prefabRelativePath: compiled.prefabRelativePath,
            entries: compiled.entries,
            entryCount: compiled.entries.length,
        };
    }

    /**
     * @description 校验 Prefab 内 uuid 引用。
     * @param prefabRelativePath Prefab
     * @returns 校验结果
     */
    public validateRefs(prefabRelativePath: string): ReturnType<Lumen24ValidateRefs['validate']> {
        Lumen24WriteGate.assertReady('validateRefs');
        return new Lumen24ValidateRefs().validate(this._projectRoot, prefabRelativePath);
    }

    /**
     * @description 2.4 可用 schema 面（节点属性 + Wave B 内置组件）。
     * @returns schema 描述
     */
    public describeSchema(): {
        readonly phase: 'creator_2x';
        readonly cocos: string;
        readonly schema: {
            readonly kind: 'nodeProps+builtins+script';
            readonly fields: readonly string[];
            readonly components: readonly string[];
            readonly note: string;
        };
    } {
        Lumen24WriteGate.assertReady('describeSchema');
        return {
            phase: 'creator_2x',
            cocos: Lumen24WriteFacade.readHostCreatorVersion() ?? '2.4.0',
            schema: {
                kind: 'nodeProps+builtins+script',
                fields: ['active', 'opacity', 'x', 'y', 'z', 'scaleX', 'scaleY', 'scaleZ'],
                components: [...Lumen24BuiltinComponents.supported, 'script(compressedUuid)'],
                note: 'creator2x: Prefab+.fire + UI builtins(Wave E) + standalone assets(docs 2.4) + bind*/structure/compileRecipe',
            },
        };
    }

    /**
     * @description 2.4 模板列表（empty/sprite/label/button）。
     * @returns 模板目录
     */
    public listTemplates(): {
        readonly phase: 'creator_2x';
        readonly cocos: string;
        readonly count: number;
        readonly templates: readonly { readonly id: string; readonly kind: string }[];
        readonly note: string;
        readonly templateRoot: string;
    } {
        Lumen24WriteGate.assertReady('listTemplates');
        const templates = Lumen24Templates.list();
        return {
            phase: 'creator_2x',
            cocos: Lumen24WriteFacade.readHostCreatorVersion() ?? '2.4.0',
            count: templates.length,
            templates: templates.map((entry) => ({ id: entry.id, kind: entry.kind })),
            note: 'default_prefab_24 full trees from Creator 2.4.11 static/default-assets/prefab (+ logical empty)',
            templateRoot: Lumen24Templates.templateRoot(),
        };
    }

    /**
     * @description 宿主版本信息（不跑 3.x d.ts 缺口扫描）。
     * @returns 信息
     */
    public cocosInfo(): {
        readonly phase: 'creator_2x';
        readonly cocos: string;
        readonly engineGapScan: 'skipped_on_creator2x';
        readonly lumen24: ReturnType<typeof Lumen24WriteGate.status>;
    } {
        return {
            phase: 'creator_2x',
            cocos: Lumen24WriteFacade.readHostCreatorVersion() ?? '2.4.0',
            engineGapScan: 'skipped_on_creator2x',
            lumen24: Lumen24WriteGate.status(),
        };
    }

    /**
     * @description 刷新资源路径。
     * @param paths 相对路径
     * @returns 刷新结果
     */
    public async refresh(paths: readonly string[] = []): Promise<{
        readonly phase: 'creator_2x';
        readonly result: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('refresh');
        const result = await this._session.requestEditorRefresh(paths);
        return { phase: 'creator_2x', result };
    }

    /**
     * @description 删除资源：已登记走 AssetDB.delete；仅磁盘存在的静默 rm（避免 `Failed to delete asset undefined`）。
     * @param relativePaths 相对路径（文件或目录）
     * @returns 删除结果
     */
    public async deleteAssets(relativePaths: readonly string[]): Promise<{
        readonly phase: 'creator_2x';
        readonly deleted: readonly string[];
        readonly skipped: readonly string[];
        readonly deletedViaAssetDb: readonly string[];
        readonly deletedViaDisk: readonly string[];
    }> {
        Lumen24WriteGate.assertReady('deleteAssets');
        const deleted: string[] = [];
        const skipped: string[] = [];
        const deletedViaAssetDb: string[] = [];
        const deletedViaDisk: string[] = [];
        const dbUrls: string[] = [];
        for (const relativePath of relativePaths) {
            if (typeof relativePath !== 'string' || relativePath.trim().length === 0) {
                continue;
            }
            const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '').trim();
            if (normalized.length === 0) {
                continue;
            }
            const absolutePath = join(this._projectRoot, normalized);
            if (!existsSync(absolutePath)) {
                skipped.push(normalized);
                continue;
            }
            deleted.push(normalized);
            const isDirectory = statSync(absolutePath).isDirectory();
            const dbUrl = isDirectory ? `db://${normalized}/` : this._assetDb.toDbUrl(normalized);
            if (this._assetDb.isTrackedDbUrl(dbUrl)) {
                dbUrls.push(dbUrl);
                deletedViaAssetDb.push(normalized);
                continue;
            }
            // 未进 AssetDB：禁止 delete(url)，否则 Console 刷 `Failed to delete asset undefined`。
            rmSync(absolutePath, { recursive: true, force: true });
            const metaAbsolute = `${absolutePath}.meta`;
            if (existsSync(metaAbsolute)) {
                rmSync(metaAbsolute, { force: true });
            }
            deletedViaDisk.push(normalized);
        }
        if (dbUrls.length > 0) {
            await this._assetDb.deleteDbUrls(dbUrls);
        }
        return { phase: 'creator_2x', deleted, skipped, deletedViaAssetDb, deletedViaDisk };
    }

    /**
     * @description 盘建目录并写 2.4 folder meta，再由调用方 refresh。
     * @param relativePath 相对目录
     * @returns 建目录结果
     */
    public async createFolder(relativePath: string): Promise<ILumen24CreateFolderResult> {
        return this._assetDb.createFolder(this._projectRoot, relativePath);
    }

    /**
     * @description 2.4：确保贴图为 Sprite 类型并 refresh。
     * @param dbPaths `db://` 路径
     * @returns 结果
     */
    public async ensureSpriteFrames(
        dbPaths: readonly string[],
    ): Promise<Awaited<ReturnType<Lumen24EditorAssetDb['ensureSpriteFrames']>>> {
        Lumen24WriteGate.assertReady('ensureSpriteFrames');
        return this._assetDb.ensureSpriteFrames(this._projectRoot, dbPaths);
    }

    /**
     * @description 2.4：`Editor.assetdb.import` 外部文件。
     * @param absoluteSources 绝对路径
     * @param destDbUrl 目标目录
     * @returns AssetDB 结果
     */
    public async importAssets(
        absoluteSources: readonly string[],
        destDbUrl: string,
    ): Promise<{ readonly phase: 'creator_2x'; readonly destDbUrl: string; readonly results: unknown }> {
        Lumen24WriteGate.assertReady('importAssets');
        const results = await this._assetDb.importFiles(this._projectRoot, absoluteSources, destDbUrl);
        return { phase: 'creator_2x', destDbUrl, results };
    }

    /**
     * @description 批量绑定 SpriteFrame。
     * @param prefabRelativePath Prefab
     * @param bindings 绑定项
     * @returns 写结果
     */
    public async bindSpriteBatch(
        prefabRelativePath: string,
        bindings: readonly Readonly<{ readonly nodePath: string; readonly spriteFrameUuid: string }>[],
    ): Promise<{
        readonly phase: 'creator_2x';
        readonly prefab: string;
        readonly count: number;
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('bindSpriteBatch');
        if (bindings.length === 0) {
            throw new Error('lumen_24_bind_sprite_batch_empty');
        }
        this._session.openPrefab(prefabRelativePath);
        for (const binding of bindings) {
            Lumen24SpriteFrameGuard.assertExists(this._projectRoot, binding.spriteFrameUuid);
            this._session.bindSpriteFrame(binding.nodePath, binding.spriteFrameUuid);
        }
        const refresh = await this._session.requestEditorRefresh([prefabRelativePath]);
        return { phase: 'creator_2x', prefab: prefabRelativePath, count: bindings.length, refresh };
    }

    /**
     * @description 写独立资产（texture meta / json / text / js）。
     * @param assetRelativePath 相对路径
     * @param props 补丁
     * @returns 写结果
     */
    public async assetSet(
        assetRelativePath: string,
        props: Readonly<Record<string, unknown>>,
    ): Promise<{
        readonly phase: 'creator_2x';
        readonly path: string;
        readonly kind: string;
        readonly patched: readonly string[];
        readonly refresh: { readonly triggered: boolean; readonly detail?: unknown };
    }> {
        Lumen24WriteGate.assertReady('assetSet');
        const result = Lumen24StandaloneAsset.assetSet(this._projectRoot, assetRelativePath, props);
        const refresh = await this._session.requestEditorRefresh([assetRelativePath]);
        return { phase: 'creator_2x', ...result, kind: result.kind, refresh };
    }

    /**
     * @description 绑控制器脚本：挂脚本 + 属性引用 + 按钮点击。
     * @param input 绑定入参
     * @returns 摘要
     */
    public async bindController(input: {
        readonly prefabRelativePath: string;
        readonly scriptRelativePath: string;
        readonly className: string;
        readonly propertyBindings: Readonly<Record<string, string>>;
        readonly propertyComponents?: Readonly<Record<string, string>>;
        readonly buttonEvents?: readonly Readonly<{
            readonly nodeName: string;
            readonly nodePath?: string;
            readonly handler: string;
            readonly customEventData?: string;
        }>[];
    }): Promise<Record<string, unknown>> {
        Lumen24WriteGate.assertReady('bindController');
        const scriptAbs = join(this._projectRoot, input.scriptRelativePath);
        if (!existsSync(scriptAbs)) {
            throw new Error(`lumen_24_bind_controller_script_missing:${input.scriptRelativePath}`);
        }
        const meta = JSON.parse(readFileSync(`${scriptAbs}.meta`, 'utf8')) as { uuid?: unknown };
        if (typeof meta.uuid !== 'string' || meta.uuid.length === 0) {
            throw new Error(`lumen_24_bind_controller_script_uuid_missing:${input.scriptRelativePath}`);
        }
        const compressedUuid = new Lumen24UuidCodec().compress(meta.uuid);
        const document = this._session.openPrefab(input.prefabRelativePath);
        const options: ILumen24ControllerBindOptions = {
            compressedUuid,
            className: input.className,
            propertyBindings: input.propertyBindings,
            propertyComponents: input.propertyComponents,
            buttonEvents: input.buttonEvents ?? [],
        };
        const bound = Lumen24ControllerBinder.bind(document, options);
        this._session.save();
        const refresh = await this._session.requestEditorRefresh([input.prefabRelativePath]);
        return {
            phase: 'creator_2x',
            method: 'lumen-24',
            prefabRelativePath: input.prefabRelativePath,
            scriptRelativePath: input.scriptRelativePath,
            className: input.className,
            ...bound,
            refresh,
        };
    }

    /**
     * @description 打开 `.fire` 场景到编辑器（给人看；写盘仍走 lumen）。
     * Creator 2.4 官方路径：宿主 `scene-script` 内调用 `_Scene.loadSceneByUuid`，
     * 经 `Editor.Scene.callSceneScript` 触发（插件宿主进程没有 `_Scene` / `scene://`）。
     * @param sceneRelativePath 场景相对路径
     * @returns 打开结果
     */
    public async openScene(sceneRelativePath: string): Promise<Record<string, unknown>> {
        Lumen24WriteGate.assertReady('openScene');
        const normalized = sceneRelativePath.replace(/\\/g, '/');
        if (!normalized.toLowerCase().endsWith('.fire')) {
            throw new Error(`lumen_24_openScene_requires_fire:${normalized}`);
        }
        const absolutePath = join(this._projectRoot, normalized);
        if (!existsSync(absolutePath)) {
            throw new Error(`lumen_24_scene_missing:${normalized}`);
        }
        const host = globalThis as {
            Editor?: {
                assetdb?: { urlToUuid?: (url: string) => string | null };
                Scene?: {
                    callSceneScript?: (
                        packageName: string,
                        method: string,
                        ...args: unknown[]
                    ) => void;
                };
            };
        };
        const url = `db://${normalized}`;
        const uuid = host.Editor?.assetdb?.urlToUuid?.(url) ?? null;
        if (uuid == null || uuid.length === 0) {
            throw new Error(`lumen_24_openScene_uuid_missing:${normalized}`);
        }
        const callSceneScript = host.Editor?.Scene?.callSceneScript;
        if (typeof callSceneScript !== 'function') {
            throw new Error('lumen_24_openScene_host_unavailable:Editor.Scene.callSceneScript');
        }
        await new Promise<void>((resolve, reject) => {
            let settled = false;
            const timer = setTimeout(() => {
                if (settled) {
                    return;
                }
                settled = true;
                reject(new Error('lumen_24_openScene_timeout:Editor.Scene.callSceneScript'));
            }, 8000);
            try {
                callSceneScript('peanut-pod-24', 'load-scene-by-uuid', uuid, (error: Error | null) => {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    clearTimeout(timer);
                    if (error != null) {
                        reject(error instanceof Error ? error : new Error(String(error)));
                        return;
                    }
                    resolve();
                });
            } catch (error) {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timer);
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        });
        return {
            phase: 'creator_2x',
            path: normalized,
            uuid,
            method: 'Editor.Scene.callSceneScript:peanut-pod-24/load-scene-by-uuid',
        };
    }
}
