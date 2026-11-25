#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
command -v python3 >/dev/null || { echo 'python3 is required.' >&2; exit 1; }
command -v dconf >/dev/null || { echo 'dconf is required.' >&2; exit 1; }
stage=$(mktemp -d "${TMPDIR:-/tmp}/desk-backup.XXXXXX")
trap 'rm -rf "$stage"' EXIT
mkdir -p "$stage/home" "$stage/dconf"
printf '%s' "$HOME" > "$stage/source-home"
paths=(.bashrc .bash_aliases .bash_profile .bash_login .profile .dircolors .inputrc .config/lavender-haven .config/gtk-3.0 .config/gtk-4.0 .config/tiling-assistant .local/share/gnome-shell/extensions .local/share/icons .local/share/themes .local/share/fonts .local/share/org.gnome.Ptyxis .local/share/lavender-haven .local/share/applications/lavender-haven.desktop .spicetify Pictures/Lavender-Haven)
for path in "${paths[@]}"; do
  if [[ -e "$HOME/$path" || -L "$HOME/$path" ]]; then
    printf '%s\0' "$path" >> "$stage/paths.nul"
    mkdir -p "$stage/home/$(dirname "$path")"
    cp -a "$HOME/$path" "$stage/home/$path"
  fi
done
# Limit exports to desktop appearance, shell, extension and terminal settings.
keys=(org/gnome/desktop/interface org/gnome/desktop/background org/gnome/desktop/wm/preferences org/gnome/shell org/gnome/Ptyxis org/gnome/terminal)
for key in "${keys[@]}"; do
  mkdir -p "$stage/dconf/$key"
  dconf dump "/$key/" > "$stage/dconf/$key/settings.ini"
done
if command -v dpkg-query >/dev/null; then dpkg-query -W -f='${binary:Package}\t${Version}\t${db:Status-Status}\n' > "$stage/installed-packages.tsv"; fi
# Enumerate the actual copied extensions without relying on the Shell D-Bus service.
python3 - "$stage" <<'PYEXT'
import json, re, sys
from pathlib import Path
stage = Path(sys.argv[1])
root = stage / 'home/.local/share/gnome-shell/extensions'
settings = (stage / 'dconf/org/gnome/shell/settings.ini').read_text()
match = re.search(r'^enabled-extensions=(.*)$', settings, re.M)
enabled = set(re.findall(r"'([^']+)'", match.group(1))) if match else set()
lines = ['User-installed extensions captured in this snapshot:', '']
for metadata in sorted(root.glob('*/metadata.json')):
    try:
        data = json.loads(metadata.read_text())
        uuid = data.get('uuid', metadata.parent.name)
        state = ('enabled' if uuid in enabled else 'not listed as enabled') if match else 'enabled state unavailable'
        lines.append(f"{data.get('name', uuid)} — {uuid} ({state})")
    except (OSError, ValueError) as exc:
        lines.append(f'{metadata.parent.name} — could not read metadata: {exc}')
if len(lines) == 2:
    lines.append('(none found)')
lines.extend(['', 'Enabled extensions recorded in GNOME settings:'])
lines.extend(f'- {uuid}' for uuid in sorted(enabled))
if not enabled:
    lines.append('(none recorded or setting unavailable)')
(stage / 'extension-list.txt').write_text('\n'.join(lines) + '\n')
PYEXT
rm -rf snapshot.previous
[[ ! -e snapshot ]] || mv snapshot snapshot.previous
mv "$stage" snapshot
trap - EXIT
rm -rf snapshot.previous
echo "Snapshot saved in $PWD/snapshot"
