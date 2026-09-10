import { existsSync } from 'node:fs';

import { Lumen24DefaultTemplateRoot, Lumen24TemplateCatalog } from './lumen-24-template-catalog.js';

/**
 * @description 逻辑空模板 id。
 */
export type Lumen24LogicalTemplateId = 'empty';

/**
 * @description 模板 id：`empty` 或 default_prefab_24 相对路径（如 `button` / `ui/editbox`）。
 */
export type Lumen24TemplateId = string;

/**
 * @description Creator 2.4 模板解析（整树 default_prefab_24 + 逻辑 empty）。
 */
export class Lumen24Templates {
    /**
     * @description 常见别名 → 目录内文件 id。
     */
    private static readonly _aliases: Readonly<Record<string, string>> = {
        empty: 'empty',
        sprite: 'sprite',
        label: 'label',
        button: 'button',
        canvas: 'canvas',
        layout: 'layout',
        editbox: 'editbox',
        scrollview: 'scrollview',
        pageview: 'pageview',
        slider: 'slider',
        progressbar: 'progressBar',
        richtext: 'richtext',
        toggle: 'toggle',
        togglecontainer: 'toggleContainer',
        togglegroup: 'toggleGroup',
        spritesplash: 'sprite_splash',
        videoplayer: 'videoplayer',
        webview: 'webview',
        particlesystem: 'particlesystem',
        tiledmap: 'tiledmap',
        tiledtile: 'tiledtile',
        '3d-particle': '3d-particle',
        '3d-stage': '3d-stage',
        '3d/particle': '3d-particle',
        '3d/stage': '3d-stage',
        'ui/sprite': 'ui/sprite',
        'ui/label': 'ui/label',
        'ui/button': 'ui/button',
        'ui/canvas': 'ui/canvas',
        'ui/layout': 'ui/layout',
        'ui/editbox': 'ui/editbox',
        'ui/scrollview': 'ui/scrollview',
        'ui/pageview': 'ui/pageview',
        'ui/slider': 'ui/slider',
        'ui/progressbar': 'ui/progressBar',
        'ui/richtext': 'ui/richtext',
        'ui/toggle': 'ui/toggle',
        'ui/togglecontainer': 'ui/toggleContainer',
        'ui/button.prefab': 'ui/button',
        'cc.sprite': 'sprite',
        'cc.label': 'label',
        'cc.button': 'button',
        'cc.editbox': 'editbox',
        'cc.scrollview': 'scrollview',
        'cc.pageview': 'pageview',
        'cc.slider': 'slider',
        'cc.progressbar': 'progressBar',
        'cc.richtext': 'richtext',
        'cc.toggle': 'toggle',
    };

    /**
     * @description 列出可用模板（含 empty）。
     * @returns 模板摘要
     */
    public static list(): readonly { readonly id: string; readonly kind: 'prefab' | 'logical' }[] {
        const fromDisk = Lumen24TemplateCatalog.list().map((entry) => ({
            id: entry.id,
            kind: 'prefab' as const,
        }));
        return [{ id: 'empty', kind: 'logical' }, ...fromDisk];
    }

    /**
     * @description 规范化模板 id。
     * @param template 用户输入
     * @returns 规范 id（`empty` 或文件 id）
     */
    public static normalize(template: string | undefined): Lumen24TemplateId {
        if (template == null || template.trim().length === 0 || template === 'empty') {
            return 'empty';
        }
        const raw = template.trim().replace(/\\/g, '/');
        const lower = raw.toLowerCase();
        const aliased = Lumen24Templates._aliases[lower] ?? Lumen24Templates._aliases[lower.replace(/^.*\//, '')];
        if (aliased === 'empty') {
            return 'empty';
        }
        const candidate = aliased ?? raw.replace(/\.prefab$/i, '');
        if (Lumen24Templates.hasPrefabFile(candidate)) {
            return candidate;
        }
        // PascalCase ui/Button → ui/button
        const uiFolded = candidate.replace(/^ui\//i, 'ui/').replace(/\/([A-Z])/g, (_, ch: string) => `/${ch.toLowerCase()}`);
        if (uiFolded !== candidate && Lumen24Templates.hasPrefabFile(uiFolded)) {
            return uiFolded;
        }
        const bare = candidate.replace(/^ui\//i, '');
        if (bare !== candidate && Lumen24Templates.hasPrefabFile(bare)) {
            return bare;
        }
        if (Lumen24Templates.hasPrefabFile(`ui/${bare}`)) {
            return `ui/${bare}`;
        }
        throw new Error(
            `lumen_24_template_unsupported:${template}:hint=empty|button|ui/editbox|… see lumen.templates`,
        );
    }

    /**
     * @description 是否存在对应整树文件。
     * @param templateId 规范 id
     * @returns 是否文件模板
     */
    public static hasPrefabFile(templateId: string): boolean {
        if (templateId === 'empty') {
            return false;
        }
        try {
            const absolute = Lumen24TemplateCatalog.resolveAbsolutePath(templateId);
            return existsSync(absolute);
        } catch {
            return false;
        }
    }

    /**
     * @description 解析模板绝对路径；`empty` 返回 null。
     * @param templateId 规范 id
     * @returns 绝对路径或 null
     */
    public static resolveAbsolutePath(templateId: Lumen24TemplateId): string | null {
        if (templateId === 'empty') {
            return null;
        }
        return Lumen24TemplateCatalog.resolveAbsolutePath(templateId);
    }

    /**
     * @description 兼容旧 API：仅 empty/sprite/label/button 的单组件回退（无文件时）。
     * @param template 模板 id
     * @returns builtin 或 null
     */
    public static builtinFor(template: Lumen24TemplateId): 'cc.Sprite' | 'cc.Label' | 'cc.Button' | null {
        if (Lumen24Templates.hasPrefabFile(template)) {
            return null;
        }
        const map: Readonly<Record<string, 'cc.Sprite' | 'cc.Label' | 'cc.Button'>> = {
            sprite: 'cc.Sprite',
            label: 'cc.Label',
            button: 'cc.Button',
        };
        return map[template] ?? null;
    }

    /**
     * @description 模板根（调试）。
     * @returns 绝对路径
     */
    public static templateRoot(): string {
        return Lumen24DefaultTemplateRoot.resolve();
    }
}
