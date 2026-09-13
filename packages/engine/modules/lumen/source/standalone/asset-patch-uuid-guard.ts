/**
 * @description 从 `assetSet` 补丁中收集 Creator 资产 uuid 引用，并在 catalog 中校验存在性。
 */
export class LumenAssetPatchUuidGuard {
    /**
     * @description Creator uuid（可含 `@子资源`）。
     */
    private static readonly _uuidRefPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(@[A-Za-z0-9_-]+)?$/i;

    /**
     * @description 收集补丁里非空的 uuid 引用（去重，保序）。
     * @param patch Inspector 补丁
     * @returns uuid 列表
     */
    public static collect(patch: unknown): readonly string[] {
        const ordered: string[] = [];
        const seen = new Set<string>();
        LumenAssetPatchUuidGuard._walk(patch, (value) => {
            if (!LumenAssetPatchUuidGuard._uuidRefPattern.test(value)) {
                return;
            }
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
            ordered.push(value);
        });
        return ordered;
    }

    /**
     * @description 断言每个 uuid 都能在 catalog 中唯一解析。
     * @param resolveOne 解析函数（通常为 `catalog.resolveOne`）
     * @param projectRoot 项目根
     * @param patch Inspector 补丁
     */
    public static assertResolvable(
        resolveOne: (projectRoot: string, query: { readonly uuid: string; readonly limit: number }) => unknown,
        projectRoot: string,
        patch: unknown,
    ): void {
        for (const uuid of LumenAssetPatchUuidGuard.collect(patch)) {
            try {
                resolveOne(projectRoot, { uuid, limit: 1 });
            } catch (error) {
                const detail = error instanceof Error ? error.message : String(error);
                throw new Error(
                    `lumen_asset_uuid_unresolved:${uuid}:${detail}:use_catalog_uuid_then_commit`,
                );
            }
        }
    }

    /**
     * @description 深度遍历补丁中的字符串。
     * @param value 任意值
     * @param onString 字符串回调
     */
    private static _walk(value: unknown, onString: (text: string) => void): void {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.length > 0) {
                onString(trimmed);
            }
            return;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                LumenAssetPatchUuidGuard._walk(item, onString);
            }
            return;
        }
        if (value == null || typeof value !== 'object') {
            return;
        }
        for (const child of Object.values(value)) {
            LumenAssetPatchUuidGuard._walk(child, onString);
        }
    }
}
