import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup?version=3.0';
import Pango from 'gi://Pango';
import Cairo from 'cairo';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class LavenderPlayer extends Extension {
    enable() {
        this._alive = true;
        this._cancel = new Gio.Cancellable();
        this._player = null;
        this._settings = this.getSettings();
        this._box = new St.BoxLayout({vertical:true, reactive:true, width:336, style:'background-color: rgba(33,30,41,0.88); border: 1px solid rgba(185,160,221,0.35); border-radius: 18px; padding: 15px 18px; spacing: 5px;'});
        this._title = new St.Label({text:'', style:'color: #e6dfee; font-weight: bold; font-size: 14px;'});
        this._artist = new St.Label({text:'', style:'color: #b9a0dd; font-size: 12px;'});
        this._box.add_child(this._title); this._box.add_child(this._artist);
        this._timing = new St.Label({text:'', style:'color: #b9a0dd; font-size: 11px; padding-top: 2px;'});
        this._box.add_child(this._timing);
        this._defaultEllipsize = [this._title, this._artist, this._timing].map(label => label.clutter_text.ellipsize);
        const row = new St.BoxLayout({x_align:Clutter.ActorAlign.CENTER, style:'spacing: 18px; padding-top: 5px;'});
        for (const [icon, method] of [['media-skip-backward-symbolic','Previous'],['media-playback-start-symbolic','PlayPause'],['media-skip-forward-symbolic','Next']]) {
            const button = new St.Button({reactive:true, can_focus:true, style_class:'lavender-player-button', child:new St.Icon({icon_name:icon, icon_size:20})});
            button.connect('clicked', () => this._call(method));
            if (method === 'PlayPause') this._playIcon = button.child;
            row.add_child(button);
        }
        this._box.add_child(row);
        this._controls = row;
        this._header = new St.BoxLayout({style: 'spacing: 14px;'});
        this._details = new St.BoxLayout({vertical: true, y_align: Clutter.ActorAlign.CENTER, style: 'spacing: 5px;'});
        this._art = new St.Icon({icon_size: 88, y_align: Clutter.ActorAlign.CENTER, style: 'border-radius: 10px;'});
        this._header.add_child(this._art);
        this._header.add_child(this._details);
        this._lyrics = new St.Label({style: 'color: #e6dfee; font-size: 12px; padding-top: 8px;'});
        this._lyrics.clutter_text.line_wrap = true;
        this._lyrics.width = 285;
        this._lyricsScroll = new St.ScrollView({height: 180, overlay_scrollbars: true});
        const lyricsContent = new St.BoxLayout({vertical: true});
        lyricsContent.add_child(this._lyrics);
        this._lyricsScroll.set_child(lyricsContent);
        this._box.add_child(this._lyricsScroll);
        this._art.hide(); this._lyricsScroll.hide();
        this._trackBox = new St.BoxLayout({vertical: true, width: 336, style: 'background-color: rgba(33,30,41,0.88); border: 1px solid rgba(185,160,221,0.35); border-radius: 18px; padding: 15px 18px; spacing: 5px;'});
        this._trackBox.add_child(new St.Label({text: 'Playlist', style: 'color: #e6dfee; font-weight: bold; font-size: 14px;'}));
        this._tracks = new St.BoxLayout({vertical: true, style: 'spacing: 5px;'});
        const trackScroll = new St.ScrollView({height: 200, overlay_scrollbars: true});
        trackScroll.set_child(this._tracks);
        this._trackBox.add_child(trackScroll);
        Main.layoutManager._backgroundGroup.add_child(this._trackBox);
        this._trackBox.hide();
        this._http = new Soup.Session();
        this._artSerial = 0;
        this._trackSerial = 0;
        Main.layoutManager._backgroundGroup.add_child(this._box);
        this._place = () => {
            const m = Main.layoutManager.primaryMonitor;
            if (!m) return;
            const corner = this._settings.get_string('corner');
            const x = corner.endsWith('right') ? m.x + m.width - 35 - this._box.width : m.x + 35;
            const y = corner.startsWith('top') ? m.y + 70 : m.y + m.height - 250;
            this._box.set_position(x, y);
            const trackX = corner.endsWith('right') ? x - 350 : x + 350;
            this._trackBox.set_position(Math.max(m.x, Math.min(trackX, m.x + m.width - 336)), y);
        };
        this._settingsChanged = this._settings.connect('changed::corner', this._place);
        this._advancedChanged = this._settings.connect('changed::advanced-visualization', () => {
            this._clearAdvanced();
            this._applyLayout();
            this._refresh();
        });
        this._waveChanged = this._settings.connect('changed::audio-wave', () => this._configureWave());
        this._configureWave();
        this._applyLayout();
        this._place(); this._monitor = Main.layoutManager.connect('monitors-changed',this._place);
        this._box.hide(); this._refresh();
        this._timer = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {this._refresh(); return GLib.SOURCE_CONTINUE;});
    }
    _configureWave() {
        this._stopWave();
        if (!this._settings.get_boolean('audio-wave')) return;
        this._wave = new St.DrawingArea({reactive: false});
        this._wave.connect('repaint', area => {
            const cr = area.get_context();
            const [w, h] = area.get_surface_size();
            const values = this._waveValues || [];
            // Follow a rounded path outside the card, with a soft layered halo.
            if (values.length && w > 50 && h > 50) {
                const radius = 19;
                const left = 10, top = 10, right = w - 10, bottom = h - 10;
                const straightX = right - left - 2 * radius;
                const straightY = bottom - top - 2 * radius;
                const arc = Math.PI * radius / 2;
                const lengths = [straightX, arc, straightY, arc, straightX, arc, straightY, arc];
                const perimeter = lengths.reduce((a, b) => a + b, 0);
                const path = () => {
                    const points = 192;
                    for (let i = 0; i <= points; i++) {
                        let d = perimeter * i / points;
                        let segment = 0;
                        while (segment < 7 && d > lengths[segment]) d -= lengths[segment++];
                        let x, y, nx, ny;
                        if (segment === 0) { x = left + radius + d; y = top; nx = 0; ny = -1; }
                        else if (segment === 2) { x = right; y = top + radius + d; nx = 1; ny = 0; }
                        else if (segment === 4) { x = right - radius - d; y = bottom; nx = 0; ny = 1; }
                        else if (segment === 6) { x = left; y = bottom - radius - d; nx = -1; ny = 0; }
                        else {
                            const angle = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][(segment - 1) / 2] + d / radius;
                            const cx = segment === 1 || segment === 3 ? right - radius : left + radius;
                            const cy = segment === 1 || segment === 7 ? top + radius : bottom - radius;
                            nx = Math.cos(angle); ny = Math.sin(angle);
                            x = cx + radius * nx; y = cy + radius * ny;
                        }
                        const sample = values[Math.floor(i * values.length / points) % values.length] || 0;
                        // Outward displacement keeps the effect away from the contents.
                        const offset = 1 + Math.min(5, Math.abs(sample) * 7);
                        x += nx * offset; y += ny * offset;
                        if (i === 0) cr.moveTo(x, y); else cr.lineTo(x, y);
                    }
                    cr.closePath();
                };
                for (const [width, alpha] of [[10, 0.035], [6, 0.07], [3, 0.16], [1.2, 0.72]]) {
                    path(); cr.setSourceRGBA(0.79, 0.68, 0.92, alpha);
                    cr.setLineWidth(width); cr.setLineJoin(Cairo.LineJoin.ROUND); cr.stroke();
                }
            }
            cr.$dispose();
        });
        // A sibling above the card keeps the line visible without intercepting clicks.
        Main.layoutManager._backgroundGroup.add_child(this._wave);
        this._wavePositionId = this._box.connect('notify::allocation', () => this._syncWave());
        this._waveVisibleId = this._box.connect('notify::visible', () => this._syncWave());
        this._syncWave();
        try {
            this._waveProcess = Gio.Subprocess.new(['python3', GLib.build_filenamev([this.path, 'audio-wave.py'])],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE);
            this._waveInput = new Gio.DataInputStream({base_stream: this._waveProcess.get_stdout_pipe()});
            this._waveCancel = new Gio.Cancellable();
            this._readWave(this._waveInput, this._waveCancel);
        } catch (e) { logError(e, 'Lavender player audio wave could not start'); }
    }
    _syncWave() {
        if (!this._wave) return;
        this._wave.set_position(this._box.x - 10, this._box.y - 10);
        this._wave.set_size(this._box.width + 20, this._box.height + 20);
        this._wave.visible = this._box.visible;
    }
    _readWave(input, cancel) {
        input.read_line_async(GLib.PRIORITY_DEFAULT, cancel, (stream, result) => {
            try {
                const [line] = stream.read_line_finish_utf8(result);
                if (line === null || cancel.is_cancelled()) return;
                this._waveValues = line.split(',').map(Number);
                this._wave?.queue_repaint();
                this._readWave(input, cancel);
            } catch (e) {
                if (!cancel.is_cancelled()) logError(e, 'Lavender player audio wave stopped');
            }
        });
    }
    _stopWave() {
        this._waveCancel?.cancel(); this._waveCancel = null;
        this._waveProcess?.send_signal(15); this._waveProcess = null;
        this._waveInput = null; this._waveValues = null;
        if (this._wavePositionId) this._box.disconnect(this._wavePositionId);
        if (this._waveVisibleId) this._box.disconnect(this._waveVisibleId);
        this._wavePositionId = 0; this._waveVisibleId = 0;
        this._wave?.destroy(); this._wave = null;
    }
    _applyLayout() {
        const advanced = this._settings.get_boolean('advanced-visualization');
        [this._title, this._artist, this._timing].forEach((label, index) => {
            label.get_parent()?.remove_child(label);
            label.width = advanced ? 185 : -1;
            label.clutter_text.ellipsize = advanced ? Pango.EllipsizeMode.END : this._defaultEllipsize[index];
        });
        if (advanced) {
            this._details.add_child(this._title);
            this._details.add_child(this._artist);
            this._details.add_child(this._timing);
            this._box.insert_child_at_index(this._header, 0);
        } else {
            if (this._header.get_parent()) this._box.remove_child(this._header);
            this._box.insert_child_at_index(this._title, 0);
            this._box.insert_child_at_index(this._artist, 1);
            this._box.insert_child_at_index(this._timing, 2);
        }
    }
    _call(method) {
        if (!this._player) return;
        Gio.DBus.session.call(this._player,'/org/mpris/MediaPlayer2','org.mpris.MediaPlayer2.Player',method,null,null,Gio.DBusCallFlags.NONE,2000,this._cancel,()=>{});
    }
    _formatTime(microseconds) {
        const seconds = Math.max(0, Math.floor(Number(microseconds) / 1000000));
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor(seconds / 60) % 60;
        const remainder = String(seconds % 60).padStart(2, '0');
        return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${remainder}` : `${minutes}:${remainder}`;
    }
    _clearAdvanced() {
        this._artSerial++; this._trackSerial++;
        this._artUrl = null; this._trackKey = null;
        this._art.hide(); this._lyricsScroll.hide(); this._trackBox.hide();
        this._tracks.destroy_all_children();
    }
    _updateAdvanced(player, meta) {
        if (!this._settings.get_boolean('advanced-visualization')) return;
        const lyrics = meta['xesam:asText']?.deep_unpack();
        if (typeof lyrics === 'string' && lyrics.trim()) {
            this._lyrics.set_text(lyrics.slice(0, 3000));
            this._lyricsScroll.show();
        } else this._lyricsScroll.hide();
        const url = meta['mpris:artUrl']?.deep_unpack() || '';
        if (url !== this._artUrl) {
            this._artUrl = url;
            const serial = ++this._artSerial;
            this._art.hide();
            if (url.startsWith('file://')) {
                this._art.gicon = Gio.FileIcon.new(Gio.File.new_for_uri(url));
                this._art.show();
            } else if (url.startsWith('https://') || url.startsWith('http://')) {
                try {
                    const message = Soup.Message.new('GET', url);
                    this._http.send_and_read_async(message, GLib.PRIORITY_DEFAULT, this._cancel, (session, result) => {
                        try {
                            const bytes = session.send_and_read_finish(result);
                            if (!this._alive || serial !== this._artSerial || message.status_code !== 200 || bytes.get_size() > 5 * 1024 * 1024) return;
                            const path = GLib.build_filenamev([GLib.get_user_cache_dir(), `lavender-player-cover-${GLib.compute_checksum_for_string(GLib.ChecksumType.SHA256, url, -1)}`]);
                            GLib.file_set_contents(path, bytes.get_data());
                            this._art.gicon = Gio.FileIcon.new(Gio.File.new_for_path(path));
                            this._art.show();
                        } catch (_) {}
                    });
                } catch (_) {}
            }
        }
        const trackId = meta['mpris:trackid']?.deep_unpack() || '';
        const key = `${player}:${trackId}`;
        if (key === this._trackKey) return;
        this._trackKey = key;
        const serial = ++this._trackSerial;
        this._trackBox.hide(); this._tracks.destroy_all_children();
        const bus = Gio.DBus.session;
        bus.call(player, '/org/mpris/MediaPlayer2', 'org.freedesktop.DBus.Properties', 'Get',
            new GLib.Variant('(ss)', ['org.mpris.MediaPlayer2.TrackList', 'Tracks']), null,
            Gio.DBusCallFlags.NONE, 2000, this._cancel, (b, result) => {
                try {
                    const ids = b.call_finish(result).deep_unpack()[0].deep_unpack();
                    if (!this._alive || serial !== this._trackSerial || !ids.length) return;
                    b.call(player, '/org/mpris/MediaPlayer2', 'org.mpris.MediaPlayer2.TrackList', 'GetTracksMetadata',
                        new GLib.Variant('(ao)', [ids.slice(0, 30)]), null, Gio.DBusCallFlags.NONE, 2000, this._cancel, (connection, reply) => {
                            try {
                                const [items] = connection.call_finish(reply).deep_unpack();
                                if (!this._alive || serial !== this._trackSerial) return;
                                for (const item of items) {
                                    const title = item['xesam:title']?.deep_unpack();
                                    if (!title) continue;
                                    const current = item['mpris:trackid']?.deep_unpack() === trackId;
                                    this._tracks.add_child(new St.Label({text: `${current ? '♪  ' : ''}${String(title).slice(0, 42)}`, style: `color: ${current ? '#e6dfee' : '#b9a0dd'}; font-size: 12px;`}));
                                }
                                if (this._tracks.get_n_children()) this._trackBox.show();
                            } catch (_) {}
                        });
                } catch (_) {}
            });
    }
    _refresh() {
        if (!this._alive || this._pending) return;
        this._pending=true;
        Gio.DBus.session.call('org.freedesktop.DBus','/org/freedesktop/DBus','org.freedesktop.DBus','ListNames',null,new GLib.VariantType('(as)'),Gio.DBusCallFlags.NONE,2000,this._cancel,(bus,res)=>{
            try {
                const names=bus.call_finish(res).deep_unpack()[0].filter(x=>x.startsWith('org.mpris.MediaPlayer2.'));
                if (!names.length) {this._player=null; this._box.hide(); this._clearAdvanced(); this._pending=false; return;}
                let remaining=names.length, candidates=[];
                for (const name of names) bus.call(name,'/org/mpris/MediaPlayer2','org.freedesktop.DBus.Properties','GetAll',new GLib.Variant('(s)',['org.mpris.MediaPlayer2.Player']),new GLib.VariantType('(a{sv})'),Gio.DBusCallFlags.NONE,2000,this._cancel,(b,r)=>{
                    try {const [props]=b.call_finish(r).deep_unpack(); candidates.push({name,props});} catch (_) {}
                    if (--remaining !== 0) return;
                    this._pending=false; if (!this._alive) return;
                    const p=candidates.find(x=>x.props.PlaybackStatus?.deep_unpack()==='Playing') || candidates[0];
                    if (!p) {this._player=null; this._box.hide(); this._clearAdvanced(); return;}
                    this._player=p.name;
                    const meta=p.props.Metadata?.deep_unpack() || {};
                    const title=meta['xesam:title']?.deep_unpack() || 'Something lovely is playing';
                    const artists=meta['xesam:artist']?.deep_unpack() || [];
                    this._title.set_text(String(title).slice(0,38)); this._artist.set_text(String(artists.join(', ') || 'media player').slice(0,42));
                    const duration = Number(meta['mpris:length']?.deep_unpack() || 0);
                    const position = Number(p.props.Position?.deep_unpack() || 0);
                    const isLive = meta['xesam:live']?.deep_unpack() === true || meta['mpris:live']?.deep_unpack() === true;
                    if (duration > 0) {
                        this._timing.set_text(`${this._formatTime(position)}  /  ${this._formatTime(duration)}`);
                        this._timing.show();
                    } else if (isLive) {
                        this._timing.set_text('●  Live');
                        this._timing.show();
                    } else {
                        this._timing.hide();
                    }
                    this._playIcon.icon_name=p.props.PlaybackStatus?.deep_unpack()==='Playing'?'media-playback-pause-symbolic':'media-playback-start-symbolic';
                    this._updateAdvanced(p.name, meta);
                    this._box.show();
                });
            } catch (_) {this._pending=false;}
        });
    }
    disable() {
        this._alive=false; this._cancel.cancel();
        this._stopWave();
        if (this._waveChanged) this._settings.disconnect(this._waveChanged);
        if(this._timer) GLib.Source.remove(this._timer);
        if(this._monitor) Main.layoutManager.disconnect(this._monitor);
        if(this._settingsChanged) this._settings.disconnect(this._settingsChanged);
        if(this._advancedChanged) this._settings.disconnect(this._advancedChanged);
        this._artSerial++; this._trackSerial++;
        this._http.abort();
        this._trackBox.destroy();
        if (!this._header.get_parent()) this._header.destroy();
        this._box.destroy();
    }
}
