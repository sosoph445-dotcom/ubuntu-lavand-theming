#!/usr/bin/python3
from pathlib import Path
import json, shutil
from gi.repository import Gio, GLib
H=Path.home(); B=H/'.local/share/lavender-haven'
terminal_undo=B/'undo-terminal.py'
if terminal_undo.exists():
 import runpy
 runpy.run_path(str(terminal_undo))
settings=B/'settings-before.json'
if settings.exists():
 for item in reversed(json.loads(settings.read_text())):
  s=Gio.Settings.new_with_path(item['schema'],item['path']) if item['path'] else Gio.Settings.new(item['schema'])
  if item['old'] is None: s.reset(item['key'])
  else: s.set_value(item['key'], GLib.Variant.parse(None,item['old'],None,None))
 Gio.Settings.sync()
for rel,existed in json.loads((B/'manifest.json').read_text()).items():
 p=H/rel
 if existed: shutil.copy2(B/'backup'/rel,p)
 elif p.exists(): p.unlink()
for rel in ['.local/share/gnome-shell/extensions/lavender-player@soso.local','.local/share/icons/Haven-Circle-b9a0dd','.local/share/icons/Haven-Circle-b9a0dd-dark','.local/share/icons/Haven-Circle-b9a0dd-light','.local/share/gnome-shell/extensions/lavender-panel@soso.local','.local/share/gnome-shell/extensions/lavender-haven@soso.local','.local/share/themes/Lavender-Haven','.local/share/icons/Lavender-Haven']:
 p=H/rel
 if p.exists(): shutil.rmtree(p)
(B/'applied.json').unlink(missing_ok=True)
print('Previous user settings and edited files restored. Log out and back in to finish unloading the desktop extension. Wallpaper and backup files were kept.')
