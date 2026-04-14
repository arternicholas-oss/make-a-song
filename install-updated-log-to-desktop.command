#!/bin/bash
# Copies the updated Daemon Manual Tasks Log onto your Desktop, replacing the existing one.
# Double-click in Finder, or run from Terminal. Safe to re-run.

set -e
cd "$(dirname "$0")"

SRC="./Daemon_Manual_Tasks_Log.docx"
DST="$HOME/Desktop/Daemon_Manual_Tasks_Log.docx"

if [ ! -f "$SRC" ]; then
  echo "Source file not found: $SRC"
  exit 1
fi

# Back up the existing file with today's date before overwriting.
if [ -f "$DST" ]; then
  BACKUP="$HOME/Desktop/Daemon_Manual_Tasks_Log.backup-$(date +%Y%m%d-%H%M%S).docx"
  cp "$DST" "$BACKUP"
  echo "Backed up existing log to: $BACKUP"
fi

cp "$SRC" "$DST"
echo "Updated log installed at: $DST"

# Pause so the window stays open when double-clicked.
echo ""
echo "Press any key to close..."
read -n 1
