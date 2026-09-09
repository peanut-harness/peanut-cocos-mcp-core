import { CoreCocosNativeWriteCapabilityCatalog, type CoreCocosNativeWriteOperation } from './core-cocos-native-write-capability-catalog.js';
import type { ICoreMcpJsonSchema } from './core-cocos-mcp-read-tool-schema-catalog.js';

/**
 * @description 已完成精确入参迁移的 Cocos 原生写工具 schema。
 * 该批覆盖编辑器选区、资产、场景和 Prefab 原生写入；其它写入族会按执行适配器成熟度继续加入。
 */
export class CoreCocosNativeWriteToolSchemaCatalog {
    private static readonly schemas: ReadonlyMap<CoreCocosNativeWriteOperation, ICoreMcpJsonSchema> = CoreCocosNativeWriteToolSchemaCatalog.buildSchemas();

    public find(operation: unknown): ICoreMcpJsonSchema | null {
        const capability = CoreCocosNativeWriteCapabilityCatalog.find(operation);
        return capability == null ? null : (CoreCocosNativeWriteToolSchemaCatalog.schemas.get(capability.operation) ?? null);
    }

    public operations(): readonly CoreCocosNativeWriteOperation[] {
        return Object.freeze([...CoreCocosNativeWriteToolSchemaCatalog.schemas.keys()]);
    }

