import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class LavenderPlayerPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const values = ['bottom-left', 'bottom-right', 'top-left', 'top-right'];
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({title: 'Player position'});
        const row = new Adw.ComboRow({
            title: 'Desktop corner',
            subtitle: 'Position on the primary monitor',
            model: Gtk.StringList.new(['Bottom left', 'Bottom right', 'Top left', 'Top right']),
            selected: Math.max(0, values.indexOf(settings.get_string('corner'))),
        });
        row.connect('notify::selected', () => settings.set_string('corner', values[row.selected]));
        settings.connect('changed::corner', () => {
            const selected = values.indexOf(settings.get_string('corner'));
            if (selected >= 0 && row.selected !== selected) row.selected = selected;
        });
        group.add(row);
        page.add(group);
        const display = new Adw.PreferencesGroup({title: 'Display'});
        const advanced = new Adw.SwitchRow({
            title: 'Advanced visualization',
            subtitle: 'Show cover art, lyrics and a separate track list when available',
        });
        settings.bind('advanced-visualization', advanced, 'active', 0);
        display.add(advanced);
        const wave = new Adw.SwitchRow({
            title: 'Lavender audio wave',
            subtitle: 'Draw a waveform around the player using system output audio (requires PipeWire)',
        });
        settings.bind('audio-wave', wave, 'active', 0);
        display.add(wave);
        page.add(display);
        window.add(page);
    }
}
