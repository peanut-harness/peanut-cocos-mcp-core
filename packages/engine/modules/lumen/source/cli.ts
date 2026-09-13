#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join } from 'path';

import { LumenSession } from './session';
import { LumenDefaultTemplateRoot } from './templates/default-root';
import type { ILumenNodeRecipe } from './types';

const [command, ...argumentsList] = process.argv.slice(2);

void main();

/**
 * @description CLI 主流程。
 * @oopException CLI 入口无领域对象归属。
 */
async function main(): Promise<void> {
    try {
        if (command === '--help' || command === '-h' || command === 'help' || command == null) {
            printUsage();
        } else if (command === '--version' || command === '-V') {
            process.stdout.write(`${readVersion()}\n`);
        } else if (command === 'scaffold') {
        assertKnownFlags(argumentsList, ['--project', '--prefab', '--root', '--template', '--templates', '--cocos']);
        const projectPath = readRequiredFlag(argumentsList, '--project');
        const prefabPath = readRequiredFlag(argumentsList, '--prefab');
        const rootName = readFlag(argumentsList, '--root') ?? 'Root';
        const template = readFlag(argumentsList, '--template') ?? 'empty';
        const session = createSession(argumentsList);
        const relativePath = session.scaffoldPrefab({
            prefabRelativePath: prefabPath,
            rootName,
            template,
            writeMetaIfMissing: true,
        });
        process.stdout.write(
            `${JSON.stringify({ phase: session.phase, prefab: relativePath, projectRoot: session.projectRoot, cocos: session.cocosVersion.toString() }, null, 2)}\n`,
        );
    } else if (command === 'stage') {
        assertKnownFlags(argumentsList, ['--project', '--file', '--content', '--cocos']);
        const filePath = readRequiredFlag(argumentsList, '--file');
        const content = readRequiredFlag(argumentsList, '--content');
        const session = createSession(argumentsList);
        session.stageTextFiles({ [filePath]: content });
        process.stdout.write(`${JSON.stringify({ phase: session.phase, file: filePath }, null, 2)}\n`);
    } else if (command === 'open') {
        assertKnownFlags(argumentsList, ['--project', '--prefab', '--templates', '--cocos']);
        const prefabPath = readRequiredFlag(argumentsList, '--prefab');
        const session = createSession(argumentsList);
        const relativePath = session.openPrefab(prefabPath);
        process.stdout.write(
            `${JSON.stringify({ phase: session.phase, prefab: relativePath, cocos: session.cocosVersion.toString() }, null, 2)}\n`,
        );
    } else if (command === 'refresh') {
        assertKnownFlags(argumentsList, ['--project', '--path', '--cocos']);
        const pathFlag = readFlag(argumentsList, '--path');
        const session = createSession(argumentsList);
        const result = await session.requestEditorRefresh(pathFlag == null || pathFlag.length === 0 ? [] : [pathFlag]);
        process.stdout.write(`${JSON.stringify({ phase: session.phase, result }, null, 2)}\n`);
    } else if (command === 'catalog') {
        assertKnownFlags(argumentsList, ['--project', '--cocos']);
        const session = createSession(argumentsList);
        const summary = session.refreshCatalog();
        process.stdout.write(`${JSON.stringify({ phase: session.phase, summary }, null, 2)}\n`);
    } else if (command === 'resolve') {
        assertKnownFlags(argumentsList, ['--project', '--uuid', '--type', '--path', '--name', '--limit', '--cocos']);
        const limitRaw = readFlag(argumentsList, '--limit');
        const session = createSession(argumentsList);
        const hits = session.resolve({
            uuid: readFlag(argumentsList, '--uuid') ?? undefined,
            type: readFlag(argumentsList, '--type') ?? undefined,
            pathContains: readFlag(argumentsList, '--path') ?? undefined,
            nameContains: readFlag(argumentsList, '--name') ?? undefined,
            limit: limitRaw == null ? 20 : Number.parseInt(limitRaw, 10),
        });
        process.stdout.write(`${JSON.stringify({ count: hits.length, hits }, null, 2)}\n`);
    } else if (command === 'schema') {
        assertKnownFlags(argumentsList, ['--project', '--type', '--cocos', '--engine']);
        const session = createSession(argumentsList);
        const componentType = readFlag(argumentsList, '--type') ?? undefined;
        process.stdout.write(`${JSON.stringify(session.describeSchema(componentType), null, 2)}\n`);
    } else if (command === 'templates') {
        assertKnownFlags(argumentsList, ['--project', '--templates', '--cocos']);
        const session = createSession(argumentsList);
        const templates = session.listTemplates();
        process.stdout.write(
            `${JSON.stringify({ cocos: session.cocosVersion.toString(), count: templates.length, templates }, null, 2)}\n`,
        );
    } else if (command === 'tree') {
        assertKnownFlags(argumentsList, ['--project', '--prefab', '--templates', '--cocos']);
        const session = openSessionWithPrefab(argumentsList);
        process.stdout.write(
            `${JSON.stringify({ cocos: session.cocosVersion.toString(), tree: session.inspectTree() }, null, 2)}\n`,
        );
    } else if (command === 'inspect') {
        assertKnownFlags(argumentsList, ['--project', '--prefab', '--node', '--templates', '--cocos']);
        const session = openSessionWithPrefab(argumentsList);
        if (session.openedAssetKind != null && session.openedAssetKind !== 'prefab' && session.openedAssetKind !== 'scene') {
            process.stdout.write(
                `${JSON.stringify({ cocos: session.cocosVersion.toString(), kind: session.openedAssetKind, asset: session.inspectAsset() }, null, 2)}\n`,
            );
        } else {
            const nodePath = readRequiredFlag(argumentsList, '--node');
            process.stdout.write(
                `${JSON.stringify({ cocos: session.cocosVersion.toString(), node: session.inspectNode(nodePath) }, null, 2)}\n`,
            );
        }
    } else if (command === 'asset-set') {
        assertKnownFlags(argumentsList, ['--project', '--prefab', '--props', '--templates', '--cocos']);
        const session = openSessionWithPrefab(argumentsList);
        const propsPath = readRequiredFlag(argumentsList, '--props');
        const patch = JSON.parse(readFileSync(propsPath, 'utf8')) as unknown;
        if (patch == null || typeof patch !== 'object' || Array.isArray(patch)) {
            throw new Error('lumen_props_json_invalid');
        }
        session.setAssetProperty({ patch: patch as Record<string, unknown> });
        session.save();
        process.stdout.write(
            `${JSON.stringify({ phase: session.phase, kind: session.openedAssetKind, prefab: readRequiredFlag(argumentsList, '--prefab') }, null, 2)}\n`,
        );
    } else if (command === 'cocos-info') {
        assertKnownFlags(argumentsList, ['--project', '--engine', '--cocos', '--gap-offset', '--gap-limit']);
        const session = createSession(argumentsList);
        const engineRoot = readFlag(argumentsList, '--engine') ?? undefined;
        const gapOffset = readOptionalIntFlag(argumentsList, '--gap-offset');
        const gapLimit = readOptionalIntFlag(argumentsList, '--gap-limit');
        process.stdout.write(
            `${JSON.stringify(
                session.probeCocosInfo(engineRoot, {
                    offset: gapOffset ?? undefined,
                    limit: gapLimit ?? undefined,
                }),
                null,
                2,
            )}\n`,
        );
    } else if (command === 'cache-sync') {
        assertKnownFlags(argumentsList, ['--cache']);
        const cacheDir = readRequiredFlag(argumentsList, '--cache');
        const result = LumenDefaultTemplateRoot.ensurePluginCache(cacheDir);
        process.stdout.write(
            `${JSON.stringify(
                {
                    copied: result.copied,
                    templateRoot: result.templateRoot,
                    bundledRoot: result.bundledRoot,
                    manifest: result.manifest,
                },
                null,
                2,
            )}\n`,
        );
    } else if (command === 'cache-reset') {
        assertKnownFlags(argumentsList, ['--cache']);
        const cacheDir = readRequiredFlag(argumentsList, '--cache');
        const result = LumenDefaultTemplateRoot.resetPluginCache(cacheDir);
        process.stdout.write(
            `${JSON.stringify(
                {
                    copied: result.copied,
                    templateRoot: result.templateRoot,
                    bundledRoot: result.bundledRoot,
                    manifest: result.manifest,
                },
                null,
                2,
            )}\n`,
        );
    } else if (command === 'cache-import') {
        assertKnownFlags(argumentsList, ['--cache', '--from']);
        const cacheDir = readRequiredFlag(argumentsList, '--cache');
        const from = readRequiredFlag(argumentsList, '--from');
        const result = LumenDefaultTemplateRoot.importPluginCache(from, cacheDir);
        process.stdout.write(
            `${JSON.stringify(
                {
                    copied: result.copied,
                    templateRoot: result.templateRoot,
                    sourceRoot: result.bundledRoot,
                    manifest: result.manifest,
                },
                null,
                2,
            )}\n`,
        );
    } else if (command === 'cache-status') {
        assertKnownFlags(argumentsList, ['--cache']);
        const cacheDir = readRequiredFlag(argumentsList, '--cache');
        const status = LumenDefaultTemplateRoot.readPluginCacheStatus(cacheDir);
        process.stdout.write(`${JSON.stringify(status, null, 2)}\n`);
    } else if (command === 'node-add') {
        assertKnownFlags(argumentsList, [
            '--project',
            '--prefab',
            '--parent',
            '--template',
            '--name',
            '--templates',
            '--cocos',
        ]);
        const session = openSessionWithPrefab(argumentsList);
        const parent = readRequiredFlag(argumentsList, '--parent');
        const template = readRequiredFlag(argumentsList, '--template');
        const name = readFlag(argumentsList, '--name') ?? undefined;
        const path = session.addChildFromTemplate({ parentPath: parent, template, name });
        session.save();
        process.stdout.write(`${JSON.stringify({ phase: session.phase, path }, null, 2)}\n`);
    } else if (command === 'node-rm') {
        assertKnownFlags(argumentsList, ['--project', '--prefab', '--path', '--templates', '--cocos']);
        const session = openSessionWithPrefab(argumentsList);
        const path = readRequiredFlag(argumentsList, '--path');
        session.removeNode(path);
        session.save();
        process.stdout.write(`${JSON.stringify({ phase: session.phase, removed: path }, null, 2)}\n`);
    } else if (command === 'node-rename') {
        assertKnownFlags(argumentsList, [
            '--project',
            '--prefab',
            '--path',
            '--name',
            '--templates',
            '--cocos',
        ]);
        const session = openSessionWithPrefab(argumentsList);
        const path = readRequiredFlag(argumentsList, '--path');
        const name = readRequiredFlag(argumentsList, '--name');
        session.renameNode(path, name);
        session.save();
        process.stdout.write(
            `${JSON.stringify({ phase: session.phase, path, name }, null, 2)}\n`,
        );
    } else if (command === 'node-reorder') {
        assertKnownFlags(argumentsList, [
            '--project',
            '--prefab',
            '--parent',
            '--child',
            '--index',
            '--templates',
            '--cocos',
        ]);
        const session = openSessionWithPrefab(argumentsList);
        const parent = readRequiredFlag(argumentsList, '--parent');
        const child = readRequiredFlag(argumentsList, '--child');
        const indexRaw = readRequiredFlag(argumentsList, '--index');
        const index = Number.parseInt(indexRaw, 10);
        if (!Number.isInteger(index) || index < 0) {
            throw new Error(`lumen_reorder_index_invalid:${indexRaw}`);
        }
        session.reorderChild(parent, child, index);
        session.save();
        process.stdout.write(
            `${JSON.stringify({ phase: session.phase, parent, child, index }, null, 2)}\n`,
        );
    } else if (command === 'comp-add') {
        assertKnownFlags(argumentsList, [
            '--project',
            '--prefab',
            '--node',
            '--type',
            '--script',
            '--templates',
            '--cocos',
        ]);
        const session = openSessionWithPrefab(argumentsList);
        session.refreshCatalog();
        const nodePath = readRequiredFlag(argumentsList, '--node');
        const builtinType = readFlag(argumentsList, '--type') ?? undefined;
        const scriptName = readFlag(argumentsList, '--script') ?? undefined;
        const componentIndex = session.attachComponent({ nodePath, builtinType, scriptName });
        session.save();
        process.stdout.write(`${JSON.stringify({ phase: session.phase, componentIndex }, null, 2)}\n`);
    } else if (command === 'comp-rm') {
        assertKnownFlags(argumentsList, ['--project', '--prefab', '--node', '--type', '--templates', '--cocos']);
        const session = openSessionWithPrefab(argumentsList);
        const nodePath = readRequiredFlag(argumentsList, '--node');
        const type = readRequiredFlag(argumentsList, '--type');
        session.removeComponent(nodePath, type);
        session.save();
        process.stdout.write(`${JSON.stringify({ phase: session.phase, removed: type }, null, 2)}\n`);
    } else if (command === 'bind-click') {
        assertKnownFlags(argumentsList, [
            '--project',
            '--prefab',
            '--button',
            '--target',
            '--component',
            '--handler',
            '--data',
            '--templates',
            '--cocos',
        ]);
        const session = openSessionWithPrefab(argumentsList);
        session.refreshCatalog();
        session.bindClick({
            buttonNodePath: readRequiredFlag(argumentsList, '--button'),
            targetNodePath: readRequiredFlag(argumentsList, '--target'),
            component: readRequiredFlag(argumentsList, '--component'),
            handler: readRequiredFlag(argumentsList, '--handler'),
            customEventData: readFlag(argumentsList, '--data') ?? '',
        });
        session.save();
        process.stdout.write(`${JSON.stringify({ phase: session.phase }, null, 2)}\n`);
    } else if (command === 'bind-sprite') {
        assertKnownFlags(argumentsList, ['--project', '--prefab', '--node', '--uuid', '--templates', '--cocos']);
        const session = openSessionWithPrefab(argumentsList);
        session.refreshCatalog();
        session.bindSprite({
            nodePath: readRequiredFlag(argumentsList, '--node'),
            spriteFrameUuid: readRequiredFlag(argumentsList, '--uuid'),
        });
        session.save();
        process.stdout.write(`${JSON.stringify({ phase: session.phase }, null, 2)}\n`);
    } else if (command === 'comp-set') {
        assertKnownFlags(argumentsList, [
            '--project',
            '--prefab',
            '--node',
            '--type',
            '--props',
            '--templates',
            '--cocos',
        ]);
        const session = openSessionWithPrefab(argumentsList);
        const nodePath = readRequiredFlag(argumentsList, '--node');
        const componentType = readRequiredFlag(argumentsList, '--type');
        const propsPath = readRequiredFlag(argumentsList, '--props');
        const patch = JSON.parse(readFileSync(propsPath, 'utf8')) as unknown;
        if (patch == null || typeof patch !== 'object' || Array.isArray(patch)) {
            throw new Error('lumen_props_json_invalid');
        }
        session.setComponentProperty({
            nodePath,
            componentType,
            patch: patch as Record<string, unknown>,
        });
        session.save();
        process.stdout.write(`${JSON.stringify({ phase: session.phase, nodePath, componentType }, null, 2)}\n`);
    } else if (command === 'node-set') {
        assertKnownFlags(argumentsList, ['--project', '--prefab', '--node', '--props', '--templates', '--cocos']);
        const session = openSessionWithPrefab(argumentsList);
        const nodePath = readRequiredFlag(argumentsList, '--node');
        const propsPath = readRequiredFlag(argumentsList, '--props');
        const patch = JSON.parse(readFileSync(propsPath, 'utf8')) as unknown;
        if (patch == null || typeof patch !== 'object' || Array.isArray(patch)) {
            throw new Error('lumen_props_json_invalid');
        }
        session.setNodeProperty({ nodePath, patch: patch as Record<string, unknown> });
        session.save();
        process.stdout.write(`${JSON.stringify({ phase: session.phase, nodePath }, null, 2)}\n`);
    } else if (command === 'structure') {
        assertKnownFlags(argumentsList, ['--project', '--prefab', '--parent', '--recipe', '--templates', '--cocos']);
        const session = openSessionWithPrefab(argumentsList);
        const parent = readRequiredFlag(argumentsList, '--parent');
        const recipePath = readRequiredFlag(argumentsList, '--recipe');
        const parsed = JSON.parse(readFileSync(recipePath, 'utf8')) as unknown;
        const recipe = parseRecipeInput(parsed);
        const created = session.buildFromRecipe({ parentPath: parent, recipe });
        session.save();
        process.stdout.write(`${JSON.stringify({ phase: session.phase, created }, null, 2)}\n`);
    } else if (command === 'save') {
        assertKnownFlags(argumentsList, ['--project', '--prefab', '--templates', '--cocos']);
        const session = openSessionWithPrefab(argumentsList);
        session.save();
        process.stdout.write(`${JSON.stringify({ phase: session.phase, saved: true }, null, 2)}\n`);
    } else {
        throw new Error(`unknown_command:${command}`);
    }
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
}
}

