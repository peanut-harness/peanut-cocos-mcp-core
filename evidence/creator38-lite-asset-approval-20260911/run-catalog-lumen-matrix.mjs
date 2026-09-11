import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const projectRoot = resolve(process.argv[2] || process.env.COCOS_PROJECT || '.');
const outDir = resolve(process.argv[3] || join(projectRoot, 'temp/qa-console/catalog-lumen'));
mkdirSync(outDir, { recursive: true });

const TZ = 'Asia/Shanghai';
const nowLocal = () => new Date().toLocaleString('sv-SE', { timeZone: TZ }) + ' UTC+8';

function readHub() {
  const p = resolve(projectRoot, '.peanut-ai/cocos-mcp.json');
  if (!existsSync(p)) throw new Error('descriptor_missing:' + p);
  return JSON.parse(readFileSync(p, 'utf8'));
}

async function hubReq(hub, body) {
  const endpoint = `${hub.endpoint}:${hub.port}/mcp`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-peanut-mcp-token': hub.token,
    },
    body: JSON.stringify({ connectionId: hub.sessionId, ...body }),
  });
  const json = await res.json().catch(() => ({ rawStatus: res.status }));
  return { httpStatus: res.status, json };
}

async function callTool(hub, name, input = {}) {
  return hubReq(hub, { action: 'call', name, input });
}

function errOf(result) {
  const j = result.json;
  return j?.error || j?.result?.error || j?.result?.message || null;
}

function isApprovalRequired(err) {
  return typeof err === 'string' && /approval_required/u.test(err);
}

function isSchemaInvalid(err) {
  return typeof err === 'string' && /schema_invalid|input_invalid/u.test(err);
}

function sliceJson(v, n = 600) {
  try { return JSON.stringify(v).slice(0, n); } catch { return String(v).slice(0, n); }
}

function pickPrefab(root) {
  const assets = resolve(root, 'assets');
  let found = null;
  function walk(dir, rel, depth) {
    if (found || depth > 5) return;
    let ents;
    try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.name.startsWith('.')) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) walk(join(dir, e.name), r, depth + 1);
      else if (!found && e.name.endsWith('.prefab')) found = `assets/${r.replace(/\\/g, '/')}`;
    }
  }
  if (existsSync(assets)) walk(assets, '', 0);
  return found;
}

async function issueLease(hub, resources, operations = [], maxRisk = 'write') {
  const res = await callTool(hub, 'peanut.editor-mcp.issue-local-approval-lease', {
    connectionId: hub.sessionId,
    resources,
    operations,
    maxRisk,
    idleLeaseMs: 120_000,
    maxHoldMs: 600_000,
  });
  const body = res.json?.result || res.json || {};
  return {
    httpStatus: res.httpStatus,
    ok: res.json?.ok === true,
    approvalId: body.approvalId || body.token || null,
    approvalToken: body.approvalToken || body.token || body.approvalId || null,
    token: body.token || body.approvalId || null,
    expiresAt: body.expiresAt || null,
    raw: body,
    error: errOf(res),
  };
}

function classifyWrite(result, expectPass) {
  const err = errOf(result);
  const okFlag = result.json?.ok === true;
  const planId = result.json?.result?.planId || null;
  if (isApprovalRequired(err)) return { verdict: expectPass ? 'FAIL' : 'REFUSED_AS_EXPECTED', error: err, executed: false, planId };
  if (typeof err === 'string' && /destructive_confirmation_required/u.test(err)) {
    return { verdict: expectPass ? 'PASS_PRODUCT_OR_BUSINESS' : 'REFUSED_AS_EXPECTED', error: err, executed: false, planId };
  }
  if (isSchemaInvalid(err)) return { verdict: 'FAIL_SCHEMA', error: err, executed: false, planId };
  if (planId && result.json?.result?.confirmationRequired) return { verdict: expectPass ? 'FAIL_PLAN_NOT_EXEC' : 'REFUSED_AS_EXPECTED', error: null, executed: false, planId };
  if (okFlag) return { verdict: expectPass ? 'PASS' : 'UNEXPECTED_PASS', error: null, executed: true, planId };
  // business / product refuse after approval gate
  if (expectPass && err) return { verdict: 'PASS_PRODUCT_OR_BUSINESS', error: err, executed: false, planId };
  return { verdict: expectPass ? 'FAIL' : 'REFUSED_OTHER', error: err, executed: false, planId };
}

