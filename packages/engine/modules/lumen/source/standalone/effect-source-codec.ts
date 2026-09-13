/**
 * @description Effect 源解析后的程序块。
 */
export interface ILumenEffectProgramBlock {
    /** @description `CCProgram` 名。 */
    readonly name: string;
    /** @description 程序源码（不含 `%{ }%`）。 */
    readonly source: string;
}

/**
 * @description Effect 源解析结果。
 */
export interface ILumenEffectParsedSource {
    /** @description `CCEffect` YAML 正文；chunk 或缺失时为 `null`。 */
    readonly effectYaml: string | null;
    /** @description 全部 `CCProgram` 块。 */
    readonly programs: readonly ILumenEffectProgramBlock[];
}

/**
 * @description Creator `.effect` / `.chunk` 源：拆 `CCEffect` / `CCProgram`，改 YAML 属性与程序文本。
 */
export class LumenEffectSourceCodec {
    /** @description 块起始：`CCEffect %{` 或 `CCProgram name %{`。 */
    private static readonly _blockStart = /CC(Effect|Program)(?:\s+(\S+))?\s*%\{/g;

    /**
     * @description 解析 Effect / chunk 源。
     * @param source 完整文件文本
     * @returns 解析结果
     */
    public parse(source: string): ILumenEffectParsedSource {
        const programs: ILumenEffectProgramBlock[] = [];
        let effectYaml: string | null = null;
        const matcher = new RegExp(LumenEffectSourceCodec._blockStart.source, 'g');
        let match = matcher.exec(source);
        while (match != null) {
            const kind = match[1];
            const name = match[2];
            const bodyStart = match.index + match[0].length;
            const bodyEnd = source.indexOf('}%', bodyStart);
            if (bodyEnd < 0) {
                throw new Error('lumen_effect_block_unclosed');
            }
            const body = source.slice(bodyStart, bodyEnd);
            if (kind === 'Effect') {
                if (effectYaml != null) {
                    throw new Error('lumen_effect_duplicate_cc_effect');
                }
                effectYaml = body;
            } else {
                if (name == null || name.length === 0) {
                    throw new Error('lumen_effect_program_name_missing');
                }
                programs.push({ name, source: body });
            }
            matcher.lastIndex = bodyEnd + 2;
            match = matcher.exec(source);
        }
        return { effectYaml, programs };
    }

    /**
     * @description 用解析块重建源文件。
     * @param parsed 解析结果
     * @returns 完整源
     */
    public serialize(parsed: ILumenEffectParsedSource): string {
        const parts: string[] = [];
        if (parsed.effectYaml != null) {
            parts.push(`CCEffect %{${parsed.effectYaml}}%`);
        }
        for (const program of parsed.programs) {
            parts.push(`CCProgram ${program.name} %{${program.source}}%`);
        }
        return `${parts.join('\n\n')}\n`;
    }

    /**
     * @description 原地替换 `CCEffect` YAML，保留文件其余文本。
     * @param source 完整源
     * @param effectYaml 新 YAML
     * @returns 新源
     */
    public replaceEffectYaml(source: string, effectYaml: string): string {
        const match = /CCEffect\s*%\{/.exec(source);
        if (match == null) {
            throw new Error('lumen_effect_cc_effect_missing');
        }
        const start = match.index + match[0].length;
        const end = source.indexOf('}%', start);
        if (end < 0) {
            throw new Error('lumen_effect_block_unclosed');
        }
        return `${source.slice(0, start)}${effectYaml}${source.slice(end)}`;
    }

    /**
     * @description 原地替换指定 `CCProgram` 源。
     * @param source 完整源
     * @param name 程序名
     * @param programSource 新程序源
     * @returns 新源
     */
    public replaceProgramSource(source: string, name: string, programSource: string): string {
        const matcher = new RegExp(`CCProgram\\s+${this._escapeRegExp(name)}\\s*%\\{`);
        const match = matcher.exec(source);
        if (match == null) {
            throw new Error(`lumen_effect_program_missing:${name}`);
        }
        const start = match.index + match[0].length;
        const end = source.indexOf('}%', start);
        if (end < 0) {
            throw new Error('lumen_effect_block_unclosed');
        }
        return `${source.slice(0, start)}${programSource}${source.slice(end)}`;
    }

    /**
     * @description 读取 YAML 中声明的 technique 名。
     * @param effectYaml `CCEffect` 正文
     * @returns 名称列表
     */
    public readTechniqueNames(effectYaml: string): readonly string[] {
        const names: string[] = [];
        const matcher = /^\s*-\s*name:\s*(\S+)/gm;
        let match = matcher.exec(effectYaml);
        while (match != null) {
            const name = match[1];
            if (name != null) {
                names.push(name);
            }
            match = matcher.exec(effectYaml);
        }
        return names;
    }

    /**
     * @description 读取 pass 的 vert / frag 引用。
     * @param effectYaml `CCEffect` 正文
     * @returns pass 列表
     */
    public readPasses(effectYaml: string): readonly { readonly vert: string; readonly frag: string }[] {
        const verts = this._matchAll(/^\s*vert:\s*(\S+)/gm, effectYaml);
        const frags = this._matchAll(/^\s*frag:\s*(\S+)/gm, effectYaml);
        const count = Math.max(verts.length, frags.length);
        const passes: Array<{ vert: string; frag: string }> = [];
        for (let index = 0; index < count; index += 1) {
            passes.push({
                vert: verts[index] ?? '',
                frag: frags[index] ?? '',
            });
        }
        return passes;
    }

    /**
     * @description 读取 `properties` 流式映射中的 `value`。
     * @param effectYaml `CCEffect` 正文
     * @returns 属性名到值
     */
    public readProperties(effectYaml: string): Readonly<Record<string, unknown>> {
        const properties: Record<string, unknown> = {};
        const matcher = /^[ \t]*([A-Za-z_]\w*):[ \t]*\{/gm;
        let match = matcher.exec(effectYaml);
        while (match != null) {
            const name = match[1];
            const open = match.index + match[0].length - 1;
            const closed = this._matchingBrace(effectYaml, open);
            const inner = effectYaml.slice(open + 1, closed);
            if (name != null && /\bvalue\s*:/.test(inner) && properties[name] === undefined) {
                properties[name] = this._readValueToken(inner);
            }
            matcher.lastIndex = closed + 1;
            match = matcher.exec(effectYaml);
        }
        return properties;
    }

    /**
     * @description 改写 YAML 中已有属性的 `value`；未知名报错。
     * @param effectYaml 当前 YAML
     * @param patch 属性名到新值
     * @returns 新 YAML
     */
    public patchProperties(effectYaml: string, patch: Readonly<Record<string, unknown>>): string {
        let next = effectYaml;
        for (const [name, value] of Object.entries(patch)) {
            const encoded = this._encodeYamlValue(value);
            const found = this._replacePropertyValue(next, name, encoded);
            if (!found.replaced) {
                throw new Error(`lumen_effect_property_missing:${name}`);
            }
            next = found.yaml;
        }
        return next;
    }

    /**
     * @description 按名替换程序源；未知名报错。
     * @param programs 当前程序
     * @param patch 程序名到新源，或 `{ name, source }` 列表
     * @returns 新程序列表
     */
    public patchPrograms(
        programs: readonly ILumenEffectProgramBlock[],
        patch: unknown,
    ): readonly ILumenEffectProgramBlock[] {
        const updates = this._readProgramPatch(patch);
        const next = programs.map((program) => ({ name: program.name, source: program.source }));
        for (const [name, source] of updates) {
            const index = next.findIndex((program) => program.name === name);
            if (index < 0) {
                throw new Error(`lumen_effect_program_missing:${name}`);
            }
            next[index] = { name, source };
        }
        return next;
    }

    /**
     * @description 读取程序补丁为名/源对。
     * @param patch 对象或数组
     * @returns 名到源
     */
    private _readProgramPatch(patch: unknown): ReadonlyArray<readonly [string, string]> {
        if (Array.isArray(patch)) {
            return patch.map((item, index) => {
                if (item == null || typeof item !== 'object' || Array.isArray(item)) {
                    throw new Error(`lumen_effect_property_type:programs[${index}]:object`);
                }
                const record = item as Record<string, unknown>;
                if (typeof record.name !== 'string' || record.name.length === 0) {
                    throw new Error(`lumen_effect_property_type:programs[${index}].name:string`);
                }
                if (typeof record.source !== 'string') {
                    throw new Error(`lumen_effect_property_type:programs[${index}].source:string`);
                }
                return [record.name, record.source] as const;
            });
        }
        if (patch == null || typeof patch !== 'object') {
            throw new Error('lumen_effect_property_type:programs:object_or_array');
        }
        const pairs: Array<readonly [string, string]> = [];
        for (const [name, source] of Object.entries(patch as Record<string, unknown>)) {
            if (typeof source !== 'string') {
                throw new Error(`lumen_effect_property_type:programs.${name}:string`);
            }
            pairs.push([name, source]);
        }
        return pairs;
    }

    /**
     * @description 替换指定属性的 `value` 标记。
     * @param yaml YAML 正文
     * @param name 属性名
     * @param encoded 已编码值
     * @returns 是否替换及新 YAML
     */
    private _replacePropertyValue(
        yaml: string,
        name: string,
        encoded: string,
    ): { readonly replaced: boolean; readonly yaml: string } {
        const matcher = new RegExp(`^[ \\t]*${this._escapeRegExp(name)}:[ \\t]*\\{`, 'gm');
        const match = matcher.exec(yaml);
        if (match == null) {
            return { replaced: false, yaml };
        }
        const open = match.index + match[0].length - 1;
        const closed = this._matchingBrace(yaml, open);
        const inner = yaml.slice(open + 1, closed);
        const valueMatch = /\bvalue\s*:\s*/.exec(inner);
        if (valueMatch == null || valueMatch.index == null) {
            return { replaced: false, yaml };
        }
        const tokenStart = valueMatch.index + valueMatch[0].length;
        const tokenEnd = this._valueTokenEnd(inner, tokenStart);
        const nextInner = `${inner.slice(0, tokenStart)}${encoded}${inner.slice(tokenEnd)}`;
        return {
            replaced: true,
            yaml: `${yaml.slice(0, open + 1)}${nextInner}${yaml.slice(closed)}`,
        };
    }

    /**
     * @description 从 `properties` 流式映射读取 `value`。
     * @param inner 花括号内文本
     * @returns 解码后的值
     */
    private _readValueToken(inner: string): unknown {
        const valueMatch = /\bvalue\s*:\s*/.exec(inner);
        if (valueMatch == null || valueMatch.index == null) {
            return null;
        }
        const start = valueMatch.index + valueMatch[0].length;
        const end = this._valueTokenEnd(inner, start);
        return this._decodeYamlValue(inner.slice(start, end).trim());
    }

    /**
     * @description 定位 YAML `value` 标记结束位置。
     * @param text 文本
     * @param start 标记起始
     * @returns 结束下标
     */
    private _valueTokenEnd(text: string, start: number): number {
        const first = text[start];
        if (first === '[') {
            return this._matchingBracket(text, start, '[', ']') + 1;
        }
        if (first === '{') {
            return this._matchingBrace(text, start) + 1;
        }
        if (first === '"' || first === "'") {
            return this._quotedEnd(text, start) + 1;
        }
        let index = start;
        while (index < text.length) {
            const ch = text[index];
            if (ch === ',' || ch === '}' || ch === '\n') {
                break;
            }
            index += 1;
        }
        return index;
    }

    /**
     * @description 解码 YAML 标量 / JSON 数组。
     * @param token 原始标记
     * @returns 值
     */
    private _decodeYamlValue(token: string): unknown {
        if (token === 'true') {
            return true;
        }
        if (token === 'false') {
            return false;
        }
        if (token === 'null') {
            return null;
        }
        if (/^-?\d+(\.\d+)?$/.test(token)) {
            return Number(token);
        }
        if (token.startsWith('[') || token.startsWith('{') || token.startsWith('"')) {
            try {
                return JSON.parse(token) as unknown;
            } catch {
                return token;
            }
        }
        if (
            (token.startsWith("'") && token.endsWith("'") && token.length >= 2) ||
            (token.startsWith('"') && token.endsWith('"') && token.length >= 2)
        ) {
            return token.slice(1, -1);
        }
        return token;
    }

    /**
     * @description 编码补丁值为 YAML `value` 标记。
     * @param value 公开值
     * @returns YAML 片段
     */
    private _encodeYamlValue(value: unknown): string {
        if (typeof value === 'string') {
            return /^[A-Za-z0-9_.-]+$/.test(value) ? value : JSON.stringify(value);
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            return String(value);
        }
        if (typeof value === 'boolean') {
            return value ? 'true' : 'false';
        }
        if (value === null) {
            return 'null';
        }
        if (Array.isArray(value)) {
            return JSON.stringify(value);
        }
        throw new Error('lumen_effect_property_type:properties.value');
    }

    /**
     * @description 匹配花括号。
     * @param text 文本
     * @param open `{` 下标
     * @returns 对应 `}` 下标
     */
    private _matchingBrace(text: string, open: number): number {
        return this._matchingBracket(text, open, '{', '}');
    }

    /**
     * @description 匹配成对括号。
     * @param text 文本
     * @param open 开括号下标
     * @param openChar 开括号
     * @param closeChar 闭括号
     * @returns 闭括号下标
     */
    private _matchingBracket(text: string, open: number, openChar: string, closeChar: string): number {
        let depth = 0;
        for (let index = open; index < text.length; index += 1) {
            const ch = text[index];
            if (ch === openChar) {
                depth += 1;
            } else if (ch === closeChar) {
                depth -= 1;
                if (depth === 0) {
                    return index;
                }
            }
        }
        throw new Error('lumen_effect_yaml_unbalanced');
    }

    /**
     * @description 定位引号字符串结束。
     * @param text 文本
     * @param start 开引号
     * @returns 闭引号下标
     */
    private _quotedEnd(text: string, start: number): number {
        const quote = text[start];
        for (let index = start + 1; index < text.length; index += 1) {
            if (text[index] === '\\') {
                index += 1;
                continue;
            }
            if (text[index] === quote) {
                return index;
            }
        }
        throw new Error('lumen_effect_yaml_unbalanced');
    }

    /**
     * @description 收集正则第一捕获组。
     * @param matcher 全局正则
     * @param text 文本
     * @returns 捕获列表
     */
    private _matchAll(matcher: RegExp, text: string): string[] {
        const values: string[] = [];
        const cloned = new RegExp(matcher.source, matcher.flags);
        let match = cloned.exec(text);
        while (match != null) {
            const value = match[1];
            if (value != null) {
                values.push(value);
            }
            match = cloned.exec(text);
        }
        return values;
    }

    /**
     * @description 转义正则字面量。
     * @param value 原文
     * @returns 转义后
     */
    private _escapeRegExp(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
