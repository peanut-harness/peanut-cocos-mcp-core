import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const documentPath = resolve(import.meta.dirname, '../specs/creator-profiles/creator-profiles.json');
const document = JSON.parse(readFileSync(documentPath, 'utf8'));
const expectedIds = ['creator-24', 'creator-30-35', 'creator-36-37', 'creator-38'];
const ids = document.profiles?.map((profile) => profile.id) ?? [];

if (document.schemaVersion !== 1 || JSON.stringify(ids) !== JSON.stringify(expectedIds)) {
  throw new Error('creator_profile_catalog_invalid');
}
for (const profile of document.profiles) {
  if (profile.support !== 'full' && profile.writesAllowed === true) {
    throw new Error(`unverified_profile_writes_enabled:${profile.id}`);
  }
  if (profile.support === 'full' && profile.verifiedVersions.length === 0) {
    throw new Error(`full_profile_without_evidence:${profile.id}`);
  }
}
process.stdout.write(`${JSON.stringify({ ok: true, profiles: ids }, null, 2)}\n`);
