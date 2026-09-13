/**
 * @description 统一资源键归一：签发 / 推导 / 校验必须走同一套规则。
 *
 * 规则（策略 A：精确匹配，归一后字符串 ⊆，无 parent/前缀覆盖）：
 * 1. trim，`\` → `/`
 * 2. `assets/...` ↔ `db://assets/...`（规范形为 `db://assets/...`）
 * 3. 形如 uuid（可带 `@sub`）时：若提供 `resolveUuidToDbPath` 且能解析则转为 db 路径再归一；
 *    否则保持原样（小写 uuid 体），并在 BOUNDARIES/MATRIX 文档说明「未解析 uuid 不与 db 路径互通」
 * 4. 其它键（绝对盘符路径、`scene:active`、整库哨兵 `db://assets` 等）保持归一斜杠后的原样
 */
export interface INormalizeResourceKeyOptions {
    /**
     * @description 可选：将 uuid（可带 @sub）解析为 db:// 路径。无 Creator AssetDB 时不要传。
     */
    readonly resolveUuidToDbPath?: (uuid: string) => string | null | undefined;
}

const UUID_BODY = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const UUID_RE = new RegExp(`^${UUID_BODY}(?:@[\\w.-]+)?$`, 'iu');

/**
 * @description 归一单个资源键。空串归一为空串（调用方应过滤）。
 * @param value 原始资源键。
 * @param options 可选 uuid 解析器。
 * @returns 归一后的资源键。
 */
export function normalizeResourceKey(value: string, options?: INormalizeResourceKeyOptions): string {
    if (typeof value !== 'string') {
        return '';
    }
    const trimmed = value.trim().replace(/\\/gu, '/');
    if (trimmed.length === 0) {
        return '';
    }

    if (UUID_RE.test(trimmed)) {
        const resolved = options?.resolveUuidToDbPath?.(trimmed);
        if (typeof resolved === 'string' && resolved.trim().length > 0) {
            // 再走一遍路径规则；不再传 resolver，避免环
            return normalizeResourceKey(resolved);
        }
        const at = trimmed.indexOf('@');
        if (at < 0) {
            return trimmed.toLowerCase();
        }
        return `${trimmed.slice(0, at).toLowerCase()}${trimmed.slice(at)}`;
    }

    if (trimmed === 'assets' || trimmed.startsWith('assets/')) {
        return `db://${trimmed}`;
    }
    if (trimmed === 'db://assets' || trimmed.startsWith('db://assets/')) {
        return trimmed;
    }

    return trimmed;
}

/**
 * @description 归一资源列表为去重集合（精确匹配用）。
 * @param values 原始列表。
 * @param options 可选 uuid 解析器。
 * @returns 归一后的 Set。
 */
export function normalizeResourceKeySet(
    values: readonly string[],
    options?: INormalizeResourceKeyOptions,
): Set<string> {
    const result = new Set<string>();
    for (const value of values) {
        const key = normalizeResourceKey(value, options);
        if (key.length > 0) {
            result.add(key);
        }
    }
    return result;
}

/**
 * @description 归一资源列表为稳定数组（去重，插入序）。
 * @param values 原始列表。
 * @param options 可选 uuid 解析器。
 * @returns 归一后的只读数组。
 */
export function normalizeResourceKeys(
    values: readonly string[],
    options?: INormalizeResourceKeyOptions,
): readonly string[] {
    return Object.freeze([...normalizeResourceKeySet(values, options)]);
}