function classifyRead(result) {
  const err = errOf(result);
  if (isApprovalRequired(err)) return { verdict: 'FAIL_UNEXPECTED_APPROVAL', error: err };
  if (result.json?.ok === true) return { verdict: 'PASS', error: null };
  return { verdict: 'PASS_BUSINESS_OR_UNAVAILABLE', error: err };
}

const hub0 = readHub();
const list = await hubReq(hub0, { action: 'list' });
let tools = list.json?.tools || list.json?.result?.tools || list.json?.result?.capabilities || [];
let toolNames = tools.map((t) => (typeof t === 'string' ? t : t?.name)).filter(Boolean);
if (toolNames.length < 10) {
  try {
    const hs = JSON.parse(readFileSync(resolve(projectRoot, 'peanut-plugins/runtime/host-status.json'), 'utf8'));
    toolNames = hs.tools || [];
  } catch {}
}

const catalogTools = toolNames.filter((n) => n.includes('asset-catalog') || n.includes('asset.catalog'));
const lumenTools = toolNames.filter((n) => n.includes('lumen'));

// Lite write ops (requiresLocalApproval) for catalog+lumen
const LITE_WRITE = [
  'asset.catalog.refresh',
  'lumen.scaffold', 'lumen.structure', 'lumen.nodeAdd', 'lumen.nodeRm', 'lumen.nodeRename', 'lumen.nodeReorder',
  'lumen.compAdd', 'lumen.compRm', 'lumen.compSet', 'lumen.assetSet', 'lumen.nodeSet',
  'lumen.bindClick', 'lumen.bindSprite', 'lumen.bindSpriteBatch', 'lumen.bindRef', 'lumen.bindController',
  'lumen.refresh', 'lumen.commit',
];
const LITE_READ = ['asset.catalog.summary'];

function toolNameFor(op) {
  return 'peanut.editor-mcp.' + op.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/\./g, '-').toLowerCase();
}

const existingPrefab = pickPrefab(projectRoot);
const tempPrefabRel = 'assets/__peanut_approval_smoke_tmp/SmokeRoot.prefab';
const tempFolder = 'assets/__peanut_approval_smoke_tmp';

const rows = [];
const inventory = {
  startedAtLocal: nowLocal(),
  hubPort: hub0.port,
  connectionId: hub0.sessionId,
  catalogToolsFromHub: catalogTools,
  lumenToolsFromHub: lumenTools,
  liteWriteFocus: LITE_WRITE,
  liteReadFocus: LITE_READ,
  existingPrefab,
  tempPrefabRel,
};

function pushRow(row) {
  rows.push(row);
  console.log(JSON.stringify({ op: row.operation, phase: row.phase, verdict: row.verdict, error: row.error }));
}

// ---- READ: asset.catalog.summary (+ any extra catalog reads on hub) ----
{
  const hub = readHub();
  const readOps = [
    { operation: 'asset.catalog.summary', tool: toolNameFor('asset.catalog.summary'), input: {} },
  ];
  for (const name of catalogTools) {
    if (name.endsWith('asset-catalog-summary')) continue;
    if (name.endsWith('asset-catalog-refresh')) continue; // write
    readOps.push({ operation: name.replace(/^peanut\.editor-mcp\./, ''), tool: name, input: {} });
  }
  // lumen read-like tools on hub that are not in Lite write list
  const lumenWriteTools = new Set(LITE_WRITE.map(toolNameFor));
  for (const name of lumenTools) {
    if (lumenWriteTools.has(name)) continue;
    readOps.push({ operation: name.replace(/^peanut\.editor-mcp\./, ''), tool: name, input: {} });
  }
  for (const item of readOps) {
    const t0 = Date.now();
    const res = await callTool(hub, item.tool, item.input);
    const c = classifyRead(res);
    pushRow({
      family: item.tool.includes('catalog') ? 'catalog-read' : 'lumen-read',
      operation: item.operation,
      tool: item.tool,
      phase: 'read-no-lease',
      httpStatus: res.httpStatus,
      ...c,
      ms: Date.now() - t0,
      slice: sliceJson(res.json),
      skipReason: null,
    });
  }
}

// helper to run no-lease / token / id for a write op

