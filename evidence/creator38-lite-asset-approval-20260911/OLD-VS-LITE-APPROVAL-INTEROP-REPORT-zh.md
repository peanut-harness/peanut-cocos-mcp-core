# 旧岛 vs Lite：资源写路径 + 租约互操作对照报告

时间：2026-09-11（UTC+8）  
范围：只读整理（本报告阶段未改代码）  
旧岛：`D:\workspaces\peanut-agents\products\cocos`（分支 `feat/editor-mcp-pink-p0-p3`）  
Lite worktree：`D:\peanut-workspace\peanut-pod-lite-wt-smoke-ab`（分支 `bot/pod-lite-smoke-ab-20260911`，含 ef208cc / e1ecdaa / 9c92cd4）  
Lite 主仓：`D:\peanut-workspace\peanut-pod-lite`（main，尚无上述 host 桥接提交）  
证据参考：`evidence/creator38-lite-write-acceptance-20260911/`（场景写已通；资产写未做）

---

## 中文结论（先行）

1. **旧岛写门禁是「Hub 单层」**：`CocosMcpHub` 用 `McpBatchApprovalStore` + 字段 **`approvalToken`**；无 token 则转 **plan**，面板批准后可 `approvePlanAndIssueToken`；editor-mcp 执行前会 **剥掉** `approvalToken`，避免 lumen/schema 误伤。
2. **Lite 写门禁是「Core 单层 + Hub 旁路」**：真正拦写的是 `CoreCocosMcpExecutionDispatcher` → `McpApprovalLeaseStore.consume(input.approvalId)`；错误码 **`core_cocos_mcp_execution_approval_required:<op>`**。Hub 仍保留旧的 `approvalToken`/`plan`，但 **plan / Hub token 不能替代 Lite lease**（写验收已证实）。
3. **字段名不兼容是当前互操作主根因**：Lite 写 schema 的控制字段只有 **`approvalId`**，且 `additionalProperties: false`；旧调用方传 **`approvalToken`** 会先撞 **`core_cocos_mcp_execution_schema_invalid` / input_invalid**，即使 token 字符串本身正确也进不了 consume。
4. **存储也未统一**：Hub `McpBatchApprovalStore`（plugin-core）与 Lite `McpApprovalLeaseStore`（capability-policy）是 **两套内存 Map**；`issueApprovalToken` ≠ `issue-local-approval-lease`。9c92cd4 已把 Lite 签发暴露为 Hub 只读工具，但返回名是 `approvalId`（另附 `token`），未接旧字段名。
5. **推荐最小接入（尚未实施）**：在 dispatcher consume 处接受 `approvalId ?? approvalToken`；schema `control()` 同时声明两字段；签发响应同时回 `approvalId`+`approvalToken`；单测覆盖别名。**不要**用订阅/plan/自动发租约绕过。资产写复验应在别名修好后做 createFolder/move（可回滚）等低风险项。

---

## 1. 旧方案：流程

### 1.1 谁发租约

| 入口 | 行为 |
|---|---|
| Hub action `issueApprovalToken` | 面板/客户端已确认资源集合后签发 |
| `approvePlanAndIssueToken(planId)` | 批准写 plan 同时签发同资源租约 |
| 可选 `sessionBound: true` | 空闲 5min / 最长 30min（否则默认 idle 10s / max 60s） |

签发主体：`CocosMcpHub` → `McpBatchApprovalStore.issue(...)`。  
返回字段：**`approvalToken`**、`expiresAt`、`idleLeaseMs`。

### 1.2 字段与绑定

- **字段名**：调用输入 / 签发输出均为 **`approvalToken`**。
- **绑定维度**（consume 校验）：
  - `connectionId`（必须同连接）
  - `resources`（规范化路径/uuid 集合；请求资源须 ⊆ 已批）
  - `operations`（可选白名单；空=同连接下任意写工具）
  - `risk` / `maxRisk`（destructive 需批到 destructive；overwrite import 会抬升 risk）
  - idle / maxHold 滑动与硬过期
