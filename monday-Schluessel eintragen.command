#!/bin/bash
# Trägt den monday.com-API-Schlüssel aus der Zwischenablage in .env.local ein (Zeile MONDAY_API_TOKEN=…).
# Vorher in monday: Profilbild → Developers → My access tokens → „Copy“. Der Schlüssel wird nicht angezeigt.
cd "$(dirname "$0")" || exit 1
KEY="$(pbpaste | tr -d '[:space:]')"
if [ ${#KEY} -lt 40 ]; then
  echo "In der Zwischenablage ist kein monday-Schlüssel (zu kurz). Bitte in monday kopieren und erneut doppelklicken."
  read -p "Enter drücken zum Schließen."; exit 1
fi
touch .env.local
grep -v '^MONDAY_API_TOKEN=' .env.local > .env.local.neu || true
echo "MONDAY_API_TOKEN=$KEY" >> .env.local.neu
mv .env.local.neu .env.local
chmod 600 .env.local
echo "monday-Schlüssel eingetragen (${#KEY} Zeichen). Jetzt den ContentCreator neu starten:"
echo "Terminal-Fenster des ContentCreator schließen und „ContentCreator starten.command“ doppelklicken."
read -p "Enter drücken zum Schließen."
