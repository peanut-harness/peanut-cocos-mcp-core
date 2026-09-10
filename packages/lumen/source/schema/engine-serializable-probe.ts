/**
 * @description 从引擎 TypeScript 源码提取 `@ccclass` + `@serializable` 字段规格。
 *
 * 轻量文本解析，非完整 AST。用于 Inspector parity 覆盖层，不写回策展表。
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { extname, join } from 'path';

import type { ILumenPropertyFieldSpec, LumenPropertyValueKind } from './component-property';
import { LumenPropertyDenyList } from './deny-list';

/**
 * @description 单份引擎序列化目录（ccclass → 字段）。
 */
export type LumenEngineSerializableCatalog = ReadonlyMap<string, readonly ILumenPropertyFieldSpec[]>;

/**
 * @description 解析结果摘要。
 */
export interface ILumenEngineSerializableLoadResult {
    /**
     * @description 扫描到的 ccclass 数量。
     */
    readonly classCount: number;

    /**
     * @description 含至少一字段的类型数。
     */
    readonly typedCount: number;

    /**
     * @description 读取的源文件数。
     */
    readonly fileCount: number;

    /**
     * @description 字段目录。
     */
    readonly catalog: LumenEngineSerializableCatalog;
}

/**
 * @description 一个 `@ccclass` 块。
 */
interface ILumenEngineClassBlock {
    /**
     * @description 如 `cc.Label`。
     */
    readonly classId: string;

    /**
     * @description 类体文本。
     */
    readonly body: string;
}

/**
 * @description 从引擎 `.ts` 源解析可序列化字段。
 */
export class LumenEngineSerializableProbe {
    /**
     * @description 从引擎根、源目录或单个 `.ts` 加载目录。
     * @param engineRoot 引擎根 / `cocos/` / 文件路径
     * @returns 加载结果
     */
    public static loadFromPath(engineRoot: string): ILumenEngineSerializableLoadResult {
        if (!existsSync(engineRoot)) {
            throw new Error(`lumen_engine_missing:${engineRoot}`);
        }
        const files = statSync(engineRoot).isFile()
            ? [engineRoot]
            : this._listTypeScriptFiles(this._resolveSourceRoot(engineRoot));
        return this._parseFileContents(files.map((filePath) => readFileSync(filePath, 'utf8')), files.length);
    }

    /**
     * @description 解析单份源码（测试用）。
     * @param source TypeScript 文本
     * @returns 目录
     */
    public static parseSource(source: string): LumenEngineSerializableCatalog {
        return this._parseFileContents([source], 1).catalog;
    }

    /**
     * @description 解析多份源码并装配嵌套 objectPatch。
     * @param sources 源码列表
     * @param fileCount 文件数
     * @returns 加载结果
     */
    private static _parseFileContents(
        sources: readonly string[],
        fileCount: number,
    ): ILumenEngineSerializableLoadResult {
        const classIds = new Map<string, string>();
        const parsed: ILumenEngineClassBlock[] = [];
        for (const source of sources) {
            for (const block of this._splitClassBlocks(source)) {
                parsed.push(block);
                classIds.set(this._shortName(block.classId), block.classId);
            }
        }
        const raw = new Map<string, ILumenPropertyFieldSpec[]>();
        for (const block of parsed) {
            const fields = this._parseFields(block.body, classIds);
            if (fields.length === 0) {
                continue;
            }
            raw.set(block.classId, fields);
        }
        const catalog = new Map<string, readonly ILumenPropertyFieldSpec[]>();
        for (const [classId, fields] of raw) {
            catalog.set(
                classId,
                fields.map((field) => this._bindNested(field, raw)),
            );
        }
        return {
            classCount: parsed.length,
            typedCount: catalog.size,
            fileCount,
            catalog,
        };
    }

    /**
     * @description 把 objectPatch 字段的 nestedFields 接到已解析类上。
     * @param field 字段
     * @param raw 类 → 字段
     * @returns 绑定后的字段
     */
    private static _bindNested(
        field: ILumenPropertyFieldSpec,
        raw: ReadonlyMap<string, readonly ILumenPropertyFieldSpec[]>,
    ): ILumenPropertyFieldSpec {
        if (field.kind !== 'objectPatch' || field.embeddedType == null) {
            return field;
        }
        const nested = raw.get(field.embeddedType);
        if (nested == null || nested.length === 0) {
            return field;
        }
        return { ...field, nestedFields: nested };
    }

