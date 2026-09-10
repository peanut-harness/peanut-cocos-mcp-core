import { LumenTerrainNativeCodec, type ILumenTerrainNativePayload } from './terrain-native-codec';

/**
 * @description 单次读写的最大顶点数，避免 MCP 上下文被整张高度场撑爆。
 */
export const LUMEN_TERRAIN_MAX_WINDOW_SAMPLES = 2048;

/**
 * @description inspect 返回的局部峰值上限。
 */
export const LUMEN_TERRAIN_MAX_PEAKS = 8;

/**
 * @description 已夹紧到网格内的顶点 AABB（含端点）。
 */
export interface ILumenTerrainRegionBox {
    /** @description 最小 i（x）。 */
    readonly iMin: number;
    /** @description 最大 i（x）。 */
    readonly iMax: number;
    /** @description 最小 j（z）。 */
    readonly jMin: number;
    /** @description 最大 j（z）。 */
    readonly jMax: number;
}

/**
 * @description 网格约定：`x = i * tileSize`，`z = j * tileSize`，`index = j * vertexCount[0] + i`。
 */
export interface ILumenTerrainLayoutInspect {
    /** @description 高度数组遍历顺序。 */
    readonly order: 'rowMajor';
    /** @description `i` 对应的本地轴。 */
    readonly iAxis: 'x';
    /** @description `j` 对应的本地轴。 */
    readonly jAxis: 'z';
}

/**
 * @description 局部高度峰值（相对当前 inspect 域）。
 */
export interface ILumenTerrainPeakInspect {
    /** @description 顶点 i。 */
    readonly i: number;
    /** @description 顶点 j。 */
    readonly j: number;
    /** @description 本地 x（米）。 */
    readonly x: number;
    /** @description 本地 z（米）。 */
    readonly z: number;
    /** @description 高度（米）。 */
    readonly height: number;
}

/**
 * @description 地形网格寻址：顶点盒或本地圆 → 同一套 AABB，供 inspect / assetSet 共用。
 */
export class LumenTerrainGrid {
    /**
     * @description 固定布局说明。
     * @returns 布局
     */
    public static layout(): ILumenTerrainLayoutInspect {
        return { order: 'rowMajor', iAxis: 'x', jAxis: 'z' };
    }

    /**
     * @description 解析 `region`：顶点盒 `{ iMin, iMax, jMin, jMax }` 或本地圆 `{ x, z, radius }`。
     * @param value 未受信输入
     * @param payload 地形
     * @returns 夹紧后的顶点盒
     */
    public static parseRegion(value: unknown, payload: ILumenTerrainNativePayload): ILumenTerrainRegionBox {
        if (value == null || typeof value !== 'object' || Array.isArray(value)) {
            throw new Error('lumen_property_type:region:object');
        }
        const record = value as Record<string, unknown>;
        const keys = Object.keys(record);
        for (const key of keys) {
            if (key !== 'iMin' && key !== 'iMax' && key !== 'jMin' && key !== 'jMax' && key !== 'x' && key !== 'z' && key !== 'radius') {
                throw new Error(`lumen_property_type:region.${key}:unknown`);
            }
        }
        const hasVertex =
            record.iMin !== undefined || record.iMax !== undefined || record.jMin !== undefined || record.jMax !== undefined;
        const hasWorld = record.x !== undefined || record.z !== undefined || record.radius !== undefined;
        if (hasVertex && hasWorld) {
            throw new Error('lumen_property_type:region:vertex_or_world');
        }
        if (!hasVertex && !hasWorld) {
            throw new Error('lumen_property_type:region:vertex_or_world');
        }
        const [vertexX, vertexZ] = LumenTerrainNativeCodec.vertexCount(payload.blockCount);
        if (hasVertex) {
            return LumenTerrainGrid._clampBox(
                {
                    iMin: LumenTerrainGrid._requireInt(record.iMin, 'region.iMin'),
                    iMax: LumenTerrainGrid._requireInt(record.iMax, 'region.iMax'),
                    jMin: LumenTerrainGrid._requireInt(record.jMin, 'region.jMin'),
                    jMax: LumenTerrainGrid._requireInt(record.jMax, 'region.jMax'),
                },
                vertexX,
                vertexZ,
            );
        }
        const x = LumenTerrainGrid._requireNumber(record.x, 'region.x');
        const z = LumenTerrainGrid._requireNumber(record.z, 'region.z');
        const radius = LumenTerrainGrid._requireNumber(record.radius, 'region.radius');
        if (radius <= 0) {
            throw new Error('lumen_property_type:region.radius:number>0');
        }
        const [sizeX, sizeZ] = LumenTerrainNativeCodec.sizeMeters(payload.tileSize, payload.blockCount);
        if (x + radius < 0 || z + radius < 0 || x - radius > sizeX || z - radius > sizeZ) {
            throw new Error('lumen_terrain_region_out_of_bounds');
        }
        const tile = payload.tileSize;
        return LumenTerrainGrid._clampBox(
            {
                iMin: Math.floor((x - radius) / tile),
                iMax: Math.ceil((x + radius) / tile),
                jMin: Math.floor((z - radius) / tile),
                jMax: Math.ceil((z + radius) / tile),
            },
            vertexX,
            vertexZ,
        );
    }

