declare module 'child_process' {
    export function execFile(
        file: string,
        argumentsValue: readonly string[],
        options: { readonly encoding: 'utf8'; readonly maxBuffer: number },
        callback: (error: unknown, stdout: string) => void,
    ): void;
}
