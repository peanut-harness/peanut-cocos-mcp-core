
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
const projectRoot = resolve("D:\\mcp-test");
const packagePath = resolve("D:\\peanut-workspace\\peanut-pod-lite-wt-smoke-ab\\packages\\mcp-pod-lite-creator-host\\release\\peanut.pod-lite-0.1.0");
const evidenceDir = resolve("D:\\peanut-workspace\\peanut-pod-lite-wt-smoke-ab\\evidence\\creator38-lite-quiet-asset-ops-20260912");
const packagingDist = resolve("D:\\peanut-workspace\\peanut-pod-lite-wt-smoke-ab\\packages\\packaging\\dist\\index.js");
mkdirSync(evidenceDir, { recursive: true });
const { PackagingApp } = await import(pathToFileURL(packagingDist).href);
const app = new PackagingApp({ projectPath: projectRoot });
const inspect = await app.inspect(packagePath);
const validation = await app.validate(packagePath);
let installResult = null, installError = null;
if (validation.ok) {
  try { installResult = await app.install(packagePath); }
  catch (e) { installError = String(e?.stack || e?.message || e); }
}
const installedPath = join(projectRoot, "peanut-plugins", "installed.json");
const installed = existsSync(installedPath) ? JSON.parse(readFileSync(installedPath, "utf8")) : null;
const report = { at: new Date().toISOString(), projectRoot, packagePath, inspect, validation, installResult, installError, installedIndex: installed };
writeFileSync(join(evidenceDir, "02-cpm-install-result.json"), JSON.stringify(report, null, 2), "utf8");
console.log(JSON.stringify({ ok: !installError && validation.ok && installResult != null, pluginId: installResult?.pluginId, installPath: installResult?.installPath, installError }, null, 2));
