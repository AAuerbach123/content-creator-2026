#!/bin/bash
# Startet den Loop „Cockpit 2027“ im ContentCreator autonom (ohne Rückfragen).
DIR="$HOME/Desktop/content-creator-2026"
cd "$DIR" || { echo "Ordner nicht gefunden"; read; exit 1; }
echo "Starte Claude Code (Loop Cockpit 2027) ..."
claude "Lies LOOP-Cockpit-2027.md vollständig und arbeite alle Phasen im autonomen Modus ab. Stelle keine Fragen, bis alles fertig ist."