function collectResources(operation, input, extra = []) {
  const keys = ['resources','paths','sources','targets','dbPaths','files','path','from','to','target','targetDirectory','uuid','url','prefabRelativePath','assetRelativePath','imagePath','scenePath','nodePath','prefabPath','parentPath','scriptRelativePath','buttonNodePath','targetNodePath','platform'];
  const out = new Set();
  const push = (v) => {
    if (typeof v === 'string' && v.trim()) out.add(v.trim().replace(/\\/g, '/'));
    else if (Array.isArray(v)) v.forEach(push);
    else if (v && typeof v === 'object' && typeof v.path === 'string') push(v.path);
  };
  for (const k of keys) push(input?.[k]);
  for (const e of extra) push(e);
  if (out.size === 0) {
    const domain = String(operation).split('.')[0];
    if (domain === 'scene') out.add('scene:active');
    else if (domain === 'asset' || domain === 'lumen' || domain === 'prefab') out.add('db://assets');
    else if (domain === 'preview') out.add('preview');
    else if (domain === 'builder') out.add('builder');
    else out.add('editor');
  }
  // always allow assets root for lumen/catalog safety
  if (String(operation).startsWith('lumen.') || String(operation).startsWith('asset.')) out.add('db://assets');
  return [...out];
}

async function runWriteMatrix(operation, tool, baseInput, resources, opts = {}) {
  const { skipLeaseExec = null, maxRisk = 'write', aliasSplit = 'both' } = opts;
  resources = collectResources(operation, baseInput, resources || []);
  // 1) no lease
  {
    const hub = readHub();
    const t0 = Date.now();
    const res = await callTool(hub, tool, { ...baseInput });
    const c = classifyWrite(res, false);
    pushRow({
      family: operation.startsWith('asset.catalog') ? 'catalog-write' : 'lumen-write',
      operation, tool, phase: 'no-lease', httpStatus: res.httpStatus, ...c,
      ms: Date.now() - t0, slice: sliceJson(res.json), skipReason: null,
    });
  }
  if (skipLeaseExec) {
    pushRow({
      family: operation.startsWith('asset.catalog') ? 'catalog-write' : 'lumen-write',
      operation, tool, phase: 'with-lease-approvalToken', verdict: 'SKIP', error: null, executed: false,
      httpStatus: null, ms: null, slice: null, skipReason: skipLeaseExec,
    });
    pushRow({
      family: operation.startsWith('asset.catalog') ? 'catalog-write' : 'lumen-write',
      operation, tool, phase: 'with-lease-approvalId', verdict: 'SKIP', error: null, executed: false,
      httpStatus: null, ms: null, slice: null, skipReason: skipLeaseExec,
    });
    return;
  }
  // 2) lease + approvalToken only
  if (aliasSplit === 'both' || aliasSplit === 'token') {
    const hub = readHub();
    const lease = await issueLease(hub, resources, [], maxRisk);
    if (!lease.ok || !lease.approvalToken) {
      pushRow({
        family: operation.startsWith('asset.catalog') ? 'catalog-write' : 'lumen-write',
        operation, tool, phase: 'with-lease-approvalToken', verdict: 'FAIL_LEASE_ISSUE',
        error: lease.error || 'lease_issue_failed', executed: false, httpStatus: lease.httpStatus,
        ms: null, slice: sliceJson(lease.raw), skipReason: null,
      });
    } else {
      const t0 = Date.now();
      const res = await callTool(hub, tool, { ...baseInput, approvalToken: lease.approvalToken });
      const c = classifyWrite(res, true);
      pushRow({
        family: operation.startsWith('asset.catalog') ? 'catalog-write' : 'lumen-write',
        operation, tool, phase: 'with-lease-approvalToken', httpStatus: res.httpStatus, ...c,
        ms: Date.now() - t0, slice: sliceJson(res.json), skipReason: null,
        leaseFields: { hasApprovalToken: !!lease.approvalToken, hasApprovalId: !!lease.approvalId },
      });
    }
  }
  // 3) lease + approvalId only
  if (aliasSplit === 'both' || aliasSplit === 'id') {
    const hub = readHub();
    const lease = await issueLease(hub, resources, [], maxRisk);
    if (!lease.ok || !lease.approvalId) {
      pushRow({
        family: operation.startsWith('asset.catalog') ? 'catalog-write' : 'lumen-write',
        operation, tool, phase: 'with-lease-approvalId', verdict: 'FAIL_LEASE_ISSUE',
        error: lease.error || 'lease_issue_failed', executed: false, httpStatus: lease.httpStatus,
        ms: null, slice: sliceJson(lease.raw), skipReason: null,
      });
    } else {
      const t0 = Date.now();
      const res = await callTool(hub, tool, { ...baseInput, approvalId: lease.approvalId });
      const c = classifyWrite(res, true);
      pushRow({
        family: operation.startsWith('asset.catalog') ? 'catalog-write' : 'lumen-write',
        operation, tool, phase: 'with-lease-approvalId', httpStatus: res.httpStatus, ...c,
        ms: Date.now() - t0, slice: sliceJson(res.json), skipReason: null,
        leaseFields: { hasApprovalToken: !!lease.approvalToken, hasApprovalId: !!lease.approvalId },
      });
    }
  }
}

