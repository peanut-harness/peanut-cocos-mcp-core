'use strict';

/**
 * @description Creator 2.4 panel：诊断只读；IPC 使用 event.reply 约定。
 */
Editor.Panel.extend({
    style: ':host { margin: 8px; } .hint { color: #9aa; font-size: 12px; }',
    template: [
        '<h3>Peanut Diagnose (Creator 2.4)</h3>',
        '<p>MVP：只读诊断。写盘 / lumen.commit / silent-asset 未开通。</p>',
        '<p class="hint">菜单：Packages → Peanut Diagnose；IPC <code>peanut-pod-24:query-diagnose</code>。</p>',
        '<pre id="out">尚未查询</pre>',
        '<ui-button id="btn">Refresh diagnose</ui-button>',
    ].join(''),
    ready() {
        const out = this.shadowRoot.getElementById('out');
        const btn = this.shadowRoot.getElementById('btn');
        const refresh = () => {
            Editor.Ipc.sendToMain('peanut-pod-24:query-diagnose', (error, result) => {
                out.textContent = error ? String(error.message || error) : JSON.stringify(result, null, 2);
            });
        };
        btn.addEventListener('confirm', refresh);
        refresh();
    },
});
