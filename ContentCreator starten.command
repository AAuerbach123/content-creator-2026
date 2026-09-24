#!/usr/bin/env bash
# ContentCreator2026 – Ein-Klick-Start (Regel 7)
# Doppelklick auf diese Datei startet den Dev-Server und oeffnet den Browser.
# Einmalig vor dem ersten Klick im Terminal: chmod +x "ContentCreator starten.command"

set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js ist nicht installiert. Bitte einmalig installieren:"
  echo "  https://nodejs.org/  (LTS-Version)"
  echo ""
  read -n 1 -s -r -p "Enter druecken, um dieses Fenster zu schliessen…"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installiere Abhaengigkeiten (nur beim ersten Start, dauert 1–3 Minuten)…"
  npm install
fi

echo ""
echo "Starte ContentCreator2026 auf http://localhost:3000"
echo "Zum Beenden: dieses Fenster schliessen oder Strg+C druecken."
echo ""

# Browser mit kleiner Verzoegerung oeffnen, danach den Server im Vordergrund halten
( sleep 2; open "http://localhost:3000" ) &
exec npm run dev
