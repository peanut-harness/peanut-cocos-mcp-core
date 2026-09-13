'use strict';

/**
 * @description Creator 2.4 scene-script：运行在场景进程，可调用 `_Scene.loadSceneByUuid`。
 * 由宿主扩展 `package.json#scene-script` 注册；插件侧经 `Editor.Scene.callSceneScript` 调用。
 */
module.exports = {
    /**
     * @description 按 UUID 打开 `.fire` 场景。
     * @param { { reply?: (error: Error | null, result?: unknown) => void } } event IPC 事件
     * @param {string} uuid 场景资源 UUID
     * @returns {void}
     */
    'load-scene-by-uuid'(event, uuid) {
        const reply = (error, result) => {
            if (typeof event.reply === 'function') {
                event.reply(error, result);
            }
        };
        if (typeof uuid !== 'string' || uuid.trim().length === 0) {
            reply(new Error('peanut_pod_24_load_scene_uuid_invalid'));
            return;
        }
        const load = typeof _Scene !== 'undefined' ? _Scene.loadSceneByUuid : null;
        if (typeof load !== 'function') {
            reply(new Error('peanut_pod_24_load_scene_host_unavailable:_Scene.loadSceneByUuid'));
            return;
        }
        try {
            load.call(_Scene, uuid.trim(), (error) => {
                if (error != null) {
                    reply(error instanceof Error ? error : new Error(String(error)));
                    return;
                }
                reply(null, { ok: true, uuid: uuid.trim() });
            });
        } catch (error) {
            reply(error instanceof Error ? error : new Error(String(error)));
        }
    },
};
