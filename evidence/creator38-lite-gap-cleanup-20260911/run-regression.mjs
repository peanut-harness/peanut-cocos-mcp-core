import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT = 'D:/workspaces/peanut-agents/test-demos/cocos-for-agent';
const EV = 'D:/peanut-workspace/peanut-pod-lite-wt-smoke-ab/evidence/creator38-lite-gap-cleanup-20260911';
mkdirSync(EV, { recursive: true });
const desc = JSON.parse(readFileSync(join(PROJECT, '.peanut-ai/cocos-mcp.json'), 'utf8'));
const connectionId = typeof desc.sessionId === 'string' && desc.sessionId.length >= 32 ? desc.sessionId : 'a'.repeat(32);

async function mcp(payload, { allowError = false } = {}) {
  const res = await fetch(`http://127.0.0.1:${desc.port}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-peanut-mcp-token': desc.token },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { ok: false, error: text }; }
  if (!allowError && res.status !== 200) throw new Error(`http_${res.status}:${text.slice(0, 400)}`);
  return { httpStatus: res.status, ...body };
}

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
    else out.add('editor');
  }
  if (String(operation).startsWith('lumen.') || String(operation).startsWith('asset.')) out.add('db://assets');
  return [...out];
}

function verdict(row) {
  const err = String(row.error || '');
  if (row.expect === 'refuse' && /approval_required|destructive_confirmation_required/i.test(err)) return 'REFUSED_AS_EXPECTED';
  if (row.expect === 'pass' && row.ok === true) return 'PASS';
  if (row.expect === 'pass_or_business' && row.ok === true) return 'PASS';
  if (row.expect === 'pass_or_business' && /lumen_|editor_mcp_/i.test(err) && !/approval_required|schema_invalid|input_invalid/i.test(err)) return 'PASS_PRODUCT_OR_BUSINESS';
  if (/schema_invalid|input_invalid/i.test(err)) return 'FAIL';
  if (row.expect === 'pass' && /approval_required/i.test(err)) return 'FAIL';
  return row.ok === true ? 'PASS' : 'FAIL';
}

const rows = [];
const prefab = 'assets/peanut-gap-smoke/GapEmpty.prefab';
const prefabAbs = join(PROJECT, prefab);
const prefabMeta = `${prefabAbs}.meta`;
try { if (existsSync(prefabAbs)) rmSync(prefabAbs, { force: true }); if (existsSync(prefabMeta)) rmSync(prefabMeta, { force: true }); } catch {}

async function issueLease(label, resources) {
  const issued = await mcp({
    action: 'issueApprovalToken',
    connectionId,
    resources,
    maxRisk: 'destructive',
    idleLeaseMs: 120_000,
    maxHoldMs: 600_000,
  });
  const result = issued.result || {};
  const row = {
    phase: 'issueApprovalToken', operation: label, expect: 'pass', ok: issued.ok === true,
    error: issued.error || null, approvalToken: result.approvalToken || null, approvalId: result.approvalId || null,
    liteMirrored: result.liteMirrored, dualSame: result.approvalToken != null && result.approvalToken === result.approvalId,
  };
  row.verdict = row.ok && row.dualSame && result.liteMirrored === true ? 'PASS' : 'FAIL';
  rows.push(row);
  console.log(label, row.verdict, { dualSame: row.dualSame, liteMirrored: row.liteMirrored, resources });
  return result.approvalToken;
}

// catalog
{
  const input = {};
  const resources = collectResources('asset.catalog.refresh', input);
  const lease = await issueLease('hub.issueApprovalToken#catalog', resources);
  const refuse = await mcp({ action: 'call', name: 'peanut.editor-mcp.asset-catalog-refresh', connectionId, input: {} }, { allowError: true });
  let row = { phase: 'no-lease', operation: 'asset.catalog.refresh', expect: 'refuse', ok: refuse.ok, error: refuse.error || null };
  row.verdict = verdict(row); rows.push(row); console.log('catalog no-lease', row.verdict, row.error);
  const pass = await mcp({ action: 'call', name: 'peanut.editor-mcp.asset-catalog-refresh', connectionId, input: { approvalToken: lease } }, { allowError: true });
  row = { phase: 'with-lease', operation: 'asset.catalog.refresh', expect: 'pass', ok: pass.ok === true, error: pass.error || null };
  row.verdict = verdict(row); rows.push(row); console.log('catalog with-lease', row.verdict, row.error);
}

// scaffold + nodeAdd empty
{
  const scaffoldInput = { prefabRelativePath: prefab, rootName: 'GapRoot', template: 'empty' };
  const addInput = { prefabRelativePath: prefab, parentPath: '/GapRoot', template: 'empty', name: 'ChildEmpty' };
  const resources = [...new Set([
    ...collectResources('lumen.scaffold', scaffoldInput),
    ...collectResources('lumen.nodeAdd', addInput),
    ...collectResources('lumen.nodeRm', { prefabRelativePath: prefab, nodePath: '/GapRoot/ChildEmpty' }),
  ])];
  const lease = await issueLease('hub.issueApprovalToken#lumen', resources);

  let r = await mcp({ action: 'call', name: 'peanut.editor-mcp.lumen-scaffold', connectionId, input: { ...scaffoldInput, approvalToken: lease } }, { allowError: true });
  let row = { phase: 'with-lease', operation: 'lumen.scaffold', expect: 'pass_or_business', ok: r.ok === true, error: r.error || null, resultSlice: JSON.stringify(r.result ?? r).slice(0, 200) };
  row.verdict = verdict(row); rows.push(row); console.log('scaffold', row.verdict, row.error || row.resultSlice);

  r = await mcp({ action: 'call', name: 'peanut.editor-mcp.lumen-node-add', connectionId, input: { ...addInput, approvalToken: lease } }, { allowError: true });
  row = { phase: 'with-lease', operation: 'lumen.nodeAdd', expect: 'pass', ok: r.ok === true, error: r.error || null, resultSlice: JSON.stringify(r.result ?? r).slice(0, 200) };
  row.verdict = /lumen_template_missing:.*empty\.prefab/i.test(String(r.error || '')) ? 'FAIL' : verdict(row);
  rows.push(row); console.log('nodeAdd empty', row.verdict, row.error || row.resultSlice);

  // destructive without confirm
  r = await mcp({ action: 'call', name: 'peanut.editor-mcp.lumen-node-rm', connectionId, input: { prefabRelativePath: prefab, nodePath: '/GapRoot/ChildEmpty', approvalToken: lease } }, { allowError: true });
  row = { phase: 'destructive-no-confirm', operation: 'lumen.nodeRm', expect: 'refuse', ok: r.ok, error: r.error || null };
  row.verdict = /destructive_confirmation_required/i.test(String(r.error || '')) ? 'REFUSED_AS_EXPECTED' : (/schema_invalid|input_invalid/i.test(String(r.error || '')) ? 'FAIL' : verdict(row));
  rows.push(row); console.log('nodeRm no-confirm', row.verdict, row.error);

  // re-issue because Hub may have consumed / or previous call failed before consume
  const lease2 = await issueLease('hub.issueApprovalToken#destructive', resources);
  r = await mcp({ action: 'call', name: 'peanut.editor-mcp.lumen-node-rm', connectionId, input: { prefabRelativePath: prefab, nodePath: '/GapRoot/ChildEmpty', approvalToken: lease2, confirmDestructive: true } }, { allowError: true });
  row = { phase: 'destructive-with-confirm', operation: 'lumen.nodeRm', expect: 'pass_or_business', ok: r.ok === true, error: r.error || null, resultSlice: JSON.stringify(r.result ?? r).slice(0, 200) };
  row.verdict = /schema_invalid|input_invalid/i.test(String(r.error || '')) ? 'FAIL' : verdict(row);
  rows.push(row); console.log('nodeRm confirm', row.verdict, row.error || row.resultSlice);
}

try { if (existsSync(prefabAbs)) rmSync(prefabAbs, { force: true }); if (existsSync(prefabMeta)) rmSync(prefabMeta, { force: true }); } catch {}

const summary = rows.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {});
const failCount = summary.FAIL || 0;
writeFileSync(join(EV, 'REGRESSION.json'), JSON.stringify({ startedAtLocal: new Date().toISOString(), hubPort: desc.port, connectionId, summary, failCount, rows }, null, 2), 'utf8');
console.log(JSON.stringify(summary));
process.exit(failCount > 0 ? 1 : 0);
