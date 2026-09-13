# Lite Architecture v2

## 依赖方向

依赖只允许沿以下方向流动：`protocol <- sdk <- engine <- hosts`。

`panel` 是独立静态应用，只消费稳定消息协议，不装配 runtime、kernel 或 Creator API。Creator 生命周期、进程、版本和面板装配全部归 `hosts`；业务能力、审批、资产写入和版本能力适配全部归 `engine`。

## 工作区

- `protocol` 固定跨模块数据形状和 `ICreatorContext`。
- `sdk` 固定第三方插件可见的最小 API，不泄漏 engine 私有类型。
- `engine` 通过 package subpath 暴露内部模块；内部目录不是独立发布单元。
- `hosts` 包含 2.x 与 3.x 两类壳，并把具体版本映射为四个兼容画像。
- `panel` 只保留可复制进 Creator 扩展的静态页面和最小应用标识。

## 版本画像

`specs/creator-profiles/creator-profiles.json` 是兼容状态清单。宿主读取实际 Creator 版本和工程声明版本，解析为不可变 `ICreatorContext` 后再装配运行时。只有画像明确标记并具有实机证据的版本可开放写入；版本范围命中本身不等于写入已验证。

当前画像：2.4 与 3.0–3.5 为 experimental，3.6–3.7 为 unsupported，3.8.7 为 full。3.8 的其它补丁版本仍为 experimental 且只读。

## 构建模型

仓库只有根 `package-lock.json`。根脚本按协议、SDK、engine、panel、hosts 顺序执行；`tools/verify-workspace-structure.mjs` 阻止工作区回潮、嵌套 lockfile 和逆向依赖。

宿主发布物使用 esbuild 打成自包含目录包。Creator 2.4 模板在没有本机编辑器时保留已提交正式模板，绝不再用测试 fixture 覆盖发布资产。

## 安全不变量

- operation ID、schema 与审批语义保持稳定。
- 缺失 schema、未知版本、空资源授权和不匹配风险均 fail-closed。
- `prefab.unpack`、`prefab.unlink`、`builder.build` 与删除/替换类操作按 destructive 处理。
- Lite 不导入 Pro；订阅状态不能替代本地写入审批。
