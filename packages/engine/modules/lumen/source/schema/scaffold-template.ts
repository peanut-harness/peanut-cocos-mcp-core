/**
 * @description 把 scaffold JSON 模板里的占位字符串替换成运行时值。
 */
export class LumenAssetScaffoldTemplate {
    /**
     * @description 深拷贝模板并替换恰好等于占位符的字符串（如 `$uuid` / `$name`）。
     * @param template 策展模板
     * @param placeholders 占位符 → 实值
     * @returns 实例化后的对象
     */
    public instantiate(
        template: Readonly<Record<string, unknown>>,
        placeholders: Readonly<Record<string, string>>,
    ): Record<string, unknown> {
        const cloned: unknown = JSON.parse(JSON.stringify(template));
        const bound = this._bind(cloned, placeholders);
        if (bound == null || typeof bound !== 'object' || Array.isArray(bound)) {
            throw new Error('lumen_scaffold_template_corrupt');
        }
        const record: Record<string, unknown> = {};
        for (const [key, item] of Object.entries(bound)) {
            record[key] = item;
        }
        return record;
    }

    /**
     * @description 递归替换占位字符串。
     * @param value JSON 值
     * @param placeholders 占位符表
     * @returns 绑定后的值
     */
    private _bind(value: unknown, placeholders: Readonly<Record<string, string>>): unknown {
        if (typeof value === 'string') {
            const mapped = placeholders[value];
            return mapped !== undefined ? mapped : value;
        }
        if (Array.isArray(value)) {
            return value.map((item) => this._bind(item, placeholders));
        }
        if (value != null && typeof value === 'object') {
            const result: Record<string, unknown> = {};
            for (const [key, item] of Object.entries(value)) {
                result[key] = this._bind(item, placeholders);
            }
            return result;
        }
        return value;
    }
}
