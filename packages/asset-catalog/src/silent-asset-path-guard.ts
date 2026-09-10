import { posix } from 'path';

/**
 * @description 校验并规范化资产生命周期操作（复制/移动/重命名/建目录/删除）用到的相对路径。
 *
 * 统一拒绝路径穿越、越出 `assets/` 根；不做磁盘存在性判断，交由各调用方按语义处理。
 */
export class SilentAssetPathGuard {
    /**
     * @description 将输入路径规范化为 posix 风格的 `assets/...` 项目相对路径。
     * @param pathValue 未受信输入路径（可为 `db://` 前缀、反斜杠或相对写法）。
     * @returns 规范化后的项目相对路径。
     */
    public normalize(pathValue: string): string {
        const trimmed = pathValue.trim().replace(/\\/g, '/').replace(/^db:\/\//u, '');
        if (trimmed.length === 0) {
            throw new Error('silent_asset_path_empty');
        }
        const normalized = posix.normalize(trimmed).replace(/^\.\//u, '');
        if (normalized.length === 0 || normalized === '.') {
            throw new Error(`silent_asset_path_empty:${pathValue}`);
        }
        if (normalized.includes('..')) {
            throw new Error(`silent_asset_path_escape:${pathValue}`);
        }
        if (normalized !== 'assets' && !normalized.startsWith('assets/')) {
            throw new Error(`silent_asset_path_outside_assets:${normalized}`);
        }
        return normalized;
    }
}
