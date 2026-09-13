'use strict';

exports.template = `
<div style="padding:12px;font-family:sans-serif;">
  <h3>Peanut Diagnose (Creator 3.0–3.5)</h3>
  <p>early3x MVP 宿主。silent-asset / lumen 需实机重测后升级 supportLevel。</p>
  <pre id="out">尚未查询</pre>
  <ui-button id="btn">Refresh diagnose</ui-button>
</div>
`;

exports.$ = {
    out: '#out',
    btn: '#btn',
};

exports.ready = async function ready() {
    const refresh = async () => {
        try {
            const result = await Editor.Message.request('peanut-pod-35', 'query-diagnose');
            this.$.out.innerText = JSON.stringify(result, null, 2);
        } catch (error) {
            this.$.out.innerText = error instanceof Error ? error.message : String(error);
        }
    };
    this.$.btn.addEventListener('confirm', () => {
        void refresh();
    });
    await refresh();
};
