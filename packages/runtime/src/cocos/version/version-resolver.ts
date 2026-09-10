import type { CreatorPhase, ICreatorVersionInfo } from 'peanut-contracts';
import { CreatorPhaseResolver } from 'peanut-contracts';

/**
 * @description Runtime 版本解析器接口。
 */
export interface IVersionResolver {
    /**
     * @description 返回当前 Runtime 绑定的 Creator 版本信息。
     * @returns 标准化的 Creator 版本信息
     */
    getCurrentVersion(): ICreatorVersionInfo;

    /**
     * @description 判断当前版本是否满足给定的简单 semver 约束。
     * @param range semver 约束字符串，支持 `*`、精确版本和比较表达式
     * @returns 满足约束时返回 `true`
     */
    satisfies(range: string): boolean;

    /**
     * @description 根据版本字符串推导适配阶段。
     * @param version 待解析的版本字符串；省略时使用当前版本
     * @returns 对应的 Creator 阶段标识
     */
    resolvePhase(version?: string): CreatorPhase;
}

/**
 * @description 标准化 Creator 版本解析器。
 */
export class VersionResolver implements IVersionResolver {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _currentVersion: ICreatorVersionInfo;

    /**
     * @description 创建一个新的版本解析器。
     * @param rawVersion 原始 Creator 版本字符串
     */
    public constructor(rawVersion: string) {
        this._currentVersion = VersionResolver._parseVersion(rawVersion);
    }

    /**
     * @description 返回当前 Runtime 绑定的 Creator 版本信息。
     * @returns 标准化的 Creator 版本信息
     */
    public getCurrentVersion(): ICreatorVersionInfo {
        return this._currentVersion;
    }

    /**
     * @description 判断当前版本是否满足给定的简单 semver 约束。
     * @param range semver 约束字符串，支持 `*`、精确版本和比较表达式
     * @returns 满足约束时返回 `true`
     */
    public satisfies(range: string): boolean {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ normalizedRange = range.trim();
        if (normalizedRange.length === 0 || normalizedRange === '*') {
            return true;
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ clauses = normalizedRange.split(/\s+/);
        for (const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ clause of clauses) {
            if (!VersionResolver._evaluateClause(this._currentVersion, clause)) {
                return false;
            }
        }
        return true;
    }

    /**
     * @description 根据版本字符串推导适配阶段。
     * @param version 待解析的版本字符串；省略时使用当前版本
     * @returns 对应的 Creator 阶段标识
     */
    public resolvePhase(version?: string): CreatorPhase {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ rawVersion = version ?? this._currentVersion.raw;
        return VersionResolver._parseVersion(rawVersion).phase;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private static _parseVersion(rawVersion: string): ICreatorVersionInfo {
        const numbers = CreatorPhaseResolver.parseVersionNumbers(rawVersion);
        return {
            raw: rawVersion,
            major: numbers.major,
            minor: numbers.minor,
            patch: numbers.patch,
            phase: CreatorPhaseResolver.resolvePhaseFromNumbers(rawVersion, numbers.major, numbers.minor),
        };
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private static _resolvePhaseByNumbers(rawVersion: string, major: number, minor: number): CreatorPhase {
        return CreatorPhaseResolver.resolvePhaseFromNumbers(rawVersion, major, minor);
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private static _evaluateClause(versionInfo: ICreatorVersionInfo, clause: string): boolean {
        if (clause === '*') {
            return true;
        }

        if (clause.startsWith('>=')) {
            return VersionResolver._compare(versionInfo, VersionResolver._parseVersion(clause.slice(2))) >= 0;
        }
        if (clause.startsWith('<=')) {
            return VersionResolver._compare(versionInfo, VersionResolver._parseVersion(clause.slice(2))) <= 0;
        }
        if (clause.startsWith('>')) {
            return VersionResolver._compare(versionInfo, VersionResolver._parseVersion(clause.slice(1))) > 0;
        }
        if (clause.startsWith('<')) {
            return VersionResolver._compare(versionInfo, VersionResolver._parseVersion(clause.slice(1))) < 0;
        }

        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ exactVersion = VersionResolver._parseVersion(clause);
        return VersionResolver._compare(versionInfo, exactVersion) === 0;
    }

    /** @description 封装当前职责中的一个处理步骤，并协调所需校验、状态与依赖调用。 */
    private static _compare(left: ICreatorVersionInfo, right: ICreatorVersionInfo): number {
        if (left.major !== right.major) {
            return left.major - right.major;
        }
        if (left.minor !== right.minor) {
            return left.minor - right.minor;
        }
        return left.patch - right.patch;
    }
}


