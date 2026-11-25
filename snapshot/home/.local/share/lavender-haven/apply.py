#!/usr/bin/python3
from pathlib import Path
import json, subprocess, sys, time
from gi.repository import Gio, GLib
B=Path.home()/'.local/share/lavender-haven'; marker=B/'applied.json'
if marker.exists() and '--force' not in sys.argv: sys.exit(0)
log=[]; saved=[]
def setting(schema,key,value,path=None):
 try:
  s=Gio.Settings.new_with_path(schema,path) if path else Gio.Settings.new(schema)
  old=s.get_user_value(key)
  saved.append({'schema':schema,'key':key,'path':path,'old':old.print_(True) if old else None})
  v=GLib.Variant(s.get_value(key).get_type_string(),value)
  if not s.set_value(key,v): raise RuntimeError('setting not writable')
 except Exception as e: log.append(f'{schema} {key}: {e}')
wall=Path.home()/'Pictures/Lavender-Haven/moonlit-haven.png'
if not wall.exists(): sys.exit('Wallpaper not ready; setup will retry next login.')
for key in ('picture-uri','picture-uri-dark'): setting('org.gnome.desktop.background',key,wall.as_uri())
setting('org.gnome.desktop.background','picture-options','zoom')
for k,v in {'color-scheme':'prefer-dark','accent-color':'purple','gtk-theme':'Lavender-Haven','icon-theme':'Haven-Circle-b9a0dd-dark','enable-animations':True,'clock-show-weekday':True}.items(): setting('org.gnome.desktop.interface',k,v)
for k,v in {'dock-position':'BOTTOM','extend-height':False,'dash-max-icon-size':44,'dock-fixed':False,'autohide':True,'intellihide':True,'transparency-mode':'FIXED','background-opacity':0.72,'custom-background-color':True,'background-color':'#292431','custom-theme-shrink':True,'show-trash':False,'show-mounts':False,'animation-time':0.22,'custom-theme-customize-running-dots':True,'custom-theme-running-dots-color':'#b9a0dd'}.items(): setting('org.gnome.shell.extensions.dash-to-dock',k,v)
# Hide only this user's desktop home icon for a quiet wallpaper.
setting('org.gnome.shell.extensions.ding','show-home',False)
p='74f04bfb-eadb-4f21-9f3d-a3d17f245885'; s=Gio.Settings.new('org.gnome.Ptyxis'); ids=s.get_strv('profile-uuids')
if p not in ids: ids.append(p)
setting('org.gnome.Ptyxis','profile-uuids',ids); setting('org.gnome.Ptyxis','default-profile-uuid',p)
for k,v in {'label':'Lavender Haven','palette':'lavender-haven','opacity':0.85}.items(): setting('org.gnome.Ptyxis.Profile',k,v,f'/org/gnome/Ptyxis/Profiles/{p}/')
setting('org.gnome.Ptyxis','audible-bell',False)
s=Gio.Settings.new('org.gnome.shell'); ids=[e for e in s.get_strv('enabled-extensions') if e != 'ding@rastersoft.com']
for ext in ('ubuntu-dock@ubuntu.com','lavender-haven@soso.local','lavender-panel@soso.local'):
 if ext not in ids: ids.append(ext)
setting('org.gnome.shell','enabled-extensions',ids)
disabled=s.get_strv('disabled-extensions')
if 'ding@rastersoft.com' not in disabled: disabled.append('ding@rastersoft.com')
disabled=[e for e in disabled if e not in ('ubuntu-dock@ubuntu.com','lavender-haven@soso.local','lavender-panel@soso.local')]
setting('org.gnome.shell','disabled-extensions',disabled)
Gio.Settings.sync()
# Ask the running shell to load the newly installed extension, if necessary.
for ext in ('ubuntu-dock@ubuntu.com','lavender-haven@soso.local','lavender-panel@soso.local'):
 try: subprocess.run(['gnome-extensions','enable',ext],capture_output=True,timeout=10)
 except Exception as e: log.append(str(e))
prior=B/'settings-before.json'
if not prior.exists(): prior.write_text(json.dumps(saved,indent=2))
marker.write_text(json.dumps({'time':time.time(),'errors':log},indent=2))
(B/'apply.log').write_text('\n'.join(log) if log else 'All settings applied. Extension may need one further login if GNOME did not discover it.')
