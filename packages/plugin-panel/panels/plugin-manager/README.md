# Plugin Manager Panel Mirror

这个目录是 `peanut-plugin-core/panels/plugin-manager` 的壳层镜像。

当前约定：

- 不把这里当作主源码目录
- 宿主固定从 `embedded/index.html` 加载面板；`standalone/` 为未来 Vite bundle、worker、wasm 等资源保留
- 若需要修改 panel 静态资源，请优先修改 `peanut-plugin-core/panels/plugin-manager/embedded`
