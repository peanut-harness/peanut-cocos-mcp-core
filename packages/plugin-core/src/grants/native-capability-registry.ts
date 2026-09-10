import { createHash, verify } from 'crypto';
import { existsSync, readFileSync } from 'fs';
import { createRequire } from 'module';
import { join, relative, resolve } from 'path';

import type { ICanvasContext2D, ICanvasImage, ICanvasImageData, ICanvasService, ICanvasSurface } from '../shared/plugin-manager-contracts.js';

/** @description 已发布 native capability 清单中的单文件摘要记录。 */
interface INativeCapabilityFile {
    /** @description 相对于当前 capability 目标目录的 POSIX 路径。 */
    readonly path: string;
    /** @description 文件 SHA-256 十六进制摘要。 */
    readonly digest: string;
}

/** @description 磁盘 native capability 载荷的最小验证清单。 */
interface INativeCapabilityManifest {
    /** @description capability 稳定标识。 */
    readonly id: string;
    /** @description 对插件公开的 capability API 版本。 */
    readonly apiVersion: string;
    /** @description 当前载荷支持的平台架构组合。 */
    readonly target: string;
    /** @description 由 capability 私有 require 加载的 CommonJS 入口。 */
    readonly entry: string;
    /** @description 参与完整性验证的文件列表。 */
    readonly files: readonly INativeCapabilityFile[];
    /** @description 对 canonical digest 的 base64 Ed25519 签名。 */
    readonly signature?: string;
}

/** @description Canvas npm 模块在本宿主中实际使用的最小结构。 */
interface INodeCanvasModule {
    /** @description 创建 node-canvas 画布。 */
    createCanvas(width: number, height: number): INodeCanvasSurface;
    /** @description 从 Buffer 加载图像。 */
    loadImage(source: Uint8Array): Promise<INodeCanvasImage>;
}

/** @description node-canvas 图像结构的最小适配视图。 */
interface INodeCanvasImage {
    /** @description 图像宽度。 */
    readonly width: number;
    /** @description 图像高度。 */
    readonly height: number;
}

/** @description node-canvas 画布结构的最小适配视图。 */
interface INodeCanvasSurface {
    /** @description 画布宽度。 */
    width: number;
    /** @description 画布高度。 */
    height: number;
    /** @description 获取 node-canvas 2D 上下文。 */
    getContext(contextId: '2d'): {
        drawImage(image: INodeCanvasImage, dx: number, dy: number): void;
        createImageData(width: number, height: number): ICanvasImageData;
        putImageData(imageData: ICanvasImageData, dx: number, dy: number): void;
    };
    /** @description 将画布编码为指定 MIME 类型。 */
    toBuffer(mimeType: 'image/png'): Uint8Array;
}

/**
 * @description 宿主 native capability 注册表；负责验证平台载荷，并仅向已授权插件提供能力专属服务。
 */
export class NativeCapabilityRegistry {
    /** @description 宿主发行物内 native capability 载荷根目录；缺失时 registry 仅可用于测试注入。 */
    private readonly _rootPath: string | null;
    /** @description 宿主内置的 Ed25519 公钥 PEM；缺失时磁盘载荷不会被接受。 */
    private readonly _publicKey: string | null;
    /** @description 测试或宿主启动期显式注册的 Canvas 服务。 */
    private _registeredCanvas: { readonly apiVersion: string; readonly service: ICanvasService } | null = null;

    /**
     * @description 创建 native capability 注册表。
     * @param rootPath 宿主发行物内 `native-capabilities` 目录；省略时不扫描磁盘
     * @param publicKey 用于验证发布签名的 Ed25519 公钥 PEM
     */
    public constructor(rootPath?: string, publicKey?: string) {
        this._rootPath = rootPath == null ? null : resolve(rootPath);
        this._publicKey = publicKey ?? null;
    }

    /**
     * @description 为内置或测试宿主直接注册 Canvas 服务。
     * @param apiVersion 服务实现的 capability API 版本
     * @param service 受控 Canvas 服务
     * @returns 无返回值
     */
    public registerCanvas(apiVersion: string, service: ICanvasService): void {
        this._registeredCanvas = { apiVersion, service };
    }

