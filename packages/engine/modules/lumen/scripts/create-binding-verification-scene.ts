import { existsSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

import { LumenHierarchyRefValidator } from '../source/hierarchy/lumen-hierarchy-ref-validator.ts';
import { LumenSession } from '../source/session.ts';

const projectRoot = resolve(readRequiredFlag('--project'));
const outputPath = readFlag('--output') ?? 'assets/peanut-capability-gallery/12-binding-verification/BindingVerification.scene';
const playerPanelPath = resolve(projectRoot, readFlag('--player-panel') ?? 'assets/peanut-capability-gallery/03-ui/PlayerPanel.prefab');
const session = new LumenSession({ projectRoot, cocosVersion: '3.8.7' });
const absoluteOutputPath = resolve(projectRoot, outputPath);

if (existsSync(absoluteOutputPath)) {
    unlinkSync(absoluteOutputPath);
}

session.scaffoldPrefab({
    prefabRelativePath: outputPath,
    rootName: 'BindingVerification',
    template: 'ui/Canvas',
    writeMetaIfMissing: true,
});
session.addChildFromTemplate({
    parentPath: '/BindingVerification/Canvas',
    template: playerPanelPath,
    name: 'PlayerPanel',
});
session.setNodeProperty({
    nodePath: '/BindingVerification/Canvas/PlayerPanel',
    patch: { position: { x: 0, y: 0, z: 0 } },
});
session.setComponentProperty({
    nodePath: '/BindingVerification/Canvas/PlayerPanel',
    componentType: 'cc.UITransform',
    patch: { contentSize: { width: 560, height: 360 } },
});
for (const [nodeName, y] of [
    ['Title', 120],
    ['StatusLabel', 50],
    ['ActionButton', -30],
    ['NodeRemovePassed', -100],
    ['DestructiveOpsPassed', -140],
] as const) {
    session.setNodeProperty({
        nodePath: `/BindingVerification/Canvas/PlayerPanel/${nodeName}`,
        patch: { position: { x: 0, y, z: 0 } },
    });
}
session.save();

const validation = new LumenHierarchyRefValidator().validate(projectRoot, { prefabRelativePath: outputPath });
process.stdout.write(`${JSON.stringify({ outputPath, validation }, null, 2)}\n`);
if (!validation.ok) {
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
