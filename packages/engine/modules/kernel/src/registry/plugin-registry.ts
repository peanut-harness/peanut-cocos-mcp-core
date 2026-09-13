import { existsSync, lstatSync, readFileSync } from 'fs';
import { join, resolve } from 'path';

import type {
    IPluginFailureIncident,
    IPluginHealthSnapshot,
    IPluginManifest,
    IPluginRuntimeMeta,
    IPluginRuntimeRecord,
    PluginState,
    PluginTrustLevel,
} from '@peanut/pod-protocol';

import type { IPluginModule, IPluginRegistrationInput } from '../shared/plugin-manager-contracts.js';

const PLUGIN_ICON_MAX_BYTES = 1024 * 1024;
const PNG_FILE_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

interface IPluginRegistrationRecord {
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    readonly runtimeMeta: IPluginRuntimeMeta;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    manifest: IPluginManifest;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    runtimeRecord: IPluginRuntimeRecord;
    /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
    module: IPluginModule | null;
}

/**
 * @description 插件注册中心，负责保存 manifest、模块实例和运行时状态。
 */
export class PluginRegistry {
    /** @description 由当前实例持有的运行状态或协作依赖，贯穿实例生命周期供后续操作使用。 */
    private readonly _records = new Map<string, IPluginRegistrationRecord>();

    /**
     * @description 注册一个新的插件 manifest。
     * @param input 插件注册输入参数
     * @returns 生成后的插件运行时元信息
     */
    public registerManifest(input: IPluginRegistrationInput): IPluginRuntimeMeta {
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ trustLevel: PluginTrustLevel = input.trustLevel ?? 'community';
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ runtimeMeta: IPluginRuntimeMeta = {
            id: input.manifest.id,
            version: input.manifest.version,
            installPath: input.installPath,
            trustLevel,
        };
        // 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
        const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ runtimeRecord: IPluginRuntimeRecord = {
            pluginId: input.manifest.id,
            version: input.manifest.version,
            state: 'discovered',
            trustLevel,
            displayName: input.manifest.displayName,
            description: input.manifest.description,
            iconUrl: this._resolveIconUrl(input.manifest, input.installPath),
        };

        this._records.set(input.manifest.id, {
            runtimeMeta,
            manifest: input.manifest,
            runtimeRecord,
            module: null,
        });

        return runtimeMeta;
    }

    /**
     * @description 将已验证的固定 PNG 图标内联为 data URL，避免嵌入式面板跨目录读取本地文件。
     * @param manifest 已注册插件清单。
     * @param installPath 插件已验证的安装目录。
     * @returns 可安全交给宿主管理界面使用的 PNG data URL；无有效图标时返回 `undefined`。
     */
    private _resolveIconUrl(manifest: IPluginManifest, installPath: string | undefined): string | undefined {
        if (installPath == null || manifest.icon !== './assets/icon.png') {
            return undefined;
        }
        const normalizedInstallPath = resolve(installPath);
        const iconPath = resolve(normalizedInstallPath, manifest.icon);
        const expectedIconPath = join(normalizedInstallPath, 'assets', 'icon.png');
        if (iconPath !== expectedIconPath || !existsSync(iconPath)) {
            return undefined;
        }
        try {
            const iconStat = lstatSync(iconPath);
            if (!iconStat.isFile() || iconStat.isSymbolicLink()) {
                return undefined;
            }
            const iconContent = readFileSync(iconPath);
            if (iconContent.byteLength > PLUGIN_ICON_MAX_BYTES || !hasPngFileSignature(iconContent)) {
                return undefined;
            }
            return `data:image/png;base64,${Buffer.from(iconContent).toString('base64')}`;
        } catch {
            return undefined;
        }
    }

    /**
     * @description 绑定指定插件的模块实例。
     * @param pluginId 插件标识
     * @param pluginModule 插件模块实例
     * @returns 绑定成功时返回 `true`
     */
    public attachModule(pluginId: string, pluginModule: IPluginModule): boolean {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ record = this._records.get(pluginId);
        if (record == null) {
            return false;
        }
        record.module = pluginModule;
        return true;
    }

