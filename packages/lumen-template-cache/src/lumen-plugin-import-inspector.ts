import { existsSync, readFileSync, statSync } from 'fs';
import { dirname, join } from 'path';

import { lumenTemplateCacheContracts as LumenPluginContracts } from './lumen-template-cache-contracts.js';
import { LumenPluginRequestCodec } from './lumen-plugin-request-codec.js';

/**
 * @description 导入源识别结果；只有版本包可写入模板缓存。
 */
export interface ILumenImportInspection {
    /**
     * @description 识别种类。
     */
    readonly kind: string;

    /**
     * @description 用户给出的原始路径。
     */
    readonly path: string;

    /**
     * @description 是否可作为模板版本包导入。
     */
    readonly importable: boolean;

    /**
     * @description 版本包根目录；不可导入时为 null。
     */
    readonly packRoot: string | null;

    /**
     * @description 面板/日志用的提示码。
     */
    readonly hintCode: string;
}

/**
 * @description 识别目录或 JSON 文件：版本包才导入，Prefab / recipe / 其它 JSON 只报告种类。
 */
export class LumenPluginImportInspector {
    /**
     * @description 识别路径指向的内容。
     * @param sourcePath 目录或文件绝对路径
     * @returns 识别结果
     */
    public inspect(sourcePath: string): ILumenImportInspection {
        const trimmed = sourcePath.trim();
        if (trimmed.length === 0 || !existsSync(trimmed)) {
            return this._result('missing', trimmed, false, null, LumenPluginContracts.importHint.missing);
        }
        const stat = statSync(trimmed);
        if (stat.isDirectory()) {
            return this._inspectDirectory(trimmed);
        }
        if (!stat.isFile()) {
            return this._result('unreadable', trimmed, false, null, LumenPluginContracts.importHint.unreadable);
        }
        return this._inspectFile(trimmed);
    }

    /**
     * @description 解析可导入的版本包根；无法导入时抛错。
     * @param sourcePath 目录或清单 JSON 路径
     * @returns 版本包根
     */
    public resolvePackRoot(sourcePath: string): string {
        const inspection = this.inspect(sourcePath);
        if (!inspection.importable || inspection.packRoot == null) {
            throw new Error(`${LumenPluginContracts.importUnsupported}:${inspection.hintCode}`);
        }
        return inspection.packRoot;
    }

    /**
     * @description 识别版本包目录。
     * @param directoryPath 目录
     * @returns 识别结果
     */
    private _inspectDirectory(directoryPath: string): ILumenImportInspection {
        const manifestPath = join(directoryPath, LumenPluginContracts.manifestFile);
        const templatesPath = join(directoryPath, LumenPluginContracts.templateDir);
        const hasManifest = existsSync(manifestPath) && statSync(manifestPath).isFile();
        const hasTemplates = existsSync(templatesPath) && statSync(templatesPath).isDirectory();
        if (hasManifest && hasTemplates) {
            return this._result('version-pack', directoryPath, true, directoryPath, LumenPluginContracts.importHint.versionPack);
        }
        return this._result('incomplete-pack', directoryPath, false, null, LumenPluginContracts.importHint.incompletePack);
    }

    /**
     * @description 尝试把文件当 JSON 解析并分类。
     * @param filePath 文件
     * @returns 识别结果
     */
    private _inspectFile(filePath: string): ILumenImportInspection {
        let parsed: unknown;
        try {
            parsed = JSON.parse(readFileSync(filePath, 'utf8'));
        } catch {
            return this._result('not-json', filePath, false, null, LumenPluginContracts.importHint.notJson);
        }
        if (this._isTemplateManifest(parsed)) {
            const packRoot = dirname(filePath);
            const templatesPath = join(packRoot, LumenPluginContracts.templateDir);
            if (existsSync(templatesPath) && statSync(templatesPath).isDirectory()) {
                return this._result('template-manifest', filePath, true, packRoot, LumenPluginContracts.importHint.templateManifest);
            }
            return this._result('incomplete-pack', filePath, false, null, LumenPluginContracts.importHint.incompletePack);
        }
        if (this._isCreatorPrefab(parsed)) {
            return this._result('creator-prefab', filePath, false, null, LumenPluginContracts.importHint.creatorPrefab);
        }
        if (this._isLumenRecipe(parsed)) {
            return this._result('lumen-recipe', filePath, false, null, LumenPluginContracts.importHint.lumenRecipe);
        }
        return this._result('json', filePath, false, null, LumenPluginContracts.importHint.jsonUnknown);
    }

    /**
     * @description 是否为模板缓存清单。
     * @param value 解析后的 JSON
     * @returns 是否清单
     */
    private _isTemplateManifest(value: unknown): boolean {
        const record = LumenPluginRequestCodec.readOptionalRecord(value);
        if (record == null) {
            return false;
        }
        return (
            LumenPluginRequestCodec.readNonEmptyString(record.packageVersion) != null &&
            LumenPluginRequestCodec.readNonEmptyString(record.contentHash) != null &&
            typeof record.templateCount === 'number' &&
            Number.isFinite(record.templateCount) &&
            typeof record.generatedAt === 'string'
        );
    }

    /**
     * @description 是否为 Creator Prefab 序列化数组。
     * @param value 解析后的 JSON
     * @returns 是否 Prefab
     */
    private _isCreatorPrefab(value: unknown): boolean {
        if (!Array.isArray(value) || value.length === 0) {
            return false;
        }
        const first = LumenPluginRequestCodec.readOptionalRecord(value[0]);
        return first != null && LumenPluginRequestCodec.readNonEmptyString(first.__type__) != null;
    }

    /**
     * @description 是否为 lumen recipe 节点对象。
     * @param value 解析后的 JSON
     * @returns 是否 recipe
     */
    private _isLumenRecipe(value: unknown): boolean {
        const record = LumenPluginRequestCodec.readOptionalRecord(value);
        if (record == null || LumenPluginRequestCodec.readNonEmptyString(record.name) == null) {
            return false;
        }
        return (
            LumenPluginRequestCodec.readNonEmptyString(record.template) != null ||
            Array.isArray(record.components) ||
            Array.isArray(record.children)
        );
    }

    /**
     * @description 组装识别结果。
     * @param kind 种类
     * @param pathValue 路径
     * @param importable 可否导入
     * @param packRoot 版本包根
     * @param hintCode 提示码
     * @returns 结果
     */
    private _result(
        kind: string,
        pathValue: string,
        importable: boolean,
        packRoot: string | null,
        hintCode: string,
    ): ILumenImportInspection {
        return {
            kind,
            path: pathValue,
            importable,
            packRoot,
            hintCode,
        };
    }
}
