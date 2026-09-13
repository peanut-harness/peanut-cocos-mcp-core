import { randomBytes } from 'crypto';

/**
 * @description 生成 UUID v4（兼容 Creator 2.4 宿主旧 Node，禁止依赖 `crypto.randomUUID`）。
 */
export class CompatibleUuid {
    /**
     * @description 生成标准连字符 UUID。
     * @returns uuid 字符串
     */
    public static create(): string {
        const bytes = randomBytes(16);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = bytes.toString('hex');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
}