    /**
     * @description 窗宽（顶点数）。
     * @param box 顶点盒
     * @returns `[width, depth]`
     */
    public static windowSize(box: ILumenTerrainRegionBox): [number, number] {
        return [box.iMax - box.iMin + 1, box.jMax - box.jMin + 1];
    }

    /**
     * @description 窗内样本数。
     * @param box 顶点盒
     * @returns 样本数
     */
    public static sampleCount(box: ILumenTerrainRegionBox): number {
        const [width, depth] = LumenTerrainGrid.windowSize(box);
        return width * depth;
    }

    /**
     * @description 拒绝超过上限的窗口。
     * @param box 顶点盒
     */
    public static assertWindowBudget(box: ILumenTerrainRegionBox): void {
        const count = LumenTerrainGrid.sampleCount(box);
        if (count > LUMEN_TERRAIN_MAX_WINDOW_SAMPLES) {
            throw new Error(`lumen_terrain_region_too_large:${count}:max=${LUMEN_TERRAIN_MAX_WINDOW_SAMPLES}`);
        }
    }

    /**
     * @description 读取窗口高度（行主序，j 外层）。
     * @param payload 地形
     * @param box 顶点盒
     * @returns 高度（米）
     */
    public static readWindow(payload: ILumenTerrainNativePayload, box: ILumenTerrainRegionBox): number[] {
        const [vertexX] = LumenTerrainNativeCodec.vertexCount(payload.blockCount);
        const heights: number[] = [];
        for (let j = box.jMin; j <= box.jMax; j += 1) {
            for (let i = box.iMin; i <= box.iMax; i += 1) {
                heights.push(LumenTerrainNativeCodec.decodeHeightMeters(payload.heightCodes[j * vertexX + i]));
            }
        }
        return heights;
    }

    /**
     * @description 用窗口高度覆盖对应顶点，其余不变。
     * @param payload 地形
     * @param box 顶点盒
     * @param heights 行主序高度
     * @returns 新编码
     */
    public static writeWindow(
        payload: ILumenTerrainNativePayload,
        box: ILumenTerrainRegionBox,
        heights: readonly unknown[],
    ): Uint16Array {
        LumenTerrainGrid.assertWindowBudget(box);
        const expected = LumenTerrainGrid.sampleCount(box);
        if (heights.length !== expected) {
            throw new Error(`lumen_terrain_height_count:${heights.length}:expected=${expected}`);
        }
        const [vertexX] = LumenTerrainNativeCodec.vertexCount(payload.blockCount);
        const next = new Uint16Array(payload.heightCodes);
        let cursor = 0;
        for (let j = box.jMin; j <= box.jMax; j += 1) {
            for (let i = box.iMin; i <= box.iMax; i += 1) {
                const meters = heights[cursor];
                cursor += 1;
                if (typeof meters !== 'number' || !Number.isFinite(meters)) {
                    throw new Error(`lumen_property_type:heights[${cursor - 1}]:number`);
                }
                next[j * vertexX + i] = LumenTerrainNativeCodec.encodeHeightMeters(meters);
            }
        }
        return next;
    }

    /**
     * @description 稀疏写入 `{ i, j, height }`。
     * @param payload 地形
     * @param value 样本列表
     * @returns 新编码
     */
    public static writeSamples(payload: ILumenTerrainNativePayload, value: unknown): Uint16Array {
        if (!Array.isArray(value)) {
            throw new Error('lumen_property_type:samples:array');
        }
        if (value.length > LUMEN_TERRAIN_MAX_WINDOW_SAMPLES) {
            throw new Error(`lumen_terrain_region_too_large:${value.length}:max=${LUMEN_TERRAIN_MAX_WINDOW_SAMPLES}`);
        }
        const [vertexX, vertexZ] = LumenTerrainNativeCodec.vertexCount(payload.blockCount);
        const next = new Uint16Array(payload.heightCodes);
        for (let index = 0; index < value.length; index += 1) {
            const item = value[index];
            if (item == null || typeof item !== 'object' || Array.isArray(item)) {
                throw new Error(`lumen_property_type:samples[${index}]:object`);
            }
            const record = item as Record<string, unknown>;
            const i = LumenTerrainGrid._requireInt(record.i, `samples[${index}].i`);
            const j = LumenTerrainGrid._requireInt(record.j, `samples[${index}].j`);
            if (i < 0 || i >= vertexX || j < 0 || j >= vertexZ) {
                throw new Error(`lumen_terrain_sample_out_of_bounds:${index}:${i},${j}`);
            }
            const height = LumenTerrainGrid._requireNumber(record.height, `samples[${index}].height`);
            next[j * vertexX + i] = LumenTerrainNativeCodec.encodeHeightMeters(height);
        }
        return next;
    }

