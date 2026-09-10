/**
 * @description 对照引擎 `@serializable` 与策展白名单，报告字段级缺口（只读；不写回策展表）。
 */
import { statSync } from 'fs';

import { LumenCuratedSchemaCatalog } from './catalog';
import type { ILumenPropertyFieldSpec } from './component-property';
import { LumenEngineSerializableProbe } from './engine-serializable-probe';

/**
 * @description 单条字段缺口。
 */
export interface ILumenFieldWhitelistGapItem {
    /**
     * @description 组件或内嵌类型，如 `cc.TrailModule`。
     */
    readonly componentType: string;

    /**
     * @description 公开属性名。
     */
    readonly apiName: string;

    /**
     * @description Prefab 序列化字段名。
     */
    readonly serializedName: string;

    /**
     * @description 推断的值类型。
     */
    readonly kind: string;
}

/**
 * @description 字段缺口分页结果。
 */
export interface ILumenFieldWhitelistGapPage {
    /**
     * @description 本页缺口项。
     */
    readonly items: readonly ILumenFieldWhitelistGapItem[];

    /**
     * @description 缺口总数。
     */
    readonly total: number;

    /**
     * @description 本页起始偏移。
     */
    readonly offset: number;

    /**
     * @description 本页条数上限。
     */
    readonly limit: number;

    /**
     * @description 是否还有后续页。
     */
    readonly truncated: boolean;

    /**
     * @description 下一页 offset；无后续页时为 null。
     */
    readonly nextOffset: number | null;

    /**
     * @description 固定为 `none`：不得自动写入策展表。
     */
    readonly autoMap: 'none';

    /**
     * @description 对照方式说明。
     */
    readonly filter: 'engine-serializable-vs-curated';
}

/**
 * @description 字段缺口扫描摘要。
 */
export interface ILumenFieldWhitelistGapSummary {
    /**
     * @description 使用的引擎源路径。
     */
    readonly sourceRoot: string;

    /**
     * @description 扫描到的 ccclass 数。
     */
    readonly classCount: number;

    /**
     * @description 含字段的类型数。
     */
    readonly typedCount: number;

    /**
     * @description 分页缺口。
     */
    readonly inEngineNotInWhitelistFields: ILumenFieldWhitelistGapPage;
}

/**
 * @description 字段缺口探测选项。
 */
export interface ILumenFieldWhitelistGapProbeOptions {
    /**
     * @description 引擎根或 `.ts` 源文件（非 `.d.ts`）。
     */
    readonly engineSourceRoot: string;

    /**
     * @description 缺口列表起始偏移。
     */
    readonly gapOffset?: number;

    /**
     * @description 缺口列表每页条数。
     */
    readonly gapLimit?: number;
}

/**
 * @description 从引擎源码提取相对策展白名单的字段缺口。
 */
export class LumenFieldWhitelistGapProbe {
    /**
     * @description 判断路径是否可用于 `@serializable` 扫描（排除 `.d.ts`）。
     * @param engineRoot 引擎根或文件
     * @returns 是否引擎 TypeScript 源
     */
    public static isEngineSourceRoot(engineRoot: string): boolean {
        const normalized = engineRoot.trim();
        if (normalized.length === 0) {
            return false;
        }
        if (normalized.endsWith('.d.ts')) {
            return false;
        }
        if (normalized.endsWith('.ts')) {
            return true;
        }
        try {
            return statSync(normalized).isDirectory();
        } catch {
            return false;
        }
    }

    /**
     * @description 扫描字段缺口并分页返回。
     * @param options 探测选项
     * @returns 摘要；无策展交集时 items 为空
     */
    public static probe(options: ILumenFieldWhitelistGapProbeOptions): ILumenFieldWhitelistGapSummary {
        const gapPage = this._readGapPage(options);
        const loaded = LumenEngineSerializableProbe.loadFromPath(options.engineSourceRoot.trim());
        const catalog = LumenCuratedSchemaCatalog.shared();
        const owners = [...catalog.listComponentTypes(), ...catalog.listEmbeddedTypes()].sort();
        const allGaps: ILumenFieldWhitelistGapItem[] = [];

        for (const componentType of owners) {
            const engineFields = loaded.catalog.get(componentType);
            const curatedFields = catalog.curatedFieldsForType(componentType);
            if (engineFields == null || engineFields.length === 0 || curatedFields == null) {
                continue;
            }
            allGaps.push(...this._diffFields(componentType, engineFields, curatedFields));
        }

        allGaps.sort((left, right) => {
            const byType = left.componentType.localeCompare(right.componentType);
            if (byType !== 0) {
                return byType;
            }
            return left.apiName.localeCompare(right.apiName);
        });

        const sliced = allGaps.slice(gapPage.offset, gapPage.offset + gapPage.limit);
        const truncated = gapPage.offset + sliced.length < allGaps.length;

        return {
            sourceRoot: options.engineSourceRoot.trim(),
            classCount: loaded.classCount,
            typedCount: loaded.typedCount,
            inEngineNotInWhitelistFields: {
                items: sliced,
                total: allGaps.length,
                offset: gapPage.offset,
                limit: gapPage.limit,
                truncated,
                nextOffset: truncated ? gapPage.offset + sliced.length : null,
                autoMap: 'none',
                filter: 'engine-serializable-vs-curated',
            },
        };
    }

    /**
     * @description 规范化分页参数。
     * @param options 探测选项
     * @returns 合法 offset / limit
     */
    private static _readGapPage(options: ILumenFieldWhitelistGapProbeOptions): {
        readonly offset: number;
        readonly limit: number;
    } {
        const offset = options.gapOffset ?? 0;
        const limit = options.gapLimit ?? 40;
        if (!Number.isInteger(offset) || offset < 0) {
            throw new Error('lumen_cocos_info_gap_offset_invalid');
        }
        if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
            throw new Error('lumen_cocos_info_gap_limit_invalid');
        }
        return { offset, limit };
    }

    /**
     * @description 引擎字段相对策展表的新增项。
     * @param componentType 类型名
     * @param engineFields 引擎字段
     * @param curatedFields 策展字段
     * @returns 缺口列表
     */
    private static _diffFields(
        componentType: string,
        engineFields: readonly ILumenPropertyFieldSpec[],
        curatedFields: readonly ILumenPropertyFieldSpec[],
    ): ILumenFieldWhitelistGapItem[] {
        const curatedApi = new Set(curatedFields.map((field) => field.apiName));
        const curatedSerialized = new Set(curatedFields.map((field) => field.serializedName));
        const gaps: ILumenFieldWhitelistGapItem[] = [];
        for (const field of engineFields) {
            if (curatedApi.has(field.apiName) || curatedSerialized.has(field.serializedName)) {
                continue;
            }
            gaps.push({
                componentType,
                apiName: field.apiName,
                serializedName: field.serializedName,
                kind: field.kind,
            });
        }
        return gaps;
    }
}
