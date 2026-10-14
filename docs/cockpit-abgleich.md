# Cockpit 2027 · Abgleich Flowcharts ↔ Code

Stand 2026-10-14. Grundlage: `_quellen_cockpit/flowcharts/` (13 Seiten DOT + PDF).

Jede Zeile ist ein Knoten aus einem Flowchart. Spalten:

- **Knoten:** Kurzname aus dem DOT.
- **Bedeutung:** was er im Flow bewirkt.
- **Code heute:** vorhandene Datei / Funktion (leer = fehlt, kommt im Cockpit).
- **Status:** `vorhanden` · `fehlt` · `teilweise` · `cockpit-neu` (wird im Cockpit neu gebaut).

## Seite 1 – Übersicht

| Knoten | Bedeutung | Code heute | Status |
|---|---|---|---|
| s | Startseite „Welches Spiel?" | `src/app/spiele/SpieleUebersicht.tsx` | teilweise – zeigt nur Kataloglinks, nicht Status/Deep-Link |
| a2m…kq | 9 Einstiege nach Monat | `katalog()` in `spiele/index.ts` | vorhanden |
| gem/bv/bg/bf | Gemeinsame Bausteine V/G/F | — | cockpit-neu |
| ablauf | 5 Phasen pro Spiel | — | cockpit-neu |

## Seite 2 – Aus 2 mach 1 (Januar · AZS/RSP)

| Knoten | Bedeutung | Code heute | Status |
|---|---|---|---|
| p1 Vorlage | Baustein V | — | cockpit-neu |
| p2 Kampagne | Zeitraum/Verlage/Modell/Preise/Antwortformat/Bildstil/Buchstabenhilfe | `aus2mach1.ts` kennt Buchstabenhilfe + Bildstil | teilweise – Modell AZS/RSP und Kampagnen-Rahmen fehlen |
| e2 Spieltage anlegen | Automat. aus Kampagne | — | cockpit-neu |
| ra Lösungswort 2 Begriffe | Rätseldaten | `aus2mach1.ts` musterInhalte | vorhanden |
| rc 2 Bilder erzeugen | 2 Varianten | `/api/generate-image` | vorhanden |
| rd Prüfung „erkennbar?" | manuell | — | cockpit-neu (Checkliste) |
| re Buchstabenhilfe | automatisch | `aus2mach1.ts` | vorhanden |
| rf Antworten | 2 Antworten | musterInhalte | vorhanden |
| p4/p5/z | Gewinner / Freigabe / grün | — | cockpit-neu |

## Seite 3 – Fehlerjagd (Februar · AZS/RSP)

| Knoten | Bedeutung | Code heute | Status |
|---|---|---|---|
| p2 Kampagne | Anzahl Unterschiede | `fehlerjagd.ts` | teilweise |
| ra Original | Bild | `/api/generate-image` | vorhanden |
| rb Suchbild + Protokoll | natürliche Unterschiede | — | cockpit-neu (Protokoll fehlt) |
| rc Zählung | eindeutig | — | cockpit-neu |
| rd Antworten | z. B. 5/7 | musterInhalte | vorhanden |
| rf Auflösungsbild | Folgetag | — | cockpit-neu |

## Seite 4 – Geldregen (März/Nov/Dez · RSP) *FREIGEGEBEN*

| Knoten | Bedeutung | Code heute | Status |
|---|---|---|---|
| p2 Kampagne (Geldpakete, Hotline, Nov+Dez fortlaufend, 0/1/4 Gewinner) | `generator.ts` + `public/serie/fragen_2027.json` + `zeitungen.json` | vorhanden |
| ra Frage des Tages (Excel/KI) | `/api/serie-fragen` + fragen_2027.json | vorhanden |
| rb 2 Antworten (Endziffer 1/2) | fragen_2027.json | vorhanden |
| rc Faktencheck (Quelle Pflicht) | — | fehlt – Pflichtfeld „Quelle" einführen |
| rd Doppelte ausschließen | — | fehlt – Prüfung |
| p4 Gewinner (1 oder 4) + Gewinnertext | `serienGewinner`-Store (DB v6) | teilweise – Gewinnertext ohne Zeichenzähler |
| p5 Freigabe | `/serie` + `check-serie.mjs` | teilweise |