    /**
     * @description 返回指定插件的 manifest。
     * @param pluginId 插件标识
     * @returns 命中时返回 manifest，否则返回 `null`
     */
    public getManifest(pluginId: string): IPluginManifest | null {
        return this._records.get(pluginId)?.manifest ?? null;
    }

    /**
     * @description 返回指定插件的运行时元信息。
     * @param pluginId 插件标识
     * @returns 命中时返回运行时元信息，否则返回 `null`
     */
    public getRuntimeMeta(pluginId: string): IPluginRuntimeMeta | null {
        return this._records.get(pluginId)?.runtimeMeta ?? null;
    }

    /**
     * @description 返回指定插件的运行时记录。
     * @param pluginId 插件标识
     * @returns 命中时返回运行时记录，否则返回 `null`
     */
    public getRuntimeRecord(pluginId: string): IPluginRuntimeRecord | null {
        return this._records.get(pluginId)?.runtimeRecord ?? null;
    }

    /**
     * @description 返回指定插件已绑定的模块实例。
     * @param pluginId 插件标识
     * @returns 命中时返回模块实例，否则返回 `null`
     */
    public getModule(pluginId: string): IPluginModule | null {
        return this._records.get(pluginId)?.module ?? null;
    }

    /**
     * @description 更新指定插件的运行时状态。
     * @param pluginId 插件标识
     * @param state 新的运行时状态
     * @returns 更新后的运行时记录；插件不存在时返回 `null`
     */
    public updateState(pluginId: string, state: PluginState): IPluginRuntimeRecord | null {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ record = this._records.get(pluginId);
        if (record == null) {
            return null;
        }
        record.runtimeRecord = {
            ...record.runtimeRecord,
            state,
        };
        return record.runtimeRecord;
    }

    /**
     * @description 更新指定插件的健康快照。
     * @param pluginId 插件标识
     * @param health 新的健康快照；传入 `undefined` 表示清空
     * @returns 更新后的运行时记录；插件不存在时返回 `null`
     */
    public updateHealth(pluginId: string, health?: IPluginHealthSnapshot): IPluginRuntimeRecord | null {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ record = this._records.get(pluginId);
        if (record == null) {
            return null;
        }

        record.runtimeRecord = {
            ...record.runtimeRecord,
            health,
        };
        return record.runtimeRecord;
    }

    /**
     * @description 更新指定插件的失败事件。
     * @param pluginId 插件标识
     * @param failureIncident 新的失败事件；传入 `undefined` 表示清空
     * @returns 更新后的运行时记录；插件不存在时返回 `null`
     */
    public updateFailureIncident(pluginId: string, failureIncident?: IPluginFailureIncident): IPluginRuntimeRecord | null {
        // 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。
        const /* 保存从依赖读取的当前数据，供本步骤判断、转换或组装输出使用。 */ record = this._records.get(pluginId);
        if (record == null) {
            return null;
        }

        record.runtimeRecord = {
            ...record.runtimeRecord,
            failureIncident,
        };
        return record.runtimeRecord;
    }

    /**
     * @description 返回所有已注册插件的运行时记录。
     * @returns 已注册插件运行时记录的只读列表
     */
    public listRuntimeRecords(): readonly IPluginRuntimeRecord[] {
        return [...this._records.values()].map((record) => {
            return record.runtimeRecord;
        });
    }

    /**
     * @description 彻底移除指定插件的注册记录。
     * @param pluginId 插件标识
     * @returns 成功移除时返回 `true`
     */
    public unregister(pluginId: string): boolean {
        return this._records.delete(pluginId);
    }
}

/**
 * @description 检查二进制内容是否具备 PNG 固定文件头，避免将任意文件交给浏览器渲染。
 * @param content 待校验的图标二进制内容。
 * @returns 内容以 PNG 文件头开头时返回 `true`。
 */
function hasPngFileSignature(content: Uint8Array): boolean {
    return content.byteLength >= PNG_FILE_SIGNATURE.byteLength && PNG_FILE_SIGNATURE.every((byte, index) => {
        return content[index] === byte;
    });
}
