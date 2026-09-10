import { Lumen24WriteFacade } from './lumen-24-write-facade.js';
import type { ILumen24CreateFolderResult } from './lumen-24-editor-assetdb.js';
import type { ILumen24NodePropsPatch } from './lumen-24-prefab-document.js';

/**
 * @description Creator 2.4 lumen 的 MCP 接入点（住在 `@peanut/cocos-lumen-24`）。
 * 禁止把 2.x 细节散落到 3.x lumen / editor-mcp 业务路由以外。
 * 兼容旧名：{@link EditorMcpLumen24Bridge}。
 */
export class Lumen24McpBridge {
    /**
     * @description 当前宿主是否 Creator 2.x。
     * @param cocosVersion 可选显式版本
     * @returns 是 2.x 时 true
     */
    public static isCreator2x(cocosVersion?: string): boolean {
        return Lumen24WriteFacade.isCreator2x(cocosVersion);
    }

    /**
     * @description 读取宿主 Creator 版本。
     * @returns 版本或 null
     */
    public static readHostCreatorVersion(): string | null {
        return Lumen24WriteFacade.readHostCreatorVersion();
    }

    /**
     * @description 门禁快照。
     * @returns 状态
     */
    public static status(): ReturnType<typeof Lumen24WriteFacade.status> {
        return Lumen24WriteFacade.status();
    }

