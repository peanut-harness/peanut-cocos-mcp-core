import type { CreatorPhase } from "./creator-version.js";

/**
 * @description Creator 主次版本号。
 */
export interface ICreatorVersionNumbers {
    /**
     * @description 主版本号。
     */
    readonly major: number;

    /**
     * @description 次版本号。
     */
    readonly minor: number;

    /**
     * @description 修订版本号。
     */
    readonly patch: number;
}

/**
 * @description Creator 版本 → phase 映射（CLI、runtime、governance 单一真相源）。
 */
export class CreatorPhaseResolver {
    /**
     * @description 解析 Creator 主次修订号。
     * @param rawVersion 原始版本字符串
     * @returns 数字三元组
     */
    public static parseVersionNumbers(rawVersion: string): ICreatorVersionNumbers {
        const parts = rawVersion
            .replace(/[^\d.]/g, "")
            .split(".")
            .filter((item) => item.length > 0);
        return {
            major: Number(parts[0] ?? "0"),
            minor: Number(parts[1] ?? "0"),
            patch: Number(parts[2] ?? "0"),
        };
    }

    /**
     * @description 将版本映射为 CreatorPhase。
     * @param rawVersion Creator 版本
     * @returns phase
     */
    public static resolvePhase(rawVersion: string): CreatorPhase {
        const { major, minor } = CreatorPhaseResolver.parseVersionNumbers(rawVersion);
        return CreatorPhaseResolver.resolvePhaseFromNumbers(rawVersion, major, minor);
    }

    /**
     * @description 由主次版本号推导 phase。
     * @param rawVersion 原始版本（仅用于错误信息）
     * @param major 主版本
     * @param minor 次版本
     * @returns phase
     */
    public static resolvePhaseFromNumbers(
        rawVersion: string,
        major: number,
        minor: number,
    ): CreatorPhase {
        if (major === 3 && minor >= 6 && minor <= 8) {
            return "editor_api_stable";
        }
        if (major === 3 && minor >= 0 && minor <= 5) {
            return "creator_3x_early";
        }
        if (major === 2 && minor >= 4) {
            return "creator_2x";
        }
        throw new Error(`unsupported_cocos_creator_version:${rawVersion}`);
    }
}


