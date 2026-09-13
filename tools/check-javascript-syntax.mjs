import { readdirSync, statSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const workingDirectory = resolve(process.cwd());
const ignoredDirectoryNames = new Set(['dist', 'node_modules', 'release']);
const supportedExtensions = new Set(['.js', '.cjs', '.mjs']);
const requestedPaths = process.argv.slice(2);

if (requestedPaths.length === 0) {
    throw new Error('javascript_syntax_paths_required');
}

const sourceFiles = [];
for (const requestedPath of requestedPaths) {
    const absolutePath = resolve(workingDirectory, requestedPath);
    const relativePath = relative(workingDirectory, absolutePath);
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
        throw new Error(`javascript_syntax_path_escape:${requestedPath}`);
    }
    collectSourceFiles(absolutePath, sourceFiles);
}

if (sourceFiles.length === 0) {
    throw new Error('javascript_syntax_sources_missing');
}
for (const sourceFile of sourceFiles.sort()) {
    const result = spawnSync(process.execPath, ['--check', sourceFile], { stdio: 'inherit' });
    if (result.error != null) {
        throw result.error;
    }
    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

process.stdout.write(`${JSON.stringify({ ok: true, checkedFiles: sourceFiles.length }, null, 4)}\n`);

function collectSourceFiles(absolutePath, output) {
    const status = statSync(absolutePath);
    if (status.isFile()) {
        if (supportedExtensions.has(extname(absolutePath))) {
            output.push(absolutePath);
        }
        return;
    }
    for (const entry of readdirSync(absolutePath, { withFileTypes: true })) {
        if (entry.isDirectory() && ignoredDirectoryNames.has(entry.name)) {
            continue;
        }
        collectSourceFiles(resolve(absolutePath, entry.name), output);
    }
}
