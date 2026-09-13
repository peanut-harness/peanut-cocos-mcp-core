# Core / Pro Boundary

`peanut-pod-lite` is the Cocos Creator editor product. It contains editor
contracts, capability policy, local approval, Creator hosts, Lumen, and the
subscription upgrade surface.

`peanut-pod-pro` is the paid edition. It contains signed-plan verification,
entitlement-gated workflows, and proprietary generators. It must not become a
second editor kernel.

Lite must never import Pro or rely on a private registry. Pro may only use
documented, versioned Lite APIs. Missing Pro, a signed-out account, or a failed
upgrade must not block Lite editor capabilities.

Lite may advertise paid operations and open a Pod Server checkout URL. It must
not execute those operations, accept a client-supplied entitlement, or treat a
subscription as a write approval. Billing webhooks on `peanut-pod-server` are
the only grant path.

## Workspace Boundary

- `protocol` 不依赖其它工作区；`sdk` 只依赖 `protocol`。
- `engine` 只依赖 `protocol` 与 `sdk`；不得导入 `hosts` 或 `panel`。
- `hosts` 负责 Creator 生命周期与动态适配，可依赖 `engine`。
- `panel` 不得装配 engine 或读取 Creator 版本；它只保留静态 UI 与稳定消息面。
- engine/host 内部目录不是 npm workspace，禁止独立 lockfile 与 `file:` 依赖。

破坏性操作至少包括删除、引用替换、节点/组件移除、Prefab 解包/解除关联和 Builder 输出覆盖。目录缺失 schema 或风险信息时必须拒绝启动，不能静默跳过。


## resources × 资产写绑定

- **匹配**：归一后字符串精确 ⊆（`lease.resources` 必须覆盖授权集）。**无** parent/前缀覆盖；租约签父路径不能放行子路径（A1）。
- **归一 `normalizeResourceKey`**（签发 / 推导 / 校验同一套）：
  1. trim，`\` → `/`
  2. `assets/...` ↔ `db://assets/...`（规范形 `db://assets/...`）
  3. uuid（可带 `@sub`）：若提供 `resolveUuidToDbPath` 且能解析 → db 路径再归一；否则保持原样（uuid 体小写）。**未解析 uuid 不与 db 路径互通**（须两侧同签 uuid 键）。
- **最终授权集** = `extractWriteResources(op,input)`（业务字段推导）∪ 声明（`input.resources` / Hub `resourceIds`）。声明**不得**替换推导（堵住口是心非越权）。
- **replaceReferences**：采集 `fromUuid`/`toUuid`/`targets`；**禁止**默默回退整树 `db://assets`；无有效资源 fail-closed。
- **createFolder**：必须签**最终 path**（精确匹配）。
- **空资源**：Hub BatchStore 与 Lite 统一 fail-closed（写/破坏性消费无有效资源则拒）；整库仅显式哨兵 `db://assets`（refresh / 无 path 的 reimport）。
- **seed risk**：`asset.replaceReferences` 与 native 对齐为 `destructive`（需 `confirmDestructive`）。
- **审计**：router `_stripHubControlFields` 剥离 `resources` 前写入 `__peanutResourcesAudit` 摘要（≤32）。
- **验收归属**：实机日志与逐项结果由独立 QA 工程保存；本仓只保留可重复执行的实现、测试和验收步骤。