// ---- WRITE catalog.refresh ----
await runWriteMatrix(
  'asset.catalog.refresh',
  toolNameFor('asset.catalog.refresh'),
  {},
  ['db://assets'],
);

// ---- WRITE lumen.refresh / commit (low risk) ----
await runWriteMatrix('lumen.refresh', toolNameFor('lumen.refresh'), {}, ['db://assets']);
await runWriteMatrix('lumen.commit', toolNameFor('lumen.commit'), {}, ['db://assets']);

// ---- scaffold temp prefab once with token, then id path on another op ----
{
  const hub = readHub();
  // no-lease scaffold
  await runWriteMatrix(
    'lumen.scaffold',
    toolNameFor('lumen.scaffold'),
    { prefabRelativePath: tempPrefabRel, rootName: 'SmokeRoot', template: 'empty', autoCommit: true },
    [tempPrefabRel, 'db://assets', tempFolder],
    { aliasSplit: 'token' }, // first create with token
  );
  // ensure exists: if token pass failed, try id
  const scaffoldPass = rows.some((r) => r.operation === 'lumen.scaffold' && r.phase.startsWith('with-lease') && (r.verdict === 'PASS' || r.verdict === 'PASS_PRODUCT_OR_BUSINESS'));
  if (!scaffoldPass) {
    await runWriteMatrix(
      'lumen.scaffold',
      toolNameFor('lumen.scaffold'),
      { prefabRelativePath: tempPrefabRel, rootName: 'SmokeRoot', template: 'empty', autoCommit: true },
      [tempPrefabRel, 'db://assets', tempFolder],
      { aliasSplit: 'id' },
    );
  } else {
    // still record id phase for scaffold on a different temp? use same path reset=true for id
    await runWriteMatrix(
      'lumen.scaffold',
      toolNameFor('lumen.scaffold'),
      { prefabRelativePath: tempPrefabRel, rootName: 'SmokeRoot', template: 'empty', autoCommit: true, reset: true },
      [tempPrefabRel, 'db://assets', tempFolder],
      { aliasSplit: 'id' },
    );
  }
}

const prefabForOps = tempPrefabRel;
const nodeParent = '/SmokeRoot';

// structure - may need recipe; attempt minimal
await runWriteMatrix(
  'lumen.structure',
  toolNameFor('lumen.structure'),
  { prefabRelativePath: prefabForOps, parentPath: nodeParent, recipe: { type: 'empty' }, autoCommit: true },
  [prefabForOps, 'db://assets'],
);

await runWriteMatrix(
  'lumen.nodeAdd',
  toolNameFor('lumen.nodeAdd'),
  { prefabRelativePath: prefabForOps, parentPath: nodeParent, template: 'empty', name: 'ChildA', autoCommit: true },
  [prefabForOps, 'db://assets'],
);

await runWriteMatrix(
  'lumen.nodeRename',
  toolNameFor('lumen.nodeRename'),
  { prefabRelativePath: prefabForOps, nodePath: '/SmokeRoot/ChildA', name: 'ChildB', autoCommit: true },
  [prefabForOps, 'db://assets'],
);

await runWriteMatrix(
  'lumen.nodeReorder',
  toolNameFor('lumen.nodeReorder'),
  { prefabRelativePath: prefabForOps, parentPath: nodeParent, childName: 'ChildB', index: 0, autoCommit: true },
  [prefabForOps, 'db://assets'],
);

await runWriteMatrix(
  'lumen.nodeSet',
  toolNameFor('lumen.nodeSet'),
  { prefabRelativePath: prefabForOps, nodePath: '/SmokeRoot/ChildB', props: { active: true }, autoCommit: true },
  [prefabForOps, 'db://assets'],
);

await runWriteMatrix(
  'lumen.compAdd',
  toolNameFor('lumen.compAdd'),
  { prefabRelativePath: prefabForOps, nodePath: '/SmokeRoot/ChildB', builtinType: 'cc.UITransform', autoCommit: true },
  [prefabForOps, 'db://assets'],
);

