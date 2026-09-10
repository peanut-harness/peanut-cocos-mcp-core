import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { Lumen24Session } from '../dist/lumen-24-session.js';

test('Lumen24 hierarchy CRUD: add/rename/set/remove', () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'lumen24-crud-'));
    try {
        const session = new Lumen24Session(projectRoot);
        const prefab = session.scaffoldPrefab({
            prefabRelativePath: 'assets/crud/Root.prefab',
            rootName: 'Root',
        });
        assert.equal(prefab, 'assets/crud/Root.prefab');
        session.addEmptyChild('Root', 'ChildA');
        session.addEmptyChild('Root', 'ChildB');
        session.reorderChild('Root', 'ChildB', 0);
        assert.equal(session.inspectTree().children[0]?.name, 'ChildB');
        session.setNodeProps('Root/ChildA', { x: 12, y: -4, active: true, opacity: 200 });
        const renamed = session.renameNode('Root/ChildA', 'ChildC');
        assert.equal(renamed, 'Root/ChildC');
        session.removeNode('Root/ChildC');
        assert.equal(session.inspectTree().children.length, 1);
        assert.equal(session.inspectTree().children[0]?.name, 'ChildB');
    } finally {
        rmSync(projectRoot, { recursive: true, force: true });
    }
});
