import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

import { LumenAtomicFileWriter } from '../io/atomic-file-writer';
import { LumenEffectSourceCodec } from './effect-source-codec';
import { LumenHierarchyEntry } from '../hierarchy/entry';
import { LumenJsonAssetIo } from '../io/json-asset';
import { LumenCocosVersion } from '../schema/cocos-version';
import { LumenStandaloneInspectQuery } from './inspect-query';

/**
 * @description 空 Effect 模板（Creator 3.8 新建 Effect：builtin unlit 结构，不做 shader graph）。
 */
const EMPTY_EFFECT_SOURCE = `CCEffect %{
  techniques:
  - name: opaque
    passes:
    - vert: legacy/main-functions/general-vs:vert
      frag: unlit-fs:frag
      properties: &props
        mainTexture: { value: white }
        mainColor: { value: [1, 1, 1, 1], editor: { type: color } }
  - name: transparent
    passes:
    - vert: legacy/main-functions/general-vs:vert
      frag: unlit-fs:frag
      blendState:
        targets:
        - blend: true
          blendSrc: src_alpha
          blendDst: one_minus_src_alpha
          blendSrcAlpha: src_alpha
          blendDstAlpha: one_minus_src_alpha
      properties: *props
}%

CCProgram unlit-fs %{
  precision highp float;
  #include <legacy/output-standard>
  #include <legacy/fog-fs>

  in vec2 v_uv;
  in vec3 v_position;

  uniform sampler2D mainTexture;

  uniform Constant {
    vec4 mainColor;
  };

  vec4 frag () {
    vec4 col = mainColor * texture(mainTexture, v_uv);
    CC_APPLY_FOG(col, v_position);
    return CCFragOutput(col);
  }
}%
`;

/**
 * @description 空 chunk 模板。
 */
const EMPTY_CHUNK_SOURCE = `// you can write GLSL code directly in here
`;

/**
 * @description Effect pass 检视。
 */
export interface ILumenEffectPassInspect {
    /** @description 顶点着色器引用，如 `vs:vert`。 */
    readonly vert: string;
    /** @description 片元着色器引用，如 `unlit-fs:frag`。 */
    readonly frag: string;
}

/**
 * @description Effect 程序检视。
 */
export interface ILumenEffectProgramInspect {
    /** @description 程序名。 */
    readonly name: string;
    /** @description 程序源码。 */
    readonly source: string;
}

/**
 * @description `.effect` Inspector 快照。
 */
export interface ILumenEffectInspect {
    /** @description 项目相对路径。 */
    readonly path: string;
    /** @description 资产种类。 */
    readonly kind: 'effect';
    /** @description technique 名。 */
    readonly techniques: readonly string[];
    /** @description pass vert / frag。 */
    readonly passes: readonly ILumenEffectPassInspect[];
    /** @description YAML `properties` 的 `value`。 */
    readonly properties: Readonly<Record<string, unknown>>;
    /** @description `CCProgram` 列表。 */
    readonly programs: readonly ILumenEffectProgramInspect[];
    /** @description `CCEffect` YAML 正文。 */
    readonly effectYaml: string;
}

/**
 * @description `.chunk` Inspector 快照。
 */
export interface ILumenEffectChunkInspect {
    /** @description 项目相对路径。 */
    readonly path: string;
    /** @description 资产种类。 */
    readonly kind: 'effectChunk';
    /** @description 完整源文件。 */
    readonly source: string;
    /** @description 若含 `CCProgram` 则列出。 */
    readonly programs: readonly ILumenEffectProgramInspect[];
}

/**
 * @description `.effect` / `.chunk` 文档：YAML 字段与程序文本读写，不做节点图。
 */
export class LumenEffectDocument {
    /** @description 源编解码。 */
    private readonly _codec = new LumenEffectSourceCodec();

    /** @description 最小 meta 写入。 */
    private readonly _io = new LumenJsonAssetIo();

    /** @description 项目相对路径。 */
    private readonly _relativePath: string;

    /** @description 当前源文件。 */
    private _source: string;

