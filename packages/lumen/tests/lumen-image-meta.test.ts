import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { LumenImageMetaDocument } from '../source/standalone/image-meta';

/**
 * @description 创建最小工程根目录。
 * @param prefix 临时目录前缀
 * @returns 工程根路径
 * @oopException 测试辅助。
 */
function createProject(prefix: string): string {
    const root = mkdtempSync(join(tmpdir(), prefix));
    mkdirSync(join(root, 'assets'), { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"name":"tmp","creator":{"version":"3.8.7"}}\n');
    return root;
}

/**
 * @description 在工程内写入一张最小图片及其 `.meta`（含 texture / sprite-frame 子资源）。
 * @param root 工程根路径
 * @param relativePath 图片相对路径
 * @param userDataOverrides `meta.userData` 覆盖项
 * @param spriteFrameOverrides sprite-frame 子资源 `userData` 覆盖项
 * @returns 图片绝对路径
 * @oopException 测试辅助。
 */
function writeImageFixture(
    root: string,
    relativePath: string,
    userDataOverrides: Readonly<Record<string, unknown>> = {},
    spriteFrameOverrides: Readonly<Record<string, unknown>> = {},
): string {
    const absolutePath = join(root, relativePath);
    writeFileSync(absolutePath, 'png-source');
    writeFileSync(
        `${absolutePath}.meta`,
        `${JSON.stringify(
            {
                ver: '1.0.27',
                importer: 'image',
                imported: true,
                uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
                files: ['.json', '.png'],
                subMetas: {
                    textureId: {
                        importer: 'texture',
                        uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee@texture',
                        userData: {
                            wrapModeS: 'clamp-to-edge',
                            wrapModeT: 'clamp-to-edge',
                            minfilter: 'linear',
                            magfilter: 'linear',
                            mipfilter: 'none',
                            anisotropy: 0,
                        },
                    },
                    spriteId: {
                        importer: 'sprite-frame',
                        uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee@sprite',
                        userData: {
                            trimThreshold: 1,
                            rotated: false,
                            borderTop: 0,
                            borderBottom: 0,
                            borderLeft: 0,
                            borderRight: 0,
                            packable: true,
                            pixelsToUnit: 100,
                            pivotX: 0.5,
                            pivotY: 0.5,
                            meshType: 0,
                            trimType: 'auto',
                            ...spriteFrameOverrides,
                        },
                    },
                },
                userData: {
                    type: 'sprite-frame',
                    hasAlpha: true,
                    fixAlphaTransparencyArtifacts: false,
                    ...userDataOverrides,
                },
            },
            null,
            2,
        )}\n`,
    );
    return absolutePath;
}

test('image meta inspect defaults new optional fields when missing from disk', (): void => {
    const root = createProject('lumen-image-meta-defaults-');
    try {
        writeImageFixture(root, 'assets/Icon.png');
        const doc = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        const snapshot = doc.inspect();
        assert.equal(snapshot.image.type, 'sprite-frame');
        assert.equal(snapshot.image.flipVertical, false);
        assert.equal(snapshot.image.bakeOfflineMipmaps, false);
        assert.equal(snapshot.image.isRGBE, false);
        assert.equal(snapshot.image.flipGreenChannel, false);
        assert.equal(snapshot.image.useCompressTexture, false);
        assert.equal(snapshot.image.presetId, '');
        assert.equal(snapshot.spriteFrame?.trimX, 0);
        assert.equal(snapshot.spriteFrame?.trimY, 0);
        assert.equal(snapshot.spriteFrame?.width, 0);
        assert.equal(snapshot.spriteFrame?.height, 0);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('image meta patches and round-trips new image userData fields', (): void => {
    const root = createProject('lumen-image-meta-image-fields-');
    try {
        const imagePath = writeImageFixture(root, 'assets/Icon.png');
        const doc = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        doc.applyPatch({
            image: {
                type: 'texture',
                flipVertical: true,
                bakeOfflineMipmaps: true,
                isRGBE: true,
                flipGreenChannel: true,
                useCompressTexture: true,
                presetId: 'preset-a',
            },
        });
        doc.save(root);

        const reopened = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        const snapshot = reopened.inspect();
        assert.equal(snapshot.image.type, 'texture');
        assert.equal(snapshot.image.flipVertical, true);
        assert.equal(snapshot.image.bakeOfflineMipmaps, true);
        assert.equal(snapshot.image.isRGBE, true);
        assert.equal(snapshot.image.flipGreenChannel, true);
        assert.equal(snapshot.image.useCompressTexture, true);
        assert.equal(snapshot.image.presetId, 'preset-a');

        const saved = JSON.parse(readFileSync(`${imagePath}.meta`, 'utf8')) as {
            userData: Record<string, unknown>;
        };
        assert.equal(saved.userData.type, 'texture');
        assert.equal(saved.userData.presetId, 'preset-a');

        reopened.applyPatch({ image: { presetId: '' } });
        reopened.save(root);
        const clearedMeta = JSON.parse(readFileSync(`${imagePath}.meta`, 'utf8')) as {
            userData: Record<string, unknown>;
        };
        assert.equal('presetId' in clearedMeta.userData, false);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('image meta rejects unknown image.type enum values', (): void => {
    const root = createProject('lumen-image-meta-type-enum-');
    try {
        writeImageFixture(root, 'assets/Icon.png');
        const doc = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        assert.throws(
            () => doc.applyPatch({ image: { type: 'bogus-type' } }),
            /lumen_image_property_range:image\.type:raw\|texture\|normal map\|sprite-frame\|texture cube/,
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('image meta rejects non-boolean values for new image flags', (): void => {
    const root = createProject('lumen-image-meta-type-check-');
    try {
        writeImageFixture(root, 'assets/Icon.png');
        const doc = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        assert.throws(() => doc.applyPatch({ image: { flipVertical: 'yes' } }), /lumen_image_property_type:image\.flipVertical:boolean/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('image meta writing sprite-frame trim rect forces trimType to custom', (): void => {
    const root = createProject('lumen-image-meta-trim-rect-');
    try {
        const imagePath = writeImageFixture(root, 'assets/Icon.png');
        const doc = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        doc.applyPatch({
            spriteFrame: { trimX: 2, trimY: 4, width: 10, height: 20 },
        });
        doc.save(root);

        const reopened = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        const snapshot = reopened.inspect();
        assert.equal(snapshot.spriteFrame?.trimType, 'custom');
        assert.equal(snapshot.spriteFrame?.trimX, 2);
        assert.equal(snapshot.spriteFrame?.trimY, 4);
        assert.equal(snapshot.spriteFrame?.width, 10);
        assert.equal(snapshot.spriteFrame?.height, 20);

        const saved = JSON.parse(readFileSync(`${imagePath}.meta`, 'utf8')) as {
            subMetas: { spriteId: { userData: Record<string, unknown> } };
        };
        assert.equal(saved.subMetas.spriteId.userData.trimType, 'custom');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('image meta trim rect overrides an explicit non-custom trimType in the same patch', (): void => {
    const root = createProject('lumen-image-meta-trim-override-');
    try {
        writeImageFixture(root, 'assets/Icon.png');
        const doc = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        doc.applyPatch({
            spriteFrame: { trimType: 'auto', width: 12 },
        });
        const snapshot = doc.inspect();
        assert.equal(snapshot.spriteFrame?.trimType, 'custom');
        assert.equal(snapshot.spriteFrame?.width, 12);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('image meta keeps trimType untouched when no trim rect field is patched', (): void => {
    const root = createProject('lumen-image-meta-trim-untouched-');
    try {
        writeImageFixture(root, 'assets/Icon.png');
        const doc = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        doc.applyPatch({ spriteFrame: { packable: false } });
        const snapshot = doc.inspect();
        assert.equal(snapshot.spriteFrame?.trimType, 'auto');
        assert.equal(snapshot.spriteFrame?.packable, false);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('image meta rejects negative or non-integer trim rect values', (): void => {
    const root = createProject('lumen-image-meta-trim-range-');
    try {
        writeImageFixture(root, 'assets/Icon.png');
        const doc = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        assert.throws(() => doc.applyPatch({ spriteFrame: { trimX: -1 } }), /lumen_image_property_range:spriteFrame\.trimX:0\.\.\d+/);
        assert.throws(() => doc.applyPatch({ spriteFrame: { width: 1.5 } }), /lumen_image_property_range:spriteFrame\.width:0\.\.\d+/);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('image meta patches compressSettings with platform overrides and syncs top-level scalars', (): void => {
    const root = createProject('lumen-image-meta-compress-platforms-');
    try {
        const imagePath = writeImageFixture(root, 'assets/Icon.png');
        const doc = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        doc.applyPatch({
            image: {
                compressSettings: {
                    useCompressTexture: true,
                    presetId: 'preset-default',
                    platforms: {
                        miniGame: { useCompressTexture: true, presetId: 'preset-mini' },
                        android: { presetId: 'preset-android' },
                    },
                },
            },
        });
        doc.save(root);

        const reopened = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        const snapshot = reopened.inspect();
        assert.equal(snapshot.image.useCompressTexture, true);
        assert.equal(snapshot.image.presetId, 'preset-default');
        assert.equal(snapshot.image.compressSettings.platforms.miniGame?.useCompressTexture, true);
        assert.equal(snapshot.image.compressSettings.platforms.miniGame?.presetId, 'preset-mini');
        assert.equal(snapshot.image.compressSettings.platforms.android?.presetId, 'preset-android');

        const saved = JSON.parse(readFileSync(`${imagePath}.meta`, 'utf8')) as {
            userData: Record<string, unknown>;
        };
        const nested = saved.userData.compressSettings as Record<string, unknown>;
        assert.equal(nested.useCompressTexture, true);
        assert.equal(nested.presetId, 'preset-default');
        assert.equal((nested.miniGame as Record<string, unknown>).presetId, 'preset-mini');
        assert.equal(saved.userData.useCompressTexture, true);
        assert.equal(saved.userData.presetId, 'preset-default');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('image meta rejects unknown compress platform keys', (): void => {
    const root = createProject('lumen-image-meta-compress-unknown-platform-');
    try {
        writeImageFixture(root, 'assets/Icon.png');
        const doc = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        assert.throws(
            () =>
                doc.applyPatch({
                    image: {
                        compressSettings: {
                            platforms: { bogusPlatform: { presetId: 'x' } },
                        },
                    },
                }),
            /lumen_image_compress_platform_unknown:bogusPlatform/,
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('image meta accepts texture.filterMode panel alias and expands to filter triplets', (): void => {
    const root = createProject('lumen-image-meta-filter-mode-');
    try {
        const imagePath = writeImageFixture(root, 'assets/Icon.png');
        const doc = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        assert.equal(doc.inspect().texture.filterMode, 'bilinear');

        doc.applyPatch({ texture: { filterMode: 'point' } });
        doc.save(root);

        const reopened = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        const snapshot = reopened.inspect();
        assert.equal(snapshot.texture.filterMode, 'point');
        assert.equal(snapshot.texture.minfilter, 'nearest');
        assert.equal(snapshot.texture.magfilter, 'nearest');
        assert.equal(snapshot.texture.mipfilter, 'none');

        const saved = JSON.parse(readFileSync(`${imagePath}.meta`, 'utf8')) as {
            subMetas: { textureId: { userData: Record<string, unknown> } };
        };
        assert.equal(saved.subMetas.textureId.userData.minfilter, 'nearest');
        assert.equal(saved.subMetas.textureId.userData.mipfilter, 'none');
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('image meta rejects unknown texture.filterMode alias', (): void => {
    const root = createProject('lumen-image-meta-filter-mode-unknown-');
    try {
        writeImageFixture(root, 'assets/Icon.png');
        const doc = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        assert.throws(
            () => doc.applyPatch({ texture: { filterMode: 'bogus-filter' } }),
            /lumen_texture_filter_mode_unknown:bogus-filter/,
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});

test('image meta still rejects fields outside the image/spriteFrame allow-lists', (): void => {
    const root = createProject('lumen-image-meta-not-editable-');
    try {
        writeImageFixture(root, 'assets/Icon.png');
        const doc = LumenImageMetaDocument.open(root, 'assets/Icon.png');
        assert.throws(() => doc.applyPatch({ image: { bogusField: true } }), /lumen_image_property_not_editable:image\.bogusField/);
        assert.throws(
            () => doc.applyPatch({ spriteFrame: { bogusField: 1 } }),
            /lumen_image_property_not_editable:spriteFrame\.bogusField/,
        );
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
