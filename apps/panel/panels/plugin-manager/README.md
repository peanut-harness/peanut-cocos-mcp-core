# Plugin Manager Panel Mirror

这个目录是 plugin-manager 面板静态资产的唯一源码源头。

当前约定：

- 不把这里当作主源码目录
- 宿主固定从 `embedded/index.html` 加载面板；`standalone/` 为未来 Vite bundle、worker、wasm 等资源保留
- 修改 panel 静态资源时只修改本目录
