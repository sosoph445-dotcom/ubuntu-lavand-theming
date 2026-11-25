import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const EFFECT_NAME = 'lavender-app-center';

const LavenderAppCenterEffect = GObject.registerClass({
    GTypeName: 'LavenderAppCenterEffect',
}, class LavenderAppCenterEffect extends Clutter.ShaderEffect {
    vfunc_get_static_shader_source() {
        return `
            uniform sampler2D tex;
            void main() {
                vec4 color = texture2D(tex, cogl_tex_coord_in[0].st);
                if (color.a > 0.0) {
                    vec3 rgb = color.rgb / color.a;
                    float low = min(rgb.r, min(rgb.g, rgb.b));
                    float high = max(rgb.r, max(rgb.g, rgb.b));
                    // Restrict the tint to dark, nearly neutral surfaces. Fade it
                    // out for colorful artwork and brighter text and icons.
                    float neutral = 1.0 - smoothstep(0.015, 0.10, high - low);
                    float dark = 1.0 - smoothstep(0.23, 0.42, high);
                    float strength = neutral * dark;
                    vec3 plum = rgb * vec3(1.03, 0.96, 1.10)
                        + vec3(0.012, 0.003, 0.022);
                    rgb = mix(rgb, clamp(plum, 0.0, 1.0), strength);
                    color.rgb = rgb * color.a;
                }
                cogl_color_out = color * cogl_color_in;
            }
        `;
    }
    vfunc_paint_target(...args) {
        this.set_uniform_value('tex', 0);
        super.vfunc_paint_target(...args);
    }
});

export default class LavenderAppCenter extends Extension {
    enable() {
        this._windows = new Map();
        this._created = global.display.connect('window-created', (_display, window) => this._watch(window));
        this._mapped = global.window_manager.connect('map', (_manager, actor) => this._apply(actor.get_meta_window()));
        for (const actor of global.get_window_actors()) this._watch(actor.get_meta_window());
    }
    _watch(window) {
        if (!window || this._windows.has(window)) return;
        const changed = window.connect('notify::wm-class', () => this._apply(window));
        const unmanaged = window.connect('unmanaged', () => this._forget(window));
        this._windows.set(window, [changed, unmanaged]);
        this._apply(window);
    }
    _apply(window) {
        if (!window) return;
        const actor = window.get_compositor_private();
        if (!actor) return;
        const wmClass = (window.get_wm_class() || '').toLowerCase();
        const match = wmClass === 'snap-store' || wmClass === 'io.snapcraft.snap-store';
        const effect = actor.get_effect(EFFECT_NAME);
        if (match && !effect) actor.add_effect_with_name(EFFECT_NAME, new LavenderAppCenterEffect());
        else if (!match && effect) actor.remove_effect_by_name(EFFECT_NAME);
    }
    _forget(window) {
        const handlers = this._windows.get(window);
        if (!handlers) return;
        for (const id of handlers) window.disconnect(id);
        this._windows.delete(window);
    }
    disable() {
        global.display.disconnect(this._created);
        global.window_manager.disconnect(this._mapped);
        for (const actor of global.get_window_actors()) actor.remove_effect_by_name(EFFECT_NAME);
        for (const window of this._windows.keys()) this._forget(window);
    }
}
