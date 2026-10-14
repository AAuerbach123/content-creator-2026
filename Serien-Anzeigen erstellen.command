#!/bin/bash
# Serien-Anzeigen als Vektor-PDF + ZIP erstellen (alle Spiele des ContentCreator, Google Chrome nötig).
# Liest den neuesten „serie-auftrag*.json“ aus dem Ordner Downloads (Seite /serie → „Export-Auftrag herunterladen“).
# Ergebnis: Schreibtisch → Serien-Anzeigen → <Spiel>_<Monat>
cd "$(dirname "$0")" || exit 1
node scripts/serie-export.mjs "$@"
open "$HOME/Desktop/Serien-Anzeigen"
read -p "Enter drücken zum Schließen."
