#!/bin/bash
# Startet den autonomen Prüf- und Korrektur-Loop für ContentCreator2026 (ohne Rückfragen).
cd "$HOME/Desktop/content-creator-2026" || { echo "Ordner nicht gefunden"; read; exit 1; }
LAEUFT=$(pgrep -fl "claude" | grep -v "Claude.app" | grep -v pgrep)
if [ -n "$LAEUFT" ]; then
  echo "Hinweis: Es laufen noch Claude-Code-Prozesse:"
  echo "$LAEUFT"
  echo ""
  echo "Wenn der Bau-Loop fertig ist (Zusammenfassung steht da), kannst du trotzdem starten."
  read -p "Enter = Prüfung jetzt starten, ctrl+C = abbrechen. "
fi
echo "Starte Claude Code (Prüfung + Fehlerkorrektur, autonom) ..."
claude "Lies LOOP-PRUEFUNG-ContentCreator2026.md vollständig und arbeite alle Prüfbereiche im autonomen Modus ab: Fehler finden, selbst korrigieren, erneut prüfen. Falls noch uncommittete Änderungen aus dem Bau-Loop vorliegen, diese zuerst committen (kein Push). Stelle keine Fragen, bis alles fertig ist."
