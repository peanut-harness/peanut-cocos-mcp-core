/**
 * @description MCP 执行风险等级；读取不需要审批租约。
 */
export type McpExecutionRisk = 'read' | 'write' | 'destructive';

/**
 * @description 创建本地审批租约的受限输入。
 */
export interface IMcpApprovalLeaseRequest {
    /** @description 获得编辑器内确认的 MCP bridge 连接标识。 */
    readonly connectionId: string;
    /** @description 本次确认允许触达的规范化资源集合。 */
    readonly resources: readonly string[];
    /** @description 可选工具白名单；空数组表示同连接下任意写工具。 */
    readonly operations?: readonly string[];
    /** @description 本次确认允许的最高风险等级。 */
    readonly maxRisk?: Exclude<McpExecutionRisk, 'read'>;
    /** @description 空闲租约时长；缺省使用安全默认值。 */
    readonly idleLeaseMs?: number;
    /** @description 从签发开始的最长持有时长；缺省使用安全默认值。 */
    readonly maxHoldMs?: number;
    /**
     * @description 可选预置 token（Hub 双写时与 BatchStore approvalToken 对齐）；非法时回退随机签发。
     */
    readonly preferredToken?: string;
}

/**
 * @description 消费本地审批租约时由 Hub 提供的可信执行上下文。
 */
export interface IMcpApprovalLeaseUse {
    /** @description 正在调用的 MCP bridge 连接标识。 */
    readonly connectionId: string;
    /** @description 稳定 MCP 工具名。 */
    readonly operation: string;
    /** @description 本次调用涉及的资源集合。 */
    readonly resources: readonly string[];
    /** @description 本次调用风险等级。 */
    readonly risk: McpExecutionRisk;
}

interface IApprovalLeaseRecord {
    readonly connectionId: string;
    readonly resources: ReadonlySet<string>;
    readonly operations: ReadonlySet<string>;
    readonly maxRisk: Exclude<McpExecutionRisk, 'read'>;
    readonly idleLeaseMs: number;
    readonly expiresAt: number;
    lastUsedAt: number;
}

/**
 * @description 管理仅在本机 Hub 内存中存在的短期审批租约。
 */
export class McpApprovalLeaseStore {
    /** @description 默认空闲租约。 */
    public static readonly defaultIdleLeaseMs = 10_000;
    /** @description 默认最长持有时间。 */
    public static readonly defaultMaxHoldMs = 60_000;
    /** @description 活动租约；Hub 进程退出即失效。 */
    private readonly leases = new Map<string, IApprovalLeaseRecord>();

    /**
     * @description 签发一个绑定连接、资源和操作范围的本地审批租约。
     * @param request 已由编辑器 UI 确认范围的输入。
     * @returns 不可预测租约 token 与绝对过期时间。
     */
    public issue(request: IMcpApprovalLeaseRequest): { readonly token: string; readonly expiresAt: number } {
        const connectionId = this.requireText(request.connectionId, 'connection');
        const resources = this.normalize(request.resources);
        if (resources.size === 0) {
            throw new Error('mcp_approval_lease_resources_required');
        }
        const now = Date.now();
        const idleLeaseMs = this.duration(request.idleLeaseMs, McpApprovalLeaseStore.defaultIdleLeaseMs);
        const maxHoldMs = Math.max(idleLeaseMs, this.duration(request.maxHoldMs, McpApprovalLeaseStore.defaultMaxHoldMs));
        const preferred =
            typeof request.preferredToken === 'string' ? request.preferredToken.trim() : '';
        const token =
            preferred.length >= 32 && /^[0-9a-f]+$/iu.test(preferred) ? preferred : this.createToken();
        this.leases.set(token, {
            connectionId,
            resources,
            operations: this.normalize(request.operations ?? []),
            maxRisk: request.maxRisk === 'destructive' ? 'destructive' : 'write',
            idleLeaseMs,
            expiresAt: now + maxHoldMs,
            lastUsedAt: now,
        });
        return { token, expiresAt: now + maxHoldMs };
    }

    /**
     * @description 校验并消费一个本地审批租约；成功消费会续期其空闲计时。
     * @param token 调用方提供的租约 token。
     * @param use Hub 提供的可信调用上下文。
     * @returns 是否允许本次调用跳过再次确认。
     */
    public consume(token: unknown, use: IMcpApprovalLeaseUse): boolean {
        this.sweep();
        if (typeof token !== 'string' || token.length === 0) {
            return false;
        }
        const record = this.leases.get(token);
        if (record == null || record.connectionId !== use.connectionId || !this.permitsRisk(record.maxRisk, use.risk)) {
            return false;
        }
        if (record.operations.size > 0 && !record.operations.has(use.operation)) {
            return false;
        }
        for (const resource of this.normalize(use.resources)) {
            if (!record.resources.has(resource)) {
                return false;
            }
        }
        record.lastUsedAt = Date.now();
        return true;
    }

    /**
     * @description 主动撤销一个本地审批租约。
     * @param token 待撤销的 token。
     * @returns token 是否存在并已移除。
     */
    public revoke(token: unknown): boolean {
        return typeof token === 'string' && token.length > 0 ? this.leases.delete(token) : false;
    }

    /**
     * @description 清理绝对过期或空闲超时的本地租约。
     * @returns 无返回值。
     */
    public sweep(): void {
        const now = Date.now();
        for (const [token, record] of this.leases) {
            if (now > record.expiresAt || now - record.lastUsedAt > record.idleLeaseMs) {
                this.leases.delete(token);
            }
        }
    }

    /**
     * @description 生成只保存在本机内存中的不可预测 token。
     * @returns 十六进制 token。
     */
    private createToken(): string {
        const bytes = new Uint8Array(32);
        globalThis.crypto.getRandomValues(bytes);
        return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    }

    /**
     * @description 校验并规范化资源或 operation 集合。
     * @param values 未信任字符串集合。
     * @returns 去重后的规范化集合。
     */
    private normalize(values: readonly string[]): Set<string> {
        const result = new Set<string>();
        for (const value of values) {
            if (typeof value === 'string' && value.trim().length > 0) {
                result.add(value.trim().replace(/\\/gu, '/'));
            }
        }
        return result;
    }

    /**
     * @description 读取并夹紧毫秒时长。
     * @param value 可选时长。
     * @param fallback 缺省值。
     * @returns 至少 20ms 的整数时长。
     */
    private duration(value: number | undefined, fallback: number): number {
        return typeof value === 'number' && Number.isFinite(value) ? Math.max(20, Math.floor(value)) : fallback;
    }

    /**
     * @description 判断已批准风险是否覆盖当前调用风险。
     * @param approved 已批准最高风险。
     * @param requested 当前调用风险。
     * @returns 是否允许执行。
     */
    private permitsRisk(approved: Exclude<McpExecutionRisk, 'read'>, requested: McpExecutionRisk): boolean {
        return requested === 'read' || requested === 'write' || approved === 'destructive';
    }

    /**
     * @description 读取非空文本字段。
     * @param value 未信任文本。
     * @param label 字段标签。
     * @returns 去除首尾空白后的文本。
     */
    private requireText(value: string, label: string): string {
        if (typeof value !== 'string' || value.trim().length === 0) {
            throw new Error(`mcp_approval_lease_${label}_invalid`);
        }
        return value.trim();
    }
}