await runWriteMatrix(
  'lumen.compSet',
  toolNameFor('lumen.compSet'),
  { prefabRelativePath: prefabForOps, nodePath: '/SmokeRoot/ChildB', componentType: 'cc.UITransform', props: { contentSize: { width: 100, height: 40 } }, autoCommit: true },
  [prefabForOps, 'db://assets'],
);

await runWriteMatrix(
  'lumen.assetSet',
  toolNameFor('lumen.assetSet'),
  { prefabRelativePath: prefabForOps, props: {}, autoCommit: true },
  [prefabForOps, 'db://assets'],
);

// binds that need richer scene graph — still attempt; business errors OK after gate
await runWriteMatrix(
  'lumen.bindSprite',
  toolNameFor('lumen.bindSprite'),
  { prefabRelativePath: prefabForOps, nodePath: '/SmokeRoot/ChildB', spriteFrameUuid: '00000000-0000-0000-0000-000000000000', autoCommit: true },
  [prefabForOps, 'db://assets'],
);

await runWriteMatrix(
  'lumen.bindSpriteBatch',
  toolNameFor('lumen.bindSpriteBatch'),
  { prefabRelativePath: prefabForOps, bindings: [{ nodePath: '/SmokeRoot/ChildB', spriteFrameUuid: '00000000-0000-0000-0000-000000000000' }], autoCommit: true },
  [prefabForOps, 'db://assets'],
);

await runWriteMatrix(
  'lumen.bindClick',
  toolNameFor('lumen.bindClick'),
  { prefabRelativePath: prefabForOps, buttonNodePath: '/SmokeRoot/ChildB', targetNodePath: '/SmokeRoot', component: 'cc.Button', handler: 'onClick', autoCommit: true },
  [prefabForOps, 'db://assets'],
);

await runWriteMatrix(
  'lumen.bindRef',
  toolNameFor('lumen.bindRef'),
  { prefabRelativePath: prefabForOps, nodePath: '/SmokeRoot', componentType: 'cc.Node', field: 'x', nodeRef: '/SmokeRoot/ChildB', autoCommit: true },
  [prefabForOps, 'db://assets'],
);

await runWriteMatrix(
  'lumen.bindController',
  toolNameFor('lumen.bindController'),
  { prefabRelativePath: prefabForOps, scriptRelativePath: 'assets/__missing_controller.ts', className: 'MissingCtrl', propertyBindings: {}, autoCommit: true },
  [prefabForOps, 'db://assets', 'assets/__missing_controller.ts'],
);

// destructive-ish on temp only
await runWriteMatrix(
  'lumen.compRm',
  toolNameFor('lumen.compRm'),
  { prefabRelativePath: prefabForOps, nodePath: '/SmokeRoot/ChildB', componentType: 'cc.UITransform', autoCommit: true },
  [prefabForOps, 'db://assets'],
  { maxRisk: 'destructive' },
);

await runWriteMatrix(
  'lumen.nodeRm',
  toolNameFor('lumen.nodeRm'),
  { prefabRelativePath: prefabForOps, nodePath: '/SmokeRoot/ChildB', autoCommit: true },
  [prefabForOps, 'db://assets'],
  { maxRisk: 'destructive' },
);

// cleanup temp folder via asset.delete if available (not primary focus but rollback)
{
  const hub = readHub();
  const lease = await issueLease(hub, [tempFolder, 'db://assets', tempPrefabRel], ['asset.delete'], 'destructive');
  if (lease.ok) {
    const res = await callTool(hub, 'peanut.editor-mcp.asset-delete', {
      paths: [tempFolder],
      approvalToken: lease.approvalToken,
      confirmDestructive: true,
    });
    pushRow({
      family: 'cleanup',
      operation: 'asset.delete',
      tool: 'peanut.editor-mcp.asset-delete',
      phase: 'cleanup-temp',
      httpStatus: res.httpStatus,
      ...classifyWrite(res, true),
      ms: null,
      slice: sliceJson(res.json),
      skipReason: null,
      note: 'rollback temp scaffold folder',
    });
  }
}

