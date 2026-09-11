import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('D:/peanut-workspace/peanut-pod-lite-wt-smoke-ab/packages/cocos-creator-lite-host-extension/package.json');
const { CpmPackageStore } = require('./src/cpm-package-store.js');
const out = 'D:/peanut-workspace/peanut-pod-lite-wt-smoke-ab/evidence/creator38-lite-gateway-fix-20260911/cpm-verify.json';
try {
  const store = new CpmPackageStore('D:/workspaces/peanut-agents/test-demos/cocos-for-agent');
  const pkg = store.resolveActivePackage('peanut.pod-lite', true);
  const result = { ok: true, id: pkg.manifest.id, version: pkg.manifest.version, packagePath: pkg.packagePath, mainPath: pkg.mainPath };
  writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} catch (e) {
  const result = { ok: false, error: String(e?.message || e) };
  writeFileSync(out, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  process.exit(1);
}