/**
 * @description 从 CLI 参数创建会话（含可选 `--cocos`）。
 * @param args CLI 参数
 * @returns 会话
 * @oopException CLI 入口旁路编排，无所属领域对象。
 */
function createSession(args: readonly string[]): LumenSession {
    return new LumenSession({
        projectRoot: readRequiredFlag(args, '--project'),
        templateRoot: readFlag(args, '--templates') ?? undefined,
        templateCacheDir: readFlag(args, '--template-cache') ?? undefined,
        cocosVersion: readFlag(args, '--cocos') ?? undefined,
        engineRoot: readFlag(args, '--engine') ?? undefined,
    });
}

/**
 * @description 打开带 prefab 的会话。
 * @param args CLI 参数
 * @returns 会话
 * @oopException CLI 入口旁路编排，无所属领域对象。
 */
function openSessionWithPrefab(args: readonly string[]): LumenSession {
    const session = createSession(args);
    session.openPrefab(readRequiredFlag(args, '--prefab'));
    return session;
}

/**
 * @description 打印用法。
 * @oopException CLI 入口旁路说明，无所属领域对象。
 */
function printUsage(): void {
    process.stdout.write(`lumen — peanut Cocos content session

Usage:
  lumen scaffold --project <creator-project> --prefab <assets/.../X.prefab|X.scene|X.mtl|X.anim|X.pmtl|X.terrain|X.effect|X.pac|X.labelatlas|X.animgraph|X.animgraphvari|X.animask|X.rt|X.rpp|X.flow|X.stg> [--root Name] [--template empty|ui/Label|standard|forward] [--templates <default_prefab_root>] [--cocos 3.8.3]
  lumen stage    --project <creator-project> --file <relative> --content <text> [--cocos 3.8.3]
  lumen open     --project <creator-project> --prefab <assets/.../X.prefab|X.scene|X.mtl|X.anim|X.pmtl|X.terrain|Icon.png|Unlit.effect|Hero.fbx|Icons.pac|Digits.labelatlas|Hero.animgraph|Screen.rt|Forward.rpp|Main.flow|Opaque.stg|Click.wav|Intro.mp4|Title.ttf|Score.fnt|Hero.skel|Hero.dbbin|Sky.cubemap|Level.tmx|pack|Smoke.plist|note.json|note.txt|Table.bin|Probe.ts|plugin.js|Cube.mesh|Skin.skeleton|Walk.animation|Body.material> [--cocos 3.8.3]
  lumen refresh  --project <creator-project> [--path <relative>]
  lumen catalog  --project <creator-project>
  lumen resolve  --project <creator-project> [--uuid|--type|--path|--name] [--limit N]
  lumen schema   --project <creator-project> [--type cc.Label] [--cocos 3.8.3] [--engine <engine-root-or-ts>]
  lumen templates --project <creator-project> [--templates <default_prefab_root>]
  lumen tree     --project ... --prefab ...
  lumen inspect  --project ... --prefab ... [--node /Root/Title]
  lumen asset-set --project ... --prefab assets/fx/Lit.mtl|assets/ui/Icon.png|assets/fx/Unlit.effect|assets/Hero.fbx|assets/ui/Icons.pac|assets/anim/Hero.animgraph|assets/fx/Screen.rt|assets/fx/Forward.rpp|assets/fx/Main.flow|assets/fx/Opaque.stg|assets/sfx/Click.wav|assets/fonts/Score.fnt|assets/spine/Hero.skel|assets/sky/Sky.cubemap|assets/pack|assets/scripts/plugin.js --props <asset-props.json>
  lumen cocos-info --project <creator-project> [--engine <engine-root-or-cc.d.ts>] [--cocos 3.8.3] [--gap-offset N] [--gap-limit N]
  lumen cache-sync --cache <plugin-cache-dir>
  lumen cache-reset --cache <plugin-cache-dir>
  lumen cache-import --cache <plugin-cache-dir> --from <version-pack-dir>
  lumen cache-status --cache <plugin-cache-dir>
  lumen node-add --project ... --prefab ... --parent /Root --template ui/Label [--name Title]
  lumen node-rm  --project ... --prefab ... --path /Root/Title
  lumen node-rename --project ... --prefab ... --path /Root/Title --name Header
  lumen node-reorder --project ... --prefab ... --parent /Root --child Body --index 0
  lumen structure --project ... --prefab ... --parent /Root --recipe <recipe.json>
  lumen comp-set --project ... --prefab ... --node /Root/Title --type cc.Label --props <props.json>
  lumen node-set --project ... --prefab ... --node /Root/Title --props <node-props.json>
  lumen comp-add --project ... --prefab ... --node /Root [--type cc.Button|--script DemoPanel]
  lumen comp-rm  --project ... --prefab ... --node /Root --type cc.Button
  lumen bind-click --project ... --prefab ... --button /Root/Btn --target /Root --component DemoPanel --handler onClick
  lumen bind-sprite --project ... --prefab ... --node /Root/Icon --uuid <spriteFrameUuid>
  lumen save     --project ... --prefab ...
  lumen --help
  lumen --version

--cocos: optional Creator version for property whitelist (default: project package.json creator.version, else baseline 3.8.3).
--template-cache: plugin cache root; syncs bundled default_prefab into <cache>/default_prefab when manifest stale.
cache-sync: sync bundled (default cocos 3.8.3) into cache when stale.
cache-reset: force restore bundled 3.8.3 into cache.
cache-import: import external pack (manifest + default_prefab) into cache.
cache-status: show bundled vs cache manifests.
Supported baseline: 3.8.3 (engine schema source); 3.8.7+ via project version / --cocos. Field gates use since/until.
Deprecated builtins (e.g. cc.LabelOutline / cc.LabelShadow) are never attached; use Label outline/shadow fields since 3.8.2.
Discovery: schema (kinds/enums), templates, tree/inspect (read-only), cocos-info (project version + optional engine d.ts compare; inEngineNotInWhitelist is paginated; field auto-map is NOT trusted).

Pipeline: stage → scaffold → structure(default_prefab recipes) → (Creator Import) → catalog → bind → save
`);
}

