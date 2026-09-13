import assert from 'node:assert/strict';
import test from 'node:test';

import { LumenRecipeMemoryCompiler } from '../source/hierarchy/recipe-memory-compiler';

test('LumenRecipeMemoryCompiler replaceRoot writes Label string', (): void => {
    const compiled = new LumenRecipeMemoryCompiler().compile({
        prefabRelativePath: 'assets/ui/Demo.prefab',
        rootName: 'DesignUi',
        mode: 'replaceRoot',
        recipe: {
            name: 'Title',
            components: ['cc.UITransform', 'cc.Label'],
            componentProps: {
                'cc.Label': { string: 'Hi' },
            },
        },
    });
    const label = compiled.entries.find((entry) => entry.__type__ === 'cc.Label');
    assert.equal(label?._string, 'Hi');
});

test('LumenRecipeMemoryCompiler Label default string is empty', (): void => {
    const compiled = new LumenRecipeMemoryCompiler().compile({
        prefabRelativePath: 'assets/ui/Demo.prefab',
        rootName: 'DesignUi',
        mode: 'replaceRoot',
        recipe: {
            name: 'Title',
            components: ['cc.UITransform', 'cc.Label'],
        },
    });
    const label = compiled.entries.find((entry) => entry.__type__ === 'cc.Label');
    assert.equal(label?._string, '');
});

test('LumenRecipeMemoryCompiler appendChildren treats template empty as components', (): void => {
    const compiled = new LumenRecipeMemoryCompiler().compile({
        prefabRelativePath: 'assets/ui/Demo.prefab',
        rootName: 'Root',
        mode: 'appendChildren',
        recipes: [{ name: 'Child', template: 'empty' }],
    });
    const child = compiled.entries.find((entry) => entry.__type__ === 'cc.Node' && entry._name === 'Child');
    assert.ok(child != null);
});

test('LumenRecipeMemoryCompiler rejects replaceRoot non-empty template', (): void => {
    assert.throws(
        () =>
            new LumenRecipeMemoryCompiler().compile({
                prefabRelativePath: 'assets/ui/Demo.prefab',
                rootName: 'DesignUi',
                mode: 'replaceRoot',
                recipe: {
                    name: 'Root',
                    template: 'ui/Button',
                },
            }),
        /lumen_root_template_unsupported/,
    );
});
