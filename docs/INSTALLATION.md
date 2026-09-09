# Core 安装顺序

`peanut-pod-lite` 是可独立运行的基础层。它不依赖 Pro、在线许可证、SnowB、设计导入或内容发布服务。

## 必需顺序

1. **关闭目标 Creator 项目。** 不得在旧宿主仍持有插件目录或运行期服务时覆盖安装。
2. **安装 Lite 宿主扩展。** 使用 `packages/cocos-creator-lite-host-extension` 的发布目录安装到项目 `extensions/peanut-pod-lite-host/`。该原生 Creator 扩展只发现、校验并加载 `peanut.pod-lite`，不扫描旧插件目录、不加载 Pro 或商业集成。
3. **启动 Creator 并等待宿主就绪。** 只接受宿主记录的 `core_host_ready` 状态；未就绪时不得安装或激活能力包。
4. **安装 Core 能力包。** 安装器必须校验目录包清单和 SHA-256 摘要，并只注册已实现的 Core operation。
5. **运行只读冒烟测试。** 至少验证 `editor.queryVersion`、`editor.queryProject`、`editor.querySelection`；失败时停止，不继续任何写入测试。
6. **运行本地审批写入测试。** 先申请一次性审批租约，再执行一个可恢复的原生写操作；Core 不接受在线签名计划作为替代审批。

## 参考安装命令

先打包两个发布物（`PEANUT_COCOS_EDITOR_ROOT` 指向参考产品的 `editor/` 目录），再严格按扩展、能力包的顺序安装：

```bash
PEANUT_COCOS_EDITOR_ROOT=/path/to/products/cocos/editor npm run pack --prefix packages/cocos-creator-lite-host-extension
PEANUT_COCOS_EDITOR_ROOT=/path/to/products/cocos/editor npm run pack --prefix packages/mcp-pod-lite-creator-host
node /path/to/products/cocos/editor/scripts/install-cocos-extension.mjs --project /path/to/project --package packages/cocos-creator-lite-host-extension/release/peanut-pod-lite-host-0.1.0
node /path/to/products/cocos/editor/scripts/install-directory-plugin.mjs --project /path/to/project --package packages/mcp-pod-lite-creator-host/release/peanut.pod-lite-0.1.0
```

`peanut-pod-lite-host` 的 `query-status`、`list-tools` 与 `invoke-tool` 是 Creator 消息入口，可用于宿主侧冒烟验证；它不会发现或加载其他插件。

## Pro 的后置安装

Pro 只能在上述六步全部通过后安装。它作为可选目录包调用 Core 宿主的本地准入服务；Pro 安装、撤销或不可用都不得移除、降级或阻塞 Core 已注册的能力。

## 失败与回滚

- 宿主安装失败：不创建能力包目录，保持项目无 MCP 扩展状态。
- 能力包摘要校验失败：删除未激活的暂存目录，不修改已生效 Core 版本。
- 冒烟测试失败：停用 Core 能力包，保留宿主日志；不得安装 Pro。
- 本地审批测试失败：停用写入路由，仅保留只读能力，直到明确修复。

此顺序专门避免旧插件管理器、旧业务插件或 Pro 授权边界成为 Core 启动依赖。
