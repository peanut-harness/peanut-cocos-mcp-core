import assert from "assert/strict";
import test from "node:test";

import { CreatorPhaseResolver } from "../src/cocos/creator-phase.js";
import { ProductLineMcpPolicy } from "../src/mcp/product-line-mcp-policy.js";

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

test("ProductLineMcpPolicy refuses Pro-only operations on every Lite phase", (): void => {
    for (const phase of ["creator_2x", "creator_3x_early", "editor_api_stable"] as const) {
        assert.equal(ProductLineMcpPolicy.decide(phase, "preview.capture"), "refuse");
        assert.equal(ProductLineMcpPolicy.decide(phase, "snowb.bmfont.export"), "refuse");
        assert.equal(
            ProductLineMcpPolicy.refuseError(phase, "preview.capture"),
            "product_line_mcp_refused:pro_exclusive:preview.capture",
        );
    }
});
