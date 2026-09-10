import Module from 'module';

/**
 * @description Creator 2.4 Electron 内置 Node 不识别 `node:` 协议前缀；为插件 CJS 包补一层解析回落。
 */
export class NodeProtocolShim {
    /** @description 是否已安装。 */
    private static _installed = false;

    /**
     * @description 安装一次 `Module._resolveFilename` 钩子，把 `node:fs` 映射为 `fs`。
     * @returns 是否本次新安装
     */
    public static installOnce(): boolean {
        if (NodeProtocolShim._installed) {
            return false;
        }
        const moduleCtor = Module as unknown as {
            _resolveFilename: (request: string, parent: unknown, isMain: boolean, options?: unknown) => string;
        };
        const original = moduleCtor._resolveFilename.bind(Module);
        moduleCtor._resolveFilename = (request: string, parent: unknown, isMain: boolean, options?: unknown): string => {
            if (typeof request === 'string' && request.startsWith('node:')) {
                return original(request.slice('node:'.length), parent, isMain, options);
            }
            return original(request, parent, isMain, options);
        };
        NodeProtocolShim._installed = true;
        return true;
    }
}
