# Lite ↔ Cocos/editor 免费面对齐 — 结论

时间：2026-09-12 00:52:45 UTC+8
分支：`bot/pod-lite-smoke-ab-20260911`
证据：`evidence/lite-editor-parity-20260912/`

## 中文结论（先行）

**免费面对齐度粗估 ≈ 94%。**  
83 项公开 op 的 catalog/schema/gateway/Hub 可见性已齐；Pro 面正确隔离；本轮补上旧岛 Agent 常用的写控制字段 `resources`，并完成资产写抽样真机（含破坏删除）。无新的「缺实现」类 P0。

## 对齐度说明

| 面 | 估计 | 依据 |
| --- | ---: | --- |
| 公开 83 catalog/schema/接线 | ~100% | policy 83 + Hub 84（含 lease 工具） |
| 租约/别名/破坏确认/安静闸门 | ~100% | 既有 commit + 本轮回归 |
| 常用读/写真机（editor/scene/catalog/lumen/asset 抽样） | ~90% | realtime/quiet-gate/本轮 device-verify |
| 全写矩阵（prefab/builder/import…） | ~70% | 实现在，真机覆盖未全 |
| **综合免费面** | **~94%** | 缺实现 P0=0；余 P1 覆盖与 sessionBound |

## 已合项（本轮 + 既有关键）

- Hub registry 桥、lease 暴露、approvalToken↔approvalId、confirmDestructive、empty 模板、quiet-gate（既有）
- **本轮**：`resources` 写入 schema（policy + editor-mcp tool catalog）+ 单测 + pack/install + 真机 7/7

## 剩余项

见 `REMAINING-zh.md`（P1：sessionBound、prefab/builder/import 全表真机）。

## 真机/单测

- `@peanut/pod-lite-capability-policy`：**13/13 PASS**
- device-verify-resources：**7/7 PASS**（schema resources、lease、refresh、createFolder、delete、无租约拒）
- Creator：软关后 `--project --nologin` 重启；未 /F

## Commit

见 git log（本轮 commit message 含 resources schema parity）。