/**
 * @description 解析 structure 命令的配方 JSON。
 * @param value 未受信 JSON
 * @returns 配方或配方数组
 * @oopException CLI 参数解析旁路。
 */
function parseRecipeInput(value: unknown): ILumenNodeRecipe | readonly ILumenNodeRecipe[] {
    if (Array.isArray(value)) {
        return value.map((item) => parseOneRecipe(item));
    }
    return parseOneRecipe(value);
}

/**
 * @description 解析单个配方节点。
 * @param value 未受信对象
 * @returns 配方
 * @oopException CLI 参数解析旁路。
 */
function parseOneRecipe(value: unknown): ILumenNodeRecipe {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('lumen_recipe_invalid');
    }
    const record = value as Record<string, unknown>;
    if (typeof record.name !== 'string' || record.name.trim().length === 0) {
        throw new Error('lumen_recipe_name_required');
    }
    const childrenRaw = record.children;
    const children =
        childrenRaw == null
            ? undefined
            : Array.isArray(childrenRaw)
              ? childrenRaw.map((child) => parseOneRecipe(child))
              : (() => {
                    throw new Error('lumen_recipe_children_invalid');
                })();
    const componentsRaw = record.components;
    const components =
        componentsRaw == null
            ? undefined
            : Array.isArray(componentsRaw) && componentsRaw.every((item) => typeof item === 'string')
              ? componentsRaw
              : (() => {
                    throw new Error('lumen_recipe_components_invalid');
                })();
    const props =
        record.props == null
            ? undefined
            : record.props != null && typeof record.props === 'object' && !Array.isArray(record.props)
              ? (record.props as Record<string, unknown>)
              : (() => {
                    throw new Error('lumen_recipe_props_invalid');
                })();
    const nodeProps =
        record.nodeProps == null
            ? undefined
            : record.nodeProps != null && typeof record.nodeProps === 'object' && !Array.isArray(record.nodeProps)
              ? (record.nodeProps as Record<string, unknown>)
              : (() => {
                    throw new Error('lumen_recipe_nodeProps_invalid');
                })();
    return {
        name: record.name,
        template: typeof record.template === 'string' ? record.template : undefined,
        components,
        props,
        propComponent: typeof record.propComponent === 'string' ? record.propComponent : undefined,
        nodeProps,
        children,
    };
}

