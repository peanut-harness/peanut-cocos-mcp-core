declare module 'fs' {
    /** @description 定义跨模块使用的数据或行为契约，避免调用方依赖具体实现。 */
    export interface FSWatcher {
        /** @description 定义实现方必须提供的操作契约，供调用方通过接口稳定调用。 */
        close(): void;
    }

    /** @description 文件系统目录项的最小声明，供 packaging 的 Creator 主进程实现扫描版本目录。 */
    export interface Dirent {
        /** @description 当前目录项名称。 */
        readonly name: string;
        /** @description 当前目录项是否为目录。 */
        isDirectory(): boolean;
    }

    /** @description 文件状态的最小声明。 */
    export interface Stats {
        readonly mtimeMs: number;
        readonly size: number;
        /** @description 当前路径是否为目录。 */
        isDirectory(): boolean;
        /** @description 当前路径是否为普通文件。 */
        isFile(): boolean;
        /** @description 当前路径是否为符号链接。 */
        isSymbolicLink(): boolean;
    }

    /** @description 定义跨模块使用的数据或行为契约，避免调用方依赖具体实现。 */
    export interface IWatchOptions {
        /** @description 定义调用方可传递或读取的契约字段，保持模块边界的数据一致性。 */
        recursive?: boolean;
    }

    /** @description 提供模块级能力入口，并按既定职责完成对应处理。 */
    export function watch(
        path: string,
        options: IWatchOptions,
        listener: (eventType: string, filename: string | null) => void,
    ): FSWatcher;
    /** @description 判断路径是否存在。 */
    export function existsSync(path: string): boolean;
    /** @description 读取路径状态。 */
    export function statSync(path: string): Stats;
    /** @description 读取路径或符号链接自身的状态。 */
    export function lstatSync(path: string): Stats;
    /** @description 创建目录及其父目录。 */
    export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined;
    /** @description 创建唯一临时目录。 */
    export function mkdtempSync(prefix: string): string;
    /** @description 读取 UTF-8 文本文件。 */
    export function readFileSync(path: string, encoding: 'utf8'): string;
    /** @description 读取二进制文件内容。 */
    export function readFileSync(path: string): Uint8Array;
    /** @description 写入 UTF-8 文本文件。 */
    export function writeFileSync(path: string, data: string, encoding: 'utf8'): void;
    /** @description 递归复制文件或目录。 */
    export function cpSync(source: string, destination: string, options?: { recursive?: boolean; force?: boolean }): void;
    /** @description 原子移动同一文件系统内的路径。 */
    export function renameSync(source: string, destination: string): void;
    /** @description 删除文件或目录。 */
    export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
    /** @description 读取目录中的目录项。 */
    export function readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
    /** @description 读取目录中的文件名称。 */
    export function readdirSync(path: string): string[];
}

declare module 'crypto' {
    /** @description SHA-256 摘要计算器的最小声明，供 packaging 在 Creator 主进程校验目录包使用。 */
    export interface IHash {
        /** @description 写入待计算摘要的二进制或文本数据。 */
        update(data: string | Uint8Array): IHash;
        /** @description 输出指定编码的摘要。 */
        digest(encoding: 'hex'): string;
    }

    /** @description 创建指定算法的摘要计算器。 */
    export function createHash(algorithm: 'sha256'): IHash;
    /** @description 使用 Ed25519 公钥验证 capability manifest 签名。 */
    export function verify(algorithm: null, data: Uint8Array, key: string, signature: Uint8Array): boolean;
    /** @description 生成指定长度的加密随机字节。 */
    export function randomBytes(size: number): Uint8Array;
}

declare module 'module' {
    /** @description 创建以指定文件为根的 CommonJS 解析器。 */
    export function createRequire(path: string): (id: string) => unknown;
}

declare module 'path' {
    /** @description 判断路径是否为当前平台支持的绝对路径。 */
    export function isAbsolute(path: string): boolean;
    /** @description 连接路径片段。 */
    export function join(...paths: string[]): string;
    /** @description 解析为绝对路径。 */
    export function resolve(...paths: string[]): string;
    /** @description 计算路径相对关系。 */
    export function relative(from: string, to: string): string;
}

declare module 'url' {
    /**
     * @description 将本地绝对路径转换为 file URL，供宿主安全显示已校验的插件图标。
     */
    export function pathToFileURL(path: string): { readonly href: string };
}

/** @description 当前 Node/Electron 进程的平台与架构信息。 */
declare const process: {
    readonly platform: string;
    readonly arch: string;
    readonly versions: {
        readonly electron?: string;
    };
    /** @description 返回进程当前工作目录，用于在 CJS bundle 中为 createRequire 提供基准 URL。 */
    cwd(): string;
};

/** @description Node Buffer 的最小二进制编码能力，用于受控的本地资源转换。 */
interface INodeBuffer extends Uint8Array {
    /** @description 使用默认编码返回二进制内容。 */
    toString(): string;
    /** @description 使用指定编码返回二进制内容。 */
    toString(encoding: 'base64'): string;
    /** @description 使用 UTF-8 编码返回二进制内容。 */
    toString(encoding: 'utf8'): string;
}

/** @description Node Buffer 的最小静态构造能力，用于解码 capability 清单签名和编码本地资源。 */
declare const Buffer: {
    from(source: string, encoding?: 'base64'): INodeBuffer;
    from(source: Uint8Array): INodeBuffer;
    /** @description 合并多个二进制块。 */
    concat(chunks: readonly INodeBuffer[]): INodeBuffer;
};
