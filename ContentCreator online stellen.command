#!/bin/bash
# ContentCreator2026 – baut die App und stellt sie auf Cloudflare online.
# Danach werden die geänderten Dateien auf GitHub gesichert.
cd "$(dirname "$0")" || exit 1

echo "1/3  Baue die App für Cloudflare (dauert 1–3 Minuten) …"
if ! npm run build:vinext; then
  echo ""; echo "FEHLER beim Bauen – bitte dieses Fenster als Screenshot an Claude schicken."
  read -p "Enter drücken zum Schließen."; exit 1
fi

echo ""; echo "2/3  Stelle online …"
if ! npm run deploy:vinext; then
  echo ""; echo "FEHLER beim Online-Stellen – bitte dieses Fenster als Screenshot an Claude schicken."
  read -p "Enter drücken zum Schließen."; exit 1
fi

echo ""; echo "3/3  Sichere Änderungen auf GitHub …"
git add wrangler.jsonc OFFENE_PUNKTE.md "OpenAI testen.command" "ContentCreator online stellen.command" 2>/dev/null
git commit -m "chore(deploy): KV-Speicher FREIGABEN für das Korrekturportal + OpenAI-Test + Online-Command" >/dev/null 2>&1 && echo "Commit erstellt."
git push && echo "GitHub: OK"

echo ""
echo "FERTIG – online: https://content-creator-2026.aauerbach1234.workers.dev"
read -p "Enter drücken zum Schließen."
