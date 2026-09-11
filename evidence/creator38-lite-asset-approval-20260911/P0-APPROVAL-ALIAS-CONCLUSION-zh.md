# P0 approvalId/approvalToken 别名 — 结论

时间：2026-09-11 21:56:37 UTC+8
分支：bot/pod-lite-smoke-ab-20260911
Worktree：peanut-pod-lite-wt-smoke-ab
工程：test-demos/cocos-for-agent

## 改动文件

1. `packages/pod-lite-capability-policy/src/core-cocos-mcp-execution-dispatcher.ts`
   - `resolveLeaseId`：`approvalId ?? approvalToken`（非空 trim）；双传优先 id
2. `packages/pod-lite-capability-policy/src/core-cocos-native-write-tool-schema-catalog.ts`
   - `control()` 同时声明 `approvalId` + `approvalToken`；`lumen.structure` 同步
3. `packages/cocos-creator-lite-host-extension/src/main.js`
   - `issue-local-approval-lease` 与 `issueApprovalLease` 响应增加 `approvalToken` 别名
4. `packages/editor-mcp/src/editor-mcp-action-router.ts`
   - `_stripHubControlFields` 剥离 `approvalId`
   - `lumen.bindController` 校验/执行前剥离 Hub 控制字段
5. `packages/pod-lite-capability-policy/tests/execution-dispatcher.test.mts`
   - 无租约拒；仅 id；仅 token；双传优先 id；schema 带 token 不 invalid

## 测试

- `@peanut/pod-lite-capability-policy`：`npm test` → 9/9 pass

## 复验（catalog + lumen）

证据：`evidence/creator38-lite-asset-approval-20260911/CATALOG-LUMEN-APPROVAL-MATRIX-zh.md`

- 读：免租约（summary PASS；lookup/inspect 等缺参业务错）
- 写：`asset.catalog.refresh` / `lumen.refresh` / `lumen.commit` / `lumen.scaffold`：无租约 `approval_required`；token 与 id 均可过门禁并成功
- 其余 lumen 写：无租约拒；有租约后为产品/业务错（非 approval_required / 非因别名 schema_invalid）
- 场景抽样：`scene.createNode` token PASS；`scene.reload` id PASS
- 门禁回归失败数：0

## 剩余缺口

- Hub `confirmDestructive` 与 Lite 写 schema（additionalProperties:false）未对齐 → destructive 真写仍卡在 Hub 确认层
- `lumen.nodeAdd` bundled `empty.prefab` 模板缺失
- structure/bind 等需真实 recipe/节点/uuid 才能业务成功（门禁已过）
- Hub BatchStore 的 `issueApprovalToken` 仍不写入 Lite `McpApprovalLeaseStore`（P1）
