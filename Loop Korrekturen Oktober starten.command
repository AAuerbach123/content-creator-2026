#!/bin/bash
# Startet den Loop „Korrekturen Oktober 2026“ im ContentCreator autonom (ohne Rückfragen).
DIR="$HOME/Desktop/content-creator-2026"
cd "$DIR" || { echo "Ordner nicht gefunden"; read; exit 1; }
echo "Starte Claude Code (Loop Korrekturen Oktober 2026) ..."
claude "Lies LOOP-Korrekturen-Oktober-2026.md vollständig und arbeite alle Phasen im autonomen Modus ab. Stelle keine Fragen, bis alles fertig ist."
