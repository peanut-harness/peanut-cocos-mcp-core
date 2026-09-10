import type { IGrantedPermissionSet, IPluginManifest } from 'peanut-contracts';

/**
 * @description 权限裁剪服务，当前阶段先按 manifest 申请直接生成授权结果。
 */
export class PermissionManager {
    /**
     * @description 根据插件 manifest 生成授权结果。
     * @param pluginId 插件标识
     * @param manifest 插件运行时清单
     * @returns 结构化授权结果
     */
    public grant(pluginId: string, manifest: IPluginManifest): IGrantedPermissionSet {
        return {
            pluginId,
            grantedAt: new Date().toISOString(),
            permissions: manifest.permissions,
        };
    }
}
