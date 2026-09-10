/**
 * @description 独立资产 inspect 查询：地形可用 `region`，其它种类拒绝未知键。
 */
export class LumenStandaloneInspectQuery {
    /**
     * @description 非地形资产不得带查询键。
     * @param query 可选查询
     * @param kind 资产种类
     */
    public static rejectIfPresent(query: Readonly<Record<string, unknown>> | undefined, kind: string): void {
        if (query == null) {
            return;
        }
        const keys = Object.keys(query);
        if (keys.length === 0) {
            return;
        }
        throw new Error(`lumen_asset_query_unsupported:${kind}:${keys.join(',')}`);
    }
}
