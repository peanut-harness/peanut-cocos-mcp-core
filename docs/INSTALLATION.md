# Core 安装顺序

`peanut-pod-lite` 是可独立运行的基础层。它不依赖 Pro、在线许可证、SnowB、设计导入或内容发布服务。

## 必需顺序

1. **关闭目标 Creator 项目。** 不得在旧宿主仍持有插件目录或运行期服务时覆盖安装。
2. **安装 Lite 宿主扩展。** 使用 `packages/cocos-creator-lite-host-extension` 的发布目录安装到项目 `extensions/peanut-pod-lite-host/`。该原生 Creator 扩展从 CPM `peanut-plugins/installed.json` 读取活动版本，完整校验后加载必需的 `peanut.pod-lite` 与可选的 `peanut.cocos-mcp-pro`；不扫描旧插件目录。
3. **通过 CPM 安装 Core 能力包。** 安装器必须先校验目录包、原子写入插件目录和 schema v2 活动版本索引，再允许 Creator host 加载。不得手工伪造成功索引。
4. **启动 Creator 并等待宿主就绪。** 只接受 `query-status` 返回 `ready: true` 且日志出现 `lite_host_ready`；未就绪时不得继续能力验收。
5. **运行只读冒烟测试。** 验证 `editor.queryVersion`、`editor.queryProject`、`editor.querySelection`、`scene.getCurrent`、`scene.getHierarchy`、`builder.queryPlatforms`、`builder.querySchema`、`builder.queryDefaultConfig` 与 `preview.query`；失败时停止，不继续任何写入测试。
6. **运行本地审批写入测试。** 先申请一次性审批租约，再执行一个可恢复的原生写操作；Core 不接受在线签名计划作为替代审批。

## 构建候选与 CPM 安装

本地可先构建宿主扩展与 Core CPM 目录包；宿主打包暂时仍从参考编辑器工程取得固定版本的 esbuild：

```bash
PEANUT_COCOS_EDITOR_ROOT=/path/to/products/cocos/editor npm run pack --prefix packages/cocos-creator-lite-host-extension
PEANUT_COCOS_EDITOR_ROOT=/path/to/products/cocos/editor npm run pack --prefix packages/mcp-pod-lite-creator-host
```

生成的目录包必须交给 CPM / Peanut Packaging 安装。当前公共 `cpm-install` 尚无签名 release，不能把旧仓库的直接安装脚本或手工复制当作正式 CPM 安装证据。

`peanut-pod-lite-host` 的 `query-status`、`list-tools` 与 `invoke-tool` 是 Creator 消息入口。`query-status.pro.state` 为 `absent`、`active` 或 `failed`；Pro 的版本、错误和已注册服务可独立诊断。

## Pro 的后置安装

Pro 只能在上述 Core 验收全部通过后由 CPM 安装。宿主使用 Electron `safeStorage`（Windows 为 DPAPI）持久化加密的 HMAC 材料，运行时只向 Pro 提供不可导出的 WebCrypto key；Linux 检测到 `basic_text` 后端时拒绝激活 Pro。进程内服务注册表由宿主注入调用方身份。Pro 安装、撤销、摘要不匹配或激活失败只更新 `query-status.pro`，不得移除、降级或阻塞 Core 已注册的能力。

## 失败与回滚

- 宿主安装失败：不创建能力包目录，保持项目无 MCP 扩展状态。
- 能力包摘要校验失败：删除未激活的暂存目录，不修改已生效 Core 版本。
- Pro 缺失或失败：保持 Core `ready: true`，撤销 Pro 已注册的服务并记录独立错误；不得把 Pro 错误提升为 Core 启动失败。
- 冒烟测试失败：停用 Core 能力包，保留宿主日志；不得安装 Pro。
- 本地审批测试失败：停用写入路由，仅保留只读能力，直到明确修复。

此顺序专门避免旧插件管理器、旧业务插件或 Pro 授权边界成为 Core 启动依赖。
