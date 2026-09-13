/**
 * @description 对照 demo stub 指向的引擎 cc.d.ts 与 lumen 白名单，输出未落地「可挂节点组件」。
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { LumenComponentPropertySchema } = require(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'index.js'),
);

const input =
    process.argv[2] ??
    'D:/workspaces/peanut-agents/test-demos/cocos-for-agent/temp/declarations/cc.d.ts';

/**
 * @description 解析 stub reference 到真实 d.ts。
 * @param {string} pathOrStub
 * @returns {string}
 */
function resolveDts(pathOrStub) {
    const text = readFileSync(pathOrStub, 'utf8');
    const match = text.match(/reference\s+path\s*=\s*"([^"]+)"/i);
    if (match?.[1] && existsSync(match[1])) {
        return match[1];
    }
    if (statSync(pathOrStub).isFile()) {
        return pathOrStub;
    }
    for (const candidate of [
        join(pathOrStub, 'bin', '.declarations', 'cc.d.ts'),
        join(pathOrStub, 'bin', 'declarations', 'cc.d.ts'),
        join(pathOrStub, 'cc.d.ts'),
    ]) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }
    throw new Error(`cc_dts_not_found:${pathOrStub}`);
}

const dtsPath = resolveDts(input);
const dts = readFileSync(dtsPath, 'utf8');
const whitelist = [...new LumenComponentPropertySchema().listSupportedComponents()];
const whitelistSet = new Set(whitelist);

/** @type {Array<{ name: string, base: string }>} */
const classes = [];
{
    const re = /export\s+class\s+([A-Za-z0-9_]+)\s+extends\s+([A-Za-z0-9_$.]+)/g;
    let match;
    while ((match = re.exec(dts)) != null) {
        classes.push({ name: match[1], base: match[2] });
    }
}
const baseOf = new Map(classes.map((entry) => [entry.name, entry.base]));

/** @type {Map<string, boolean>} */
const privateIsComponent = new Map();
{
    const re =
        /(?:export\s+)?const\s+(_cocos_[A-Za-z0-9_]+):\s*new\s*\(\.\.\.args:\s*any\[\]\)\s*=>\s*([A-Za-z0-9_]+)/g;
    let match;
    while ((match = re.exec(dts)) != null) {
        const key = match[1];
        const ret = match[2];
        privateIsComponent.set(key, ret === 'Component');
    }
    // Component & IEventified mixins
    const mixinRe =
        /(?:export\s+)?const\s+(_cocos_[A-Za-z0-9_]+):\s*new\s*\(\.\.\.args:\s*any\[\]\)\s*=>\s*Component\s*&/g;
    while ((match = mixinRe.exec(dts)) != null) {
        privateIsComponent.set(match[1], true);
    }
}

/**
 * @description 是否组件继承链（排除 Asset）。
 * @param {string} shortName
 * @returns {boolean}
 */
function isNodeComponentClass(shortName) {
    let current = shortName;
    const seen = new Set();
    for (let hop = 0; hop < 40; hop += 1) {
        if (seen.has(current)) {
            return false;
        }
        seen.add(current);
        if (current === 'Asset' || current === 'BufferAsset') {
            return false;
        }
        if (current === 'Component') {
            return true;
        }
        const base = baseOf.get(current);
        if (base == null) {
            return false;
        }
        if (base === 'Component') {
            return true;
        }
        if (base === 'Asset') {
            return false;
        }
        if (base.startsWith('__private.')) {
            const key = base.slice('__private.'.length);
            return privateIsComponent.get(key) === true;
        }
        current = base;
    }
    return false;
}

const skipShort = new Set([
    'Component',
    'Joint2D',
    'Light',
    'Renderer',
    'UIRenderer',
    'ModelRenderer',
    'UIComponent',
    'ViewGroup',
    'Collider',
    'Collider2D',
    'Constraint',
    'CharacterController',
    'PostProcessSetting',
    'LabelOutline',
    'LabelShadow',
    'MissingScript',
    'PrefabLink',
    'MainMenu',
    'NewScript',
    'CameraCtrl',
    'SpriteCtrl',
    'line',
]);

/** impl short -> public short used in Prefab (__type__) */
const implToPublic = new Map([
    ['MaskComponent', 'Mask'],
    ['RichTextComponent', 'RichText'],
    ['GraphicsComponent', 'Graphics'],
]);

/** @type {Set<string>} */
const candidates = new Set();
for (const entry of classes) {
    if (skipShort.has(entry.name)) {
        continue;
    }
    if (!isNodeComponentClass(entry.name)) {
        continue;
    }
    const publicName = implToPublic.get(entry.name) ?? entry.name;
    if (skipShort.has(publicName)) {
        continue;
    }
    let typeName = `cc.${publicName}`;
    if (entry.name === 'Skeleton') {
        typeName = 'sp.Skeleton';
    }
    if (entry.name === 'ArmatureDisplay') {
        typeName = 'dragonBones.ArmatureDisplay';
    }
    // 跳过仍带 Component 后缀的废弃实现名（已映射到公开名）
    if (entry.name.endsWith('Component') && implToPublic.has(entry.name)) {
        candidates.add(typeName);
        continue;
    }
    if (entry.name.endsWith('Component') && /^(Label|Sprite|Canvas|UITransform|Button)/.test(entry.name)) {
        continue;
    }
    candidates.add(typeName);
}

const missing = [...candidates].filter((type) => !whitelistSet.has(type)).sort();
const landed = [...candidates].filter((type) => whitelistSet.has(type)).sort();
const whitelistExtra = whitelist.filter((type) => !candidates.has(type)).sort();

/** @type {Record<string, string[]>} */
const groups = {
    highValueMissing: [],
    postProcess: [],
    tiled: [],
    animation: [],
    physics: [],
    other: [],
};

for (const type of missing) {
    const short = type.replace(/^cc\./, '');
    if (/^(Bloom|DOF|FXAA|FSR|HBAO|TAA|PostProcess|ColorGrading|BlitScreen)$/.test(short)) {
        groups.postProcess.push(type);
    } else if (/^Tiled(Layer|ObjectGroup|Tile|UserNodeData)$/.test(short)) {
        groups.tiled.push(type);
    } else if (/^(AnimationController|SkinnedMeshBatchRenderer)$/.test(short)) {
        groups.animation.push(type);
    } else if (/^(SimplexCollider|IKConstraint)$/.test(short)) {
        groups.physics.push(type);
    } else if (/^(Line|LODGroup|Sorting2D|UISkew)$/.test(short)) {
        groups.highValueMissing.push(type);
    } else {
        groups.other.push(type);
    }
}

const report = {
    note: 'demo stub 仅 reference 到引擎 d.ts；本报告以可挂到 Node 的 Component 子类为准，不含 Asset。',
    input,
    resolvedDts: dtsPath,
    exportClassCount: classes.length,
    nodeComponentCandidateCount: candidates.size,
    whitelistCount: whitelist.length,
    landedCount: landed.length,
    missingCount: missing.length,
    missingByGroup: groups,
    missingAll: missing,
    whitelistNotDetectedInDtsComponentScan: whitelistExtra,
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
