<!-- peanut-hub:standards:start -->
# Peanut 共享规范入口

本区块由 Hub 安装器写入。Grok / Codex / Cursor / Claude 共用这一份 `AGENTS.md`，不要再生成 `CLAUDE.md`、`.cursorrules` 或其它厂商副本。

- 先 `node ../peanut-hub/tools/knowledge/rag.mjs query "<任务>"`，只用命中（默认 3 条）。禁止通读 knowledge。
- 改代码后更新对应卡片并 `node ../peanut-hub/tools/knowledge/rag.mjs build`；`check-sync` 必须通过。事实未变则 `attest <repo-id> "<原因>"`（写入 Hub `knowledge/sync.json`，须提交）。不要提交 `.rag/`。
- 确认语言后再读 Hub `standards/languages/<语言>/README.md`。共享规范只以 Hub `standards/` 为权威。
- Hub 路径不可读则先恢复，不要猜规则。不要覆盖其他任务改动；交付前在实际工程跑只读检查。
<!-- peanut-hub:standards:end -->
