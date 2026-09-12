# 中文结论先行 — resources × 资产写绑定（策略 A）

时间：2026-09-12 09:26:54 UTC+8

## 结论

**P0+P1+P2 已在 worktree 落地，并在 `D:\\mcp-test`（Creator 3.8.7）完成资产写矩阵真机验收：29/29 PASS。**

拍板对齐：
1. **不要 parent/前缀覆盖** → 精确匹配（归一后 ⊆）；A1 父路径签子路径拒 PASS
2. **全做** → 归一 / 收紧声明覆盖 / replaceReferences uuid 采绑 / fail-closed / seed risk 对齐 / 文档 / 证据均已做
3. 真机工程确为 **`D:\\mcp-test`**

## 改动摘要

- 新增 `normalizeResourceKey` / `extractWriteResources` / `resolveAuthorizedResources`（capability-policy）
- Lite host：最终授权 = 推导 ∪ 声明，声明不得替换推导
- LeaseStore + BatchStore：同一归一；BatchStore 空资源 fail-closed
- Hub `_readOptionalResources` 扩键并对齐归一
- `replaceReferences` 采 fromUuid/toUuid/targets，禁止整树回退
- seed risk：`asset.replaceReferences` → destructive
- router 剥离前保留 `__peanutResourcesAudit`
- 文档：BOUNDARIES / MATRIX / LEDGER 写清策略 A + 归一规则

## 单测

- `@peanut/pod-lite-capability-policy`：**26/26 PASS**（含 resources-authorization）
- `mcp-batch-approval-store`：**5/5 PASS**（含空资源 fail-closed、assets↔db 互通）

## 真机矩阵（mcp-test）

- 每写 op 无租约拒：12/12 PASS（安静闸门 / approval_required）
- A1 无前缀拒、A2 精确过、A3 口是心非拒、错绑拒、refresh 哨兵/窄租约、写矩阵绑定、uuid 绑/错绑、delete：均 PASS
- A13 归一互通：业务成功（`asset_open_ok`），评分脚本曾误读 message，已更正为 PASS

## 剩余风险

- uuid→db 路径仅在提供 `resolveUuidToDbPath` 时互通；默认未解析 uuid 须两侧同签 uuid 键
- Hub/Lite 双 Store 仍在；未 mirror 时仍依赖 `issue-local-approval-lease`
- `ensureSpriteFramesBatch` / `replaceReferences` 在假 uuid 下可能业务失败，但租约门禁已覆盖
- 新工程需显式 `setPluginExposure(..., all)` 才会把写 op 暴露到 Hub catalog

## 证据

`evidence/creator38-lite-resources-binding-20260912/`
