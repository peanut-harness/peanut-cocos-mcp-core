import type { IPluginProtectedKeyApi } from './plugin-manager-contracts.js';
import { execFile } from 'child_process';

const keychainServiceName = 'peanut.cocos.mcp.hmac.v1';
const keychainMissingItemExitCode = 44;

/**
 * @description 为指定插件提供宿主安全存储密钥端口的工厂。
 */
export interface IPluginProtectedKeyProvider {
    /**
     * @description 返回仅属于一个已激活插件的受保护密钥端口。
     * @param pluginId 已由宿主验证的插件标识。
     * @returns 该插件的密钥端口。
     */
    forPlugin(pluginId: string): IPluginProtectedKeyApi;
}

/**
 * @description 在宿主尚未配置 Keychain/Credential Manager 时明确拒绝密钥请求的实现。
 */
export class UnavailablePluginProtectedKeyApi implements IPluginProtectedKeyApi {
    /**
     * @description 拒绝创建或读取 HMAC 密钥，避免任何能力回退到普通插件存储。
     * @param _purpose 逻辑密钥用途。
     * @returns 永不成功的 Promise。
     */
    public async getOrCreateHmacSha256Key(_purpose: string): Promise<CryptoKey> {
        throw new Error('plugin_protected_key_unavailable');
    }
}

/**
 * @description macOS `security` 命令的最小可替换执行端口。
 */
export interface IMacOsKeychainCommandRunner {
    /**
     * @description 运行不含 shell 的 `security` 子命令。
     * @param argumentsValue 已验证的命令参数。
     * @returns 命令退出码和标准输出；不得将密钥内容写入日志。
     */
    run(argumentsValue: readonly string[]): Promise<{ readonly exitCode: number; readonly stdout: string }>;
}

/**
 * @description 使用 macOS 系统 Keychain 为每个插件提供隔离 HMAC 密钥的提供器。
 */
export class MacOsKeychainPluginProtectedKeyProvider implements IPluginProtectedKeyProvider {
    /** @description 安全命令运行器。 */
    private readonly commandRunner: IMacOsKeychainCommandRunner;

    /**
     * @description 创建 macOS Keychain 密钥提供器。
     * @param commandRunner 可替换命令运行器；默认调用系统 `security`。
     */
    public constructor(commandRunner: IMacOsKeychainCommandRunner = new MacOsSecurityCommandRunner()) {
        this.commandRunner = commandRunner;
    }

    /**
     * @description 返回一个绑定到特定插件的 Keychain 端口。
     * @param pluginId 已验证插件标识。
     * @returns 仅用于该插件的受保护密钥端口。
     */
    public forPlugin(pluginId: string): IPluginProtectedKeyApi {
        if (!/^[a-z][a-z0-9.-]{1,127}$/u.test(pluginId)) {
            throw new Error('plugin_protected_key_plugin_id_invalid');
        }
        return new MacOsKeychainPluginProtectedKeyApi(pluginId, this.commandRunner);
    }
}

/**
 * @description 绑定单个插件的 macOS Keychain HMAC 密钥访问端口。
 */
class MacOsKeychainPluginProtectedKeyApi implements IPluginProtectedKeyApi {
    /** @description 调用方插件 id。 */
    private readonly pluginId: string;
    /** @description 安全命令运行器。 */
    private readonly commandRunner: IMacOsKeychainCommandRunner;
    /** @description 按用途缓存同一会话内已导入的不可导出密钥。 */
    private readonly keys = new Map<string, Promise<CryptoKey>>();

    /**
     * @description 创建插件专属 Keychain 端口。
     * @param pluginId 已验证调用方插件 id。
     * @param commandRunner 安全命令运行器。
     */
    public constructor(pluginId: string, commandRunner: IMacOsKeychainCommandRunner) {
        this.pluginId = pluginId;
        this.commandRunner = commandRunner;
    }

    /**
     * @description 读取或创建插件用途专属的不可导出 HMAC-SHA-256 密钥。
     * @param purpose 已验证逻辑用途。
     * @returns 仅可签名的不可导出 HMAC 密钥。
     */
    public async getOrCreateHmacSha256Key(purpose: string): Promise<CryptoKey> {
        if (!/^[a-z][a-z0-9-]{2,63}$/u.test(purpose)) {
            throw new Error('plugin_protected_key_purpose_invalid');
        }
        let pending = this.keys.get(purpose);
        if (pending == null) {
            pending = this.loadOrCreate(purpose);
            this.keys.set(purpose, pending);
        }
        return pending;
    }

