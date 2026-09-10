/**
 * @description lumen MCP 输入编解码：未受信 payload → 契约输入（从 lumen-gateway peel）。
 */
import type {
    ContractPayload,
    ILumenAssetSetMcpInput,
    ILumenBindClickMcpInput,
    ILumenBindSpriteMcpInput,
    ILumenBindSpriteBatchMcpInput,
    ILumenBindRefMcpInput,
    ILumenValidateRefsMcpInput,
    ILumenCompAddMcpInput,
    ILumenCompRmMcpInput,
    ILumenCompSetMcpInput,
    ILumenInspectMcpInput,
    ILumenNodeAddMcpInput,
    ILumenNodeRenameMcpInput,
    ILumenNodeReorderMcpInput,
    ILumenNodeRmMcpInput,
    ILumenNodeSetMcpInput,
    ILumenPrefabMcpInput,
    ILumenRefreshMcpInput,
    ILumenScaffoldMcpInput,
    ILumenSchemaMcpInput,
    ILumenStructureMcpInput,
    ILumenCompileRecipeMcpInput,
    ILumenTemplatesMcpInput,
    ILumenCocosInfoMcpInput,
} from 'peanut-contracts';
import { LumenHierarchyEntry, type ILumenNodeRecipe } from '@peanut/cocos-lumen';

/**
 * @description lumen 操作输入校验与收窄。
 */
