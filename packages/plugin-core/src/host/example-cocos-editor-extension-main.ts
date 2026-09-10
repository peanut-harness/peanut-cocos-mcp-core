import { RuntimeFacade } from 'peanut-runtime';
import { PackagingApp } from 'peanut-packaging';

import { createBuiltinPluginManagerPanelRegistration } from '../builtin/builtin-plugin-manager-panel-registration.js';
import { PluginManagerEditorExtensionModule } from './plugin-manager-editor-extension-module.js';
import { NodePluginPackageModuleResolver } from '../loader/node-plugin-package-module-resolver.js';

// 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ hostGlobal = globalThis as Record<string, unknown>;
// 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ editorApi = hostGlobal.Editor as
        { App?: { version?: unknown }; Project?: { path?: unknown; name?: unknown } } | undefined;
// 保存当前 Creator 版本；真实宿主优先使用官方 App.version，测试可通过受控全局变量注入，未知宿主必须显式失败。
const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ creatorVersion =
        typeof editorApi?.App?.version === 'string' && editorApi.App.version.trim().length > 0
            ? editorApi.App.version.trim()
            : typeof hostGlobal.__PEANUT_CREATOR_VERSION__ === 'string' && hostGlobal.__PEANUT_CREATOR_VERSION__.trim().length > 0
              ? hostGlobal.__PEANUT_CREATOR_VERSION__.trim()
              : (() => {
                    throw new Error('cocos_creator_version_unavailable');
                })();
// 保存 Creator 当前工程根目录；示例在非 Creator 运行时保持纯内存包装模式。
const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ projectPath =
        typeof editorApi?.Project?.path === 'string' && editorApi.Project.path.trim().length > 0 ? editorApi.Project.path : undefined;
// 保存 Creator 当前工程显示名；缺失时保持 null。
const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ projectName =
        typeof editorApi?.Project?.name === 'string' && editorApi.Project.name.trim().length > 0 ? editorApi.Project.name.trim() : null;
// 保存稳定复用的 runtime 门面，供 load 时写入工程路径。
const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ runtime = new RuntimeFacade(creatorVersion, {
        editorApiHostGlobal: hostGlobal,
    });

// 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。
const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ pluginManagerEditorExtensionModule =
        new PluginManagerEditorExtensionModule({
            builtinPanelRegistration: createBuiltinPluginManagerPanelRegistration(),
            packaging: projectPath == null ? undefined : new PackagingApp({ projectPath }),
            pluginPackageModuleResolver: projectPath == null ? undefined : new NodePluginPackageModuleResolver(),
            developmentControl: projectPath == null ? undefined : { projectPath },
            mcpHub: projectPath == null ? undefined : { projectPath },
            diagnosticProjectPath: projectPath,
            runtime,
        });

/**
 * @description Cocos 扩展主进程入口：启动 plugin-manager 宿主壳。
 * @returns Promise 在启动完成后结束
 */
export async function load(): Promise<void> {
    if (projectPath != null) {
        await runtime.project.configure(projectPath, projectName);
    }
    await pluginManagerEditorExtensionModule.load();
}

/**
 * @description Cocos 扩展主进程入口：停止 plugin-manager 宿主壳。
 * @returns Promise 在释放完成后结束
 */
export async function unload(): Promise<void> {
    await pluginManagerEditorExtensionModule.unload();
}

/**
 * @description 提供给宿主消息系统转发的最小方法集合。
 */
export const /* 保存当前执行步骤的中间结果，仅在本作用域内参与后续处理。 */ methods = pluginManagerEditorExtensionModule.methods;
