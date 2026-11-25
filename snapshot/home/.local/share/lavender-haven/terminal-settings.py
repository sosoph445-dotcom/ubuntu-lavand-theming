from pathlib import Path
import json
from gi.repository import Gio, GLib
B=Path.home()/'.local/share/lavender-haven'; records=[]
p='74f04bfb-eadb-4f21-9f3d-a3d17f245885'
changes=[('org.gnome.Ptyxis',None,{'use-system-font':False,'font-name':'Ubuntu Sans Mono 12','cursor-shape':'ibeam','cursor-blink-mode':'off','audible-bell':False}),('org.gnome.Ptyxis.Profile',f'/org/gnome/Ptyxis/Profiles/{p}/',{'palette':'lavender-haven','opacity':0.85,'cell-height-scale':1.12})]
for schema,path,values in changes:
 s=Gio.Settings.new_with_path(schema,path) if path else Gio.Settings.new(schema)
 for key,value in values.items():
  old=s.get_user_value(key)
  records.append({'schema':schema,'path':path,'key':key,'old':old.print_(True) if old else None})
  if not s.set_value(key,GLib.Variant(s.get_value(key).get_type_string(),value)): raise RuntimeError(key)
Gio.Settings.sync()
f=B/'terminal-settings-before.json'
if not f.exists(): f.write_text(json.dumps(records,indent=2))
f=B/'settings-before.json'; all_records=json.loads(f.read_text())
for item in records:
 if not any((r['schema'],r['path'],r['key'])==(item['schema'],item['path'],item['key']) for r in all_records): all_records.append(item)
f.write_text(json.dumps(all_records,indent=2))
print('Applied terminal font, spacing, cursor and lavender colors for your user.')
