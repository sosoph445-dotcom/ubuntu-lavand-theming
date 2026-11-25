import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class LavenderHaven extends Extension {
    enable() {
        this._alive = true;
        this._levels = Array(32).fill(0);
        this._pending = new Uint8Array(0);
        this._cancel = new Gio.Cancellable();
        this._box = new St.BoxLayout({vertical: true, reactive: false, width: 440,
            style: 'spacing: 12px;', x_align: Clutter.ActorAlign.CENTER});
        this._label = new St.Label({text: '', x_align: Clutter.ActorAlign.CENTER,
            style: 'color: #e3d6ef; font-size: 15px; font-weight: 300; text-shadow: 0 2px 5px #17131d;'});
        this._area = new St.DrawingArea({width: 360, height: 45, x_align: Clutter.ActorAlign.CENTER});
        this._area.connect('repaint', area => {
            const cr = area.get_context();
            const [w,h] = area.get_surface_size();
            for (let i=0; i<32; i++) {
                const height = 2 + this._levels[i] * (h-3);
                cr.setSourceRGBA(0.725, 0.627, 0.867, 0.65);
                cr.rectangle(i*w/32+2, h-height, w/32-5, height);
                cr.fill();
            }
            cr.$dispose();
        });
        this._box.add_child(this._label);
        this._box.add_child(this._area);
        // A background actor stays beneath ordinary application windows.
        Main.layoutManager._backgroundGroup.add_child(this._box);
        this._place = () => {
            const m = Main.layoutManager.primaryMonitor;
            if (m) this._box.set_position(m.x+(m.width-440)/2, m.y+m.height-180);
        };
        this._place();
        this._monitorSignal = Main.layoutManager.connect('monitors-changed', this._place);
        const phrases = ['a little slower, a little softer.', 'you are allowed to feel at home.',
            'let the evening hold you.', 'small steps. warm light. enough.',
            'there is room here to simply be.', 'rest is part of the rhythm.',
            'the moon keeps quiet company.', 'make a little space for wonder.'];
        let phrase = Math.floor(Math.random()*phrases.length);
        const next = () => {this._label.set_text(phrases[phrase++ % phrases.length]); return GLib.SOURCE_CONTINUE;};
        next();
        this._phraseTimer = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, 300, next);
        this._drawTimer = GLib.timeout_add(GLib.PRIORITY_LOW, 80, () => {
            this._levels = this._levels.map(v => v*0.83);
            this._area.queue_repaint(); return GLib.SOURCE_CONTINUE;
        });
        this._startAudio();
        this._retryTimer = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, 20, () => {
            if (!this._proc) this._startAudio();
            return GLib.SOURCE_CONTINUE;
        });
    }
    _startAudio() {
        if (!this._alive || !GLib.find_program_in_path('ffmpeg')) return;
        try {
            const proc = Gio.Subprocess.new(['ffmpeg','-nostdin','-hide_banner','-loglevel','error',
                '-f','pulse','-i','@DEFAULT_MONITOR@','-ac','1','-ar','8000','-f','s16le','pipe:1'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE);
            this._proc = proc;
            proc.wait_async(null, (p,r) => {
                try {p.wait_finish(r);} catch (_) {}
                if (this._proc === proc) this._proc = null;
            });
            const stream = proc.get_stdout_pipe();
            const read = () => {
                if (!this._alive || this._proc !== proc) return;
                stream.read_bytes_async(2048, GLib.PRIORITY_LOW, this._cancel, (s,r) => {
                    try {
                        const data=s.read_bytes_finish(r).get_data();
                        if (!data.length || !this._alive) return;
                        const joined=new Uint8Array(this._pending.length+data.length);
                        joined.set(this._pending); joined.set(data,this._pending.length);
                        const n=512, bytes=n*2;
                        if (joined.length>=bytes) {
                            const offset=Math.floor(joined.length/bytes)*bytes-bytes;
                            const view=new DataView(joined.buffer,offset,bytes);
                            const samples=Array.from({length:n},(_,i)=>view.getInt16(i*2,true)/32768 * (0.5-0.5*Math.cos(2*Math.PI*i/(n-1))));
                            for(let b=0;b<32;b++) {
                                const k=Math.max(1,Math.round(Math.pow(220,b/31)));
                                let re=0,im=0;
                                for(let i=0;i<n;i++) {const a=2*Math.PI*k*i/n; re+=samples[i]*Math.cos(a); im-=samples[i]*Math.sin(a);}
                                const level=Math.min(1,Math.sqrt(Math.hypot(re,im)/n)*4);
                                this._levels[b]=Math.max(this._levels[b]*0.7,level);
                            }
                        }
                        this._pending=joined.slice(Math.floor(joined.length/bytes)*bytes);
                        read();
                    } catch (_) { /* Cancellation or audio server restart. */ }
                });
            };
            read();
        } catch (e) {console.warn(`Lavender Haven audio: ${e.message}`);}
    }
    disable() {
        this._alive=false;
        this._cancel?.cancel();
        for(const key of ['_phraseTimer','_drawTimer','_retryTimer']) {
            if(this[key]) GLib.Source.remove(this[key]);
            this[key]=0;
        }
        if(this._monitorSignal) Main.layoutManager.disconnect(this._monitorSignal);
        this._monitorSignal=0;
        this._proc?.force_exit(); this._proc=null;
        this._box?.destroy(); this._box=null;
        this._area=null; this._label=null; this._cancel=null;
    }
}
