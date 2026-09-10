# Pod 迁移实施计划

本轮范围：以 `D:/workspaces/peanut-agents/products/cocos` 为实现参考，在当前工作空间完成 Lite、Pro、Server 的迁移；`D:/workspaces/peanut-agents/test-demos/cocos-for-agent` 为已授权测试工程。不发布远端，不退役尚未通过替代验收的旧插件。

## 实施顺序及验收

1. **源码与构建独立**：迁入免费 Asset Catalog、Lumen 及其模板、Creator runtime 与 MCP 执行实现；迁入 Pro 专有生成器。依赖只指向新仓库公开包，构建不读取旧仓库。保留来源、版本和差异记录。
2. **Lite 执行闭环**：83 项免费操作通过新分发器注册；写操作消费宿主签发的审批租约，资源范围由宿主解析。免费预览与收费 capture 分离。验证实际处理器覆盖、输入拒绝、审批拒绝、生命周期及旧实现 fixture 对照。
3. **Pro 执行闭环**：SnowB、UI Prefab、SDF、Asset Version Mover、capture、Content Delivery 接入实际实现；全部 15 项经过统一在线计划和本地审批入口。缺少原生工具明确拒绝。不得把旧服务转发或仅注入接口标成已迁移。
4. **Server 运行闭环**：校验当前身份、设备、权益及撤销；补齐必要的设备管理、数据库迁移与 HTTP 生命周期，覆盖错误、超时、撤销和隔离。订阅变更只接可信管理方，不能由普通客户端自授权益。
5. **统一构建与验收**：固定 Lite 子模块版本，运行类型、增量格式和静态检查、单元与协议测试，验证制品没有旧源码依赖。将当前制品安装到指定工程，确认工程路径与实际新插件所有者后做 Creator 冒烟测试。

## 完成判据

- “源码迁入”“处理器接线”“独立构建”“fixture 通过”“Creator 实测”分别记录，不以目录覆盖代替可执行覆盖。
- Lite 独立运行；Pro 不导入 Lite 私有源码，不绕过审批或在线校验。
- 拒绝路径不产生副作用，卸载和激活失败释放已注册资源。
- Creator 2.4/3.5/3.8 分别记录验证范围，不能用 3.8 的结果声称全部版本通过。
- 外部 OIDC/KMS/数据库及需要人工操作的 Creator 验收必须有真实证据；没有配置或无法重载时明确保留未验证项。

## 开始状态（2026-09-09）

Lite 83 项 catalog/schema 已有，首批原生读取由 3 项扩展到 9 项；Pro 15 项 catalog 已有，多数仍为端口；Server 已有签发与验证，但没有完整管理生命周期。Pro 打包脚本当前有其他任务未提交修改，本轮不覆盖。

执行结果随实际验证更新至 [迁移账本](COCOS-MIGRATION-LEDGER.md)；Pro 分项设计见其 `docs/UNIFIED-PREMIUM-MIGRATION-PLAN.md`。
