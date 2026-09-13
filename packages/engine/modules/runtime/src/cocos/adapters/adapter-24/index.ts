/**
 * @description Creator 2.4.x 适配器导出。
 *
 * @see compatibility.matrix.json productLines
 * @see tools/lumen-24/LANDING.md
 */
export { EditorApi24Adapter } from './editor-api-24-adapter.js';
export type { ICreator24MessageHostGlobal } from './editor-api-24-adapter.js';
export { EditorApi24HostAssetBridgeProvider } from './editor-api-24-host-asset-bridge-provider.js';
export type {
    ICreator24AssetDbApi,
    ICreator24AssetDbHostGlobal,
} from './editor-api-24-host-asset-bridge-provider.js';

/**
 * @description Creator 2.4 产品线 phase。
 */
export const ADAPTER_24_PHASE = 'creator_2x' as const;

/**
 * @description 适配器 id。
 */
export const ADAPTER_24_ID = 'adapter-24' as const;
