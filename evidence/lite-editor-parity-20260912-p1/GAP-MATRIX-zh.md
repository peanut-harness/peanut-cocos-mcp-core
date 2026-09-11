# Lite ↔ 旧岛 editor 免费面对齐缺口表（P1 刷新）

时间：2026-09-12 01:07:25 UTC+8
Worktree：`D:\peanut-workspace\peanut-pod-lite-wt-smoke-ab`（`bot/pod-lite-smoke-ab-20260911`）

## 中文结论（先行）

- **sessionBound**：已对齐旧岛 BatchStore 语义（5min/30min），Hub 镜像不再落回短租约。
- **prefab/builder/import/preview**：真机矩阵 `42/42`；拒批安静。
- **缺实现 P0**：0。
- **剩余**：主要为旧岛同构 schema 摩擦（open/importPlan/managedStatus 无 control）与文档措辞。

## 总览计数

| 差距类型 | 条数（约） | 说明 |
| --- | ---: | --- |
| 已对齐 | 83+支撑 + sessionBound + 本轮真机域 | |
| 缺实现 P0 | 0 | |
| 行为差 P1→done | sessionBound | 本轮已修 |
| 旧岛同构摩擦 | 3 op schema | open/importPlan/managedStatus |
| 属 Pro | 7+ | 维持禁入 |

## P1 本轮验证摘要

见 `P1-MATRIX-RESULTS-zh.md` / `P1-MATRIX-RESULTS.json` / `P1-MATRIX-CONFIRM-EXTRA.json`。
