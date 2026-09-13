import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import test from 'node:test';

import { CreatorProcessDiscovery, resolveCreatorContext } from '../dist/index.js';

test('resolves the four Creator compatibility profiles', () => {
  assert.equal(resolveCreatorContext('2.4.11').profileId, 'creator-24');
  assert.equal(resolveCreatorContext('3.5.2').profileId, 'creator-30-35');
  assert.equal(resolveCreatorContext('3.7.4').profileId, 'creator-36-37');
  assert.equal(resolveCreatorContext('3.8.7').profileId, 'creator-38');
});

test('only exact host-verified Creator builds enable writes', () => {
  assert.equal(resolveCreatorContext('3.8.7', '3.8.7').writesAllowed, true);
  assert.equal(resolveCreatorContext('3.8.6', '3.8.6').writesAllowed, false);
  assert.equal(resolveCreatorContext('3.8.7', '3.8.6').writesAllowed, false);
  assert.equal(resolveCreatorContext('3.7.4').writesAllowed, false);
});

test('missing and unsupported versions fail closed', () => {
  assert.throws(() => resolveCreatorContext(''), /creator_version_unavailable/);
  assert.throws(() => resolveCreatorContext('3.9.0'), /unsupported_cocos_creator_version/);
});

test('discovers Creator project processes on Windows and resolves platform binaries', () => {
  const projectPath = 'D:/workspaces/demo/proj';
  const normalizedProjectPath = resolve(projectPath);
  const processList = [
    `111 C:\\ProgramData\\cocos\\editors\\Creator\\3.8.7\\CocosCreator.exe --nologin --project ${normalizedProjectPath}`,
    `222 C:\\ProgramData\\cocos\\editors\\Creator\\3.8.7\\CocosCreator.exe --type=renderer --project ${normalizedProjectPath}`,
  ].join('\n');
  assert.deepEqual(CreatorProcessDiscovery.parseProjectProcessIds(processList, projectPath), [111]);
  assert.match(CreatorProcessDiscovery.resolveDefaultBinary('win32', {}), /CocosCreator\.exe$/u);
  assert.match(CreatorProcessDiscovery.resolveDefaultBinary('darwin', {}), /MacOS\/CocosCreator$/u);
});
