# Lavender Haven

Installed only for /home/soso. No system packages, other users, login screen, or system configuration were changed.

A charcoal and soft lavender desktop with warm amber wallpaper lighting, custom lavender folder icons, dark GTK accents, a translucent compact bottom dock, gentle GNOME animations, and a matching Ptyxis terminal profile. Application icons inherit the installed Yaru set. GTK apps may differ in how much custom styling they honor.

Wallpaper: ~/Pictures/Lavender-Haven/moonlit-haven.png
Generated using the built-in imagegen tool. The generation prompt is saved alongside this guide.

The Lavender Haven GNOME 50 extension displays one of eight quiet phrases, rotating every five minutes, and 32 lavender frequency bars above the dock. It captures the default system audio monitor through the installed ffmpeg; it does not select the microphone. Bars sit quietly during silence. Desktop icons are disabled for this user so their desktop window cannot cover the widgets. Existing Desktop files are preserved.

Apply again from your normal desktop terminal:

    python3 ~/.local/share/lavender-haven/apply.py --force

Or search for “Apply Lavender Haven” in the applications overview. Login activation applies the setup once. If the widgets are absent immediately after first installation, log out and back in so GNOME discovers the extension.

Undo from your normal desktop terminal:

    python3 ~/.local/share/lavender-haven/undo.py

Then log out and back in. Undo restores the exact previous values of touched GNOME settings and restores pre-existing GTK CSS. Original files and an additional dconf snapshot are retained under backup/. It leaves the wallpaper and this guide available.

You can edit phrases in ~/.local/share/gnome-shell/extensions/lavender-haven@soso.local/extension.js. Reload the extension or log in again after edits.

Verification: settings validated against the installed schemas using the memory backend; Python and JavaScript syntax checked. Live verification confirmed the wallpaper URI, Lavender-Haven GTK and icon themes, default Ptyxis profile, bottom dock position, and ACTIVE Ubuntu Dock. The custom extension is enabled in settings but the running shell has not discovered it yet; log out and back in. Its rendering and system audio behavior remain unverified until then. Runtime activation results are in applied.json and apply.log.

## Terminal

Native Bash theme: ~/.config/lavender-haven/bash.sh. A two-line lavender prompt shows the user and directory, Git branch with * for tracked changes, and a rose exit code after failed commands. Untracked files are not counted. Existing prompt hooks are preserved. Listings, grep matches, compiler messages and Readline completions use the matching palette. No extra packages or special fonts are needed. Ptyxis uses Ubuntu Sans Mono 12 with extra line spacing, a steady thin cursor, and a 85% opaque charcoal background (15% transparency).

Open a new terminal, or run `source ~/.bashrc` in an existing Bash session.

Undo just the terminal customization:

    python3 ~/.local/share/lavender-haven/undo-terminal.py

The full undo command also removes the terminal customization. The original Bash configuration is backed up as backup/bashrc-before-terminal.

Terminal style refinement: a lavender flower beside your username, a fine italic working directory, a small outline-heart prompt, and a moonlit welcome displayed once per terminal. The original color palette is unchanged. Root prompts retain a # marker.

## Top bar

Lavender Panel Islands makes the unused top bar fully transparent. Only actual panel buttons (clock, Activities, status and app indicators) receive rounded charcoal backgrounds with a fine lavender outline. Menus and hover feedback remain readable. Installed only in ~/.local/share/gnome-shell/extensions/lavender-panel@soso.local. Log out and back in after first installation so GNOME can discover it.

To revert only the top bar:

    gnome-extensions disable lavender-panel@soso.local

The full undo command also restores the previous extension selection and removes this extension.

## Rounded app icons

The active icon theme is Haven-Circle-b9a0dd-dark, a user-local Tela Circle variant with lavender folders and muted app colors derived from the desktop palette. Source: https://github.com/vinceliuice/Tela-circle-icon-theme. Installed under ~/.local/share/icons, with no changes to system themes. Theme variants and source are kept for reproducibility. Existing sandboxed apps may keep bundled icons where they cannot access user themes.

To return to the earlier lavender folder icons:

    gsettings set org.gnome.desktop.interface icon-theme Lavender-Haven
