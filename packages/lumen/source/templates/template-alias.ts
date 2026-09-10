/**
 * @description 将历史/工程内别名模板 id 归一化为 `default_prefab` 下的相对路径。
 * 例如 cocos-for-agent 曾用 `renderer/windows/Button` 指 UI 控件，真实模板为 `ui/Button`。
 */
export class LumenTemplateAlias {
    /**
     * @description 归一化模板 id（不含 `.prefab` 后缀）。
     * @param template 调用方传入的 template / recipe.template
     * @returns 可在 templateRoot 下解析的相对 id
     */
    public static normalize(template: string): string {
        const trimmed = template.trim();
        if (trimmed.length === 0) {
            return trimmed;
        }
        const withoutExt = trimmed.endsWith('.prefab') ? trimmed.slice(0, -'.prefab'.length) : trimmed;
        const rendererWindows = /^renderer\/windows\/(.+)$/u.exec(withoutExt.replace(/\\/g, '/'));
        if (rendererWindows != null) {
            const leaf = rendererWindows[1] ?? '';
            if (leaf.length > 0 && !leaf.includes('/')) {
                return `ui/${leaf}`;
            }
        }
        return withoutExt.replace(/\\/g, '/');
    }
}
