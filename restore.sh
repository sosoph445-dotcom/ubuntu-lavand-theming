#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$(readlink -f "$0")")"
if [[ ${1:-} == --install-packages ]]; then
  command -v apt-get >/dev/null || { echo 'Automatic installation requires Ubuntu/Debian apt.' >&2; exit 1; }
  sudo apt-get update
  sudo apt-get install -y dconf-cli gnome-shell ptyxis bash-completion git fonts-ubuntu gnome-shell-extension-ubuntu-dock
  exit
fi
[[ $# == 0 ]] || { echo "Usage: $0 [--install-packages]" >&2; exit 2; }
[[ -f snapshot/source-home ]] || { echo 'Snapshot missing. Run backup.sh on the original machine first.' >&2; exit 1; }
for cmd in dconf python3; do command -v "$cmd" >/dev/null || { echo "Missing $cmd. Install prerequisites first." >&2; exit 1; }; done
[[ -n ${DBUS_SESSION_BUS_ADDRESS:-} ]] || { echo 'Run this inside your graphical GNOME session (a session D-Bus is required).' >&2; exit 1; }
old_home=$(cat snapshot/source-home)
rollback="$HOME/desk-restore-previous-$(date +%Y%m%d-%H%M%S)-$$"
mkdir -p "$rollback/home" "$rollback/dconf"
echo "Saving replaced files and existing settings to $rollback"
# Back up each top-level captured path and merge captured files into the target.
while IFS= read -r -d '' rel; do
  source="snapshot/home/$rel"
  target="$HOME/$rel"
  if [[ -e "$target" || -L "$target" ]]; then
    mkdir -p "$rollback/home/$(dirname "$rel")"
    cp -a "$target" "$rollback/home/$rel"
  fi
  mkdir -p "$(dirname "$target")"
  if [[ -d "$source" && ! -L "$source" && -d "$target" && ! -L "$target" ]]; then
    cp -a "$source/." "$target/"
  else
    cp -a "$source" "$target"
  fi
done < snapshot/paths.nul
# Relocate references in shell startup files and selected desktop files.
OLD_HOME="$old_home" NEW_HOME="$HOME" python3 - <<'PY'
import os
from pathlib import Path
old, new = os.environ['OLD_HOME'], os.environ['NEW_HOME']
for rel in ('.bashrc', '.bash_aliases', '.bash_profile', '.bash_login', '.profile', '.local/share/applications/lavender-haven.desktop'):
    p = Path(new) / rel
    if p.is_file():
        data = p.read_bytes()
        p.write_bytes(data.replace(old.encode(), new.encode()))
PY
for file in snapshot/dconf/*/*/settings.ini snapshot/dconf/*/*/*/settings.ini snapshot/dconf/*/*/*/*/settings.ini; do
  [[ -f "$file" ]] || continue
  key=${file#snapshot/dconf/}; key=${key%/settings.ini}
  mkdir -p "$rollback/dconf/$key"
  dconf dump "/$key/" > "$rollback/dconf/$key/settings.ini"
  OLD_HOME="$old_home" NEW_HOME="$HOME" python3 -c 'import os,sys; from urllib.parse import quote; s=sys.stdin.read(); old=os.environ["OLD_HOME"]; new=os.environ["NEW_HOME"]; sys.stdout.write(s.replace(quote(old),quote(new)).replace(old,new))' < "$file" | dconf load "/$key/"
done
command -v fc-cache >/dev/null && fc-cache -f "$HOME/.local/share/fonts" || :
echo 'Restore complete. Log out and back in to reload GNOME Shell and extensions.'
echo "Previous files and dconf exports: $rollback"
echo 'Extensions may need updates if the GNOME Shell version differs.'
