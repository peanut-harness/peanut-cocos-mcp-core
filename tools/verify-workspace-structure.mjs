import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';

import { InternalModuleCatalog } from './internal-module-catalog.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const expectedWorkspaces = [
    'packages/protocol',
    'packages/sdk',
    'packages/engine',
    'packages/hosts',
    'apps/panel',
];
const allowedWorkspaceDependencies = new Map([
    ['packages/protocol', []],
    ['packages/sdk', ['@peanut/pod-protocol']],
    ['packages/engine', ['@peanut/pod-protocol', '@peanut/pod-sdk']],
    ['packages/hosts', ['@peanut/pod-engine', '@peanut/pod-protocol', '@peanut/pod-sdk']],
    ['apps/panel', []],
]);
const ignoredDirectoryNames = new Set(['.git', '.npm-cache', 'dist', 'evidence', 'node_modules', 'release']);

const rootManifest = JSON.parse(readFileSync(join(repositoryRoot, 'package.json'), 'utf8'));
if (JSON.stringify(rootManifest.workspaces) !== JSON.stringify(expectedWorkspaces)) {
    throw new Error('workspace_layout_drift');
}

const forbiddenTopLevelPackages = readdirSync(join(repositoryRoot, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !['protocol', 'sdk', 'engine', 'hosts'].includes(name));
if (forbiddenTopLevelPackages.length > 0) {
    throw new Error(`unexpected_top_level_packages:${forbiddenTopLevelPackages.join(',')}`);
}

const workspaceManifests = new Map();
for (const workspace of expectedWorkspaces) {
    const manifestPath = join(repositoryRoot, workspace, 'package.json');
    if (!existsSync(manifestPath)) {
        throw new Error(`workspace_manifest_missing:${workspace}`);
    }
    const workspaceManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    workspaceManifests.set(workspace, workspaceManifest);
    const peanutDependencies = Object.keys(workspaceManifest.dependencies ?? {})
        .filter((dependencyName) => dependencyName.startsWith('@peanut/'))
        .sort();
    const expectedDependencies = [...(allowedWorkspaceDependencies.get(workspace) ?? [])].sort();
    if (JSON.stringify(peanutDependencies) !== JSON.stringify(expectedDependencies)) {
        throw new Error(`workspace_dependency_drift:${workspace}:${peanutDependencies.join(',')}`);
    }
}

const internalModuleCatalog = new InternalModuleCatalog(repositoryRoot);
const engineModules = internalModuleCatalog.list('engine');
const hostModules = internalModuleCatalog.list('hosts');
for (const moduleRecord of [...engineModules, ...hostModules]) {
    if (moduleRecord.manifest.private !== true || moduleRecord.manifest.peanut?.verify !== true) {
        throw new Error(`internal_module_governance_missing:${moduleRecord.name}`);
    }
    for (const taskName of ['build', 'typecheck', 'test']) {
        if (typeof moduleRecord.manifest.scripts?.[taskName] !== 'string') {
            throw new Error(`internal_module_task_missing:${moduleRecord.name}:${taskName}`);
        }
    }
}

const engineManifest = workspaceManifests.get('packages/engine');
const engineExportKeys = Object.keys(engineManifest.exports ?? {}).sort();
const expectedEngineExportKeys = engineModules.map((moduleRecord) => `./${basename(moduleRecord.path)}`).sort();
if (JSON.stringify(engineExportKeys) !== JSON.stringify(expectedEngineExportKeys)) {
    throw new Error(`engine_module_exports_drift:${engineExportKeys.join(',')}`);
}
for (const moduleRecord of engineModules) {
    const expectedName = `@peanut/pod-engine/${basename(moduleRecord.path)}`;
    if (moduleRecord.name !== expectedName) {
        throw new Error(`engine_module_name_drift:${moduleRecord.path}:${moduleRecord.name}`);
    }
    const importedDependencies = collectInternalModuleImports(moduleRecord.directory)
        .filter((dependencyName) => dependencyName !== moduleRecord.name)
        .sort();
    const declaredDependencies = [...moduleRecord.internalDependencies].sort();
    if (JSON.stringify(importedDependencies) !== JSON.stringify(declaredDependencies)) {
        throw new Error(
            `internal_module_dependency_drift:${moduleRecord.name}:declared=${declaredDependencies.join(',')}:imported=${importedDependencies.join(',')}`,
        );
    }
}

const creatorProfileDocument = JSON.parse(
    readFileSync(join(repositoryRoot, 'specs/creator-profiles/creator-profiles.json'), 'utf8'),
);
const expectedHostProfiles = creatorProfileDocument.profiles
    .filter((profile) => profile.defaultSupport !== 'unsupported')
    .map((profile) => profile.id)
    .sort();
const actualHostProfiles = hostModules.map((moduleRecord) => moduleRecord.manifest.peanut?.profileId).sort();
if (JSON.stringify(actualHostProfiles) !== JSON.stringify(expectedHostProfiles)) {
    throw new Error(`creator_host_profile_drift:${actualHostProfiles.join(',')}`);
}
for (const moduleRecord of hostModules) {
    const profile = creatorProfileDocument.profiles.find(
        (candidate) => candidate.id === moduleRecord.manifest.peanut.profileId,
    );
    const expectedEditorRange = `>=${profile.minVersion} <${profile.maxVersionExclusive}`;
    if (moduleRecord.manifest.editor !== expectedEditorRange) {
        throw new Error(`creator_host_editor_range_drift:${moduleRecord.name}:${moduleRecord.manifest.editor}`);
    }
}

const staleLocks = [];
const staleFileDependencies = [];
const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) {
            continue;
        }
        const absolutePath = join(directory, entry.name);
        if (entry.isDirectory()) {
            visit(absolutePath);
            continue;
        }
        if (entry.name === 'package-lock.json' && absolutePath !== join(repositoryRoot, 'package-lock.json')) {
            staleLocks.push(relative(repositoryRoot, absolutePath));
        }
        if (entry.name === 'package.json' && readFileSync(absolutePath, 'utf8').includes('"file:')) {
            staleFileDependencies.push(relative(repositoryRoot, absolutePath));
        }
    }
};
visit(repositoryRoot);
if (staleLocks.length > 0) {
    throw new Error(`nested_package_locks:${staleLocks.join(',')}`);
}
if (staleFileDependencies.length > 0) {
    throw new Error(`nested_file_dependencies:${staleFileDependencies.join(',')}`);
}

