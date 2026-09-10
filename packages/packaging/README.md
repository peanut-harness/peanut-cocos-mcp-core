# peanut-packaging

`peanut-packaging` 负责插件包的打包、结构检查、安装规划、安装、升级、回滚和修复。

## 职责

- `pack`
- `inspect`
- `planInstall`
- `install`
- `upgrade`
- `uninstall`
- `repair`

## 公共入口

统一从包根导入：

```typescript
import { PackagingApp } from 'peanut-packaging';
```

## 最小示例

```typescript
import type { IPluginManifest } from 'peanut-contracts';
import { PackagingApp } from 'peanut-packaging';

const packagingApp = new PackagingApp();
const manifest: IPluginManifest = {
    id: 'readme.packaging.plugin',
    version: '0.1.0',
    kind: 'tooling-plugin',
    displayName: 'README Packaging Plugin',
    main: './index.js',
    engines: {
        host: '^0.1.0',
    },
    activation: {
        autoActivate: false,
        events: [],
    },
    permissions: {},
};

const packResult = await packagingApp.pack('plugins/readme-packaging', manifest);
const installPlan = await packagingApp.planInstall(packResult.packagePath);
const installResult = await packagingApp.install(packResult.packagePath);
```

## 验证

```bash
npm run --workspace peanut-packaging typecheck
npm run --workspace peanut-packaging test
npm run --workspace peanut-packaging smoke
```

## 最小运行时导出器

仓库内的 Node 构建任务可复用 [minimal-runtime-exporter.mjs](scripts/minimal-runtime-exporter.mjs)，将多个构建目录复制为最小运行时目录，并自动生成 `runtime.manifest.json`（文件摘要、体积、跳过原因）。调用方负责声明各目录的保留规则；工具本身不绑定 SnowB、Vite 或 Cocos。

```javascript
import { exportMinimalRuntime } from '../peanut-packaging/scripts/minimal-runtime-exporter.mjs';

await exportMinimalRuntime({
    outputDirectory: 'release/minimal-runtime',
    sources: [
        {
            sourceDirectory: 'dist',
            targetDirectory: 'runtime',
            getSkipReason: (relativePath) => (relativePath.endsWith('.map') ? 'source_map' : null),
        },
    ],
    metadata: { profile: 'release' },
});
```

目录包的运行时入口固定为根目录 `<plugin-id>.bundle.js`，避免仅含一个文件的 `sources/` 目录。单面板插件统一使用 `panels/{embedded,standalone}`：两者都是完整模板，分别提供 `index.html`、`index.js`、`index.css`。Vite bundle、worker、wasm 等共用运行时资源放入 `libs/<panel-id>/`，两个模板均从此加载；宿主只加载 `panels/embedded/index.html`。Node 打包脚本可调用 [panel-package-layout.mjs](scripts/panel-package-layout.mjs) 的 `createPanelPackageLayout` 与 `createPanelTemplateAssets`；TypeScript 代码可通过 `PanelPackageLayout` 计算并校验相同路径。

## 边界

- 允许依赖 `peanut-contracts`
- 不接管插件激活、grant 注入和 panel 生命周期
- `runtime` 与 `plugin-manager` 通过其公共 API 对接，不应反向塞入宿主状态
