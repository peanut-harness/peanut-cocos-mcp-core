import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * @description Creator 2.4 序列化资源（prefab / scene）磁盘 `.meta` 保证。
 */
export class Lumen24SerializedAssetMeta {
    /**
     * @description 若缺失则写入标准 `.meta`（含空 `subMetas`），避免 AssetDB `copySubMetas of null`。
     * @param absolutePath 资源绝对路径（不含 `.meta`）
     * @param kind `prefab` 或 `scene`
     * @returns meta uuid
     */
    public static ensure(absolutePath: string, kind: 'prefab' | 'scene'): string {
        const metaPath = `${absolutePath}.meta`;
        if (existsSync(metaPath)) {
            try {
                const parsed = JSON.parse(readFileSync(metaPath, 'utf8')) as { uuid?: unknown };
                if (typeof parsed.uuid === 'string' && parsed.uuid.length > 0) {
                    return parsed.uuid;
                }
            } catch {
                // 损坏 meta 时覆盖写入
            }
        }
        const uuid = Lumen24SerializedAssetMeta._createUuid();
        const body =
            kind === 'prefab'
                ? {
                      ver: '1.3.2',
                      uuid,
                      importer: 'prefab',
                      optimizationPolicy: 'AUTO',
                      asyncLoadAssets: false,
                      readonly: false,
                      subMetas: {},
                  }
                : {
                      ver: '1.3.2',
                      uuid,
                      importer: 'scene',
                      asyncLoadAssets: false,
                      autoReleaseAssets: false,
                      subMetas: {},
                  };
        writeFileSync(metaPath, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
        return uuid;
    }

    /**
     * @description 生成 UUID（兼容 Creator 2.4 旧 Node）。
     * @returns uuid
     */
    private static _createUuid(): string {
        const bytes = randomBytes(16);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = bytes.toString('hex');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
}
