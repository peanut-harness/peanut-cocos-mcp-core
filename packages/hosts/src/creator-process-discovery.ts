import { resolve } from 'node:path';

/**
 * @description 封装 Cocos Creator 主进程识别与默认可执行文件解析，避免引擎模块依赖宿主脚本。
 */
export class CreatorProcessDiscovery {
    /**
     * @description 从平台进程列表文本中解析绑定指定工程的 Creator 主进程 PID。
     * @param processListText `ps` 或 Windows 进程命令行列表文本。
     * @param projectPath 工程绝对或相对路径。
     * @returns 去重后的 Creator 主进程 PID。
     */
    public static parseProjectProcessIds(processListText: string, projectPath: string): readonly number[] {
        const normalizedProjectPath = CreatorProcessDiscovery._normalizePath(resolve(projectPath));
        const processIds = new Set<number>();
        for (const line of processListText.split(/\r?\n/u)) {
            const normalizedLine = CreatorProcessDiscovery._normalizePath(line.trim());
            if (!CreatorProcessDiscovery._isCreatorMainProcess(normalizedLine)) {
                continue;
            }
            if (!CreatorProcessDiscovery._hasProjectArgument(normalizedLine, normalizedProjectPath)) {
                continue;
            }
            const match = /^(\d+)\s+/u.exec(normalizedLine);
            const processId = match == null ? Number.NaN : Number(match[1]);
            if (Number.isInteger(processId) && processId > 0) {
                processIds.add(processId);
            }
        }
        return [...processIds];
    }

    /**
     * @description 按宿主平台返回默认 Creator 3.8.7 可执行文件，并优先使用显式环境变量。
     * @param platform Node.js 平台标识。
     * @param environment 当前进程环境变量。
     * @returns 可供宿主启动流程校验的默认可执行文件路径或命令名。
     */
    public static resolveDefaultBinary(platform: NodeJS.Platform = process.platform, environment: NodeJS.ProcessEnv = process.env): string {
        const configuredBinary = environment.COCOS_CREATOR_APP?.trim();
        if (configuredBinary != null && configuredBinary.length > 0) {
            return configuredBinary;
        }
        if (platform === 'win32') {
            return 'C:\\ProgramData\\cocos\\editors\\Creator\\3.8.7\\CocosCreator.exe';
        }
        if (platform === 'darwin') {
            return '/Applications/Cocos/Creator/3.8.7/CocosCreator.app/Contents/MacOS/CocosCreator';
        }
        return 'CocosCreator';
    }

    /**
     * @description 判断命令行是否属于 Creator 主进程并排除 renderer/helper 子进程。
     * @param normalizedLine 已标准化的命令行。
     * @returns 命令行属于主进程时返回 `true`。
     */
    private static _isCreatorMainProcess(normalizedLine: string): boolean {
        const lowerLine = normalizedLine.toLowerCase();
        const isCreator = lowerLine.includes('cocoscreator') || lowerLine.includes('cocos creator');
        return isCreator && !lowerLine.includes('helper') && !lowerLine.includes('--type=');
    }

    /**
     * @description 判断命令行是否通过 `--project` 或 `--path` 指向指定工程。
     * @param normalizedLine 已标准化的命令行。
     * @param normalizedProjectPath 已标准化的工程路径。
     * @returns 命令行绑定指定工程时返回 `true`。
     */
    private static _hasProjectArgument(normalizedLine: string, normalizedProjectPath: string): boolean {
        return ['--project', '--path'].some((argumentName) => {
            return (
                normalizedLine.includes(`${argumentName} ${normalizedProjectPath}`) ||
                normalizedLine.includes(`${argumentName} "${normalizedProjectPath}"`)
            );
        });
    }

    /**
     * @description 把平台路径分隔符与大小写归一化为进程命令行比较格式。
     * @param value 待归一化文本。
     * @returns 使用正斜杠和小写字符的比较值。
     */
    private static _normalizePath(value: string): string {
        return value.replaceAll('\\', '/').toLowerCase();
    }
}
