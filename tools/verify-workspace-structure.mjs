import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

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

for (const workspace of expectedWorkspaces) {
    const manifestPath = join(repositoryRoot, workspace, 'package.json');
    if (!existsSync(manifestPath)) {
        throw new Error(`workspace_manifest_missing:${workspace}`);
    }
    const workspaceManifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const peanutDependencies = Object.keys(workspaceManifest.dependencies ?? {})
        .filter((dependencyName) => dependencyName.startsWith('@peanut/'))
        .sort();
    const expectedDependencies = [...(allowedWorkspaceDependencies.get(workspace) ?? [])].sort();
    if (JSON.stringify(peanutDependencies) !== JSON.stringify(expectedDependencies)) {
        throw new Error(`workspace_dependency_drift:${workspace}:${peanutDependencies.join(',')}`);
    }
}

const staleLocks = [];
const staleFileDependencies = [];
const ignoredDirectoryNames = new Set(['.git', '.npm-cache', 'dist', 'evidence', 'node_modules', 'release']);
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
