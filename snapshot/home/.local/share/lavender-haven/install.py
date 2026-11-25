from pathlib import Path
import shutil, json, subprocess
H=Path.home(); B=H/'.local/share/lavender-haven'; backup=B/'backup'; backup.mkdir(exist_ok=True)
manifest={}
def put(rel,text):
 p=H/rel; p.parent.mkdir(parents=True,exist_ok=True)
 if p.exists():
  q=backup/rel; q.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(p,q); manifest[rel]=True
 else: manifest[rel]=False
 p.write_text(text)
if (H/'.config/dconf/user').exists(): shutil.copy2(H/'.config/dconf/user',backup/'dconf-user-original')
css='''/* Lavender Haven — user-local palette */
@define-color accent_bg_color #ac94cf;
@define-color accent_fg_color #211e29;
@define-color accent_color #c6afe7;
@define-color theme_selected_bg_color #ac94cf;
@define-color theme_selected_fg_color #211e29;
@define-color window_bg_color #211e29;
@define-color window_fg_color #e6dfee;
@define-color view_bg_color #1c1922;
@define-color view_fg_color #e6dfee;
@define-color headerbar_bg_color #292431;
@define-color card_bg_color #302a39;
@define-color sidebar_bg_color #27222f;
selection { background-color: #ac94cf; color: #211e29; }
'''
for version in ('3.0','4.0'):
 p=H/f'.config/gtk-{version}/gtk.css'
 put(f'.config/gtk-{version}/gtk.css',(p.read_text()+'\n' if p.exists() else '')+css)
# Keep the tested Yaru base; override its accents locally.
put('.local/share/themes/Lavender-Haven/index.theme','[Desktop Entry]\nName=Lavender Haven\nType=X-GNOME-Metatheme\n[X-GNOME-Metatheme]\nGtkTheme=Lavender-Haven\nIconTheme=Lavender-Haven\n')
put('.local/share/themes/Lavender-Haven/gtk-3.0/gtk.css','@import url("file:///usr/share/themes/Yaru-dark/gtk-3.0/gtk.css");\n'+css)
put('.local/share/icons/Lavender-Haven/index.theme','[Icon Theme]\nName=Lavender Haven\nComment=Lavender folders with Yaru application icons\nInherits=Yaru-dark,Adwaita,hicolor\nDirectories=scalable/places\n[scalable/places]\nSize=48\nType=Scalable\nMinSize=16\nMaxSize=512\nContext=Places\n')
svg='''<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><path fill="#87709e" d="M5 17a5 5 0 0 1 5-5h15l6 6h23a5 5 0 0 1 5 5v27a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5z"/><rect x="5" y="23" width="54" height="32" rx="5" fill="#b9a0dd"/><path d="M7 28h50" stroke="#dac9ef" stroke-opacity=".45" stroke-width="2"/>MARK</svg>'''
marks={'folder':'','folder-open':'','user-home':'<path fill="#645174" d="m24 41 8-7 8 7v8h-6v-6h-4v6h-6z"/>','folder-documents':'<path fill="#645174" d="M27 32h8l5 5v13H27z"/>','folder-download':'<path stroke="#645174" stroke-width="3" fill="none" d="M32 32v14m-6-6 6 6 6-6"/>','folder-music':'<path stroke="#645174" stroke-width="3" fill="none" d="M29 46V34l10-2v12"/><circle cx="26" cy="46" r="4" fill="#645174"/><circle cx="36" cy="44" r="4" fill="#645174"/>','folder-pictures':'<path fill="#645174" d="m23 48 7-10 6 6 4-4 5 8z"/><circle cx="39" cy="35" r="3" fill="#645174"/>','folder-videos':'<path fill="#645174" d="m29 33 12 8-12 8z"/>','folder-templates':'','folder-publicshare':'','folder-desktop':''}
for name,mark in marks.items(): put(f'.local/share/icons/Lavender-Haven/scalable/places/{name}.svg',svg.replace('MARK',mark))
colors=['#322b3d','#d9939c','#a9bda0','#dfbc8a','#a7afd8','#b9a0dd','#9dbfc3','#d6cddd','#71657f','#edb0b7','#c3d4b8','#f2d2a5','#c2c9ed','#d3bcef','#b7d9dc','#f4edf7']
palette='[Palette]\nName=Lavender Haven\nBackground=#211e29\nForeground=#e6dfee\nCursor=#d3bcef\nTitlebarBackground=#292431\nTitlebarForeground=#e6dfee\n'+''.join(f'Color{i}={c}\n' for i,c in enumerate(colors))
put('.local/share/org.gnome.Ptyxis/palettes/lavender-haven.palette',palette)
put('.config/autostart/lavender-haven.desktop','[Desktop Entry]\nType=Application\nName=Lavender Haven setup\nExec=/usr/bin/python3 /home/soso/.local/share/lavender-haven/apply.py\nX-GNOME-Autostart-enabled=true\nNoDisplay=true\n')
put('.local/share/applications/lavender-haven.desktop','[Desktop Entry]\nType=Application\nName=Apply Lavender Haven\nComment=Apply your cozy lavender desktop\nExec=/usr/bin/python3 /home/soso/.local/share/lavender-haven/apply.py --force\nIcon=preferences-desktop-wallpaper\nTerminal=false\nCategories=Settings;\n')
(B/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('User-local themes, icons, terminal palette, backups and login activation installed.')