/**
 * @description 读取包版本。
 * @returns 版本号
 * @oopException CLI 旁路读 package.json。
 */
function readVersion(): string {
    const packagePath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: string };
    return packageJson.version ?? '0.0.0';
}

/**
 * @description 读取必填 flag。
 * @param args 参数列表
 * @param name flag 名
 * @returns 值
 * @oopException CLI 参数解析。
 */
function readRequiredFlag(args: readonly string[], name: string): string {
    const value = readFlag(args, name);
    if (value == null || value.length === 0) {
        throw new Error(`missing_flag:${name}`);
    }
    return value;
}

/**
 * @description 读取可选 flag。
 * @param args 参数列表
 * @param name flag 名
 * @returns 值或 null
 * @oopException CLI 参数解析。
 */
function readFlag(args: readonly string[], name: string): string | null {
    const index = args.indexOf(name);
    if (index < 0) {
        return null;
    }
    return args[index + 1] ?? null;
}

/**
 * @description 读取可选整数 flag。
 * @param args 参数列表
 * @param name flag 名
 * @returns 整数或 null
 * @oopException CLI 参数解析。
 */
function readOptionalIntFlag(args: readonly string[], name: string): number | null {
    const raw = readFlag(args, name);
    if (raw == null || raw.length === 0) {
        return null;
    }
    if (!/^-?\d+$/.test(raw)) {
        throw new Error(`lumen_cli_int_flag_invalid:${name}`);
    }
    return Number(raw);
}

/**
 * @description 校验未知 flag。
 * @param args 参数
 * @param allowed 允许列表
 * @oopException CLI 参数解析。
 */
function assertKnownFlags(args: readonly string[], allowed: readonly string[]): void {
    const allowedSet = new Set([...allowed, '--template-cache']);
    for (let index = 0; index < args.length; index += 1) {
        const token = args[index];
        if (token == null || !token.startsWith('--')) {
            continue;
        }
        if (!allowedSet.has(token)) {
            throw new Error(`unknown_flag:${token}`);
        }
        index += 1;
    }
}