- **plan 关系**：无有效 token 时 Hub `_call` **不执行**，返回 `planId` + `confirmationRequired`；批准后才真写。plan **本身不是**执行凭证，token 才是。

### 1.3 资产写如何过审批

1. MCP/HTTP 调一级工具 `peanut.editor-mcp.<op-kebab>`（如 `asset-import`），输入带 `approvalToken` + 业务字段（及可选 `resources`）。
2. Hub：`tryConsume(approvalToken, {connectionId, operation: toolName, resources, risk})`。
3. destructive 另需 `confirmDestructive: true`。
4. 通过后 `_invokeWithPostflight` → editor-mcp `EditorMcpActionRouter`。
5. Router 对 lumen 等会 **delete approvalToken / confirmDestructive / resources**，再进 gateway。
6. 资产路径：`editor-mcp-silent-asset-gateway`（import / move / createFolder / delete…）+ `LumenAssetDbReadyWaiter`（import 分层等待 AssetDB 稳定；`refreshAfter` 默认 true）。

### 1.4 AssetDB 就绪

- 显式 op：`asset.waitReady` → `LumenAssetDbReadyWaiter`。
- import 管道内建分层 wait；silent move/rename 后 refresh。
- lumen commit / preview 路径也会触发 AssetDB soft refresh。

---

## 2. 旧实现关键类型/文件（路径 + 职责）

| 路径 | 职责 |
|---|---|
| `products/cocos/editor/core/plugin-core/src/mcp/cocos-mcp-hub.ts` | Hub：catalog/call/plan、`issueApprovalToken`、写门禁、`approvePlanAndIssueToken` |
| `.../mcp/mcp-batch-approval-store.ts` | `McpBatchApprovalStore`：`issue` / `tryConsume` / `revoke` / `sweep`；`approvalToken` 语义 |
| `.../host/plugin-manager-editor-entry.ts` | 拉起 `CocosMcpHub` |
| `.../mcp/project-mcp-agent-config.ts` | 指引客户端优先用服务端 token/lease |
| `products/cocos/editor/plugins/integrations/editor-mcp/src/editor-mcp-action-router.ts` | 83 op 路由；剥 approvalToken |
| `.../editor-mcp-tool-catalog.ts` | 工具 schema（含 `approvalToken` 描述） |
| `.../editor-mcp-silent-asset-gateway.ts` | 资产写 + AssetDB ready/refresh |
| `.../editor-mcp-scene-gateway.ts` | `scene.createNode` 等 |
| `products/cocos/editor/core/contracts/src/mcp/editor-mcp-contracts.ts` | 契约类型 |
| `.../tests/mcp-write-safety-matrix.test.ts` | 无 token→plan；issue→consume 矩阵 |

---

## 3. Lite 现状：流程与实现

### 3.1 流程（当前 worktree）

```
Hub HTTP / peanut.editor-mcp.* 
  → CocosMcpHub（仍可因无 approvalToken 而返 plan；directWriteEnabled=true 时跳过 Hub 批处理）
  → host toolHandlers（main.js 发布到 McpCapabilityRegistry，e1ecdaa）
  → CoreCocosMcpExecutionDispatcher.execute
       · schema 校验（写工具 control 字段 = approvalId；additionalProperties:false）
       · requiresLocalApproval ⇒ McpApprovalLeaseStore.consume(input.approvalId, {connectionId, resources, operation, risk})
       · 失败 ⇒ throw core_cocos_mcp_execution_approval_required:<operation>
  → EditorMcpGatewayAdapter → createEditorMcpExecuteOperation → 旧 editor-mcp router/gateway
```

**签发 Lite 租约（9c92cd4）**：

| 入口 | 返回 |
|---|---|
| Hub 工具 `peanut.editor-mcp.issue-local-approval-lease`（readOnly） | `{ approvalId, token, expiresAt, connectionId }` |
| Creator message `issue-approval-lease` / method `issueApprovalLease` | `{ token, expiresAt }`（Core API） |

