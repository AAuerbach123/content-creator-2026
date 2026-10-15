#!/bin/bash
# ContentCreator2026 – sichert den aktuellen Stand (Cockpit 2027, Zeitungen & Rufnummern je Spiel,
# Gewinner-Zusatztext, Einführungstext 1. Spieltag, Serien-Modus) als Git-Commit.
# Vorher laufen die Prüfungen. Hochladen auf GitHub (push) nur nach Rückfrage.
cd "$(dirname "$0")" || exit 1

abbruch() {
  echo ""; echo "ABBRUCH: $1"
  echo "Es wurde NICHTS gespeichert. Bitte dieses Fenster als Screenshot an Claude schicken."
  read -p "Enter drücken zum Schließen."; exit 1
}

echo "1/4  Prüfe den Code (Typprüfung, ca. 30 s) …"
npx tsc --noEmit || abbruch "Typprüfung fehlgeschlagen."

echo ""; echo "2/4  Prüfskripte …"
for s in check-i18n check-umlaute check-hilfe check-kontrast check-spielauswahl; do
  node "scripts/$s.mjs" >/dev/null 2>&1 || abbruch "Prüfskript $s fehlgeschlagen."
  echo "     ✓ $s"
done
for m in 2027-11 2027-12; do
  out=$(node scripts/check-serie.mjs "$m" 2>&1) || abbruch "check-serie $m fehlgeschlagen."
  if echo "$out" | grep -q "Keine Python-Referenz"; then
    echo "     ⚠ Geldregen $m: Referenzordner nicht gefunden – nur Inhaltsprüfung"
  else
    echo "$out" | grep -q " 0 abweichend" || abbruch "Geldregen $m ist nicht mehr bytegleich."
    echo "     ✓ Geldregen $m bytegleich"
  fi
done

echo ""; echo "3/4  Erstelle den Commit …"
git add -A
git status --short | head -20
echo "     … insgesamt $(git status --short | wc -l | tr -d ' ') Dateien"
git commit -q -m "feat(cockpit): Gestaltung – Vorschläge A/B/C nebeneinander + 3 KI-Varianten (Farben/Titel/Unterzeile), Wahl gilt überall; fix: KI-Gewinnertext, Gesamtprüfung ignoriert Fotodaten; Access-Werte; Erklärfilm-Drehbuch" \
  || abbruch "Commit fehlgeschlagen (evtl. nichts zu sichern)."
echo "     ✓ Commit erstellt: $(git log -1 --format='%h %s' | cut -c1-90)"

echo ""
read -p "4/4  Jetzt auch auf GitHub hochladen (push)? [j/N] " antwort
if [[ "$antwort" =~ ^[jJyY]$ ]]; then
  git push && echo "     ✓ GitHub: OK" || abbruch "Push fehlgeschlagen (Commit ist lokal gespeichert)."
else
  echo "     Nicht hochgeladen – der Commit ist lokal gespeichert."
fi

echo ""; echo "FERTIG."
read -p "Enter drücken zum Schließen."
