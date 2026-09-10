/**
 * @description 深拷贝（兼容 Creator 旧 Electron / Node 14，禁止依赖全局 `structuredClone`）。
 */
export class LumenDeepClone {
    /**
     * @description 深拷贝可 JSON 化的 Prefab 条目树。
     * @param value 输入值
     * @returns 拷贝
     */
    public static clone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value)) as T;
    }
}
