/**
 * @description Cocos Creator 3.x UUID 压缩与还原编解码器。
 */
export class CocosUuidCodec {
    /** @description Base64 字母表，与引擎 `UuidUtils` 一致。 */
    private static readonly _alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    /**
     * @description 将标准 UUID 压缩为 Prefab `__type__` 使用的短形式。
     * @param uuid 带或不带连字符的 UUID。
     * @returns 压缩 UUID 字符串。
     */
    public compress(uuid: string): string {
        const normalized = this.normalize(uuid);
        if (normalized.includes('@')) {
            const [head, suffix] = normalized.split('@');
            if (head == null || suffix == null || head.length !== 32) {
                throw new Error(`invalid_sub_asset_uuid:${uuid}`);
            }
            return `${this.compress(head)}@${suffix}`;
        }
        if (normalized.length !== 32) {
            throw new Error(`invalid_uuid_length:${uuid}`);
        }
        let out = normalized.slice(0, 5);
        const rest = normalized.slice(5);
        for (let index = 0; index < rest.length; index += 3) {
            const lhs = Number.parseInt(rest[index] ?? '', 16);
            const mhs = Number.parseInt(rest[index + 1] ?? '', 16);
            const rhs = Number.parseInt(rest[index + 2] ?? '', 16);
            if (Number.isNaN(lhs) || Number.isNaN(mhs) || Number.isNaN(rhs)) {
                throw new Error(`invalid_uuid_hex:${uuid}`);
            }
            out += CocosUuidCodec._alphabet[(lhs << 2) | (mhs >> 2)] ?? '';
            out += CocosUuidCodec._alphabet[((mhs & 3) << 4) | rhs] ?? '';
        }
        return out;
    }

    /**
     * @description 去掉连字符并校验基本形态。
     * @param uuid 原始 UUID。
     * @returns 去连字符后的小写十六进制串（可保留 `@suffix`）。
     */
    public normalize(uuid: string): string {
        const trimmed = uuid.trim();
        if (trimmed.length === 0) {
            throw new Error('uuid_empty');
        }
        const atIndex = trimmed.indexOf('@');
        if (atIndex === -1) {
            return trimmed.replace(/-/g, '').toLowerCase();
        }
        const head = trimmed.slice(0, atIndex).replace(/-/g, '').toLowerCase();
        const suffix = trimmed.slice(atIndex + 1);
        return `${head}@${suffix}`;
    }
}