    /**
     * @description 获取满足插件版本范围的 Canvas 服务；未安装或未通过验证时抛出稳定错误。
     * @param versionRange 插件 manifest 声明的 Canvas API 兼容范围
     * @returns 已验证且版本兼容的 Canvas 服务
     */
    public requireCanvas(versionRange: string): ICanvasService {
        if (this._registeredCanvas != null) {
            this._assertVersionCompatible(this._registeredCanvas.apiVersion, versionRange, 'canvas');
            return this._registeredCanvas.service;
        }
        if (this._rootPath == null) {
            throw new Error('native_capability_unavailable:canvas');
        }
        const target = `${process.platform}-${process.arch}`;
        const targetDirectory = join(this._rootPath, 'canvas', '1.x', target);
        const manifestPath = join(targetDirectory, 'capability.manifest.json');
        if (!existsSync(manifestPath)) {
            throw new Error(`native_capability_target_missing:canvas:${target}`);
        }
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as INativeCapabilityManifest;
        this._validateManifest(targetDirectory, manifest, target);
        this._assertVersionCompatible(manifest.apiVersion, versionRange, 'canvas');
        const entryPath = resolve(targetDirectory, manifest.entry);
        if (!this._isPathWithinDirectory(targetDirectory, entryPath) || !existsSync(entryPath)) {
            throw new Error('native_capability_entry_invalid:canvas');
        }
        const capabilityRequire = createRequire(entryPath);
        const nodeCanvas = capabilityRequire(entryPath) as INodeCanvasModule;
        return this._createCanvasService(nodeCanvas);
    }

    /** @description 验证目标、签名和每个文件的内容摘要。 */
    private _validateManifest(targetDirectory: string, manifest: INativeCapabilityManifest, target: string): void {
        if (manifest.id !== 'canvas' || manifest.target !== target || !Array.isArray(manifest.files)) {
            throw new Error('native_capability_manifest_invalid:canvas');
        }
        const digestPayload = manifest.files
            .slice()
            .sort((left, right) => left.path.localeCompare(right.path))
            .map((record) => `${record.path}:${record.digest}`)
            .join('\n');
        if (this._publicKey == null || manifest.signature == null) {
            throw new Error('native_capability_signature_missing:canvas');
        }
        const signature = Buffer.from(manifest.signature, 'base64');
        if (!verify(null, Buffer.from(digestPayload), this._publicKey, signature)) {
            throw new Error('native_capability_signature_invalid:canvas');
        }
        for (const file of manifest.files) {
            const filePath = resolve(targetDirectory, file.path);
            if (!this._isPathWithinDirectory(targetDirectory, filePath) || !existsSync(filePath)) {
                throw new Error(`native_capability_file_missing:canvas:${file.path}`);
            }
            const digest = createHash('sha256').update(readFileSync(filePath)).digest('hex');
            if (digest !== file.digest) {
                throw new Error(`native_capability_file_integrity_invalid:canvas:${file.path}`);
            }
        }
    }

    /** @description 验证首版 `^major.0.0` API 兼容范围。 */
    private _assertVersionCompatible(apiVersion: string, versionRange: string, capabilityId: string): void {
        const apiMajor = /^([0-9]+)\./.exec(apiVersion)?.[1];
        const requestedMajor = /^\^([0-9]+)\./.exec(versionRange)?.[1];
        if (apiMajor == null || requestedMajor == null || apiMajor !== requestedMajor) {
            throw new Error(`native_capability_version_incompatible:${capabilityId}:${versionRange}`);
        }
    }

    /** @description 判断已解析路径是否仍位于 capability 目标目录内，兼容 Windows 分隔符。 */
    private _isPathWithinDirectory(directoryPath: string, candidatePath: string): boolean {
        const relativePath = relative(directoryPath, candidatePath);
        return relativePath !== '' && !relativePath.startsWith('..') && !relativePath.includes('../') && !relativePath.includes('..\\');
    }

    /** @description 将 node-canvas 模块包装为不泄露底层 npm 类型的受控服务。 */
    private _createCanvasService(nodeCanvas: INodeCanvasModule): ICanvasService {
        return {
            createSurface: (width: number, height: number): ICanvasSurface => {
                const surface = nodeCanvas.createCanvas(width, height);
                return this._wrapSurface(surface);
            },
            loadImage: async (source: Uint8Array): Promise<ICanvasImage> => {
                return nodeCanvas.loadImage(source);
            },
        };
    }

    /** @description 将 node-canvas 画布包装为 Peanut Canvas Surface。 */
    private _wrapSurface(surface: INodeCanvasSurface): ICanvasSurface {
        return {
            width: surface.width,
            height: surface.height,
            getContext2D: (): ICanvasContext2D => {
                const context = surface.getContext('2d');
                return {
                    drawImage: (image: ICanvasImage, dx: number, dy: number): void => {
                        context.drawImage(image as INodeCanvasImage, dx, dy);
                    },
                    createImageData: (width: number, height: number): ICanvasImageData => context.createImageData(width, height),
                    putImageData: (imageData: ICanvasImageData, dx: number, dy: number): void => {
                        context.putImageData(imageData, dx, dy);
                    },
                };
            },
            resize: (width: number, height: number): void => {
                surface.width = width;
                surface.height = height;
            },
            toPng: (): Uint8Array => surface.toBuffer('image/png'),
        };
    }
}
