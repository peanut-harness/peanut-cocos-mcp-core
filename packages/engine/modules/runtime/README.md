# @peanut/pod-engine/runtime

`@peanut/pod-engine/runtime` 负责 Creator 版本适配、宿主能力封装以及统一任务执行管线。

## 职责

- 通过独立工厂选择并注册 Creator adapter
- 暴露 `RuntimeFacade`
- 提供 `message / asset / scene / selection / project / panel-host` runtime service
- 管理任务接入、合并、锁、提交与 trace

## 公共入口

统一从包根导入：

```typescript
import { RuntimeFacade, VersionResolver } from '@peanut/pod-engine/runtime';
```

不要把 `src/` 深路径当成稳定公共 API。

## 最小示例

```typescript
import { RuntimeFacade } from '@peanut/pod-engine/runtime';

const runtimeFacade = new RuntimeFacade('3.8.7');
const taskReceipt = await runtimeFacade.execution.submit({
    requestId: 'runtime-readme-request',
    pluginId: 'runtime-readme-plugin',
    scope: 'asset',
    priority: 'normal',
    kind: 'asset.query',
    payload: {
        pathOrUuid: 'assets/example.prefab',
    },
    mergePolicy: 'dedupe',
    idempotencyKey: 'asset.query:assets/example.prefab',
});
```

默认内存宿主为空，不会注入示例资源或场景节点。离线测试需要通过 `initialState` 显式提供种子；宿主也可通过 `adapterFactory` 替换版本适配器组合根。

## 验证

```bash
npm run --workspace @peanut/pod-engine/runtime typecheck
npm run --workspace @peanut/pod-engine/runtime test
npm run --workspace @peanut/pod-engine/runtime smoke
```

## 边界

- 允许依赖 `@peanut/pod-protocol`
- 不承载插件治理、安装、回滚与 UI 管理逻辑
- 不把 `Editor.*` 版本分支泄漏到消费方
- 重复适配器 id 或同一版本命中多个适配器时显式失败
