# Lite ↔ Cocos/editor 免费面对齐 — P1 结论

时间：2026-09-12 01:07:25 UTC+8
分支：`bot/pod-lite-smoke-ab-20260911`
证据：`evidence/lite-editor-parity-20260912-p1/`
前置：`evidence/lite-editor-parity-20260912/`（resources schema / quiet-gate）

## 中文结论（先行）

**免费面对齐度粗估 ≈ 97%。**  
本轮补齐 `sessionBound` 长租约（5min/30min）并与 Hub BatchStore 镜像对齐；prefab / builder / import / preview 免费域带参真机矩阵 **42/42 PASS**（含预期拒批与产品破坏确认）；拒批安静（project.log 无 `error: ... approval_required` 刷屏）。缺实现 P0 仍为 0。

## 对齐度说明

| 面 | 估计 | 依据 |
| --- | ---: | --- |
| 公开 83 catalog/schema/接线 | ~100% | 既有 |
| 租约/别名/破坏确认/安静闸门/`sessionBound` | ~100% | 本轮单测 + 真机 lease 契约 |
| 常用读/写真机 | ~95% | 本轮 prefab/builder/import/preview 全表 |
| 全写矩阵 | ~95% | 42/42；confirm 补跑 builder.build/unpack/unlink 真执行 PASS |
| **综合免费面** | **~97%** | 余旧岛同构摩擦与文档措辞 |

## 本轮已合项

1. **`sessionBound`**：`McpApprovalLeaseStore` 支持会话默认 5min/30min；host `issue-local-approval-lease` schema/回传；Hub `_mirrorLocalApprovalLease` 传已解析 idle/max（修镜像短租差）。
2. **真机矩阵**：读免租约 PASS；写无租约拒批安静；写带租约执行/产品确认。
3. **confirm 补跑**：`builder.build` / `prefab.unpack` / `prefab.unlink` + `confirmDestructive` → ok。

## 剩余项

见 `REMAINING-zh.md`。

## 真机/单测

- `@peanut/pod-lite-capability-policy`：**16/16 PASS**（含 sessionBound 3 例）
- `mcp-batch-approval-store`：**3/3 PASS**
- P1 矩阵：**42/42 PASS**；quiet-gate PASS
- Creator：软关后 `--project --nologin` 重启；未 /F

## Commit

见 git log（本轮 message 含 sessionBound + P1 matrix）。
