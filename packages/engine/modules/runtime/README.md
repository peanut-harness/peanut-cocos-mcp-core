# @peanut/pod-engine/runtime

`@peanut/pod-engine/runtime` 负责 Creator 版本适配、宿主能力封装以及统一任务执行管线。

## 职责

- 选择并注册 Creator adapter
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
