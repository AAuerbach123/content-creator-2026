#!/bin/bash
# Setzt den autonomen Bau von ContentCreator2026 fort (ohne Rückfragen).
cd "$HOME/Desktop/content-creator-2026" || { echo "Ordner nicht gefunden"; read; exit 1; }
# Einmalig: KI-Schlüssel aus den bestehenden Projekten übernehmen (bleiben lokal, nicht im Git)
if [ ! -f .env.local ]; then
  [ -f "$HOME/Desktop/wissensquiz/.env.local" ] && grep -E '^(OPENAI|ANTHROPIC)_API_KEY=' "$HOME/Desktop/wissensquiz/.env.local" > .env.local
  [ -f "$HOME/Downloads/01_Projekte/Telemedia/Spiele_2027/.env" ] && grep -E '^ELEVENLABS_API_KEY=' "$HOME/Downloads/01_Projekte/Telemedia/Spiele_2027/.env" >> .env.local
  echo "Schlüssel übernommen: $(cut -d= -f1 .env.local | tr '\n' ' ')"
fi
echo "Starte Claude Code (ContentCreator2026, autonom) ..."
claude "Lies LOOP-ContentCreator2026.md vollständig und arbeite ab der ersten offenen Aufgabe alle Phasen im autonomen Modus ab. Stelle keine Fragen, bis alles fertig ist."
