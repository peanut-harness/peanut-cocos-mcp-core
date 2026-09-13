/**
 * @description Cocos Creator 语义化版本（major.minor.patch），用于属性表白名单兼容。
 */
import { readFileSync } from 'fs';
import { join } from 'path';

export class LumenCocosVersion {
    /**
     * @description 属性表白名单对照基线（`engine-3.8.3`）；无项目版本信息时回退此值。
     */
    public static readonly DEFAULT = LumenCocosVersion.parse('3.8.3');

    /**
     * @description 已验证兼容的上限参考（demo Creator）；更高小版本按字段 `since`/`until` 门控。
     */
    public static readonly COMPAT_HINT = LumenCocosVersion.parse('3.8.7');

    /** @description 主版本。 */
    public readonly major: number;

    /** @description 次版本。 */
    public readonly minor: number;

    /** @description 补丁版本。 */
    public readonly patch: number;

    /**
     * @description 构造版本。
     * @param major 主版本
     * @param minor 次版本
     * @param patch 补丁版本
     */
    public constructor(major: number, minor: number, patch: number) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }

    /**
     * @description 解析 `3.8.7` / `3.8` / `v3.8.7` 形式。
     * @param input 版本字符串
     * @returns 版本对象
     */
    public static parse(input: string): LumenCocosVersion {
        const trimmed = input.trim().replace(/^v/i, '');
        const match = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(trimmed);
        if (match == null) {
            throw new Error(`lumen_cocos_version_invalid:${input}`);
        }
        return new LumenCocosVersion(
            Number.parseInt(match[1] ?? '0', 10),
            Number.parseInt(match[2] ?? '0', 10),
            Number.parseInt(match[3] ?? '0', 10),
        );
    }

    /**
     * @description 从 Creator 工程 `package.json` 的 `creator.version` 读取；失败返回 null。
     * @param projectRoot 项目根
     * @param readFile 可选读文件函数（测试注入）
     * @returns 版本或 null
     */
    public static tryReadFromProject(
        projectRoot: string,
        readFile: (absolutePath: string) => string = (absolutePath) =>
            readFileSync(absolutePath, 'utf8'),
    ): LumenCocosVersion | null {
        try {
            const raw = readFile(join(projectRoot, 'package.json'));
            const parsed = JSON.parse(raw) as { creator?: { version?: unknown } };
            const version = parsed.creator?.version;
            if (typeof version !== 'string' || version.trim().length === 0) {
                return null;
            }
            return LumenCocosVersion.parse(version);
        } catch {
            return null;
        }
    }

    /**
     * @description 与另一版本比较。
     * @param other 另一版本
     * @returns 负/零/正
     */
    public compare(other: LumenCocosVersion): number {
        if (this.major !== other.major) {
            return this.major - other.major;
        }
        if (this.minor !== other.minor) {
            return this.minor - other.minor;
        }
        return this.patch - other.patch;
    }

    /**
     * @description 是否 >= 指定版本字符串。
     * @param version 版本字符串
     * @returns 是否成立
     */
    public isAtLeast(version: string): boolean {
        return this.compare(LumenCocosVersion.parse(version)) >= 0;
    }

    /**
     * @description 是否 < 指定版本字符串。
     * @param version 版本字符串
     * @returns 是否成立
     */
    public isBelow(version: string): boolean {
        return this.compare(LumenCocosVersion.parse(version)) < 0;
    }

    /**
     * @description 规范字符串。
     * @returns `major.minor.patch`
     */
    public toString(): string {
        return `${this.major}.${this.minor}.${this.patch}`;
    }
}