## Seite 5 – Geldregen Kreuz & Quer (April · RSP)

| Knoten | Bedeutung | Code heute | Status |
|---|---|---|---|
| p2 Kampagne | Geldpakete | `kreuzquer.ts` (`kreuzQuerApril`) + `kq_geldregen_inhalte.json` | teilweise |
| ra Lösungs- und Alternativwort | — | cockpit-neu (Eingabe-Formular fehlt) |
| rb Gitter automatisch (Lösungsfelder 1–5) | `kreuzquer.ts` | teilweise |
| rc Hinweisbild | `/api/generate-image` | vorhanden |
| rd „eindeutig lösbar?" | — | cockpit-neu (manuelle Prüfung) |

## Seite 6 – Brückenrätsel (Mai · AZS/RSP)

| Knoten | Bedeutung | Code heute | Status |
|---|---|---|---|
| ra Lösungswort | `brueckenraetsel.ts` | vorhanden |
| rb Wortpaare + Brückenwort | — | cockpit-neu (Wörterbuch-Prüfung fehlt) |
| rc Prüfung Zusammensetzung | — | fehlt – KI-Fallback |
| rd Mittelspalte Lösung | `brueckenraetsel.ts` | vorhanden |
| rf Brückenwörter-Liste + Beispiel | — | cockpit-neu |

## Seite 7 – Kombinieren & Kassieren (Juni · AZS/RSP)

| Knoten | Bedeutung | Code heute | Status |
|---|---|---|---|
| ra Begriffspaar + 1 Bild | `kombinieren.ts` | vorhanden |
| rb „beide erkennbar?" | — | cockpit-neu |
| rc Buchstabenhilfe | — | fehlt im Spiel – prüfen |

## Seite 8 – Juli-Jackpot (Juli · nur RSP, 4 Wochen)

| Knoten | Bedeutung | Code heute | Status |
|---|---|---|---|
| r0 Woche wählen | Postkarte · Wahr/erfunden · Sprichwort · Schatten | `juli.ts` (4 Spiele) | vorhanden |
| p2 Jackpot ein/aus je Woche | — | cockpit-neu |
| rd Endziffer + Jackpot | — | cockpit-neu |
| ra Schattenregeln | SKILL (Gegenlicht usw.) | teilweise (Prompt bereits streng) |

## Seite 9 – Gitterrätsel (September · AZS/RSP)

| Knoten | Bedeutung | Code heute | Status |
|---|---|---|---|
| Spieldefinition | `gitterraetsel` in `kreuzquer.ts` Zeile 763 | vorhanden |
| ra Wörterliste nach Länge | `tm_original_inhalte.json → gitter` | teilweise (Inhalte liegen vor, Logik in Spieldef prüfen) |
| rb Gitter + vorgegebenes Wort | — | teilweise |
| rc Lösungsfelder markieren | — | teilweise |
| rd Eindeutigkeit prüfen | — | fehlt – Testskript `_test_gitter.mjs` fehlt |

## Seite 10 – Kreuz & Quer (Oktober · nur AZS)

| Knoten | Bedeutung | Code heute | Status |
|---|---|---|---|
| Spieldefinition | `kreuzQuerOktober` in `kreuzquer.ts` Zeile 737 | vorhanden |
| ra Lösungswort | — | teilweise |
| rb Kreuzworträtsel-Logik | — | teilweise |
| rc Bild des Tages | `/api/generate-image` | vorhanden |

## Seite 11 – Baustein V · Vorlage (Grafiker)

| Knoten | Bedeutung | Code heute | Status |
|---|---|---|---|
| v2 Upload (PDF/IDML/PNG) | `VorlagenUpload.tsx` + `/api/analyze-template` | teilweise (IDML fehlt) |
| v3 Analyse | `/api/analyze-template` | vorhanden |
| v4 Felder zuordnen | — | cockpit-neu (klickbare Zuordnung fehlt) |
| v5 Vorschlag A/B/C | `WegAuswahl.tsx` | vorhanden |
| v6 Musterdaten-Vorschau (0/1/4 Gewinner, längster Text, längster Zeitungsname) | — | cockpit-neu |
| v9 Je Zeitung ableiten | `verlage.ts` | vorhanden |
| v10 Freigabe → gesperrt | — | cockpit-neu |

