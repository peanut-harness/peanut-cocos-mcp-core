import assert from 'node:assert/strict';
import test from 'node:test';

import { LumenScriptPropertyExtractor } from '../source/hierarchy/script-property-extractor';

test('script property extractor maps ProbeButton-like fields', (): void => {
    const source = `
import { _decorator, Component, Node, Label, CCInteger } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ProbeButton')
export class ProbeButton extends Component {
    @property
    public labelText: string = 'probe';

    @property({ type: [CCInteger] })
    public scores: number[] = [];

    @property({ type: [Node] })
    public targets: Node[] = [];

    @property({ type: [Label] })
    public labels: Label[] = [];

    @property({ type: SpriteFrame })
    public icon = null;

    @property({ serializable: false })
    public scratch: number = 0;

    @property({ type: SomeCustom })
    public custom = null;
}
`;
    const result = LumenScriptPropertyExtractor.extractFromSource(source);
    assert.equal(result.className, 'ProbeButton');
    assert.deepEqual(
        result.fields.map((field) => field.apiName),
        ['labelText', 'scores', 'targets', 'labels', 'icon'],
    );
    assert.equal(result.fields.find((field) => field.apiName === 'labelText')?.kind, 'string');
    assert.equal(result.fields.find((field) => field.apiName === 'scores')?.kind, 'numberList');
    assert.equal(result.fields.find((field) => field.apiName === 'targets')?.kind, 'nodeRefList');
    const labels = result.fields.find((field) => field.apiName === 'labels');
    assert.equal(labels?.kind, 'componentRefList');
    assert.equal(labels?.refComponentType, 'cc.Label');
    assert.equal(result.fields.find((field) => field.apiName === 'icon')?.kind, 'uuid');
    assert.equal(
        result.skipped.some((item) => item.name === 'scratch' && item.reason === 'serializable_false'),
        true,
    );
    assert.equal(
        result.skipped.some((item) => item.name === 'custom' && item.reason === 'unsupported_type'),
        true,
    );
});

test('script property extractor supports bare @property(Type)', (): void => {
    const result = LumenScriptPropertyExtractor.extractFromSource(`
@ccclass('Bare')
export class Bare extends Component {
  @property(Node)
  public target: Node | null = null;

  @property(CCFloat)
  public speed = 1;
}
`);
    assert.equal(result.fields.find((field) => field.apiName === 'target')?.kind, 'nodeRef');
    assert.equal(result.fields.find((field) => field.apiName === 'speed')?.kind, 'number');
});

test('script property extractor maps schema component aliases such as ScrollBar', (): void => {
    const result = LumenScriptPropertyExtractor.extractFromSource(`
@ccclass('Bars')
export class Bars extends Component {
  @property(ScrollBar)
  public bar: ScrollBar | null = null;
}
`);
    const bar = result.fields.find((field) => field.apiName === 'bar');
    assert.equal(bar?.kind, 'componentRef');
    assert.equal(bar?.refComponentType, 'cc.ScrollBar');
});

test('script property extractor maps custom component refs when resolver provided', (): void => {
    const result = LumenScriptPropertyExtractor.extractFromSource(
        `
@ccclass('RichTextFxTestHost')
export class RichTextFxTestHost extends Component {
  @property(PeanutRichTextView)
  public chatSample: PeanutRichTextView | null = null;
}
`,
        {
            resolveCustomComponentType: (simpleName) =>
                simpleName === 'PeanutRichTextView' ? '00f8cLjW6VLQq50AhGf6KfP' : undefined,
        },
    );
    const chatSample = result.fields.find((field) => field.apiName === 'chatSample');
    assert.equal(chatSample?.kind, 'componentRef');
    assert.equal(chatSample?.refComponentType, '00f8cLjW6VLQq50AhGf6KfP');
});