    /**
     * @description 从源文本创建文档。
     * @param relativePath 相对路径
     * @param source 完整源
     */
    public constructor(relativePath: string, source: string) {
        this._relativePath = relativePath;
        this._source = source;
    }

    /**
     * @description 相对项目根路径。
     * @returns 路径
     */
    public get relativePath(): string {
        return this._relativePath;
    }

    /**
     * @description 资产种类。
     * @returns `effect` 或 `effectChunk`
     */
    public get kind(): 'effect' | 'effectChunk' {
        return LumenHierarchyEntry.assetKindFromPath(this._relativePath) === 'effectChunk'
            ? 'effectChunk'
            : 'effect';
    }

    /**
     * @description 创建空 Effect 或 chunk。
     * @param relativePath 相对路径
     * @param name 未写入源；仅校验 template
     * @param template 仅 `empty`
     * @returns 文档
     */
    public static createEmpty(relativePath: string, name: string, template: string = 'empty'): LumenEffectDocument {
        void name;
        if (template !== 'empty') {
            throw new Error(`lumen_effect_template_unknown:${template}`);
        }
        const kind = LumenHierarchyEntry.assetKindFromPath(relativePath);
        const source = kind === 'effectChunk' ? EMPTY_CHUNK_SOURCE : EMPTY_EFFECT_SOURCE;
        return new LumenEffectDocument(relativePath, source);
    }

    /**
     * @description 从磁盘打开 `.effect` / `.chunk`。
     * @param projectRoot 项目根
     * @param relativePath 相对路径
     * @returns 文档
     */
    public static open(projectRoot: string, relativePath: string): LumenEffectDocument {
        const absolutePath = join(projectRoot, relativePath);
        if (!existsSync(absolutePath)) {
            throw new Error(`lumen_effect_missing:${relativePath}`);
        }
        const source = readFileSync(absolutePath, 'utf8');
        const kind = LumenHierarchyEntry.assetKindFromPath(relativePath);
        if (kind === 'effect') {
            const parsed = new LumenEffectSourceCodec().parse(source);
            if (parsed.effectYaml == null) {
                throw new Error(`lumen_effect_cc_effect_missing:${relativePath}`);
            }
        }
        return new LumenEffectDocument(relativePath, source);
    }

    /**
     * @description 检视 YAML 字段与程序文本。
     * @param query Effect 不接受查询键
     * @returns 快照
     */
    public inspect(query?: Readonly<Record<string, unknown>>): ILumenEffectInspect | ILumenEffectChunkInspect {
        LumenStandaloneInspectQuery.rejectIfPresent(query, this.kind);
        const parsed = this._codec.parse(this._source);
        const programs = parsed.programs.map((program) => ({ name: program.name, source: program.source }));
        if (this.kind === 'effectChunk') {
            return {
                path: this._relativePath,
                kind: 'effectChunk',
                source: this._source,
                programs,
            };
        }
        if (parsed.effectYaml == null) {
            throw new Error(`lumen_effect_cc_effect_missing:${this._relativePath}`);
        }
        return {
            path: this._relativePath,
            kind: 'effect',
            techniques: this._codec.readTechniqueNames(parsed.effectYaml),
            passes: this._codec.readPasses(parsed.effectYaml),
            properties: this._codec.readProperties(parsed.effectYaml),
            programs,
            effectYaml: parsed.effectYaml,
        };
    }

    /**
     * @description 写入 YAML 属性、程序源或整文件。
     * @param patch `properties` / `programs` / `effectYaml` / `source`
     */
    public applyPatch(patch: Readonly<Record<string, unknown>>): void {
        if (this.kind === 'effectChunk') {
            this._patchChunk(patch);
            return;
        }
        this._patchEffect(patch);
    }

    /**
     * @description 写回源文件与最小 meta。
     * @param projectRoot 项目根
     * @param writeMetaIfMissing 缺少 meta 时是否创建
     */
    public save(
        projectRoot: string,
        writeMetaIfMissing: boolean = true,
        cocosVersion: LumenCocosVersion = LumenCocosVersion.DEFAULT,
    ): void {
        const absolutePath = join(projectRoot, this._relativePath);
        mkdirSync(dirname(absolutePath), { recursive: true });
        LumenAtomicFileWriter.writeUtf8(absolutePath, this._source);
        if (writeMetaIfMissing) {
            this._io.writeMetaIfMissing(
                projectRoot,
                this._relativePath,
                this.kind === 'effectChunk' ? 'chunk' : 'effect',
                cocosVersion,
            );
        }
    }

