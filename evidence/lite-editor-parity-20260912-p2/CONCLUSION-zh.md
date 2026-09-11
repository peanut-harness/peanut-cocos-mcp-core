# Lite ↔ Cocos/editor 免费面对齐 — P2 结论

时间：2026-09-12 01:22:38 UTC+8
分支：`bot/pod-lite-smoke-ab-20260911`
证据：`evidence/lite-editor-parity-20260912-p2/`
前置：`evidence/lite-editor-parity-20260912-p1/`（sessionBound + P1 矩阵）

## 中文结论（先行）

**综合对齐度估值 ≈ 98%。**  
对照旧岛后：`asset.importPlan` / `asset.managedStatus` **设计即只读免租约**（CAPABILITIES `readOnly:true`，旧岛 schema 亦无 control）——Lite 曾误放入写目录导致假闸门，本轮迁回 read catalog，**未硬加 control**。  
`asset.open` 为写风险：旧岛靠 Hub plan/directWrite；Lite 补 `control()` 租约入口并对齐 dispatcher 消费；无 directWrite 时仍返回 Hub plan（同构旧路径）。真机 **10/10 PASS**；单测 policy **17/17 PASS**。

## 对齐度

| 面 | 估值 | 说明 |
| --- | ---: | --- |
| 公开 83 catalog/schema/网关 | ~100% | 维持 |
| 租约/别名/破坏确认/安静闸门/sessionBound | ~100% | 维持 |
| 缺 control 摩擦三项 | ~100% | 本轮闭环 |
| **综合对齐度** | **~98%** | 余文档/覆盖/Pro |

## 验证

- `@peanut/pod-lite-capability-policy`：**17/17 PASS**（含 P2 分类+租约单测）
- 真机：见 `P2-DEVICE-RESULTS.json` / `P2-DEVICE-RESULTS-zh.md`
- Creator：软关后 `--project --nologin` 重开；未 /F

## Commit

见 git log（本轮 message：P2 control/reclassify）。
