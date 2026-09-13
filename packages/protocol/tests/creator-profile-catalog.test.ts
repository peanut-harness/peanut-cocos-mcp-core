import assert from 'node:assert/strict';
import test from 'node:test';

import { CREATOR_PROFILE_DEFINITIONS } from '../src/index.js';

test('Creator profile catalog keeps ordered non-overlapping ranges', () => {
    assert.deepEqual(
        CREATOR_PROFILE_DEFINITIONS.map((profile) => profile.id),
        ['creator-24', 'creator-30-35', 'creator-36-37', 'creator-38'],
    );
    for (let index = 1; index < CREATOR_PROFILE_DEFINITIONS.length; index += 1) {
        assert.equal(
            CREATOR_PROFILE_DEFINITIONS[index - 1].maxVersionExclusive,
            CREATOR_PROFILE_DEFINITIONS[index].minVersion,
        );
    }
});

test('write-enabled Creator versions always have verification evidence', () => {
    for (const profile of CREATOR_PROFILE_DEFINITIONS) {
        for (const version of profile.writeEnabledVersions) {
            assert.ok(profile.verifiedVersions.includes(version));
        }
    }
});
