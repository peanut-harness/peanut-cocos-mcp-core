import {
    CREATOR_PROFILE_DEFINITIONS,
    CreatorPhaseResolver,
    type ICreatorContext,
    type ICreatorProfileDefinition,
    type ICreatorVersionInfo,
} from '@peanut/pod-protocol';

const CREATOR_VERSION_PATTERN = /^(?:v)?(\d+)\.(\d+)\.(\d+)$/u;

/**
 * @description 将宿主和项目版本解析为唯一可信的 Creator 运行上下文。
 */
export class CreatorContextResolver {
    /**
     * @description 根据宿主版本和项目声明版本解析可信 Creator 上下文。
     * @param hostVersion 当前 Creator 编辑器进程报告的版本。
     * @param projectVersion 当前项目声明的 Creator 版本；无法读取时为 null。
     * @returns 可供宿主和引擎执行策略使用的不可变上下文。
     */
    public static resolve(hostVersion: string, projectVersion: string | null = null): ICreatorContext {
        const version = CreatorContextResolver._parseVersion(hostVersion);
        const normalizedHostVersion = CreatorContextResolver._normalizeVersion(version);
        const profile = CreatorContextResolver._resolveProfile(version);
        const parsedProjectVersion = projectVersion == null ? null : CreatorContextResolver._parseVersion(projectVersion);
        const projectVersionMatches =
            parsedProjectVersion != null && CreatorContextResolver._normalizeVersion(parsedProjectVersion) === normalizedHostVersion;
        const verified = profile.verifiedVersions.includes(normalizedHostVersion);
        const writeEnabled = profile.writeEnabledVersions.includes(normalizedHostVersion);
        const diagnostics = [
            `profile:${profile.id}`,
            `host:${normalizedHostVersion}`,
            parsedProjectVersion == null ? 'project_version:unknown' : `project:${CreatorContextResolver._normalizeVersion(parsedProjectVersion)}`,
            parsedProjectVersion == null
                ? 'host_project_version:unknown'
                : projectVersionMatches
                  ? 'host_project_version:match'
                  : 'host_project_version:mismatch',
            verified ? 'evidence:host_verified' : 'evidence:missing',
            writeEnabled ? 'write_evidence:present' : 'write_evidence:missing',
        ];
        return Object.freeze({
            version,
            projectVersion: parsedProjectVersion,
            profileId: profile.id,
            hostFamily: profile.hostFamily,
            support: verified ? 'full' : profile.defaultSupport,
            writesAllowed: writeEnabled && projectVersionMatches,
            diagnostics: Object.freeze(diagnostics),
        });
    }

    /**
     * @description 严格解析 Creator 语义版本，拒绝缺失段和非版本文本。
     * @param rawVersion 未受信的宿主或项目版本文本。
     * @returns 已验证的 Creator 版本信息。
     */
    private static _parseVersion(rawVersion: string): ICreatorVersionInfo {
        const trimmed = rawVersion.trim();
        const match = CREATOR_VERSION_PATTERN.exec(trimmed);
        if (match == null) {
            throw new Error(trimmed.length === 0 ? 'creator_version_unavailable' : `creator_version_invalid:${trimmed}`);
        }
        const major = Number(match[1]);
        const minor = Number(match[2]);
        const patch = Number(match[3]);
        if (![major, minor, patch].every(Number.isSafeInteger)) {
            throw new Error(`creator_version_invalid:${trimmed}`);
        }
        const phase = CreatorPhaseResolver.resolvePhaseFromNumbers(trimmed, major, minor);
        return Object.freeze({ raw: trimmed, major, minor, patch, phase });
    }

    /**
     * @description 从生成的画像目录中查找覆盖指定 Creator 版本的定义。
     * @param version 已验证的 Creator 版本。
     * @returns 唯一匹配的 Creator 画像定义。
     */
    private static _resolveProfile(version: ICreatorVersionInfo): ICreatorProfileDefinition {
        const profile = CREATOR_PROFILE_DEFINITIONS.find((candidate) => {
            return (
                CreatorContextResolver._compareVersionInfo(version, candidate.minVersion) >= 0 &&
                CreatorContextResolver._compareVersionInfo(version, candidate.maxVersionExclusive) < 0
            );
        });
        if (profile == null) {
            throw new Error(`unsupported_cocos_creator_version:${version.raw}`);
        }
        return profile;
    }

    /**
     * @description 将已解析版本与规范中的标准语义版本比较。
     * @param version 已解析的 Creator 版本。
     * @param candidate 标准三段语义版本。
     * @returns 小于、等于或大于零的比较结果。
     */
    private static _compareVersionInfo(version: ICreatorVersionInfo, candidate: string): number {
        const candidateParts = candidate.split('.').map(Number);
        const versionParts = [version.major, version.minor, version.patch];
        for (let index = 0; index < versionParts.length; index += 1) {
            if (versionParts[index] !== candidateParts[index]) {
                return versionParts[index] - candidateParts[index];
            }
        }
        return 0;
    }

    /**
     * @description 将 Creator 版本信息格式化为稳定三段版本文本。
     * @param version 已验证的 Creator 版本。
     * @returns 三段语义版本文本。
     */
    private static _normalizeVersion(version: ICreatorVersionInfo): string {
        return `${version.major}.${version.minor}.${version.patch}`;
    }
}
