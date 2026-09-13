import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { FileAssetDependencyIndex } from "../src/file-asset-dependency-index.ts";
import { SerializedAssetReferenceScanner } from "../src/serialized-asset-reference-scanner.ts";

/**
 * @description 写入最小层级 prefab。
 * @param root 工程根。
 * @param relativePath 相对路径。
 * @param uuid prefab uuid。
 * @param spriteUuid spriteFrame uuid。
 * @returns 无。
 */
function writeHierarchyPrefab(
  root: string,
  relativePath: string,
  uuid: string,
  spriteUuid: string,
): void {
  const absolute = join(root, relativePath);
  mkdirSync(join(absolute, ".."), { recursive: true });
  writeFileSync(
    absolute,
    `${JSON.stringify(
      [
        { __type__: "cc.Prefab", _name: "Panel", data: { __id__: 1 } },
        {
          __type__: "cc.Node",
          _name: "Panel",
          _children: [{ __id__: 2 }],
          _components: [],
        },
        {
          __type__: "cc.Node",
          _name: "Icon",
          _children: [],
          _components: [{ __id__: 3 }],
        },
        {
          __type__: "cc.Sprite",
          _name: "",
          _spriteFrame: { __uuid__: spriteUuid },
        },
      ],
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    `${absolute}.meta`,
    `${JSON.stringify({ uuid, importer: "prefab", files: [".json"], subMetas: {} }, null, 2)}\n`,
  );
}

test("SerializedAssetReferenceScanner finds missing uuids and referencing nodes", (): void => {
  const root = mkdtempSync(join(tmpdir(), "peanut-ref-scan-"));
  mkdirSync(join(root, "assets"), { recursive: true });
  const missingUuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const prefabUuid = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  writeHierarchyPrefab(root, "assets/ui/Panel.prefab", prefabUuid, missingUuid);
  FileAssetDependencyIndex.invalidate(root);
  const scanner = new SerializedAssetReferenceScanner();
  const missing = scanner.scanMissing(root, { limit: 20 });
  assert.equal(
    missing.hits.some((hit) => hit.uuid === missingUuid),
    true,
  );
  const nodes = scanner.findReferencingNodes(root, {
    uuid: missingUuid,
    assetPath: "assets/ui/Panel.prefab",
  });
  assert.equal(nodes.hits.length >= 1, true);
  assert.equal(nodes.hits[0]?.nodePath.includes("/Panel/Icon"), true);
  assert.equal(nodes.hits[0]?.componentType, "cc.Sprite");
  assert.equal(nodes.hits[0]?.referencedUuid, missingUuid);
});

test("SerializedAssetReferenceScanner missingOnly + nodeNameContains filters", (): void => {
  const root = mkdtempSync(join(tmpdir(), "peanut-ref-missing-"));
  mkdirSync(join(root, "assets"), { recursive: true });
  const missingUuid = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  writeHierarchyPrefab(
    root,
    "assets/ui/Broken.prefab",
    "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    missingUuid,
  );
  FileAssetDependencyIndex.invalidate(root);
  const scanner = new SerializedAssetReferenceScanner();
  const allMissing = scanner.findReferencingNodes(root, {
    missingOnly: true,
    limit: 20,
  });
  assert.equal(allMissing.missingOnly, true);
  assert.ok(allMissing.hits.some((hit) => hit.referencedUuid === missingUuid));
  const byName = scanner.findReferencingNodes(root, {
    missingOnly: true,
    nodeNameContains: "Icon",
    limit: 20,
  });
  assert.ok(
    byName.hits.every((hit) => hit.nodePath.toLowerCase().includes("icon")),
  );
  const byUuid = scanner.findReferencingNodes(root, {
    missingOnly: true,
    uuid: missingUuid,
    nodePathContains: "/Panel/Icon",
    limit: 20,
  });
  assert.equal(byUuid.hits.length >= 1, true);
  assert.equal(byUuid.hits[0]?.referencedUuid, missingUuid);
});
