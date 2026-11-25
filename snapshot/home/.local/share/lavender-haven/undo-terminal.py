from pathlib import Path
import json, shutil
from gi.repository import Gio, GLib
H=Path.home(); B=H/'.local/share/lavender-haven'
f=B/'terminal-settings-before.json'
if f.exists():
 for r in reversed(json.loads(f.read_text())):
  s=Gio.Settings.new_with_path(r['schema'],r['path']) if r['path'] else Gio.Settings.new(r['schema'])
  if r['old'] is None: s.reset(r['key'])
  else: s.set_value(r['key'],GLib.Variant.parse(None,r['old'],None,None))
 Gio.Settings.sync()
p=H/'.bashrc'
block='\n# Lavender Haven terminal theme (user-local).\n[ -r "$HOME/.config/lavender-haven/bash.sh" ] && . "$HOME/.config/lavender-haven/bash.sh"\n'
p.write_text(p.read_text().replace(block,''))
(H/'.config/lavender-haven/bash.sh').unlink(missing_ok=True)
if (B/'backup/palette-before-terminal').exists(): shutil.copy2(B/'backup/palette-before-terminal',H/'.local/share/org.gnome.Ptyxis/palettes/lavender-haven.palette')
print('Terminal customization removed. Open a new terminal to use the restored setup.')
