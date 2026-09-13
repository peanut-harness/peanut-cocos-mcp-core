import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { LumenAssetPatchUuidGuard } from '../source/standalone/asset-patch-uuid-guard';
import { LumenSession } from '../source/session';

/**
 * @description 最小工程。
 * @param prefix 前缀
 * @returns 根路径
 * @oopException 测试辅助。
 */
function createProject(prefix: string): string {
    const root = mkdtempSync(join(tmpdir(), prefix));
    mkdirSync(join(root, 'assets'), { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"name":"tmp","creator":{"version":"3.8.7"}}\n');
    return root;
}

test('asset patch uuid guard collects refs and skips empty', (): void => {
    assert.deepEqual(
        LumenAssetPatchUuidGuard.collect({
            spriteFrameUuid: '2eda6098-e866-4077-93e2-5f83c73645b3@f9941',
            faces: { left: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', right: '' },
            startChar: '0',
        }),
        ['2eda6098-e866-4077-93e2-5f83c73645b3@f9941', 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'],
    );
});

test('setAssetProperty rejects unresolved uuid refs', (): void => {
    const root = createProject('lumen-uuid-guard-');
    try {
        const session = new LumenSession({ projectRoot: root });
        session.scaffoldPrefab({
            prefabRelativePath: 'assets/ui/Digits.labelatlas',
            rootName: 'Digits',
            template: 'empty',
        });
        assert.throws(
            () =>
                session.setAssetProperty({
                    patch: { spriteFrameUuid: 'dddddddd-eeee-ffff-aaaa-bbbbbbbbbbbb' },
                }),
            /lumen_asset_uuid_unresolved:dddddddd-eeee-ffff-aaaa-bbbbbbbbbbbb/,
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
