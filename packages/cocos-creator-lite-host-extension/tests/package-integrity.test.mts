import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const require = createRequire(import.meta.url);

test('integrity verification accepts native Windows paths and rejects tampering or unchecked entries', () => {
    const root = mkdtempSync(join(tmpdir(), 'pod-lite-integrity-'));
    try {
        const main = 'module.exports = {};';
        writeFileSync(join(root, 'main.js'), main);
        const digest = createHash('sha256').update(main).digest('hex');
        const manifest = {
            id: 'peanut.pod-lite',
            main: './main.js',
            package: { files: [{ path: 'main.js', digest }], digest: createHash('sha256').update(`main.js:${digest}`).digest('hex') },
        };
        const manifestPath = join(root, 'peanut.pod-lite.manifest.json');
        writeFileSync(manifestPath, JSON.stringify(manifest));
        const verify = () =>
            runInNewContext(`${source}\nverifyPackage(packagePath);`, { require, module: { exports: {} }, packagePath: root });
        assert.doesNotThrow(verify);
        writeFileSync(join(root, 'main.js'), 'tampered');
        assert.throws(verify, /integrity_file_mismatch/u);
        writeFileSync(join(root, 'main.js'), main);
        writeFileSync(join(root, 'unchecked.js'), main);
        writeFileSync(manifestPath, JSON.stringify({ ...manifest, main: './unchecked.js' }));
        assert.throws(verify, /entry_not_integrity_checked/u);
        writeFileSync(manifestPath, JSON.stringify({ ...manifest, main: '../main.js' }));
        assert.throws(verify, /integrity_file_missing/u);
        writeFileSync(manifestPath, JSON.stringify({ ...manifest, main: 'C:\\outside.js' }));
        assert.throws(verify, /integrity_path_invalid/u);
        mkdirSync(join(root, 'nested'));
        writeFileSync(manifestPath, JSON.stringify({ ...manifest, main: './nested/../main.js' }));
        assert.doesNotThrow(verify);
    } finally {
        rmSync(root, { recursive: true, force: true });
    }
});
