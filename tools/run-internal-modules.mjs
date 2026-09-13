import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repositoryRoot = resolve(import.meta.dirname, '..');
const groups = {
  engine: [
    'packages/engine/modules/assets',
    'packages/engine/modules/installation',
    'packages/engine/modules/runtime',
    'packages/engine/modules/lumen',
    'packages/engine/modules/lumen-24',
    'packages/engine/modules/template-cache',
    'packages/engine/modules/kernel',
    'packages/engine/modules/mcp',
    'packages/engine/modules/policy',
    'packages/engine/modules/creator-plugin'
  ],
  hosts: [
    'packages/hosts/modules/creator-24',
    'packages/hosts/modules/creator-30-35',
    'packages/hosts/modules/creator-38'
  ]
};

const task = process.argv[2];
const requestedGroup = process.argv[3];
const selectedGroups = requestedGroup == null ? Object.keys(groups) : [requestedGroup];

if (task === 'clean') {
  if (requestedGroup == null) {
    for (const relativeDirectory of ['packages/protocol/dist', 'packages/sdk/dist', 'packages/hosts/dist', 'apps/panel/dist']) {
      const outputPath = resolve(repositoryRoot, relativeDirectory);
      if (existsSync(outputPath)) {
        rmSync(outputPath, { recursive: true, force: true });
      }
    }
  }
  for (const group of selectedGroups) {
    for (const relativeDirectory of groups[group] ?? []) {
      for (const outputName of ['dist', 'release']) {
        const outputPath = resolve(repositoryRoot, relativeDirectory, outputName);
        if (existsSync(outputPath)) {
          rmSync(outputPath, { recursive: true, force: true });
        }
      }
    }
  }
  process.exit(0);
}

if (!['build', 'typecheck', 'test', 'pack'].includes(task)) {
  throw new Error(`unsupported_internal_task:${String(task)}`);
}

for (const group of selectedGroups) {
  const modules = groups[group];
  if (modules == null) {
    throw new Error(`unknown_internal_group:${group}`);
  }
  for (const relativeDirectory of modules) {
    const moduleDirectory = resolve(repositoryRoot, relativeDirectory);
    const npmCli = process.env.npm_execpath;
    if (npmCli == null) {
      throw new Error('npm_execpath_unavailable');
    }
    const result = spawnSync(
      process.execPath,
      [npmCli, 'run', task, '--if-present'],
      {
        cwd: moduleDirectory,
        stdio: 'inherit',
        env: process.env,
      },
    );
    if (result.error != null) {
      throw result.error;
    }
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }
}