    /**
     * @description 按 `@ccclass('id')` 切分类块。
     * @param source 源码
     * @returns 类块
     */
    private static _splitClassBlocks(source: string): readonly ILumenEngineClassBlock[] {
        const stripped = source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/.*$/gm, ' ');
        const matcher = /@ccclass\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        const hits: Array<{ readonly classId: string; readonly index: number }> = [];
        let match: RegExpExecArray | null = matcher.exec(stripped);
        while (match != null) {
            const classId = match[1];
            if (classId != null && classId.trim().length > 0) {
                hits.push({ classId: classId.trim(), index: match.index });
            }
            match = matcher.exec(stripped);
        }
        const blocks: ILumenEngineClassBlock[] = [];
        for (let i = 0; i < hits.length; i += 1) {
            const current = hits[i];
            const next = hits[i + 1];
            if (current == null) {
                continue;
            }
            const end = next == null ? stripped.length : next.index;
            blocks.push({ classId: current.classId, body: stripped.slice(current.index, end) });
        }
        return blocks;
    }

    /**
     * @description 解析类块内 `@serializable` 字段。
     * @param body 类体
     * @param classIds 短名 → ccclass id
     * @returns 字段规格
     */
    private static _parseFields(
        body: string,
        classIds: ReadonlyMap<string, string>,
    ): ILumenPropertyFieldSpec[] {
        const chunks = body.split(/@serializable\b/);
        const fields: ILumenPropertyFieldSpec[] = [];
        const used = new Set<string>();
        for (const chunk of chunks.slice(1)) {
            const fieldMatch =
                /(?:public|protected|private)\s+(?:readonly\s+)?([A-Za-z0-9_]+)\s*(?::\s*([^=;{]+?))?\s*(?:=\s*([^;]+))?/.exec(
                    chunk,
                );
            if (fieldMatch == null) {
                continue;
            }
            const serializedName = fieldMatch[1];
            if (serializedName == null || LumenPropertyDenyList.isStructuralKey(serializedName) || used.has(serializedName)) {
                continue;
            }
            const decoratorWindow = chunk.slice(0, fieldMatch.index);
            const typeDecorator = /@type\s*\(\s*['"]?([A-Za-z0-9_.]+)['"]?\s*\)/.exec(decoratorWindow);
            const annotation = fieldMatch[2]?.trim() ?? '';
            const initializer = fieldMatch[3]?.trim() ?? '';
            const typeHint = typeDecorator?.[1] ?? annotation.split('|')[0]?.trim() ?? '';
            const inferred = this._inferSpec(serializedName, typeHint, initializer, classIds);
            if (inferred == null) {
                continue;
            }
            used.add(serializedName);
            fields.push(inferred);
        }
        return fields;
    }

    /**
     * @description 从类型注解 / 初值推断规格。
     * @param serializedName 源码字段名
     * @param typeHint `@type` 或 TS 注解
     * @param initializer 初值文本
     * @param classIds 短名映射
     * @returns 规格或 `null`
     */
    private static _inferSpec(
        serializedName: string,
        typeHint: string,
        initializer: string,
        classIds: ReadonlyMap<string, string>,
    ): ILumenPropertyFieldSpec | null {
        const apiName = this._apiNameFromSerialized(serializedName);
        const hint = this._shortName(typeHint.replace(/^typeof\s+/, '').replace(/<.*>/, '').trim());
        const init = initializer.trim();
        const kindAndEmbed = this._kindFromHint(hint, classIds) ?? this._kindFromInitializer(init, classIds);
        if (kindAndEmbed == null) {
            return null;
        }
        return {
            apiName,
            serializedName,
            kind: kindAndEmbed.kind,
            origin: 'engine',
            ...(kindAndEmbed.embeddedType != null ? { embeddedType: kindAndEmbed.embeddedType } : {}),
        };
    }

    /**
     * @description 从类型名推断 kind。
     * @param hint 短类型名
     * @param classIds 短名映射
     * @returns kind 与可选 embeddedType
     */
    private static _kindFromHint(
        hint: string,
        classIds: ReadonlyMap<string, string>,
    ): { readonly kind: LumenPropertyValueKind; readonly embeddedType?: string } | null {
        if (hint === 'string' || hint === 'String') {
            return { kind: 'string' };
        }
        if (hint === 'number' || hint === 'Number') {
            return { kind: 'number' };
        }
        if (hint === 'boolean' || hint === 'Boolean') {
            return { kind: 'boolean' };
        }
        if (hint === 'Color') {
            return { kind: 'color' };
        }
        if (hint === 'Vec2') {
            return { kind: 'vec2' };
        }
        if (hint === 'Vec3') {
            return { kind: 'vec3' };
        }
        if (hint === 'Size') {
            return { kind: 'size' };
        }
        if (hint === 'Rect') {
            return { kind: 'rect' };
        }
        if (hint === 'CurveRange') {
            return { kind: 'curveRange', embeddedType: 'cc.CurveRange' };
        }
        if (hint === 'GradientRange') {
            return { kind: 'gradientRange', embeddedType: 'cc.GradientRange' };
        }
        if (
            hint === 'Font' ||
            hint === 'SpriteFrame' ||
            hint === 'Material' ||
            hint === 'Texture2D' ||
            hint === 'Prefab' ||
            hint === 'Mesh' ||
            hint === 'AudioClip'
        ) {
            return { kind: 'uuid' };
        }
        const classId = classIds.get(hint);
        if (classId != null) {
            return { kind: 'objectPatch', embeddedType: classId };
        }
        return null;
    }

    /**
     * @description 从初值推断 kind。
     * @param initializer 初值
     * @param classIds 短名映射
     * @returns kind
     */
    private static _kindFromInitializer(
        initializer: string,
        classIds: ReadonlyMap<string, string>,
    ): { readonly kind: LumenPropertyValueKind; readonly embeddedType?: string } | null {
        if (initializer === 'true' || initializer === 'false') {
            return { kind: 'boolean' };
        }
        if (/^['"]/.test(initializer)) {
            return { kind: 'string' };
        }
        if (/^-?\d+(\.\d+)?$/.test(initializer)) {
            return { kind: 'number' };
        }
        const constructed = /^new\s+([A-Za-z0-9_]+)/.exec(initializer);
        const typeName = constructed?.[1];
        if (typeName != null) {
            return this._kindFromHint(typeName, classIds);
        }
        if (initializer === 'null') {
            return null;
        }
        return null;
    }

    /**
     * @description `_string` → `string`。
     * @param serializedName 源码字段名
     * @returns 公开名
     */
    private static _apiNameFromSerialized(serializedName: string): string {
        if (serializedName.startsWith('_') && serializedName.length > 1 && serializedName[1] !== '_') {
            return serializedName.slice(1);
        }
        return serializedName;
    }

    /**
     * @description `cc.Label` → `Label`。
     * @param name 类型名
     * @returns 短名
     */
    private static _shortName(name: string): string {
        const parts = name.split('.');
        const last = parts[parts.length - 1];
        return last == null || last.length === 0 ? name : last;
    }

    /**
     * @description 引擎根下的源码目录。
     * @param engineRoot 输入路径
     * @returns 扫描根
     */
    private static _resolveSourceRoot(engineRoot: string): string {
        const cocos = join(engineRoot, 'cocos');
        if (existsSync(cocos) && statSync(cocos).isDirectory()) {
            return cocos;
        }
        return engineRoot;
    }

    /**
     * @description 列出源码文件（跳过 `.d.ts`）。
     * @param directory 目录
     * @returns 文件路径
     */
    private static _listTypeScriptFiles(directory: string): readonly string[] {
        const out: string[] = [];
        this._walk(directory, out, 0);
        return out;
    }

    /**
     * @description 递归收集 `.ts`。
     * @param directory 目录
     * @param out 输出
     * @param depth 深度
     */
    private static _walk(directory: string, out: string[], depth: number): void {
        if (depth > 24 || out.length > 4000) {
            return;
        }
        const entries = readdirSync(directory, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') {
                continue;
            }
            const fullPath = join(directory, entry.name);
            if (entry.isDirectory()) {
                this._walk(fullPath, out, depth + 1);
                continue;
            }
            if (entry.isFile() && extname(entry.name) === '.ts' && !entry.name.endsWith('.d.ts')) {
                out.push(fullPath);
            }
        }
    }
}
