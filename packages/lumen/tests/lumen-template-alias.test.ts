import assert from "node:assert/strict";
import test from "node:test";

import { LumenTemplateAlias } from "../source/templates/template-alias.js";

test("LumenTemplateAlias maps renderer/windows widgets to ui/*", (): void => {
    assert.equal(LumenTemplateAlias.normalize("renderer/windows/Button"), "ui/Button");
    assert.equal(LumenTemplateAlias.normalize("renderer/windows/Label.prefab"), "ui/Label");
    assert.equal(LumenTemplateAlias.normalize("ui/Sprite"), "ui/Sprite");
});

test("LumenTemplateAlias leaves nested renderer paths unchanged", (): void => {
    assert.equal(
        LumenTemplateAlias.normalize("renderer/windows/core/windows/builtin-dialogs"),
        "renderer/windows/core/windows/builtin-dialogs",
    );
});