    /**
     * @description 从 Keychain 加载或首次创建密钥并导入为不可导出 WebCrypto 密钥。
     * @param purpose 已验证用途。
     * @returns 不可导出 HMAC 密钥。
     */
    private async loadOrCreate(purpose: string): Promise<CryptoKey> {
        const account = `${this.pluginId}:${purpose}`;
        let material = await this.find(account);
        if (material == null) {
            const generated = MacOsKeychainPluginProtectedKeyApi.encodeMaterial(globalThis.crypto.getRandomValues(new Uint8Array(32)));
            const added = await this.commandRunner.run(['add-generic-password', '-s', keychainServiceName, '-a', account, '-w', generated]);
            material = added.exitCode === 0 ? generated : await this.find(account);
            if (material == null) {
                throw new Error(`plugin_protected_key_keychain_write_failed:${added.exitCode}`);
            }
        }
        const keyMaterial = MacOsKeychainPluginProtectedKeyApi.decodeMaterial(material);
        const isolatedMaterial = new Uint8Array(keyMaterial.byteLength);
        isolatedMaterial.set(keyMaterial);
        return globalThis.crypto.subtle.importKey('raw', isolatedMaterial.buffer, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    }

    /**
     * @description 从 Keychain 查询一条 base64 编码密钥记录。
     * @param account 插件和用途组成的 account 标识。
     * @returns 密钥文本；未找到时返回 null。
     */
    private async find(account: string): Promise<string | null> {
        const result = await this.commandRunner.run(['find-generic-password', '-s', keychainServiceName, '-a', account, '-w']);
        if (result.exitCode === keychainMissingItemExitCode) {
            return null;
        }
        if (result.exitCode !== 0 || result.stdout.trim().length === 0) {
            throw new Error(`plugin_protected_key_keychain_read_failed:${result.exitCode}`);
        }
        return result.stdout.trim();
    }

    /**
     * @description 将 Keychain 的 base64 文本解码为严格的 32 字节密钥材料。
     * @param value 未信任 Keychain 输出。
     * @returns 独立的密钥字节副本。
     */
    private static decodeMaterial(value: string): Uint8Array {
        if (!/^[A-Za-z0-9+/]{43}=$/u.test(value)) {
            throw new Error('plugin_protected_key_keychain_material_invalid');
        }
        const decoded = atob(value);
        if (decoded.length !== 32) {
            throw new Error('plugin_protected_key_keychain_material_invalid');
        }
        const material = new Uint8Array(decoded.length);
        for (let index = 0; index < decoded.length; index += 1) {
            material[index] = decoded.charCodeAt(index);
        }
        return material;
    }

    /**
     * @description 将随机字节编码为 Keychain 可保存的 base64 文本。
     * @param value 随机密钥字节。
     * @returns base64 密钥文本。
     */
    private static encodeMaterial(value: Uint8Array): string {
        let binary = '';
        for (const byte of value) {
            binary += String.fromCharCode(byte);
        }
        return btoa(binary);
    }
}

/**
 * @description 不经 shell 调用 macOS `/usr/bin/security` 的生产命令运行器。
 */
class MacOsSecurityCommandRunner implements IMacOsKeychainCommandRunner {
    /**
     * @description 运行 macOS security 子命令；失败时仅返回状态码，不回传 stderr 以免泄露敏感输出。
     * @param argumentsValue 已验证命令参数。
     * @returns 命令退出码与标准输出。
     */
    public async run(argumentsValue: readonly string[]): Promise<{ readonly exitCode: number; readonly stdout: string }> {
        return new Promise((resolve) => {
            execFile('/usr/bin/security', [...argumentsValue], { encoding: 'utf8', maxBuffer: 8_192 }, (error, stdout) => {
                resolve(
                    error == null
                        ? Object.freeze({ exitCode: 0, stdout })
                        : Object.freeze({ exitCode: MacOsSecurityCommandRunner.exitCode(error), stdout: '' }),
                );
            });
        });
    }

    /**
     * @description 从 child-process 异常安全提取有限退出码。
     * @param value 未信任异常。
     * @returns 非零退出码。
     */
    private static exitCode(value: unknown): number {
        if (typeof value !== 'object' || value == null) {
            return 1;
        }
        const descriptor = Object.getOwnPropertyDescriptor(value, 'code');
        return descriptor != null && 'value' in descriptor && typeof descriptor.value === 'number' && Number.isInteger(descriptor.value)
            ? descriptor.value
            : 1;
    }
}