    /**
     * @description 域内高度最小/最大。
     * @param heights 高度
     * @returns `[min, max]`
     */
    public static minMax(heights: readonly number[]): [number, number] {
        if (heights.length === 0) {
            return [0, 0];
        }
        let min = heights[0];
        let max = heights[0];
        for (let i = 1; i < heights.length; i += 1) {
            const value = heights[i];
            if (value < min) {
                min = value;
            }
            if (value > max) {
                max = value;
            }
        }
        return [min, max];
    }

    /**
     * @description 域内局部峰值，按高度降序，去近邻。
     * @param payload 地形
     * @param box 检索盒
     * @returns 峰值
     */
    public static findPeaks(payload: ILumenTerrainNativePayload, box: ILumenTerrainRegionBox): ILumenTerrainPeakInspect[] {
        const [vertexX, vertexZ] = LumenTerrainNativeCodec.vertexCount(payload.blockCount);
        const candidates: ILumenTerrainPeakInspect[] = [];
        for (let j = box.jMin; j <= box.jMax; j += 1) {
            for (let i = box.iMin; i <= box.iMax; i += 1) {
                const height = LumenTerrainNativeCodec.decodeHeightMeters(payload.heightCodes[j * vertexX + i]);
                let minNeighbor = height;
                let isPeak = true;
                for (let dj = -1; dj <= 1; dj += 1) {
                    for (let di = -1; di <= 1; di += 1) {
                        if (di === 0 && dj === 0) {
                            continue;
                        }
                        const ni = i + di;
                        const nj = j + dj;
                        if (ni < 0 || ni >= vertexX || nj < 0 || nj >= vertexZ) {
                            continue;
                        }
                        const neighbor = LumenTerrainNativeCodec.decodeHeightMeters(payload.heightCodes[nj * vertexX + ni]);
                        if (neighbor > height) {
                            isPeak = false;
                        }
                        if (neighbor < minNeighbor) {
                            minNeighbor = neighbor;
                        }
                    }
                }
                if (isPeak && height > minNeighbor) {
                    candidates.push({
                        i,
                        j,
                        x: i * payload.tileSize,
                        z: j * payload.tileSize,
                        height,
                    });
                }
            }
        }
        candidates.sort((left, right) => right.height - left.height);
        const peaks: ILumenTerrainPeakInspect[] = [];
        for (const candidate of candidates) {
            const near = peaks.some((peak) => Math.max(Math.abs(peak.i - candidate.i), Math.abs(peak.j - candidate.j)) <= 2);
            if (near) {
                continue;
            }
            peaks.push(candidate);
            if (peaks.length >= LUMEN_TERRAIN_MAX_PEAKS) {
                break;
            }
        }
        return peaks;
    }

    /**
     * @description 整幅网格的顶点盒。
     * @param payload 地形
     * @returns 全图盒
     */
    public static fullBox(payload: ILumenTerrainNativePayload): ILumenTerrainRegionBox {
        const [vertexX, vertexZ] = LumenTerrainNativeCodec.vertexCount(payload.blockCount);
        return { iMin: 0, iMax: vertexX - 1, jMin: 0, jMax: vertexZ - 1 };
    }

    /**
     * @description 夹紧并校验非空盒。
     * @param box 原始盒
     * @param vertexX i 顶点数
     * @param vertexZ j 顶点数
     * @returns 夹紧盒
     */
    private static _clampBox(box: ILumenTerrainRegionBox, vertexX: number, vertexZ: number): ILumenTerrainRegionBox {
        if (box.iMin > box.iMax || box.jMin > box.jMax) {
            throw new Error('lumen_property_type:region:min<=max');
        }
        const iMin = Math.max(0, Math.min(vertexX - 1, box.iMin));
        const iMax = Math.max(0, Math.min(vertexX - 1, box.iMax));
        const jMin = Math.max(0, Math.min(vertexZ - 1, box.jMin));
        const jMax = Math.max(0, Math.min(vertexZ - 1, box.jMax));
        if (iMin > iMax || jMin > jMax) {
            throw new Error('lumen_terrain_region_empty');
        }
        return { iMin, iMax, jMin, jMax };
    }

    /**
     * @description 必填整数。
     * @param value 值
     * @param apiName 字段
     * @returns 整数
     */
    private static _requireInt(value: unknown, apiName: string): number {
        if (typeof value !== 'number' || !Number.isInteger(value)) {
            throw new Error(`lumen_property_type:${apiName}:int`);
        }
        return value;
    }

    /**
     * @description 必填有限数。
     * @param value 值
     * @param apiName 字段
     * @returns 数字
     */
    private static _requireNumber(value: unknown, apiName: string): number {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new Error(`lumen_property_type:${apiName}:number`);
        }
        return value;
    }
}
