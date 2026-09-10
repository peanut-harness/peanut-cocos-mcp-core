import assert from "assert/strict";
import test from "node:test";

import { CreatorPhaseResolver } from "../src/cocos/creator-phase.js";

test("CreatorPhaseResolver maps roadmap boundaries", (): void => {
    assert.equal(CreatorPhaseResolver.resolvePhase("2.4.0"), "creator_2x");
    assert.equal(CreatorPhaseResolver.resolvePhase("2.4.11"), "creator_2x");
    assert.equal(CreatorPhaseResolver.resolvePhase("3.0.0"), "creator_3x_early");
    assert.equal(CreatorPhaseResolver.resolvePhase("3.5.2"), "creator_3x_early");
    assert.equal(CreatorPhaseResolver.resolvePhase("3.6.0"), "editor_api_stable");
    assert.equal(CreatorPhaseResolver.resolvePhase("3.8.7"), "editor_api_stable");
    assert.throws(() => CreatorPhaseResolver.resolvePhase("3.9.0"), /unsupported_cocos_creator_version/);
    assert.throws(() => CreatorPhaseResolver.resolvePhase("2.3.9"), /unsupported_cocos_creator_version/);
});
