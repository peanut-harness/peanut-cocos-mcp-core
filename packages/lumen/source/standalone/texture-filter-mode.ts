/**
 * @description Creator 贴图 Filter Mode 面板别名 ↔ `minfilter` / `magfilter` / `mipfilter` 三元组编解码。
 */

/** @description 面板别名对应的 meta 过滤三元组。 */
const FILTER_MODE_TRIPLETS: Readonly<
    Record<
        string,
        {
            readonly minfilter: string;
            readonly magfilter: string;
            readonly mipfilter: string;
        }
    >
> = {
    point: { minfilter: 'nearest', magfilter: 'nearest', mipfilter: 'none' },
    nearest: { minfilter: 'nearest', magfilter: 'nearest', mipfilter: 'none' },
    bilinear: { minfilter: 'linear', magfilter: 'linear', mipfilter: 'none' },
    trilinear: { minfilter: 'linear', magfilter: 'linear', mipfilter: 'linear' },
};

/**
 * @description 贴图采样过滤三元组。
 */
export interface ILumenTextureFilterTriplet {
    /** @description 缩小过滤。 */
    readonly minfilter: string;

    /** @description 放大过滤。 */
    readonly magfilter: string;

    /** @description Mipmap 过滤。 */
    readonly mipfilter: string;
}

/**
 * @description 将 Creator 检视器 Filter Mode 别名展开为 meta 过滤字段。
 */
export class LumenTextureFilterModeCodec {
    /**
     * @description 根据 meta 过滤三元组推断面板别名；无法匹配时返回 `null`。
     * @param triplet 过滤三元组。
     * @returns 面板别名或 `null`。
     */
    public static inferFilterMode(triplet: ILumenTextureFilterTriplet): string | null {
        for (const [alias, expected] of Object.entries(FILTER_MODE_TRIPLETS)) {
            if (
                alias === 'nearest' &&
                expected.minfilter === triplet.minfilter &&
                expected.magfilter === triplet.magfilter &&
                expected.mipfilter === triplet.mipfilter
            ) {
                continue;
            }
            if (
                expected.minfilter === triplet.minfilter &&
                expected.magfilter === triplet.magfilter &&
                expected.mipfilter === triplet.mipfilter
            ) {
                return alias;
            }
        }
        return null;
    }

    /**
     * @description 展开 `filterMode` 面板别名；未知别名时抛出。
     * @param filterMode 面板别名。
     * @returns 过滤三元组。
     */
    public static expandFilterMode(filterMode: string): ILumenTextureFilterTriplet {
        const normalized = filterMode.trim().toLowerCase();
        const triplet = FILTER_MODE_TRIPLETS[normalized];
        if (triplet == null) {
            throw new Error(`lumen_texture_filter_mode_unknown:${filterMode}`);
        }
        return triplet;
    }

    /**
     * @description 将 `filterMode` 别名写入补丁对象，并移除冲突的单独 filter 字段。
     * @param patch 原始 texture 补丁。
     * @returns 展开后的补丁副本。
     */
    public static expandPatch(patch: Readonly<Record<string, unknown>>): Record<string, unknown> {
        const filterMode = patch.filterMode;
        if (filterMode === undefined) {
            return { ...patch };
        }
        if (typeof filterMode !== 'string' || filterMode.trim().length === 0) {
            throw new Error('lumen_texture_filter_mode_type:filterMode:string');
        }
        const expanded = this.expandFilterMode(filterMode);
        const next: Record<string, unknown> = { ...patch };
        delete next.filterMode;
        next.minfilter = expanded.minfilter;
        next.magfilter = expanded.magfilter;
        next.mipfilter = expanded.mipfilter;
        return next;
    }
}