// secondary scene sample (createNode no-lease + token)
{
  await runWriteMatrix(
    'scene.createNode',
    toolNameFor('scene.createNode'),
    { name: '__peanut_catalog_lumen_scene_tmp', parentPath: 'Scene' },
    ['scene:active'],
    { aliasSplit: 'token' },
  );
  // cleanup via soft reload
  const hub = readHub();
  const lease = await issueLease(hub, ['scene:active'], ['scene.reload'], 'write');
  if (lease.ok) {
    const res = await callTool(hub, toolNameFor('scene.reload'), { soft: true, approvalId: lease.approvalId });
    pushRow({
      family: 'scene-sample-cleanup',
      operation: 'scene.reload',
      tool: toolNameFor('scene.reload'),
      phase: 'with-lease-approvalId',
      httpStatus: res.httpStatus,
      ...classifyWrite(res, true),
      ms: null,
      slice: sliceJson(res.json),
      skipReason: null,
    });
  }
}

inventory.finishedAtLocal = nowLocal();
inventory.rowCount = rows.length;

const summary = {
  inventory,
  counts: {
    PASS: rows.filter((r) => r.verdict === 'PASS').length,
    REFUSED_AS_EXPECTED: rows.filter((r) => r.verdict === 'REFUSED_AS_EXPECTED').length,
    PASS_PRODUCT_OR_BUSINESS: rows.filter((r) => r.verdict === 'PASS_PRODUCT_OR_BUSINESS').length,
    PASS_BUSINESS_OR_UNAVAILABLE: rows.filter((r) => r.verdict === 'PASS_BUSINESS_OR_UNAVAILABLE').length,
    FAIL: rows.filter((r) => String(r.verdict).startsWith('FAIL')).length,
    SKIP: rows.filter((r) => r.verdict === 'SKIP').length,
  },
  // approval gate regressions: no-lease must refuse; lease token/id must not be approval_required/schema_invalid
  gateChecks: rows.filter((r) => r.phase === 'no-lease' || r.phase.startsWith('with-lease')).map((r) => ({
    operation: r.operation,
    phase: r.phase,
    verdict: r.verdict,
    error: r.error,
    okGate:
      r.phase === 'no-lease'
        ? r.verdict === 'REFUSED_AS_EXPECTED' && isApprovalRequired(r.error || '')
        : r.verdict === 'SKIP' || (!isApprovalRequired(r.error || '') && !isSchemaInvalid(r.error || '') && r.verdict !== 'FAIL_LEASE_ISSUE' && r.verdict !== 'FAIL_SCHEMA'),
  })),
  rows,
};

writeFileSync(join(outDir, 'CATALOG-LUMEN-APPROVAL-MATRIX.json'), JSON.stringify(summary, null, 2), 'utf8');

// markdown table
const md = [];
md.push('# catalog + lumen 审批别名复验表');
md.push('');
md.push(`时间：${inventory.startedAtLocal} → ${inventory.finishedAtLocal}`);
md.push(`Hub：:${inventory.hubPort} connectionId=${inventory.connectionId}`);
md.push('');
md.push('## 清单（Lite focus + Hub 暴露）');
md.push('');
md.push(`- Lite 写：${LITE_WRITE.join(', ')}`);
md.push(`- Lite 读：${LITE_READ.join(', ')}`);
md.push(`- Hub catalog tools：${catalogTools.join(', ') || '(none)'}`);
md.push(`- Hub lumen tools：${lumenTools.join(', ') || '(none)'}`);
md.push('');
md.push('## 结果计数');
md.push('');
md.push('```json');
md.push(JSON.stringify(summary.counts, null, 2));
md.push('```');
md.push('');
md.push('## 明细表');
md.push('');
md.push('| family | operation | phase | verdict | error | skipReason |');
md.push('|---|---|---|---|---|---|');
for (const r of rows) {
  const err = (r.error || '').toString().replace(/\|/g, '\\|').slice(0, 120);
  const skip = (r.skipReason || '').toString().replace(/\|/g, '\\|').slice(0, 80);
  md.push(`| ${r.family} | ${r.operation} | ${r.phase} | ${r.verdict} | ${err} | ${skip} |`);
}
md.push('');
const gateFail = summary.gateChecks.filter((g) => !g.okGate);
md.push(`## 门禁回归失败数：${gateFail.length}`);
if (gateFail.length) {
  md.push('```json');
  md.push(JSON.stringify(gateFail, null, 2));
  md.push('```');
}
writeFileSync(join(outDir, 'CATALOG-LUMEN-APPROVAL-MATRIX-zh.md'), md.join('\n'), 'utf8');
console.log(JSON.stringify({ ok: true, outDir, counts: summary.counts, gateFail: gateFail.length, rows: rows.length }, null, 2));
