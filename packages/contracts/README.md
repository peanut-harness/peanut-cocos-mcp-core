# peanut-contracts

`peanut-contracts` 是 Peanut 插件运行时 monorepo 的共享契约包，提供跨工程稳定 DTO、字面量类型和纯辅助类型。

## 设计目标

- 保持纯净：不引入 Node、Cocos Editor、Worker 或宿主实现依赖
- 保持稳定：优先通过新增字段或新增类型演进，避免频繁重写已有语义
- 保持边界清晰：只放共享协议，不放运行时服务、加载逻辑、打包逻辑或面板实现

## 当前子域

```text
src/
  cocos/          # Creator 版本模型
  contribution/   # command/menu/panel/diagnostics schema
  panel/          # Panel Bridge 消息协议
  permission/     # 权限声明与授权结果
  plugin/         # 插件 manifest、包信息、运行时记录、失败快照
  result/         # 统一错误与变更摘要
  shared/         # 通用语义类型与纯辅助类型
  task/           # 任务请求、回执、快照、结果、trace
  index.ts        # 根导出
```

## 使用方式

业务侧统一从根导出消费：

```typescript
import type { IPluginManifest, ITaskRequest, PluginId } from 'peanut-contracts';
```

不要直接依赖内部实现路径，避免把子域文件路径当成稳定公共 API。

## 放什么

- 跨 `peanut-runtime`、`peanut-packaging`、`peanut-plugin-core` 与 `peanut-plugin-panel` 共享的 DTO
- 稳定字面量联合类型
- 纯语义辅助类型，例如 `PluginId`、`TaskId`、`IsoDateTimeString`

## 不放什么

- `Editor.*`、文件系统、网络、进程或加密实现
- runtime service、插件装载器、面板托管器
- 打包、验签、安装、回滚实现
- 面向单个模块私有 UI 的局部载荷

当前明确不进入 `peanut-contracts` 的例子：

- 插件管理面板专用 payload，例如失败列表、安装快照、包动作结果
- 插件宿主 API 接口，例如 `IPluginModule`、`IPluginTaskApi`、`IGrantedRuntimeClientSet`

## 开发约定

- breaking change 先写入变更记录，再修改消费者
- 优先新增字段，避免收紧既有字段语义
- 新增公共类型后，补 root export smoke test 和子域组合测试
