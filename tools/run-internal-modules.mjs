import { existsSync, rmSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { InternalModuleCatalog } from './internal-module-catalog.mjs';

const repositoryRoot = resolve(import.meta.dirname, '..');
const catalog = new InternalModuleCatalog(repositoryRoot);
const task = process.argv[2];
const requestedGroup = process.argv[3];
const selectedGroups = requestedGroup == null ? catalog.listGroups() : Object.freeze([requestedGroup]);

if (task === 'clean') {
    cleanWorkspaceOutputs();
    for (const group of selectedGroups) {
        for (const moduleRecord of catalog.list(group)) {
            cleanModuleOutputs(moduleRecord);
        }
    }
    process.exit(0);
}

if (!['build', 'typecheck', 'test', 'pack'].includes(task)) {
    throw new Error(`unsupported_internal_task:${String(task)}`);
}

const npmCli = process.env.npm_execpath;
if (npmCli == null) {
    throw new Error('npm_execpath_unavailable');
}
for (const group of selectedGroups) {
    for (const moduleRecord of catalog.list(group)) {
        const result = spawnSync(process.execPath, [npmCli, 'run', task, '--if-present'], {
            cwd: moduleRecord.directory,
            stdio: 'inherit',
            env: process.env,
        });
        if (result.error != null) {
            throw result.error;
        }
        if (result.status !== 0) {
            process.exit(result.status ?? 1);
        }
    }
}

function cleanWorkspaceOutputs() {
    if (requestedGroup != null) {
        return;
    }
    for (const relativeDirectory of ['packages/protocol/dist', 'packages/sdk/dist', 'packages/hosts/dist', 'apps/panel/dist']) {
        removeOutputDirectory(resolve(repositoryRoot, relativeDirectory));
    }
}

function cleanModuleOutputs(moduleRecord) {
    for (const outputName of ['dist', 'release']) {
        removeOutputDirectory(resolve(moduleRecord.directory, outputName));
    }
}

function removeOutputDirectory(outputPath) {
    const relativeOutputPath = relative(repositoryRoot, outputPath);
    if (relativeOutputPath.startsWith('..') || isAbsolute(relativeOutputPath)) {
        throw new Error(`internal_output_path_escape:${outputPath}`);
    }
    if (existsSync(outputPath)) {
        rmSync(outputPath, { recursive: true, force: true });
    }
}