export class EditorMcpLumenInputCodec {
    /**
     * @description 解析 lumen.schema 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readSchemaInput(input: ContractPayload | undefined): ILumenSchemaMcpInput {
        const record = this._requireRecord(input, false);
        this._assertOnlyFields(record, ['type', 'cocosVersion'], 'schema');
        return {
            type: this._readOptionalString(record.type, 'type'),
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
        };
    }

    /**
     * @description 解析 lumen.templates 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readTemplatesInput(input: ContractPayload | undefined): ILumenTemplatesMcpInput {
        const record = this._requireRecord(input, false);
        this._assertOnlyFields(record, ['cocosVersion'], 'templates');
        return {
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
        };
    }

    /**
     * @description 解析 prefab 路径类输入（tree 等）。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readPrefabInput(input: ContractPayload | undefined): ILumenPrefabMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(record, ['prefabRelativePath', 'assetRelativePath', 'cocosVersion'], 'prefab');
        return {
            prefabRelativePath: this.readAssetPath(record),
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
        };
    }

    /**
     * @description 解析 lumen.inspect 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readInspectInput(input: ContractPayload | undefined): ILumenInspectMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(record, ['prefabRelativePath', 'assetRelativePath', 'nodePath', 'region', 'cocosVersion'], 'inspect');
        const nodePathRaw = this._readOptionalString(record.nodePath, 'nodePath');
        const nodePath = nodePathRaw == null ? undefined : nodePathRaw.startsWith('/') ? nodePathRaw : `/${nodePathRaw}`;
        const region = this._readOptionalRegion(record.region);
        return {
            prefabRelativePath: this.readAssetPath(record),
            ...(nodePath != null ? { nodePath } : {}),
            ...(region != null ? { region } : {}),
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
        };
    }

    /**
     * @description 解析 lumen.scaffold 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readScaffoldInput(input: ContractPayload | undefined): ILumenScaffoldMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(
            record,
            ['prefabRelativePath', 'assetRelativePath', 'rootName', 'template', 'cocosVersion', 'autoCommit', 'reset'],
            'scaffold',
        );
        return {
            prefabRelativePath: this.readAssetPath(record),
            rootName: this._readOptionalString(record.rootName, 'rootName'),
            template: this._readOptionalString(record.template, 'template'),
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
            ...(record.reset === true ? { reset: true } : {}),
        };
    }

    /**
     * @description 解析 lumen.structure 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readStructureInput(input: ContractPayload | undefined): ILumenStructureMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(record, ['prefabRelativePath', 'parentPath', 'recipe', 'cocosVersion', 'autoCommit'], 'structure');
        const recipe = record.recipe;
        if (recipe == null || (typeof recipe !== 'object' && !Array.isArray(recipe))) {
            throw new Error('editor_mcp_lumen_structure_recipe_invalid');
        }
        this._assertRecipeShape(recipe);
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(record.prefabRelativePath, 'prefabRelativePath'),
            parentPath: this._readRequiredNodePath(record.parentPath, 'parentPath'),
            recipe,
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
        };
    }

    /**
     * @description 读取内存配方编译输入。
     * @param input 未受信输入
     * @returns 已校验输入
     */
    public readCompileRecipeInput(input: ContractPayload | undefined): ILumenCompileRecipeMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(
            record,
            ['prefabRelativePath', 'rootName', 'mode', 'recipe', 'recipes', 'rootContentSize', 'rootAnchorPoint'],
            'compileRecipe',
        );
        const mode = record.mode;
        if (mode !== 'replaceRoot' && mode !== 'appendChildren') {
            throw new Error('editor_mcp_lumen_compile_mode_invalid');
        }
        const rootName = this._readRequiredString(record.rootName, 'rootName');
        if (mode === 'replaceRoot') {
            this._assertRecipeShape(record.recipe);
            return {
                prefabRelativePath: this._readRequiredProjectRelativePath(record.prefabRelativePath, 'prefabRelativePath'),
                rootName,
                mode,
                recipe: record.recipe,
            };
        }
        if (!Array.isArray(record.recipes)) {
            throw new Error('editor_mcp_lumen_compile_recipes_invalid');
        }
        for (const item of record.recipes) {
            this._assertRecipeShape(item);
        }
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(record.prefabRelativePath, 'prefabRelativePath'),
            rootName,
            mode,
            recipes: record.recipes,
            rootContentSize: this._readOptionalSize(record.rootContentSize, 'rootContentSize'),
            rootAnchorPoint: this._readOptionalPoint(record.rootAnchorPoint, 'rootAnchorPoint'),
        };
    }

    /**
     * @description 解析 lumen.nodeAdd 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readNodeAddInput(input: ContractPayload | undefined): ILumenNodeAddMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(record, ['prefabRelativePath', 'parentPath', 'template', 'name', 'cocosVersion', 'autoCommit'], 'nodeAdd');
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(record.prefabRelativePath, 'prefabRelativePath'),
            parentPath: this._readRequiredNodePath(record.parentPath, 'parentPath'),
            template: this._readRequiredString(record.template, 'template'),
            name: this._readOptionalString(record.name, 'name'),
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
        };
    }

    /**
     * @description 解析 lumen.nodeRm 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readNodeRmInput(input: ContractPayload | undefined): ILumenNodeRmMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(record, ['prefabRelativePath', 'nodePath', 'cocosVersion', 'autoCommit'], 'nodeRm');
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(record.prefabRelativePath, 'prefabRelativePath'),
            nodePath: this._readRequiredNodePath(record.nodePath, 'nodePath'),
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
        };
    }

    /**
     * @description 解析 lumen.nodeRename 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readNodeRenameInput(input: ContractPayload | undefined): ILumenNodeRenameMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(record, ['prefabRelativePath', 'nodePath', 'name', 'cocosVersion', 'autoCommit'], 'nodeRename');
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(record.prefabRelativePath, 'prefabRelativePath'),
            nodePath: this._readRequiredNodePath(record.nodePath, 'nodePath'),
            name: this._readRequiredString(record.name, 'name'),
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
        };
    }

    /**
     * @description 解析 lumen.nodeReorder 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readNodeReorderInput(input: ContractPayload | undefined): ILumenNodeReorderMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(
            record,
            ['prefabRelativePath', 'parentPath', 'childName', 'index', 'cocosVersion', 'autoCommit'],
            'nodeReorder',
        );
        if (typeof record.index !== 'number' || !Number.isInteger(record.index) || record.index < 0) {
            throw new Error('editor_mcp_lumen_nodeReorder_index_invalid');
        }
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(record.prefabRelativePath, 'prefabRelativePath'),
            parentPath: this._readRequiredNodePath(record.parentPath, 'parentPath'),
            childName: this._readRequiredString(record.childName, 'childName'),
            index: record.index,
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
        };
    }

    /**
     * @description 解析 lumen.compAdd 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readCompAddInput(input: ContractPayload | undefined): ILumenCompAddMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(
            record,
            ['prefabRelativePath', 'nodePath', 'builtinType', 'scriptName', 'cocosVersion', 'autoCommit'],
            'compAdd',
        );
        const builtinType = this._readOptionalString(record.builtinType, 'builtinType');
        const scriptName = this._readOptionalString(record.scriptName, 'scriptName');
        if ((builtinType == null) === (scriptName == null)) {
            throw new Error('editor_mcp_lumen_compAdd_requires_exactly_one_of_builtinType_or_scriptName');
        }
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(record.prefabRelativePath, 'prefabRelativePath'),
            nodePath: this._readRequiredNodePath(record.nodePath, 'nodePath'),
            builtinType,
            scriptName,
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
        };
    }

    /**
     * @description 解析 lumen.compRm 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readCompRmInput(input: ContractPayload | undefined): ILumenCompRmMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(record, ['prefabRelativePath', 'nodePath', 'componentType', 'cocosVersion', 'autoCommit'], 'compRm');
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(record.prefabRelativePath, 'prefabRelativePath'),
            nodePath: this._readRequiredNodePath(record.nodePath, 'nodePath'),
            componentType: this._readRequiredString(record.componentType, 'componentType'),
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
        };
    }

    /**
     * @description 解析 lumen.compSet 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readCompSetInput(input: ContractPayload | undefined): ILumenCompSetMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(
            record,
            ['prefabRelativePath', 'nodePath', 'componentType', 'props', 'cocosVersion', 'autoCommit'],
            'compSet',
        );
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(record.prefabRelativePath, 'prefabRelativePath'),
            nodePath: this._readRequiredNodePath(record.nodePath, 'nodePath'),
            componentType: this._readRequiredString(record.componentType, 'componentType'),
            props: this._readPropsObject(record.props, 'props'),
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
        };
    }

    /**
     * @description 读取 `lumen.assetSet` 输入。
     * @param input 未受信输入
     * @returns 校验后的补丁
     */
    public readAssetSetInput(input: ContractPayload | undefined): ILumenAssetSetMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(record, ['prefabRelativePath', 'assetRelativePath', 'props', 'cocosVersion', 'autoCommit'], 'assetSet');
        return {
            prefabRelativePath: this.readAssetPath(record),
            props: this._readPropsObject(record.props, 'props'),
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
        };
    }

    /**
     * @description 解析 lumen.nodeSet 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readNodeSetInput(input: ContractPayload | undefined): ILumenNodeSetMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(record, ['prefabRelativePath', 'nodePath', 'props', 'cocosVersion', 'autoCommit'], 'nodeSet');
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(record.prefabRelativePath, 'prefabRelativePath'),
            nodePath: this._readRequiredNodePath(record.nodePath, 'nodePath'),
            props: this._readPropsObject(record.props, 'props'),
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
        };
    }

    /**
     * @description 解析 lumen.bindClick 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readBindClickInput(input: ContractPayload | undefined): ILumenBindClickMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(
            record,
            [
                'prefabRelativePath',
                'buttonNodePath',
                'targetNodePath',
                'component',
                'handler',
                'customEventData',
                'cocosVersion',
                'autoCommit',
            ],
            'bindClick',
        );
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(record.prefabRelativePath, 'prefabRelativePath'),
            buttonNodePath: this._readRequiredNodePath(record.buttonNodePath, 'buttonNodePath'),
            targetNodePath: this._readRequiredNodePath(record.targetNodePath, 'targetNodePath'),
            component: this._readRequiredString(record.component, 'component'),
            handler: this._readRequiredString(record.handler, 'handler'),
            customEventData: this._readOptionalString(record.customEventData, 'customEventData'),
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
        };
    }

    /**
     * @description 解析 lumen.bindSprite 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readBindSpriteInput(input: ContractPayload | undefined): ILumenBindSpriteMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(record, ['prefabRelativePath', 'nodePath', 'spriteFrameUuid', 'cocosVersion', 'autoCommit'], 'bindSprite');
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(record.prefabRelativePath, 'prefabRelativePath'),
            nodePath: this._readRequiredNodePath(record.nodePath, 'nodePath'),
            spriteFrameUuid: this._readRequiredString(record.spriteFrameUuid, 'spriteFrameUuid'),
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
        };
    }

    /**
     * @description 解析 lumen.bindSpriteBatch 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readBindSpriteBatchInput(input: ContractPayload | undefined): ILumenBindSpriteBatchMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(
            record,
            ['prefabRelativePath', 'assetRelativePath', 'bindings', 'cocosVersion', 'autoCommit'],
            'bindSpriteBatch',
        );
        const bindingsRaw = record.bindings;
        if (!Array.isArray(bindingsRaw) || bindingsRaw.length === 0) {
            throw new Error('editor_mcp_lumen_bind_sprite_batch_empty');
        }
        const bindings = bindingsRaw.map((item, index) => {
            if (item == null || typeof item !== 'object' || Array.isArray(item)) {
                throw new Error(`editor_mcp_lumen_bind_sprite_batch_item_invalid:${index}`);
            }
            const binding = item as Record<string, unknown>;
            return {
                nodePath: this._readRequiredNodePath(binding.nodePath, `bindings[${index}].nodePath`),
                spriteFrameUuid: this._readRequiredString(binding.spriteFrameUuid, `bindings[${index}].spriteFrameUuid`),
            };
        });
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(
                record.prefabRelativePath ?? record.assetRelativePath,
                'prefabRelativePath',
            ),
            bindings,
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
        };
    }

    /**
     * @description 解析 lumen.bindRef 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readBindRefInput(input: ContractPayload | undefined): ILumenBindRefMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(
            record,
            [
                'prefabRelativePath',
                'assetRelativePath',
                'nodePath',
                'componentType',
                'field',
                'nodeRef',
                'componentRef',
                'cocosVersion',
                'autoCommit',
            ],
            'bindRef',
        );
        let componentRef: ILumenBindRefMcpInput['componentRef'];
        if (record.componentRef != null) {
            if (typeof record.componentRef !== 'object' || Array.isArray(record.componentRef)) {
                throw new Error('editor_mcp_lumen_bind_ref_componentRef_invalid');
            }
            const ref = record.componentRef as Record<string, unknown>;
            componentRef = {
                nodePath: this._readRequiredNodePath(ref.nodePath, 'componentRef.nodePath'),
                type: this._readRequiredString(ref.type, 'componentRef.type'),
            };
        }
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(
                record.prefabRelativePath ?? record.assetRelativePath,
                'prefabRelativePath',
            ),
            nodePath: this._readRequiredNodePath(record.nodePath, 'nodePath'),
            componentType: this._readRequiredString(record.componentType, 'componentType'),
            field: this._readRequiredString(record.field, 'field'),
            nodeRef: this._readOptionalString(record.nodeRef, 'nodeRef'),
            componentRef,
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            autoCommit: this._readOptionalAutoCommit(record.autoCommit),
        };
    }

    /**
     * @description 解析 lumen.validateRefs 输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readValidateRefsInput(input: ContractPayload | undefined): ILumenValidateRefsMcpInput {
        const record = this._requireRecord(input, true);
        this._assertOnlyFields(record, ['prefabRelativePath', 'assetRelativePath'], 'validateRefs');
        return {
            prefabRelativePath: this._readRequiredProjectRelativePath(
                record.prefabRelativePath ?? record.assetRelativePath,
                'prefabRelativePath',
            ),
        };
    }

    /**
     * @description 解析 lumen.refresh / commit 路径输入。
     * @param input 未受信输入。
     * @returns 已校验结果。
     */
    public readRefreshInput(input: ContractPayload | undefined): ILumenRefreshMcpInput {
        const record = this._requireRecord(input, false);
        this._assertOnlyFields(record, ['paths', 'prefabRelativePath', 'assetRelativePath'], 'refresh');
        /** @type {string[]} */
        const paths: string[] = [];
        if (record.paths != null) {
            if (!Array.isArray(record.paths)) {
                throw new Error('editor_mcp_lumen_refresh_paths_invalid');
            }
            for (let index = 0; index < record.paths.length; index += 1) {
                const item = record.paths[index];
                if (typeof item !== 'string' || item.trim().length === 0) {
                    throw new Error(`editor_mcp_lumen_refresh_paths_invalid:${index}`);
                }
                paths.push(this._readRequiredProjectRelativePath(item, `paths[${index}]`));
            }
        }
        if (record.prefabRelativePath != null || record.assetRelativePath != null) {
            const single = this.readAssetPath(record);
            if (!paths.includes(single)) {
                paths.push(single);
            }
        }
        return paths.length > 0 ? { paths } : {};
    }

    /**
     * @description 解析 `lumen.cocosInfo` 输入（含缺口分页）。
     * @param input 未受信 payload
     * @returns 已校验输入
     */
    public readCocosInfoInput(input: ContractPayload | undefined): ILumenCocosInfoMcpInput {
        const record = this._requireRecord(input, false);
        this._assertOnlyFields(record, ['engineRoot', 'cocosVersion', 'gapOffset', 'gapLimit'], 'cocosInfo');
        return {
            engineRoot: this._readOptionalEngineRoot(record.engineRoot),
            cocosVersion: this._readOptionalString(record.cocosVersion, 'cocosVersion'),
            gapOffset: this._readOptionalGapInt(record.gapOffset, 'gapOffset'),
            gapLimit: this._readOptionalGapInt(record.gapLimit, 'gapLimit'),
        };
    }

    /**
     * @description 读取可选非负整数分页字段。
     * @param value 未受信输入
     * @param fieldName 字段名
     * @returns 整数或省略
     */
    private _readOptionalGapInt(value: unknown, fieldName: string): number | undefined {
        if (value == null) {
            return undefined;
        }
        if (typeof value !== 'number' || !Number.isInteger(value)) {
            throw new Error(`editor_mcp_lumen_${fieldName}_invalid`);
        }
        return value;
    }

    private _readOptionalAutoCommit(value: unknown): boolean | undefined {
        if (value == null) {
            return undefined;
        }
        if (typeof value !== 'boolean') {
            throw new Error('editor_mcp_lumen_autoCommit_invalid');
        }
        return value;
    }

    private _readOptionalEngineRoot(value: unknown): string | undefined {
        if (value == null) {
            return undefined;
        }
        if (typeof value !== 'string' || value.trim().length === 0) {
            throw new Error('editor_mcp_lumen_engineRoot_invalid');
        }
        const trimmed = value.trim();
        if (trimmed.split(/[\\/]/).some((segment) => segment === '..')) {
            throw new Error('editor_mcp_lumen_engineRoot_path_traversal');
        }
        return trimmed;
    }

    private _assertRecipeShape(value: unknown): void {
        if (Array.isArray(value)) {
            for (const item of value) {
                this._assertOneRecipe(item);
            }
            return;
        }
        this._assertOneRecipe(value);
    }

    /**
     * @description 将已校验配方收窄为节点配方。
     * @param value 未受信配方
     * @returns 节点配方
     */
    public asNodeRecipe(value: unknown): ILumenNodeRecipe {
        this._assertOneRecipe(value);
        if (typeof value !== 'object' || value == null || Array.isArray(value)) {
            throw new Error('editor_mcp_lumen_structure_recipe_invalid');
        }
        return value as ILumenNodeRecipe;
    }

    /**
     * @description 将已校验配方列表收窄。
     * @param value 未受信列表
     * @returns 节点配方列表
     */
    public asNodeRecipeList(value: readonly unknown[] | undefined): readonly ILumenNodeRecipe[] {
        if (value == null) {
            return [];
        }
        return value.map((item) => this.asNodeRecipe(item));
    }

    /**
     * @description 读取可选宽高。
     * @param value 未受信值
     * @param fieldName 字段名
     * @returns 宽高或省略
     */
    private _readOptionalSize(value: unknown, fieldName: string): Readonly<{ width: number; height: number }> | undefined {
        if (value == null) {
            return undefined;
        }
        if (typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`editor_mcp_lumen_${fieldName}_invalid`);
        }
        const record = value as Record<string, unknown>;
        if (
            typeof record.width !== 'number' ||
            typeof record.height !== 'number' ||
            !Number.isFinite(record.width) ||
            !Number.isFinite(record.height)
        ) {
            throw new Error(`editor_mcp_lumen_${fieldName}_invalid`);
        }
        return { width: record.width, height: record.height };
    }

    /**
     * @description 读取可选锚点。
     * @param value 未受信值
     * @param fieldName 字段名
     * @returns 锚点或省略
     */
    private _readOptionalPoint(value: unknown, fieldName: string): Readonly<{ x: number; y: number }> | undefined {
        if (value == null) {
            return undefined;
        }
        if (typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`editor_mcp_lumen_${fieldName}_invalid`);
        }
        const record = value as Record<string, unknown>;
        if (typeof record.x !== 'number' || typeof record.y !== 'number' || !Number.isFinite(record.x) || !Number.isFinite(record.y)) {
            throw new Error(`editor_mcp_lumen_${fieldName}_invalid`);
        }
        return { x: record.x, y: record.y };
    }

    private _assertOneRecipe(value: unknown): void {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('editor_mcp_lumen_structure_recipe_invalid');
        }
        const record = value as Record<string, unknown>;
        if (typeof record.name !== 'string' || record.name.trim().length === 0) {
            throw new Error('editor_mcp_lumen_structure_recipe_name_required');
        }
        if (record.template != null && typeof record.template !== 'string') {
            throw new Error('editor_mcp_lumen_structure_recipe_template_invalid');
        }
        if (record.children != null) {
            if (!Array.isArray(record.children)) {
                throw new Error('editor_mcp_lumen_structure_recipe_children_invalid');
            }
            for (const child of record.children) {
                this._assertOneRecipe(child);
            }
        }
    }

    private _requireRecord(input: ContractPayload | undefined, required: boolean): ContractPayload {
        if (input == null) {
            if (required) {
                throw new Error('editor_mcp_lumen_input_required');
            }
            return {};
        }
        if (typeof input !== 'object' || Array.isArray(input)) {
            throw new Error('editor_mcp_invalid_operation_input');
        }
        return input;
    }

    private _assertOnlyFields(input: ContractPayload, allowed: readonly string[], operationLabel: string): void {
        const allowedSet = new Set(allowed);
        for (const fieldName of Object.keys(input)) {
            if (!allowedSet.has(fieldName)) {
                throw new Error(`editor_mcp_lumen_${operationLabel}_field_unsupported:${fieldName}`);
            }
        }
    }

    private _readOptionalString(value: unknown, fieldName: string): string | undefined {
        if (value == null) {
            return undefined;
        }
        if (typeof value !== 'string' || value.trim().length === 0) {
            throw new Error(`editor_mcp_lumen_${fieldName}_invalid`);
        }
        return value.trim();
    }

    private _readRequiredString(value: unknown, fieldName: string): string {
        const parsed = this._readOptionalString(value, fieldName);
        if (parsed == null) {
            throw new Error(`editor_mcp_lumen_${fieldName}_required`);
        }
        return parsed;
    }

    private _readRequiredNodePath(value: unknown, fieldName: string): string {
        const path = this._readRequiredString(value, fieldName);
        return path.startsWith('/') ? path : `/${path}`;
    }

    /**
     * @description 读取 `prefabRelativePath` 或别名 `assetRelativePath`。
     * @param record 输入对象
     * @returns 项目相对路径
     */
    public readAssetPath(record: ContractPayload): string {
        const prefabPath = record.prefabRelativePath;
        const assetPath = record.assetRelativePath;
        if (prefabPath != null && assetPath != null && prefabPath !== assetPath) {
            throw new Error('editor_mcp_lumen_path_conflict');
        }
        const value = prefabPath ?? assetPath;
        return this._readRequiredProjectRelativePath(value, 'prefabRelativePath');
    }

    /**
     * @description 由扩展名推断资产种类。
     * @param relativePath 相对路径
     * @returns kind
     */
    public kindFromPath(relativePath: string): string {
        return LumenHierarchyEntry.assetKindFromPath(relativePath);
    }

    private _readRequiredProjectRelativePath(value: unknown, fieldName: string): string {
        if (typeof value !== 'string' || value.trim().length === 0) {
            throw new Error(`editor_mcp_lumen_${fieldName}_required`);
        }
        let normalizedPath = value.trim().split('\\').join('/');
        // 允许误传 db://assets/...，归一成项目相对路径。
        if (normalizedPath.startsWith('db://')) {
            normalizedPath = normalizedPath.slice('db://'.length);
        }
        normalizedPath = normalizedPath.replace(/^\/+/u, '');
        if (
            normalizedPath.startsWith('/') ||
            /^[a-zA-Z]:/.test(normalizedPath) ||
            normalizedPath.split('/').some((segment) => segment.length === 0 || segment === '..')
        ) {
            throw new Error(`editor_mcp_lumen_${fieldName}_not_project_relative`);
        }
        return normalizedPath;
    }

    private _readPropsObject(value: unknown, fieldName: string): Readonly<Record<string, unknown>> {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`editor_mcp_lumen_${fieldName}_invalid`);
        }
        return value as Readonly<Record<string, unknown>>;
    }

    /**
     * @description 读取可选地形 region。
     * @param value 未受信输入
     * @returns 区域对象或省略
     */
    private _readOptionalRegion(value: unknown): Readonly<Record<string, unknown>> | undefined {
        if (value == null) {
            return undefined;
        }
        return this._readPropsObject(value, 'region');
    }
}
