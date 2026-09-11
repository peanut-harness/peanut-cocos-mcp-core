import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
const projectRoot = resolve(process.argv[2]);
const evidenceDir = resolve(process.argv[3]);
mkdirSync(evidenceDir, { recursive: true });
const descPath = join(projectRoot, '.peanut-ai/cocos-mcp.json');
function readHub() {
  return JSON.parse(readFileSync(descPath, 'utf8'));
}
async function hubReq(hub, body) {
  const res = await fetch(`${hub.endpoint}:${hub.port}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-peanut-mcp-token': hub.token },
    body: JSON.stringify({ connectionId: hub.sessionId, ...body }),
  });
  return { httpStatus: res.status, json: await res.json().catch(() => ({ rawStatus: res.status })) };
}
async function callOp(hub, operation) {
  for (const name of ['peanut.editor-mcp.query', 'peanut.editor-mcp.call']) {
    const res = await hubReq(hub, { action: 'call', name, input: { operation, input: {} } });
    if (res.json?.ok === true) return { ok: true, via: name, slice: JSON.stringify(res.json).slice(0, 400) };
    if (res.json?.ok === false && !/unknown|not found/i.test(String(res.json?.error || ''))) {
      return { ok: false, via: name, error: res.json?.error || res.json?.result?.error || null, slice: JSON.stringify(res.json).slice(0, 400) };
    }
  }
  return { ok: false, error: 'all_routes_failed' };
}
const polls = [];
let ready = false;
let toolsCount = null;
let lastStatus = null;
const deadline = Date.now() + 240000;
while (Date.now() < deadline) {
  try {
    if (!existsSync(descPath)) {
      polls.push({ at: new Date().toISOString(), error: 'descriptor_missing' });
    } else {
      const hub = readHub();
      const status = await hubReq(hub, { action: 'status' });
      const list = await hubReq(hub, { action: 'list' });
      const tools = list.json?.tools || list.json?.result?.tools || [];
      toolsCount = tools.length;
      lastStatus = status.json;
      const readyFlag = status.json?.result?.ready ?? status.json?.ready;
      const row = { at: new Date().toISOString(), http: status.httpStatus, ready: readyFlag, ok: status.json?.ok, toolsCount, slice: JSON.stringify(status.json).slice(0, 1000) };
      polls.push(row);
      writeFileSync(join(evidenceDir, 'query-status-latest.json'), JSON.stringify({ status: status.json, toolsCount, listOk: list.json?.ok }, null, 2));
      if (readyFlag === true || (status.json?.ok === true && toolsCount >= 70)) {
        ready = true;
        break;
      }
    }
  } catch (e) {
    polls.push({ at: new Date().toISOString(), error: String(e?.message || e) });
  }
  await new Promise((r) => setTimeout(r, 4000));
}
writeFileSync(join(evidenceDir, 'query-status-polls.json'), JSON.stringify(polls, null, 2));
const report = { ready, toolsCount, startedSmokeAt: new Date().toISOString(), rows: [] };
if (!ready) {
  report.blocker = 'host_not_ready';
  writeFileSync(join(evidenceDir, 'readonly-smoke.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ready: false, toolsCount, polls: polls.length }, null, 2));
  process.exit(2);
}
const ops = ['editor.queryVersion','editor.queryProject','editor.querySelection','scene.getCurrent','scene.getHierarchy','builder.queryPlatforms','builder.querySchema','builder.queryDefaultConfig','preview.query'];
for (const op of ops) {
  const hub = readHub();
  const t0 = Date.now();
  const result = await callOp(hub, op);
  report.rows.push({ operation: op, ms: Date.now() - t0, ...result });
  console.log(`[smoke] ${op} ok=${result.ok}`);
}
report.finishedAt = new Date().toISOString();
report.pass = report.rows.filter((r) => r.ok).length;
report.fail = report.rows.filter((r) => !r.ok).length;
writeFileSync(join(evidenceDir, 'readonly-smoke.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ready: true, toolsCount, pass: report.pass, fail: report.fail }, null, 2));
process.exit(report.fail ? 1 : 0);
