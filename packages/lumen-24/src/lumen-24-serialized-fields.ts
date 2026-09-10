/**
 * @description 3.x 公开字段名 → Creator 2.4 Prefab 序列化字段名（`_N$` 前缀等）。
 */
export class Lumen24SerializedFields {
    /**
     * @description 解析 bindRef / nodeRef 应写入的磁盘字段名列表。
     * @param componentType 规范组件类型（如 `cc.Button`）
     * @param field 3.x apiName、3.x serializedName 或 2.4 原字段名
     * @returns 需同步写入的字段名（通常一项）
     */
    public static refFieldKeys(componentType: string, field: string): readonly string[] {
        const trimmed = field.trim();
        if (trimmed.length === 0) {
            return [];
        }
        if (componentType === 'cc.Button') {
            if (trimmed === 'target' || trimmed === '_target' || trimmed === '_N$target') {
                return ['_N$target'];
            }
        }
        if (componentType === 'cc.Toggle') {
            if (trimmed === 'target' || trimmed === '_target' || trimmed === '_N$target') {
                return ['_N$target'];
            }
            if (trimmed === 'checkMark' || trimmed === '_checkMark' || trimmed === '_N$checkMark') {
                return ['_N$checkMark'];
            }
        }
        if (trimmed.startsWith('_N$')) {
            return [trimmed];
        }
        if (trimmed.startsWith('_') && trimmed.length > 1) {
            const apiName = trimmed.slice(1);
            const mapped = Lumen24SerializedFields.refFieldKeys(componentType, apiName);
            if (mapped.length === 1 && mapped[0] !== trimmed) {
                return mapped;
            }
        }
        return [trimmed];
    }
}