消费：**仅**写工具 input 的 **`approvalId`**（与签发 token 同串）。  
**订阅 / plan / Hub `approvalToken` 均不能替代** 该 consume（写验收：no-lease → approval_required；directWrite=false → 仅 plan）。

### 3.2 关键类型/文件

| 路径 | 职责 |
|---|---|
| `packages/pod-lite-capability-policy/src/mcp-approval-lease-store.ts` | `McpApprovalLeaseStore`：`issue`/`consume`/`revoke`；无 `sessionBound` |
| `.../core-cocos-mcp-execution-dispatcher.ts` | fail-closed；**只读 `input.approvalId`** |
| `.../core-cocos-native-write-tool-schema-catalog.ts` | 写 schema；`control()={approvalId}`；`additionalProperties:false` |
| `.../core-cocos-native-write-capability-catalog.ts` | 含 `asset.*` / `scene.createNode` 等；`requiresLocalApproval: true` |
| `.../editor-mcp-gateway-adapter.ts` | 注册 Lite 公开 ~83 ops，转发 router |
| `packages/mcp-pod-lite-creator-host/src/index.ts` | 组装 dispatcher+leases；`issueApprovalLease`；`extractWriteResources` |
| `packages/cocos-creator-lite-host-extension/src/main.js` | 注册 lease 工具、发布 Hub registry、消息桥 |
| `packages/plugin-core/src/mcp/cocos-mcp-hub.ts` | **仍是旧** `McpBatchApprovalStore` + `approvalToken`（与 Lite store 平行） |
| `packages/editor-mcp/...` | 与旧岛同源执行层（剥 `approvalToken`；AssetDB waiter 仍在） |
| `packages/pod-lite-capability-policy/tests/execution-dispatcher.test.mts` | 仅测 `approvalId`，无 token 别名 |

### 3.3 已复验事实（场景写，非资产写）

来自 `evidence/creator38-lite-write-acceptance-20260911/`：

| 相位 | 结果 |
|---|---|
| 无租约 `scene.createNode` | `core_cocos_mcp_execution_approval_required:scene.createNode` |
| Hub plan（directWrite=false） | 返回 `planId`，**未执行** |
| `issue-local-approval-lease` + `approvalId` | createNode / setSelection / focusNode / reload **PASS** |
| `scene.save` | 产品策略拒：`scene_save_refused:use_lumen_offline_write` |

**尚未覆盖**：`asset.createFolder` / `asset.move` / `asset.import` 等资产写；**尚未覆盖**：仅传 `approvalToken` 的别名路径。

---

## 4. 差异表

| 维度 | 旧岛 | Lite（现状） | 互操作影响 |
|---|---|---|---|
| 签发字段 | `approvalToken` | `approvalId`（响应另有 `token`） | 旧客户端对不上 |
| 消费字段 | `input.approvalToken` | `input.approvalId` only | 传 token → schema 拒或 approval_required |
| Store | `McpBatchApprovalStore`（Hub 内） | `McpApprovalLeaseStore`（Core 内） | **两套**；issueApprovalToken 灌不进 Lite |
| 无租约行为 | Hub 返 plan | Core throw `approval_required`（若 Hub 已放行） | plan ≠ 执行凭证（一致意图，形态不同） |
| sessionBound | 有（5min/30min） | 无（仅 idle/maxHold 参数） | 长会话手感差一截 |
| schema 多余字段 | 工具 catalog 显式含 approvalToken | 写 schema `additionalProperties:false` | **approvalToken 直接 schema_invalid** |
| Hub registry | editor-mcp 自注册 | Lite host 桥接发布（e1ecdaa）+ lease 工具（9c92cd4） | catalog 已齐；语义未齐 |
| 资产写入口 | silent-asset-gateway | 同网关经 GatewayAdapter | 执行层可复用；门禁字段挡住 |
| AssetDB ready | waitReady + import 内建 | 同（lumen waiter 在包内） | 门禁打通后应可复用 |
| 错误码 | plan / `cocos_mcp_*` / destructive confirm | `core_cocos_mcp_execution_approval_required` / `schema_invalid` / `mcp_approval_lease_*` | 客户端需认 Lite 码 |
| 单测别名 | Hub matrix 测 approvalToken | dispatcher 只测 approvalId | 缺口明确 |

