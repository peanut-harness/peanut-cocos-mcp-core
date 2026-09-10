import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @description 断言 SpriteFrame uuid 能在工程 meta 中解析（避免 Creator「Asset used by cc.Sprite is missing」）。
 */
export class Lumen24SpriteFrameGuard {
    /**
     * @description 校验 uuid 存在于 assets 下任意 `.meta`（含 subMetas）。
     * @param projectRoot 工程根
     * @param spriteFrameUuid uuid（可带 `@subId`）
     * @returns void
     */
    public static assertExists(projectRoot: string, spriteFrameUuid: string): void {
        const uuid = spriteFrameUuid.trim();
        if (uuid.length === 0) {
            throw new Error('lumen_24_sprite_frame_uuid_empty');
        }
        const assetsRoot = join(projectRoot, 'assets');
        if (!existsSync(assetsRoot)) {
            throw new Error('lumen_24_assets_missing');
        }
        const needle = uuid.toLowerCase();
        const base = needle.includes('@') ? needle.split('@')[0]! : needle;
        if (Lumen24SpriteFrameGuard._scanHasUuid(assetsRoot, needle, base)) {
            return;
        }
        throw new Error(`lumen_24_sprite_frame_uuid_missing_in_meta:${uuid}`);
    }

    /**
     * @description 递归扫 meta 是否包含 uuid。
     * @param dir 目录
     * @param full 完整 uuid（小写）
     * @param base 去 `@` 前缀
     * @returns 是否命中
     */
    private static _scanHasUuid(dir: string, full: string, base: string): boolean {
        for (const name of readdirSync(dir)) {
            const absolute = join(dir, name);
            const st = statSync(absolute);
            if (st.isDirectory()) {
                if (Lumen24SpriteFrameGuard._scanHasUuid(absolute, full, base)) {
                    return true;
                }
                continue;
            }
            if (!name.endsWith('.meta')) {
                continue;
            }
            let text: string;
            try {
                text = readFileSync(absolute, 'utf8');
            } catch {
                continue;
            }
            const lower = text.toLowerCase();
            if (lower.includes(full) || lower.includes(base)) {
                return true;
            }
        }
        return false;
    }
}
