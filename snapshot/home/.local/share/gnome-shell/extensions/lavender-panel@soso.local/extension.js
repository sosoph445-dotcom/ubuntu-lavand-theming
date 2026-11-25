import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export default class LavenderPanel extends Extension {
    enable() {
        Main.panel.add_style_class_name('lavender-panel-islands');
    }
    disable() {
        Main.panel.remove_style_class_name('lavender-panel-islands');
    }
}