const forbiddenImports = [
    ['packages/sdk/src', /(?:from\s+|require\()["']@peanut\/pod-(?:engine|hosts|panel)/u],
    ['packages/engine', /(?:from\s+|require\()["']@peanut\/pod-(?:hosts|panel)/u],
    ['apps/panel/src', /(?:from\s+|require\()["']@peanut\/pod-(?:engine|hosts)/u],
];
for (const [relativeDirectory, pattern] of forbiddenImports) {
    const sourceFiles = [];
    const collectSources = (directory) => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) {
                continue;
            }
            const absolutePath = join(directory, entry.name);
            if (entry.isDirectory()) {
                collectSources(absolutePath);
            } else if (/\.(?:ts|mts|js|mjs)$/u.test(entry.name)) {
                sourceFiles.push(absolutePath);
            }
        }
    };
    collectSources(join(repositoryRoot, relativeDirectory));
    const violation = sourceFiles.find((sourcePath) => pattern.test(readFileSync(sourcePath, 'utf8')));
    if (violation != null) {
        throw new Error(`forbidden_workspace_import:${relative(repositoryRoot, violation)}`);
    }
}

process.stdout.write(`${JSON.stringify({ ok: true, workspaces: expectedWorkspaces }, null, 2)}\n`);

function collectInternalModuleImports(directory) {
    const sourceFiles = [];
    const collectSources = (currentDirectory) => {
        for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
            if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) {
                continue;
            }
            const absolutePath = join(currentDirectory, entry.name);
            if (entry.isDirectory()) {
                collectSources(absolutePath);
            } else if (/\.(?:ts|mts|cts|js|mjs|cjs)$/u.test(entry.name)) {
                sourceFiles.push(absolutePath);
            }
        }
    };
    collectSources(directory);
    const dependencyNames = new Set();
    const importPattern = /(?:from\s+|import\(\s*|require\(\s*)['"](@peanut\/pod-engine\/[a-z0-9-]+)['"]/gu;
    for (const sourcePath of sourceFiles) {
        const source = readFileSync(sourcePath, 'utf8');
        importPattern.lastIndex = 0;
        for (const match of source.matchAll(importPattern)) {
            dependencyNames.add(match[1]);
        }
    }
    return [...dependencyNames];
}