    private static buildSchemas(): ReadonlyMap<CoreCocosNativeWriteOperation, ICoreMcpJsonSchema> {
        const schemas = new Map<CoreCocosNativeWriteOperation, ICoreMcpJsonSchema>();
        const control = (): Readonly<Record<string, ICoreMcpJsonSchema>> => ({ approvalId: this.string('本地审批租约 ID。') });
        schemas.set('editor.setSelection', this.object({ paths: this.stringArray('节点路径列表（优先）。'), ids: this.stringArray('节点 uuid / id 列表。'), clear: this.boolean('为 true 时清空选区。'), ...control() }));
        schemas.set('asset.catalog.refresh', this.object(control()));
        schemas.set('asset.importPlan', this.object({ sources: this.stringArray('待分析的源文件路径列表。'), dependencyMap: this.freeObject('显式依赖表。'), expandClosure: this.boolean('是否从磁盘展开依赖闭包；默认 true。') }, ['sources']));
        schemas.set('asset.import', this.object({ sources: this.stringArray('待导入的源文件路径列表。'), target: this.string('目标 db://assets/... 目录。'), mode: this.string('覆盖模式；override 等价 overwrite:true。'), overwrite: this.boolean('是否覆盖已有资源（destructive）。'), dependencyMap: this.freeObject('显式依赖表。'), concurrency: this.integer('层内并发度（1–8）。'), refreshAfter: this.boolean('层后是否刷新并等待 AssetDB；默认 true。'), allowMissingDependencies: this.boolean('是否允许缺失依赖继续；默认 false。'), expandClosure: this.boolean('是否展开依赖闭包；默认 true。'), planId: this.string('asset.importPlan 返回的 planId；受管模式建议提供。'), ...control() }, ['sources', 'target']));
        schemas.set('asset.managedStatus', this.object({ targets: this.stringArray('目标 db://assets/... 路径列表。') }, ['targets']));
        schemas.set('asset.replaceReferences', this.object({ fromUuid: this.string('被替换 uuid（可带 @sub）。'), toUuid: this.string('目标 uuid（可带 @sub）。'), pathContains: this.string('路径子串过滤。'), dryRun: this.boolean('只报告不写盘。'), allowMissingTarget: this.boolean('允许目标 uuid 不在 catalog。'), refreshIndex: this.boolean('强制重建依赖索引。'), ...control() }, ['fromUuid', 'toUuid']));
        schemas.set('asset.open', this.object({ uuid: this.string('标准或压缩 uuid。'), path: this.string('db:// 或相对路径。'), url: this.string('与 path 同义。') }));
        schemas.set('asset.copy', this.object({ paths: this.stringArray('待复制资源相对路径列表（种子；依赖闭包会一并复制并换新 uuid）。'), targetDirectory: this.string('复制产物根目录（db://assets/... 或工程相对路径）。'), ...control() }, ['paths', 'targetDirectory']));
        schemas.set('asset.move', this.object({ from: this.string('源相对路径（文件或文件夹）。'), to: this.string('目标相对路径；不得已存在。'), ...control() }, ['from', 'to']));
        schemas.set('asset.rename', this.object({ path: this.string('待重命名资源相对路径（文件或文件夹）。'), newName: this.string('新文件/文件夹名（不含路径分隔符）。'), ...control() }, ['path', 'newName']));
        schemas.set('asset.createFolder', this.object({ path: this.string('待创建文件夹相对路径；缺失的父目录会一并创建。'), ...control() }, ['path']));
        schemas.set('asset.delete', this.object({ paths: this.stringArray('待删除资源相对路径列表（文件或文件夹，递归）。'), ...control() }, ['paths']));
        schemas.set('asset.reimport', this.object({ paths: this.stringArray('可选相对路径列表；省略则刷新 db://assets。'), path: this.string('单路径别名；会并入 paths。'), ...control() }));
        schemas.set('asset.writeText', this.object({ path: this.string('单文件相对路径（assets/...）；与 files 二选一。'), content: this.string('单文件 UTF-8 内容；与 path 成对。'), files: { type: 'array', description: '批量文本文件；提供时忽略 path/content。', items: this.object({ path: this.string('相对路径（assets/...）。'), content: this.string('UTF-8 文本。') }, ['path', 'content']) }, ...control() }));
        schemas.set('asset.ensureSpriteFramesBatch', this.object({ dbPaths: this.stringArray('db://assets/... 或 assets/... 的 PNG 路径列表。'), refreshRoot: this.string('可选批量刷新根；省略则逐项 refresh-asset 并等待就绪。'), ...control() }, ['dbPaths']));
        schemas.set('scene.restoreEditorResource', this.object({ uuid: this.string('资源 uuid；与 url 至少一个，或都省略表示恢复「当前」。'), url: this.string('资源 url / db 路径。'), ...control() }));
        schemas.set('scene.open', this.object({ path: this.string('场景 db:// 或项目相对路径。'), ...control() }, ['path']));
        schemas.set('scene.save', this.object({ path: this.string('可选场景路径；省略时保存当前打开场景。'), ...control() }));
        schemas.set('scene.reload', this.object({ soft: this.boolean('是否软重载；默认 true。'), ...control() }));
        schemas.set('scene.focusNode', this.object({ path: this.string('节点路径或 uuid。'), ...control() }, ['path']));
        schemas.set('scene.createNode', this.object({ parentPath: this.string('父节点路径；省略时挂场景根。'), name: this.string('节点名。'), type: this.string('类型提示：empty / Camera / Light 等。'), ...control() }));
        schemas.set('prefab.createFromNode', this.object({ nodePath: this.string('源节点路径或 uuid。'), prefabPath: this.string('目标 Prefab db://assets/.../*.prefab。'), ...control() }, ['nodePath', 'prefabPath']));
        schemas.set('prefab.apply', this.object({ nodePath: this.string('实例根节点路径或 uuid。'), ...control() }, ['nodePath']));
        schemas.set('prefab.revert', this.object({ nodePath: this.string('实例根节点路径或 uuid。'), ...control() }, ['nodePath']));
        schemas.set('prefab.unpack', this.object({ nodePath: this.string('实例根节点路径或 uuid。'), ...control() }, ['nodePath']));
        schemas.set('prefab.unlink', this.object({ nodePath: this.string('实例根节点路径或 uuid。'), ...control() }, ['nodePath']));
        return schemas;
    }

    private static object(properties: Readonly<Record<string, ICoreMcpJsonSchema>>, required: readonly string[] = []): ICoreMcpJsonSchema { return Object.freeze({ type: 'object', properties: Object.freeze({ ...properties }), required: Object.freeze([...required]), additionalProperties: false }); }
    private static string(description: string): ICoreMcpJsonSchema { return Object.freeze({ type: 'string', description }); }
    private static integer(description: string): ICoreMcpJsonSchema { return Object.freeze({ type: 'integer', description }); }
    private static boolean(description: string): ICoreMcpJsonSchema { return Object.freeze({ type: 'boolean', description }); }
    private static stringArray(description: string): ICoreMcpJsonSchema { return Object.freeze({ type: 'array', description, items: this.string('字符串值。') }); }
    private static freeObject(description: string): ICoreMcpJsonSchema { return Object.freeze({ type: 'object', description, additionalProperties: true }); }
}
