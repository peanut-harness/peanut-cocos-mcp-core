import { CompatibleUuid } from 'peanut-asset-catalog';
import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';

/**
 * @description 同目录临时文件写入后 rename，避免覆盖过程中截断损坏目标文件。
 */
export class LumenAtomicFileWriter {
    /**
     * @description 将 UTF-8 文本原子写入目标路径。
     * @param targetPath 最终文件绝对路径
     * @param content 完整文件内容
     */
    public static writeUtf8(targetPath: string, content: string): void {
        this._write(targetPath, content, 'utf8');
    }

    /**
     * @description 将二进制内容原子写入目标路径。
     * @param targetPath 最终文件绝对路径
     * @param content 完整字节
     */
    public static writeBuffer(targetPath: string, content: Uint8Array): void {
        this._write(targetPath, content);
    }

    /**
     * @description 同目录临时文件写入后 rename。
     * @param targetPath 最终路径
     * @param content 文本或字节
     * @param encoding 文本编码；省略表示二进制
     */
    private static _write(targetPath: string, content: string | Uint8Array, encoding?: 'utf8'): void {
        const directory = dirname(targetPath);
        mkdirSync(directory, { recursive: true });
        const temporaryPath = join(directory, `.${basename(targetPath)}.${CompatibleUuid.create()}.tmp`);
        try {
            if (encoding === 'utf8' && typeof content === 'string') {
                writeFileSync(temporaryPath, content, 'utf8');
            } else {
                writeFileSync(temporaryPath, content);
            }
            renameSync(temporaryPath, targetPath);
        } finally {
            if (existsSync(temporaryPath)) {
                unlinkSync(temporaryPath);
            }
        }
    }
}
