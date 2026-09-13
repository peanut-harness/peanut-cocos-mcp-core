/**
 * @description 插件装包专用运行时入口：只暴露模板缓存与 AssetDB 刷新，避免目录包打进整库 lumen。
 */
export { LumenAssetDbEditorRefreshAdapter } from './io/asset-db-refresh';
export { LumenDefaultTemplateRoot } from './templates/default-root';
export type { ILumenEditorRefreshResult, ILumenMessagePort } from './types';
export type { ILumenTemplateCacheStatus, ILumenTemplateCacheSyncResult } from './templates/manifest';
