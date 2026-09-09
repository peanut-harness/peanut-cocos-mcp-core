# Cocos 编辑器能力迁移账本

源清单固定为 `peanut-agents/products/cocos/editor/plugins`。Core 的范围不是只读子集：凡不属于明确商业化清单的 Cocos Creator 编辑器能力，均由 Core 提供，并且可以在 Pro 未安装时独立运行。

## Core

| 源模块 | 迁入范围 | 当前状态 |
| --- | --- | --- |
| `integrations/editor-mcp` | editor、asset、scene、prefab、preview（不含 capture）、builder、Lumen、reference 的 83 个 operation | capability/schema/风险目录已覆盖；执行分发器已接输入验证与审批租约消费；新宿主仅注册 3 项读取，剩余 80 项待迁入 |
| `tools/lumen` | 模板缓存、导入/重置、AssetDB refresh、host 生命周期 | 缓存识别/请求解析已归入 Lite packages/lumen-template-cache；Creator import/reset/refresh adapter 待迁入 |
| `ui/panel` | 通用宿主壳与生命周期 | 待迁入 Core Creator host |

Core 写入一律由本地审批租约控制；不得被在线许可证、订阅或 Pro 缺失阻断。

## Pro（唯一例外）

| 源模块 | 付费能力 |
| --- | --- |
| `tools/snowb-bmf` | SnowB / BMFont |
| `providers/ui-prefab` | Figma/PSD → UI Prefab |
| `providers/sdf` | SDF/MSDF Font |
| `integrations/asset-version-mover` | Asset Version Mover |
| `integrations/editor-mcp` | `preview.capture` 截图 |
| `providers/content-delivery` | Content Delivery |

Pro 仅对这张表的能力签发在线计划并校验权益/撤销；不得接管其它 Cocos 编辑器操作。

## 安装顺序

安装 `Core Creator host` → 启动并通过 Core 冒烟测试 → 安装 `Core capability` 包 → 验证本地审批写入。Pro 始终可选，且必须最后安装。