    /**
     * @description 写入 `.effect` 补丁。
     * @param patch 公开字段
     */
    private _patchEffect(patch: Readonly<Record<string, unknown>>): void {
        this._assertOnlyFields(patch, ['properties', 'programs', 'effectYaml', 'source'], 'effect');
        if (patch.source !== undefined) {
            if (Object.keys(patch).length !== 1) {
                throw new Error('lumen_effect_source_exclusive');
            }
            if (typeof patch.source !== 'string') {
                throw new Error('lumen_effect_property_type:source:string');
            }
            const parsed = this._codec.parse(patch.source);
            if (parsed.effectYaml == null) {
                throw new Error(`lumen_effect_cc_effect_missing:${this._relativePath}`);
            }
            this._source = patch.source;
            return;
        }
        let source = this._source;
        const parsed = this._codec.parse(source);
        if (parsed.effectYaml == null) {
            throw new Error(`lumen_effect_cc_effect_missing:${this._relativePath}`);
        }
        let effectYaml = parsed.effectYaml;
        if (patch.effectYaml !== undefined) {
            if (typeof patch.effectYaml !== 'string' || patch.effectYaml.length === 0) {
                throw new Error('lumen_effect_property_type:effectYaml:string');
            }
            effectYaml = patch.effectYaml;
            source = this._codec.replaceEffectYaml(source, effectYaml);
        }
        if (patch.properties !== undefined) {
            effectYaml = this._codec.patchProperties(effectYaml, this._readRecord(patch.properties, 'properties'));
            source = this._codec.replaceEffectYaml(source, effectYaml);
        }
        if (patch.programs !== undefined) {
            const updates = this._codec.patchPrograms(parsed.programs, patch.programs);
            for (const program of updates) {
                const previous = parsed.programs.find((item) => item.name === program.name);
                if (previous == null || previous.source === program.source) {
                    continue;
                }
                source = this._codec.replaceProgramSource(source, program.name, program.source);
            }
        }
        this._source = source;
    }

    /**
     * @description 写入 `.chunk` 补丁。
     * @param patch 公开字段
     */
    private _patchChunk(patch: Readonly<Record<string, unknown>>): void {
        this._assertOnlyFields(patch, ['source', 'programs'], 'effectChunk');
        if (patch.source !== undefined) {
            if (typeof patch.source !== 'string') {
                throw new Error('lumen_effect_property_type:source:string');
            }
            this._source = patch.source;
            return;
        }
        if (patch.programs !== undefined) {
            const parsed = this._codec.parse(this._source);
            let source = this._source;
            const updates = this._codec.patchPrograms(parsed.programs, patch.programs);
            for (const program of updates) {
                const previous = parsed.programs.find((item) => item.name === program.name);
                if (previous == null || previous.source === program.source) {
                    continue;
                }
                source = this._codec.replaceProgramSource(source, program.name, program.source);
            }
            this._source = source;
        }
    }

    /**
     * @description 读取对象补丁。
     * @param value 未受信值
     * @param fieldName 字段名
     * @returns 对象
     */
    private _readRecord(value: unknown, fieldName: string): Record<string, unknown> {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error(`lumen_effect_property_type:${fieldName}:object`);
        }
        return value as Record<string, unknown>;
    }

    /**
     * @description 拒绝未知补丁字段。
     * @param value 补丁
     * @param allowed 允许字段
     * @param scope 分组
     */
    private _assertOnlyFields(
        value: Readonly<Record<string, unknown>>,
        allowed: readonly string[],
        scope: string,
    ): void {
        const allowedSet = new Set(allowed);
        for (const key of Object.keys(value)) {
            if (!allowedSet.has(key)) {
                throw new Error(`lumen_effect_property_not_editable:${scope}.${key}:allowed=${allowed.join(',')}`);
            }
        }
    }
}