    /**
     * @description 空 Prefab scaffold。
     * @param projectRoot 工程根
     * @param input scaffold 字段
     * @returns 门面结果
     */
    public static async scaffold(
        projectRoot: string,
        input: {
            readonly prefabRelativePath: string;
            readonly rootName?: string;
            readonly template?: string;
            readonly reset?: boolean;
        },
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['scaffoldPrefab']>>> {
        return new Lumen24WriteFacade(projectRoot).scaffoldPrefab(input);
    }

    /**
     * @description 层次树。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @returns 树
     */
    public static tree(
        projectRoot: string,
        prefabRelativePath: string,
    ): ReturnType<Lumen24WriteFacade['tree']> {
        return new Lumen24WriteFacade(projectRoot).tree(prefabRelativePath);
    }

    /**
     * @description 检视节点。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @param nodePath 可选节点
     * @returns 检视
     */
    public static inspect(
        projectRoot: string,
        prefabRelativePath: string,
        nodePath?: string,
    ): ReturnType<Lumen24WriteFacade['inspect']> {
        return new Lumen24WriteFacade(projectRoot).inspect(prefabRelativePath, nodePath);
    }

    /**
     * @description 追加空子节点。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @param parentPath 父路径
     * @param name 子名
     * @param template 模板
     * @returns 写结果
     */
    public static async nodeAdd(
        projectRoot: string,
        prefabRelativePath: string,
        parentPath: string,
        name: string,
        template?: string,
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['nodeAdd']>>> {
        return new Lumen24WriteFacade(projectRoot).nodeAdd(
            prefabRelativePath,
            parentPath,
            name,
            template,
        );
    }

    /**
     * @description 删除节点。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @param nodePath 节点
     * @returns 写结果
     */
    public static async nodeRm(
        projectRoot: string,
        prefabRelativePath: string,
        nodePath: string,
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['nodeRm']>>> {
        return new Lumen24WriteFacade(projectRoot).nodeRm(prefabRelativePath, nodePath);
    }

    /**
     * @description 重命名。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @param nodePath 节点
     * @param name 新名
     * @returns 写结果
     */
    public static async nodeRename(
        projectRoot: string,
        prefabRelativePath: string,
        nodePath: string,
        name: string,
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['nodeRename']>>> {
        return new Lumen24WriteFacade(projectRoot).nodeRename(prefabRelativePath, nodePath, name);
    }

    /**
     * @description 重排子节点。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @param parentPath 父路径
     * @param childName 子名
     * @param index 目标下标
     * @returns 写结果
     */
    public static async nodeReorder(
        projectRoot: string,
        prefabRelativePath: string,
        parentPath: string,
        childName: string,
        index: number,
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['nodeReorder']>>> {
        return new Lumen24WriteFacade(projectRoot).nodeReorder(
            prefabRelativePath,
            parentPath,
            childName,
            index,
        );
    }

    /**
     * @description 写节点属性。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @param nodePath 节点
     * @param props 补丁
     * @returns 写结果
     */
    public static async nodeSet(
        projectRoot: string,
        prefabRelativePath: string,
        nodePath: string,
        props: ILumen24NodePropsPatch,
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['nodeSet']>>> {
        return new Lumen24WriteFacade(projectRoot).nodeSet(prefabRelativePath, nodePath, props);
    }

    /**
     * @description 挂载内置组件。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @param nodePath 节点
     * @param builtinType 类型
     * @param scriptName 脚本（未支持）
     * @returns 写结果
     */
    public static async compAdd(
        projectRoot: string,
        prefabRelativePath: string,
        nodePath: string,
        builtinType?: string,
        scriptName?: string,
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['compAdd']>>> {
        return new Lumen24WriteFacade(projectRoot).compAdd(
            prefabRelativePath,
            nodePath,
            builtinType,
            scriptName,
        );
    }

    /**
     * @description 移除组件。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @param nodePath 节点
     * @param componentType 类型
     * @returns 写结果
     */
    public static async compRm(
        projectRoot: string,
        prefabRelativePath: string,
        nodePath: string,
        componentType: string,
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['compRm']>>> {
        return new Lumen24WriteFacade(projectRoot).compRm(prefabRelativePath, nodePath, componentType);
    }

    /**
     * @description 写组件属性。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @param nodePath 节点
     * @param componentType 类型
     * @param props 补丁
     * @returns 写结果
     */
    public static async compSet(
        projectRoot: string,
        prefabRelativePath: string,
        nodePath: string,
        componentType: string,
        props: Readonly<Record<string, unknown>>,
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['compSet']>>> {
        return new Lumen24WriteFacade(projectRoot).compSet(
            prefabRelativePath,
            nodePath,
            componentType,
            props,
        );
    }

    /**
     * @description 绑定 SpriteFrame。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @param nodePath 节点
     * @param spriteFrameUuid uuid
     * @returns 写结果
     */
    public static async bindSprite(
        projectRoot: string,
        prefabRelativePath: string,
        nodePath: string,
        spriteFrameUuid: string,
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['bindSprite']>>> {
        return new Lumen24WriteFacade(projectRoot).bindSprite(
            prefabRelativePath,
            nodePath,
            spriteFrameUuid,
        );
    }

    /**
     * @description 绑定点击。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @param buttonNodePath 按钮节点
     * @param targetNodePath 目标节点
     * @param component 脚本标识
     * @param handler 方法名
     * @param customEventData 自定义数据
     * @returns 写结果
     */
    public static async bindClick(
        projectRoot: string,
        prefabRelativePath: string,
        buttonNodePath: string,
        targetNodePath: string,
        component: string,
        handler: string,
        customEventData?: string,
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['bindClick']>>> {
        return new Lumen24WriteFacade(projectRoot).bindClick(
            prefabRelativePath,
            buttonNodePath,
            targetNodePath,
            component,
            handler,
            customEventData ?? '',
        );
    }

    /**
     * @description 绑定节点/组件引用。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @param nodePath 持有组件的节点
     * @param componentType 组件
     * @param field 字段
     * @param nodeRef 节点路径
     * @param componentRef 组件引用
     * @returns 写结果
     */
    public static async bindRef(
        projectRoot: string,
        prefabRelativePath: string,
        nodePath: string,
        componentType: string,
        field: string,
        nodeRef?: string,
        componentRef?: Readonly<{ readonly nodePath: string; readonly type: string }>,
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['bindRef']>>> {
        return new Lumen24WriteFacade(projectRoot).bindRef(
            prefabRelativePath,
            nodePath,
            componentType,
            field,
            nodeRef,
            componentRef,
        );
    }

    /**
     * @description 按配方构建子树。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @param parentPath 父路径
     * @param recipe 配方
     * @returns 写结果
     */
    public static async structure(
        projectRoot: string,
        prefabRelativePath: string,
        parentPath: string,
        recipe: Parameters<Lumen24WriteFacade['structure']>[2],
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['structure']>>> {
        return new Lumen24WriteFacade(projectRoot).structure(prefabRelativePath, parentPath, recipe);
    }

    /**
     * @description 内存编译配方。
     * @param projectRoot 工程根
     * @param input 编译输入
     * @returns entries
     */
    public static compileRecipe(
        projectRoot: string,
        input: Parameters<Lumen24WriteFacade['compileRecipe']>[0],
    ): ReturnType<Lumen24WriteFacade['compileRecipe']> {
        return new Lumen24WriteFacade(projectRoot).compileRecipe(input);
    }

    /**
     * @description 校验引用。
     * @param projectRoot 工程根
     * @param prefabRelativePath Prefab
     * @returns 校验结果
     */
    public static validateRefs(
        projectRoot: string,
        prefabRelativePath: string,
    ): ReturnType<Lumen24WriteFacade['validateRefs']> {
        return new Lumen24WriteFacade(projectRoot).validateRefs(prefabRelativePath);
    }

    /**
     * @description schema 面。
     * @param projectRoot 工程根
     * @returns schema
     */
    public static describeSchema(projectRoot: string): ReturnType<Lumen24WriteFacade['describeSchema']> {
        return new Lumen24WriteFacade(projectRoot).describeSchema();
    }

    /**
     * @description 模板列表。
     * @param projectRoot 工程根
     * @returns 模板
     */
    public static listTemplates(projectRoot: string): ReturnType<Lumen24WriteFacade['listTemplates']> {
        return new Lumen24WriteFacade(projectRoot).listTemplates();
    }

    /**
     * @description 宿主信息。
     * @param projectRoot 工程根
     * @returns 信息
     */
    public static cocosInfo(projectRoot: string): ReturnType<Lumen24WriteFacade['cocosInfo']> {
        return new Lumen24WriteFacade(projectRoot).cocosInfo();
    }

    /**
     * @description 刷新路径。
     * @param projectRoot 工程根
     * @param paths 相对路径
     * @returns 刷新结果
     */
    public static async refresh(
        projectRoot: string,
        paths: readonly string[],
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['refresh']>>> {
        return new Lumen24WriteFacade(projectRoot).refresh(paths);
    }

    /**
     * @description 经 AssetDB 删除资源。
     * @param projectRoot 工程根
     * @param relativePaths 相对路径
     * @returns 删除结果
     */
    public static async deleteAssets(
        projectRoot: string,
        relativePaths: readonly string[],
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['deleteAssets']>>> {
        return new Lumen24WriteFacade(projectRoot).deleteAssets(relativePaths);
    }

    /**
     * @description 批量绑定 SpriteFrame。
     */
    public static async bindSpriteBatch(
        projectRoot: string,
        prefabRelativePath: string,
        bindings: readonly Readonly<{ readonly nodePath: string; readonly spriteFrameUuid: string }>[],
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['bindSpriteBatch']>>> {
        return new Lumen24WriteFacade(projectRoot).bindSpriteBatch(prefabRelativePath, bindings);
    }

    /**
     * @description 写独立资产。
     */
    public static async assetSet(
        projectRoot: string,
        assetRelativePath: string,
        props: Readonly<Record<string, unknown>>,
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['assetSet']>>> {
        return new Lumen24WriteFacade(projectRoot).assetSet(assetRelativePath, props);
    }

    /**
     * @description 绑控制器。
     */
    public static async bindController(
        projectRoot: string,
        input: Parameters<Lumen24WriteFacade['bindController']>[0],
    ): Promise<Record<string, unknown>> {
        return new Lumen24WriteFacade(projectRoot).bindController(input);
    }

    /**
     * @description 打开场景页签。
     */
    public static async openScene(
        projectRoot: string,
        sceneRelativePath: string,
    ): Promise<Record<string, unknown>> {
        return new Lumen24WriteFacade(projectRoot).openScene(sceneRelativePath);
    }

    /**
     * @description AssetDB 建目录。
     * @param projectRoot 工程根
     * @param relativePath 相对目录
     * @returns 建目录结果
     */
    public static async createFolder(
        projectRoot: string,
        relativePath: string,
    ): Promise<ILumen24CreateFolderResult> {
        return new Lumen24WriteFacade(projectRoot).createFolder(relativePath);
    }

    /**
     * @description 2.4 ensure SpriteFrame（meta.type=sprite + refresh）。
     * @param projectRoot 工程根
     * @param dbPaths db 路径
     * @returns 结果
     */
    public static async ensureSpriteFrames(
        projectRoot: string,
        dbPaths: readonly string[],
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['ensureSpriteFrames']>>> {
        return new Lumen24WriteFacade(projectRoot).ensureSpriteFrames(dbPaths);
    }

    /**
     * @description 2.4 AssetDB import。
     * @param projectRoot 工程根
     * @param absoluteSources 绝对路径
     * @param destDbUrl 目标
     * @returns 结果
     */
    public static async importAssets(
        projectRoot: string,
        absoluteSources: readonly string[],
        destDbUrl: string,
    ): Promise<Awaited<ReturnType<Lumen24WriteFacade['importAssets']>>> {
        return new Lumen24WriteFacade(projectRoot).importAssets(absoluteSources, destDbUrl);
    }
}

/**
 * @description 兼容旧名；新代码优先用 {@link Lumen24McpBridge}。
 */
export const EditorMcpLumen24Bridge = Lumen24McpBridge;