---

## 5. 推荐接入（最小改动，保持旧调用方手感）

**原则**：同一 `McpApprovalLeaseStore.consume`；订阅/plan 不得替代；不整岛迁、不装 Pro。

### P0（建议立刻做）

1. **`CoreCocosMcpExecutionDispatcher.requireApproval`**  
   `const leaseId = input.approvalId ?? input.approvalToken`（非空 string trim）再 `consume(leaseId, …)`。
2. **写 schema `control()`**  
   同时声明 `approvalId` 与 `approvalToken`（描述写清：二者等价，指向同一本地租约）。保持 `additionalProperties: false`。
3. **签发响应别名**  
   `issue-local-approval-lease` 已有 `approvalId`+`token`；再加 **`approvalToken: issued.token`**，旧文档/技能可直接抄字段。
4. **单测**（`execution-dispatcher.test.mts` 或新测）：  
   - 无 id/token → approval_required  
   - 仅 `approvalId` → 成功  
   - 仅 `approvalToken` → 成功  
   - 两者都传且不一致：建议 **优先 approvalId**，并加测锁定该策略  
   - schema：带 `approvalToken` 不再 schema_invalid

### P1（可选，仍属小改）

5. Hub `issueApprovalToken` / `approvePlanAndIssueToken`：**额外**调用 `coreModule.issueApprovalLease`（同 connection/resources/operations/maxRisk），使「旧 Hub action」与 Lite store 对齐；返回可同时带两字段。注意：仍是一次用户确认，不是自动免审。  
6. 文档/技能：Lite 路径写明「先 `issue-local-approval-lease`，再写工具带 approvalId|approvalToken」；强调 plan 非替代。

### 明确不做

- ❌ 写工具内自动 issue lease  
- ❌ 用 planId / 订阅态跳过 `requiresLocalApproval`  
- ❌ 合并删掉 Hub BatchStore 的大重构（可后续，非本切片）

### 资产写复验建议（改完后）

在 `evidence/creator38-lite-asset-approval-20260911/`：

| 用例 | 期望 |
|---|---|
| 无租约 `scene.createNode` | `approval_required` |
| 仅 `approvalToken`（lease 已 issue） | 成功 |
| 仅 `approvalId` | 成功 |
| `asset.createFolder`（临时目录，可删） | 成功 + 可回滚 delete/move 回 |
| `asset.move` 或小文件 import 到临时目录 | 成功；记录 schema 与错误码 |
| Hub plan 无 lease | 不执行真写 |

---

## 6. 验收标准

1. **无租约拒**：任意 `requiresLocalApproval` 写 op，无有效 lease → `core_cocos_mcp_execution_approval_required:<op>`；不得因 plan/订阅而执行。  
2. **token 与 id 均可**：对同一 `McpApprovalLeaseStore` 签发的串，input 只带 `approvalToken` 或只带 `approvalId` 均能过 consume；二者都不是商业 entitlement。  
3. **可恢复资产写**：至少 1～2 个低风险可回滚资产写（优先 createFolder / move）在 issue lease 后成功；失败时错误码可区分 schema / approval / AssetDB / 业务。  
4. **回归**：现有 `scene.createNode` 无租约拒 + 有 approvalId 通 仍成立；加单测锁别名。

---

## 本阶段状态

- ✅ 对照报告完成（只读）  
- ⏸ 编码/Creator 复验按转向要求暂停；P0 改动点已收敛到 dispatcher + schema + 签发别名 + 单测  
- 主仓 `peanut-pod-lite` main **尚未**包含 e1ecdaa/9c92cd4；实机应以 worktree 为准