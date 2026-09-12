import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { LumenHierarchyRefValidator } from '../source/hierarchy/lumen-hierarchy-ref-validator.ts';
import { LumenSession } from '../source/session.ts';

const projectRoot = resolve(readRequiredFlag('--project'));
const outputDirectory = normalizeAssetDirectory(readFlag('--output') ?? 'assets/peanut-capability-gallery/11-component-matrix');
const spriteFrameUuid = readRequiredFlag('--sprite-frame');
const seed = new LumenSession({ projectRoot, cocosVersion: '3.8.7' });
const componentTypes = seed.describeSchema().components;
const failures: Array<{ readonly componentType: string; readonly reason: string }> = [];

mkdirSync(resolve(projectRoot, outputDirectory), { recursive: true });

for (let index = 0; index < componentTypes.length; index += 1) {
    const componentType = componentTypes[index]!;
    const rootName = componentType.replace(/[^A-Za-z0-9]+/gu, '-');
    const relativePath = `${outputDirectory}/${String(index + 1).padStart(3, '0')}-${rootName}.prefab`;
    try {
        const absolutePath = resolve(projectRoot, relativePath);
        if (existsSync(absolutePath)) {
            unlinkSync(absolutePath);
        }
        const session = new LumenSession({ projectRoot, cocosVersion: '3.8.7' });
        session.scaffoldPrefab({
            prefabRelativePath: relativePath,
            rootName,
            template: 'empty',
            writeMetaIfMissing: true,
        });
        session.attachComponent({ nodePath: `/${rootName}`, builtinType: componentType });
        if (componentType === 'cc.Sprite') {
            session.refreshCatalog();
            session.bindSprite({ nodePath: `/${rootName}`, spriteFrameUuid });
        }
        session.save();

        const validation = new LumenHierarchyRefValidator().validate(projectRoot, { prefabRelativePath: relativePath });
        if (!validation.ok) {
            failures.push({
                componentType,
                reason: validation.issues.map((issue) => `${issue.kind}:${issue.fieldHint}`).join(','),
            });
        }
    } catch (error) {
        failures.push({ componentType, reason: error instanceof Error ? error.message : String(error) });
    }
}

process.stdout.write(
    `${JSON.stringify(
        {
            ok: failures.length === 0,
            projectRoot,
            outputDirectory,
            componentCount: componentTypes.length,
            failures,
        },
        null,
        2,
    )}\n`,
);

if (failures.length > 0) {
    process.exitCode = 1;
}

function readFlag(name: string): string | undefined {
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

function readRequiredFlag(name: string): string {
    const value = readFlag(name);
    if (value == null || value.length === 0) {
        throw new Error(`missing_required_flag:${name}`);
    }
    return value;
}

function normalizeAssetDirectory(value: string): string {
    const absolute = resolve(projectRoot, value);
    const relativePath = relative(projectRoot, absolute).replaceAll('\\', '/');
    if (!relativePath.startsWith('assets/') || relativePath.includes('../')) {
        throw new Error('component_matrix_output_must_be_under_assets');
    }
    return relativePath;
}
