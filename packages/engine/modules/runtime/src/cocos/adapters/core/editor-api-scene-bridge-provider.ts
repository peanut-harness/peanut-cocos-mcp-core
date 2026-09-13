/**
 * @description Creator 场景脚本桥接 provider 契约，隔离适配器与具体宿主实现。
 */
export interface IEditorApiSceneBridgeProvider {
    /**
     * @description 判断当前宿主是否能调用 Creator 场景脚本。
     * @returns 可调用时返回 `true`
     */
    isAvailable(): boolean;

    /**
     * @description 获取当前场景根节点的 JSON 安全快照。
     * @returns 当前场景未加载时返回 `null`
     */
    getCurrent(): Promise<Record<string, unknown> | null>;

    /**
     * @description 获取当前场景树的深度优先节点快照列表。
     * @param options 可选场景查询参数
     * @returns 场景节点快照列表
     */
    getHierarchy(options?: {
        readonly includeEditorNodes?: boolean;
    }): Promise<readonly Record<string, unknown>[]>;

    /**
     * @description 调用已声明场景脚本中的受控方法。
     * @param packageName 提供目标场景脚本的扩展包名
     * @param method 场景脚本中导出的稳定方法名
     * @param args JSON 安全的数据参数
     * @returns 场景脚本返回结果
     */
    execute<TData = unknown>(packageName: string, method: string, args?: readonly unknown[]): Promise<TData>;
}
