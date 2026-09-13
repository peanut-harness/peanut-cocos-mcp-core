# peanut-pod-35

Creator **3.0.x–3.5.x** 薄宿主（`early3x` 产品线）。

## 边界

- Runtime 使用 early-3x 适配器，当前画像为 experimental，默认禁止写入。
- 装入工程 `extensions/peanut-pod-35/`。
- silent-asset 与 Lumen 必须经过对应版本实机验证后才能提升支持级别。

## 打包

```bash
cd peanut-pod-lite
npm install
npm run pack --prefix packages/hosts/modules/creator-30-35
```

产物：`packages/hosts/modules/creator-30-35/release/peanut-pod-35-0.1.0/`。
