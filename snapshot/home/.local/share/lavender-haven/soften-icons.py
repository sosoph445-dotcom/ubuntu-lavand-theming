from pathlib import Path
import colorsys, re
root=Path.home()/'.local/share/icons/Haven-Circle-b9a0dd/scalable/apps'
# Muted versions of the existing theme's rose, amber, sage, mist,
# periwinkle and lavender. Keep original geometry and shading.
anchors=['d9939c','dfbc8a','a9bda0','9dbfc3','a7afd8','b9a0dd']
def soften(match):
 raw=match.group(1)
 if len(raw)==3: raw=''.join(c*2 for c in raw)
 rgb=tuple(int(raw[i:i+2],16)/255 for i in (0,2,4))
 h,l,s=colorsys.rgb_to_hls(*rgb)
 if s < .12: return match.group(0)
 deg=h*360
 index=0 if deg<18 or deg>=342 else 1 if deg<68 else 2 if deg<165 else 3 if deg<205 else 4 if deg<265 else 5 if deg<320 else 0
 target=anchors[index]; base=tuple(int(target[i:i+2],16)/255 for i in (0,2,4))
 bh,bl,bs=colorsys.rgb_to_hls(*base)
 # Maintain enough lightness variation to keep small details legible.
 nl=max(.23,min(.91,bl+(l-.5)*.65))
 out=colorsys.hls_to_rgb(bh,nl,bs)
 return '#'+''.join(f'{round(c*255):02x}' for c in out)
count=0
for p in root.glob('*.svg'):
 if p.is_symlink(): continue
 s=p.read_text(); new=re.sub(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])',soften,s)
 if new!=s: p.write_text(new); count+=1
print(f'Softened {count} app icons to the Lavender Haven palette families.')
