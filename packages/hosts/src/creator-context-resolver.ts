import {
    CreatorPhaseResolver,
    type CreatorHostFamily,
    type CreatorProfileId,
    type CreatorProfileSupport,
    type ICreatorContext,
    type ICreatorVersionInfo,
} from '@peanut/pod-protocol';

interface ICreatorProfileDefinition {
    /**
     * @description 档案标识。
     */
    readonly id: CreatorProfileId;

    /**
     * @description 档案对应的 Creator API 家族。
     */
    readonly hostFamily: CreatorHostFamily;

    /**
     * @description 未命中实机验证版本时使用的默认支持等级。
     */
    readonly defaultSupport: CreatorProfileSupport;

    /**
     * @description 已通过宿主实机验证的精确版本集合。
     */
    readonly verifiedVersions: readonly string[];
}

const PROFILE_DEFINITIONS: Readonly<Record<CreatorProfileId, ICreatorProfileDefinition>> = {
    'creator-24': {
        id: 'creator-24',
        hostFamily: 'creator-2x',
        defaultSupport: 'experimental',
        verifiedVersions: [],
    },
    'creator-30-35': {
        id: 'creator-30-35',
        hostFamily: 'creator-3x',
        defaultSupport: 'experimental',
        verifiedVersions: [],
    },
    'creator-36-37': {
        id: 'creator-36-37',
        hostFamily: 'creator-3x',
        defaultSupport: 'unsupported',
        verifiedVersions: [],
    },
    'creator-38': {
        id: 'creator-38',
        hostFamily: 'creator-3x',
        defaultSupport: 'experimental',
        verifiedVersions: ['3.8.7'],
    },
};

/**
 * @description 将宿主和项目版本解析为唯一可信的 Creator 运行上下文。
 * @oopException 该函数是宿主启动边界的无状态解析入口，保留函数形式便于各版本扩展复用。
 */
export function resolveCreatorContext(hostVersion: string, projectVersion?: string | null): ICreatorContext {
    const version = parseVersion(hostVersion);
    const normalizedHostVersion = normalizeVersion(version);
    const profile = PROFILE_DEFINITIONS[resolveProfileId(version)];
    const parsedProjectVersion = projectVersion == null ? null : parseVersion(projectVersion);
    const versionMatchesProject =
        parsedProjectVersion == null || normalizeVersion(parsedProjectVersion) === normalizedHostVersion;
    const verified = profile.verifiedVersions.includes(normalizedHostVersion);
    const support: CreatorProfileSupport = verified ? 'full' : profile.defaultSupport;
    const diagnostics = [
        `profile:${profile.id}`,
        `host:${normalizedHostVersion}`,
        parsedProjectVersion == null ? 'project_version:unknown' : `project:${normalizeVersion(parsedProjectVersion)}`,
        versionMatchesProject ? 'host_project_version:match_or_unknown' : 'host_project_version:mismatch',
        verified ? 'evidence:host_verified' : 'evidence:missing',
    ];
    return {
        version,
        projectVersion: parsedProjectVersion,
        profileId: profile.id,
        hostFamily: profile.hostFamily,
        support,
        writesAllowed: support === 'full' && versionMatchesProject,
        diagnostics,
    };
}

function parseVersion(rawVersion: string): ICreatorVersionInfo {
    const trimmed = rawVersion.trim();
    if (trimmed.length === 0) {
        throw new Error('creator_version_unavailable');
    }
    const numbers = CreatorPhaseResolver.parseVersionNumbers(trimmed);
    const phase = CreatorPhaseResolver.resolvePhaseFromNumbers(trimmed, numbers.major, numbers.minor);
    return { raw: trimmed, ...numbers, phase };
}

function normalizeVersion(version: ICreatorVersionInfo): string {
    return `${version.major}.${version.minor}.${version.patch}`;
}

function resolveProfileId(version: ICreatorVersionInfo): CreatorProfileId {
    if (version.major === 2 && version.minor >= 4) return 'creator-24';
    if (version.major === 3 && version.minor <= 5) return 'creator-30-35';
    if (version.major === 3 && version.minor <= 7) return 'creator-36-37';
    if (version.major === 3 && version.minor === 8) return 'creator-38';
    throw new Error(`unsupported_cocos_creator_version:${version.raw}`);
}
