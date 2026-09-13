/**
 * @description 按 Creator 项目 / 引擎声明快速汇总版本与白名单对照信息。
 *
 * 可信度：
 * - 项目 `creator.version`：高（运行目标）
 * - 引擎 `cc.d.ts` 类名扫描：中（存在性对照，非序列化字段权威）
 * - 自动从 d.ts 推导 Prefab `_field` 映射：低（不自动写入白名单）
 */
import { existsSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import { LumenCocosVersion } from './cocos-version';
import { LumenComponentPropertySchema } from './component-property';
import {
    LumenFieldWhitelistGapProbe,
    type ILumenFieldWhitelistGapSummary,
} from './field-whitelist-gap-probe';

/**
 * @description 信息源可信度说明。
 */
export interface ILumenCocosInfoTrust {
    /**
     * @description 项目版本来源可信度。
     */
    readonly projectVersion: 'high' | 'medium' | 'low' | 'none';

    /**
     * @description 引擎 d.ts 扫描可信度。
     */
    readonly engineDts: 'medium' | 'none';

    /**
     * @description 字段自动映射可信度（始终 low/none，提醒勿盲信）。
     */
    readonly fieldAutoMap: 'low' | 'none';
}

/**
 * @description 组件级白名单缺口的一页结果。
 */
export interface ILumenWhitelistGapPage {
    /**
     * @description 本页组件类型，如 `cc.VideoPlayer`。
     */
    readonly items: readonly string[];

    /**
     * @description 启发式过滤后的缺口总数。
     */
    readonly total: number;

    /**
     * @description 本页起始偏移（从 0 计）。
     */
    readonly offset: number;

    /**
     * @description 本页请求条数上限。
     */
    readonly limit: number;

    /**
     * @description 是否还有后续页。
     */
    readonly truncated: boolean;

    /**
     * @description 下一页 offset；没有后续页时为 null。
     */
    readonly nextOffset: number | null;

    /**
     * @description 过滤方式：按 `export class X extends …Component|Renderer|…` 识别可挂组件，不是字段映射。
     */
    readonly filter: 'componentExtendsHeuristic';

    /**
     * @description 固定为 `none`：本列表不得自动写入白名单。
     */
    readonly autoMap: 'none';
}

/**
 * @description 引擎扫描摘要。
 */
export interface ILumenEngineScanSummary {
    /**
     * @description 引擎根。
     */
    readonly root: string;

    /**
     * @description 使用的声明文件。
     */
    readonly dtsPath: string;

    /**
     * @description 扫描到的 `export class` 数量（启发式）。
     */
    readonly classCount: number;

    /**
     * @description 与 lumen 白名单交集的 `cc.*` 类型。
     */
    readonly matchedWhitelist: readonly string[];

    /**
     * @description 白名单有、d.ts 未找到的类型。
     */
    readonly whitelistMissingInDts: readonly string[];

    /**
     * @description d.ts 有、白名单未收录的常见组件名（与 `inEngineNotInWhitelist.items` 相同，兼容旧字段）。
     */
    readonly dtsNotInWhitelistSample: readonly string[];

    /**
     * @description 引擎有、白名单未收录的组件级缺口（可分页；不得自动写入白名单）。
     */
    readonly inEngineNotInWhitelist: ILumenWhitelistGapPage;

    /**
     * @description 引擎 `@serializable` 相对策展表的字段缺口；仅扫描 TypeScript 源时为非 null。
     */
    readonly fieldGaps: ILumenFieldWhitelistGapSummary | null;
}

/**
 * @description `cocos-info` 报告。
 */
export interface ILumenCocosInfoReport {
    /**
     * @description 生效版本（显式 / 项目 / 基线）。
     */
    readonly effectiveVersion: string;

    /**
     * @description 产品基线。
     */
    readonly baseline: string;

    /**
     * @description 项目读到的版本；未读到为 null。
     */
    readonly projectVersion: string | null;

    /**
     * @description 可信度说明。
     */
    readonly trust: ILumenCocosInfoTrust;

    /**
     * @description 当前版本下白名单组件数。
     */
    readonly whitelistComponentCount: number;

    /**
     * @description 废弃且永不挂载的内置组件。
     */
    readonly deprecatedBuiltins: readonly string[];

    /**
     * @description 可选引擎扫描；未提供引擎根时为 null。
     */
    readonly engine: ILumenEngineScanSummary | null;

    /**
     * @description 给调用方的使用提示。
     */
    readonly notes: readonly string[];
}

/**
 * @description 探测选项。
 */
export interface ILumenCocosInfoProbeOptions {
    /**
     * @description Creator 项目根（可读 `package.json`）。
     */
    readonly projectRoot?: string;

    /**
     * @description 显式版本覆盖。
     */
    readonly cocosVersion?: string;

    /**
     * @description 引擎根（含 `bin/.declarations/cc.d.ts` 或直接给 d.ts）。
     */
    readonly engineRoot?: string;

    /**
     * @description d.ts 未收录样本上限（兼容旧名；与 `gapLimit` 相同）。
     */
    readonly sampleLimit?: number;

    /**
     * @description 缺口列表起始偏移；缺省 0。
     */
    readonly gapOffset?: number;

    /**
     * @description 缺口列表每页条数；缺省 40，最大 200。
     */
    readonly gapLimit?: number;
}

/**
 * @description 汇总项目版本与可选引擎声明对照。
 */
export class LumenCocosInfoProbe {
    /**
     * @description 可挂节点组件的父类短名启发式（含 Renderer / Collider 等中间基类）。
     */
    private static readonly _componentParent =
        /(Component|Renderer|Light|Collider|Joint|Constraint|Controller|Force)$/;

    /**
     * @description 生成报告。
     * @param options 探测选项
     * @returns 报告
     */
    public static probe(options: ILumenCocosInfoProbeOptions): ILumenCocosInfoReport {
        const projectVersion =
            options.projectRoot != null && options.projectRoot.trim().length > 0
                ? LumenCocosVersion.tryReadFromProject(options.projectRoot)
                : null;
        let effective: LumenCocosVersion;
        let projectTrust: ILumenCocosInfoTrust['projectVersion'] = 'none';
        if (options.cocosVersion != null && options.cocosVersion.trim().length > 0) {
            effective = LumenCocosVersion.parse(options.cocosVersion);
            projectTrust = projectVersion != null ? 'high' : 'medium';
        } else if (projectVersion != null) {
            effective = projectVersion;
            projectTrust = 'high';
        } else {
            effective = LumenCocosVersion.DEFAULT;
            projectTrust = 'none';
        }

        const schema = new LumenComponentPropertySchema(effective);
        const whitelist = schema.listSupportedComponents();
        const gapPage = this._readGapPage(options);
        const engineRoot =
            options.engineRoot != null && options.engineRoot.trim().length > 0
                ? options.engineRoot.trim()
                : null;
        const engine =
            engineRoot != null ? this._scanEngine(engineRoot, whitelist, gapPage, options) : null;

        const notes = [
            'project creator.version is the runtime target (high trust).',
            'engine cc.d.ts class scan is existence-only (medium); do not treat it as Prefab field map.',
            'attach uses an engine-type deny-list; deprecated builtins stay rejected.',
            'unknown inspector fields are discovered from serialized Prefab instances (scalars/vectors/color/uuid); __id__ refs stay curated.',
            'inEngineNotInWhitelist is paginated component-level gaps; it does not auto-edit the curated table.',
            'inEngineNotInWhitelistFields compares engine @serializable to curated fields; autoMap is always none.',
        ];
        if (engine == null) {
            notes.push('pass --engine <engine-root> to compare whitelist against cc.d.ts.');
        } else if (engine.fieldGaps == null) {
            notes.push('pass engine TypeScript source (not cc.d.ts) for field-level inEngineNotInWhitelistFields.');
        }

        return {
            effectiveVersion: effective.toString(),
            baseline: LumenCocosVersion.DEFAULT.toString(),
            projectVersion: projectVersion?.toString() ?? null,
            trust: {
                projectVersion: projectTrust,
                engineDts: engine == null ? 'none' : 'medium',
                fieldAutoMap: 'none',
            },
            whitelistComponentCount: whitelist.length,
            deprecatedBuiltins: ['cc.LabelOutline', 'cc.LabelShadow'],
            engine,
            notes,
        };
    }

    /**
     * @description 规范化分页参数。
     * @param options 探测选项
     * @returns 合法 offset / limit
     */
    private static _readGapPage(options: ILumenCocosInfoProbeOptions): {
        readonly offset: number;
        readonly limit: number;
    } {
        const offset = options.gapOffset ?? 0;
        const limit = options.gapLimit ?? options.sampleLimit ?? 40;
        if (!Number.isInteger(offset) || offset < 0) {
            throw new Error('lumen_cocos_info_gap_offset_invalid');
        }
        if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
            throw new Error('lumen_cocos_info_gap_limit_invalid');
        }
        return { offset, limit };
    }

    /**
     * @description 扫描引擎 d.ts 并与白名单对照。
     * @param engineRoot 引擎根或 d.ts 路径
     * @param whitelist lumen 组件列表
     * @param gapPage 缺口分页
     * @returns 扫描摘要
     */
    private static _scanEngine(
        engineRoot: string,
        whitelist: readonly string[],
        gapPage: { readonly offset: number; readonly limit: number },
        options: ILumenCocosInfoProbeOptions,
    ): ILumenEngineScanSummary {
        const fieldGaps = LumenFieldWhitelistGapProbe.isEngineSourceRoot(engineRoot)
            ? LumenFieldWhitelistGapProbe.probe({
                  engineSourceRoot: engineRoot,
                  gapOffset: options.gapOffset,
                  gapLimit: options.gapLimit,
              })
            : null;

        if (
            fieldGaps != null &&
            statSync(engineRoot).isFile() &&
            engineRoot.endsWith('.ts') &&
            !engineRoot.endsWith('.d.ts')
        ) {
            return {
                root: engineRoot,
                dtsPath: '',
                classCount: fieldGaps.classCount,
                matchedWhitelist: [],
                whitelistMissingInDts: [...whitelist],
                dtsNotInWhitelistSample: [],
                inEngineNotInWhitelist: {
                    items: [],
                    total: 0,
                    offset: gapPage.offset,
                    limit: gapPage.limit,
                    truncated: false,
                    nextOffset: null,
                    filter: 'componentExtendsHeuristic',
                    autoMap: 'none',
                },
                fieldGaps,
            };
        }

        let dtsPath: string;
        try {
            dtsPath = this._resolveDtsPath(engineRoot);
        } catch (error) {
            if (fieldGaps != null) {
                return {
                    root: engineRoot,
                    dtsPath: '',
                    classCount: fieldGaps.classCount,
                    matchedWhitelist: [],
                    whitelistMissingInDts: [...whitelist],
                    dtsNotInWhitelistSample: [],
                    inEngineNotInWhitelist: {
                        items: [],
                        total: 0,
                        offset: gapPage.offset,
                        limit: gapPage.limit,
                        truncated: false,
                        nextOffset: null,
                        filter: 'componentExtendsHeuristic',
                        autoMap: 'none',
                    },
                    fieldGaps,
                };
            }
            throw error;
        }

        const text = readFileSync(dtsPath, 'utf8');
        const classNames = new Set<string>();
        const componentLikeNames = new Set<string>();
        const classPattern = /export\s+class\s+([A-Za-z0-9_]+)\b/g;
        let match: RegExpExecArray | null = classPattern.exec(text);
        while (match != null) {
            const name = match[1];
            if (name != null) {
                classNames.add(name);
            }
            match = classPattern.exec(text);
        }
        const extendsPattern = /export\s+class\s+([A-Za-z0-9_]+)\s+extends\s+([A-Za-z0-9_$.]+)/g;
        let extendsMatch: RegExpExecArray | null = extendsPattern.exec(text);
        while (extendsMatch != null) {
            const name = extendsMatch[1];
            const parent = extendsMatch[2];
            if (name != null && parent != null && this._isComponentLikeParent(parent)) {
                componentLikeNames.add(name);
            }
            extendsMatch = extendsPattern.exec(text);
        }

        const matchedWhitelist: string[] = [];
        const whitelistMissingInDts: string[] = [];
        for (const type of whitelist) {
            const shortName = this._shortClassName(type);
            if (classNames.has(shortName)) {
                matchedWhitelist.push(type);
            } else {
                whitelistMissingInDts.push(type);
            }
        }

        const whitelistShort = new Set(whitelist.map((type) => this._shortClassName(type)));
        const allGaps: string[] = [];
        for (const name of [...componentLikeNames].sort()) {
            if (whitelistShort.has(name)) {
                continue;
            }
            allGaps.push(`cc.${name}`);
        }
        const sliced = allGaps.slice(gapPage.offset, gapPage.offset + gapPage.limit);
        const truncated = gapPage.offset + sliced.length < allGaps.length;
        const inEngineNotInWhitelist: ILumenWhitelistGapPage = {
            items: sliced,
            total: allGaps.length,
            offset: gapPage.offset,
            limit: gapPage.limit,
            truncated,
            nextOffset: truncated ? gapPage.offset + sliced.length : null,
            filter: 'componentExtendsHeuristic',
            autoMap: 'none',
        };

        return {
            root: engineRoot,
            dtsPath,
            classCount: classNames.size,
            matchedWhitelist,
            whitelistMissingInDts,
            dtsNotInWhitelistSample: sliced,
            inEngineNotInWhitelist,
            fieldGaps,
        };
    }

    /**
     * @description 解析 d.ts 路径。
     * @param engineRoot 引擎根或文件
     * @returns d.ts 绝对路径
     */
    private static _resolveDtsPath(engineRoot: string): string {
        if (!existsSync(engineRoot)) {
            throw new Error(`lumen_engine_missing:${engineRoot}`);
        }
        if (statSync(engineRoot).isFile()) {
            return engineRoot;
        }
        const candidates = [
            join(engineRoot, 'bin', '.declarations', 'cc.d.ts'),
            join(engineRoot, 'bin', 'declarations', 'cc.d.ts'),
            join(engineRoot, 'cc.d.ts'),
        ];
        for (const candidate of candidates) {
            if (existsSync(candidate)) {
                return candidate;
            }
        }
        throw new Error(`lumen_engine_dts_missing:${engineRoot}`);
    }

    /**
     * @description 取白名单类型的短类名（`cc.Label` / `sp.Skeleton` / `cc.animation.AnimationController` → 末段）。
     * @param type 白名单类型
     * @returns 短类名
     */
    private static _shortClassName(type: string): string {
        const parts = type.split('.');
        const shortName = parts[parts.length - 1];
        if (shortName == null || shortName.length === 0) {
            return type;
        }
        return shortName;
    }

    /**
     * @description 判断父类短名是否像可挂组件基类。
     * @param parent 声明中的 extends 类型
     * @returns 是否纳入组件级缺口
     */
    private static _isComponentLikeParent(parent: string): boolean {
        const parts = parent.split('.');
        const shortName = parts[parts.length - 1];
        if (shortName == null || shortName.length === 0) {
            return false;
        }
        return this._componentParent.test(shortName);
    }
}
