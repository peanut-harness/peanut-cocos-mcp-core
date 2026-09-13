/**
 * @description 把随机字节编码为十六进制；避开 @types/node 24 下 Uint8Array.toString 无 encoding 参数的类型冲突。
 * @param bytes 随机字节。
 * @returns 小写十六进制字符串。
 */
export function toHex(bytes: Uint8Array): string {
    return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}