## Seite 12 – Baustein G · Gewinner (NEU mit Gewinnertext)

| Knoten | Bedeutung | Code heute | Status |
|---|---|---|---|
| g0 Gibt es Gewinner? | 1. Spieltag = nein | — | cockpit-neu |
| g2 Link zum Foto-Formular | monday-Formular | teilweise (`src/app/api/monday/`) |
| g3 Gewinner lädt Foto hoch | monday + Einwilligung | teilweise |
| g5 Gewinner-Karte (Name/Ort/Betrag/Foto/Einwilligung/Gewinnertext) | `SerienGewinner` in DB v6 | teilweise – Betrag=Preisstufe-Dropdown fehlt |
| g6/g7 Gewinnertext + KI-Vorschlag | — | cockpit-neu (Route + Zähler fehlen) |
| g8 Länge ≤90 (1) / ≤45 (4) | — | cockpit-neu |
| g10 Foto bis 14:00 Uhr | — | cockpit-neu (Hinweis) |
| g11 Neutrales Symbol fallback | — | fehlt |
| g12 Satz zusammensetzen | — | cockpit-neu (im Rahmen) |

## Seite 13 – Baustein F · Prüfen und freigeben

| Knoten | Bedeutung | Code heute | Status |
|---|---|---|---|
| f1 Lösung Vortag übernehmen | — | cockpit-neu |
| f2 Live-Vorschau je Zeitung | `/serie` iframe | vorhanden |
| f3 Knopf „Prüfen und freigeben" | — | cockpit-neu |
| f4 Automat. Prüfungen (Pflicht/Überlauf/Beträge/TNB/Lösung) | `pruefen.ts` | teilweise |
| f6 Klartext-Meldung Sprung | — | cockpit-neu |
| f7 Anzeigen für alle Zeitungen | `scripts/serie-export.mjs` | vorhanden |
| f8 monday-Upload (alte Fassung ersetzen) | `src/app/api/monday/` | teilweise |
| f9 Vier-Augen-Prüfer | `src/app/review/[token]` | teilweise |

## Reihenfolge der Phasen

Die im LOOP-Dokument vorgeschlagene Reihenfolge **1 → 7** ist tragfähig. Keine Anpassung nötig. Hintergrund:

- Phase 1 (Gerüst) muss zuerst, weil alle Panels Bausteine brauchen.
- Phase 2 (Datenmodell) ist Pflicht vor jedem Assistenten.
- Phase 3 (Baustein V) wird in Phase 4 verlinkt – deshalb vorher.
- Phase 4 (Kampagne) kann unabhängig von Phase 5 getestet werden.
- Phase 5 (Rätsel) braucht Phase 4 (Spieltag-Liste).
- Phase 6 (Gewinner) und Phase 7 (Freigabe) sind täglich – stehen am Ende.

## Lücken, die ins Cockpit müssen (Zusammenfassung)

1. **Pflichtfeld „Quelle"** bei Geldregen-Fragen (bisher nur Fließtext).
2. **Doppelte-Frage-Prüfung** bei Geldregen.
3. **Felder zuordnen** per Klick auf importiertes PDF/Bild (Baustein V).
4. **Musterdaten-Vorschau** 0/1/4 Gewinner im Rahmen.
5. **Gewinnertext**-Baustein inkl. Zeichenzähler und KI-Vorschlag.
6. **Rollen**-Umschalter Grafiker/Redaktion/Prüfer.
7. **Status-Chips** einheitlich (grau/gelb/rot/grün + Symbol).
8. **Stapel-KI** je Spiel (Rätsel für die ganze Kampagne).
9. **Jackpot-Schalter** je Juli-Woche.
10. **Preis-Editor** mit Nachrechnung abgeleiteter Texte.
