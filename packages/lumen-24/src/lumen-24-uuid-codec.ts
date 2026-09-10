/**
 * @description Cocos UUID 压缩（与引擎 UuidUtils / peanut-asset-catalog 一致；2.4 Prefab `__type__` / `_componentId` 用）。
 */
export class Lumen24UuidCodec {
    /** @description Base64 字母表。 */
    private static readonly _alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    /**
     * @description 标准 UUID → 压缩串。
     * @param uuid UUID
     * @returns 压缩 UUID
     */
    public compress(uuid: string): string {
        const normalized = uuid.trim().replace(/-/g, '').toLowerCase();
        if (normalized.length !== 32) {
            throw new Error(`lumen_24_invalid_uuid_length:${uuid}`);
        }
        let out = normalized.slice(0, 5);
        const rest = normalized.slice(5);
        for (let index = 0; index < rest.length; index += 3) {
            const lhs = Number.parseInt(rest[index] ?? '', 16);
            const mhs = Number.parseInt(rest[index + 1] ?? '', 16);
            const rhs = Number.parseInt(rest[index + 2] ?? '', 16);
            if (Number.isNaN(lhs) || Number.isNaN(mhs) || Number.isNaN(rhs)) {
                throw new Error(`lumen_24_invalid_uuid_hex:${uuid}`);
            }
            out += Lumen24UuidCodec._alphabet[(lhs << 2) | (mhs >> 2)] ?? '';
            out += Lumen24UuidCodec._alphabet[((mhs & 3) << 4) | rhs] ?? '';
        }
        return out;
    }
}
