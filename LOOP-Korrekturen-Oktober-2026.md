# LOOP – ContentCreator2026: Korrekturen Oktober 2026

**Arbeitsanweisung für Claude Code.** Lies dieses Dokument ganz. Arbeite die Phasen der Reihe nach ab: erste offene Aufgabe `[ ]` nehmen, umsetzen, prüfen, abhaken `[x]`, mit klarer Message committen (`git --no-optional-locks …`). Arbeite **ohne Rückfragen** bis zum Ende. Wenn etwas unklar ist, wähle die vernünftigste Lösung und begründe sie kurz im Entscheidungs-Log am Ende dieser Datei.

**Hintergrund:** Rückmeldungen von Jenny Wiegandt, Yasmina Salah und Andreas Gnam (Telemedia) vom 06./07.10.2026 zur Präsentation „Gewinnspielplan 2027“. In den Dummies der Präsentation ist das bereits umgesetzt. Im ContentCreator fehlt es noch. Dazu kommen zwei neue Funktionen: Präsentationen per Knopfdruck und die Anbindung des Korrekturportals.

---

## 0. Nicht verhandelbare Regeln

1. **Kein Deploy, kein `git push`, keine Secrets.** Ein-Zeilen-Befehle für Andreas kommen nach `OFFENE_PUNKTE.md`.
2. **npm-Installationen nur auf dem Mac von Andreas.** Fehlt ein Paket, die Funktion mit verständlicher Fehlermeldung bauen und den Befehl `npm i …` in `OFFENE_PUNKTE.md` eintragen.
3. **Kein `rm -rf`.** Veraltete Dateien nach `_alt/` verschieben.
4. **Nichts erfinden.** Keine Rechtstexte, Telefonnummern, Kontaktdaten oder Konditionen erfinden. Fehlt eine Angabe, einen gelben Platzhalter setzen und den Punkt in `public/serie/OFFENE_PUNKTE.md` eintragen.
5. **Datei-Änderungen unter `src/` laden die laufende Seite neu.** Läuft gerade ein Upload im Browser, zuerst warten.
6. **Jede Phase endet mit Prüfung:** `node_modules/.bin/tsc --noEmit -p .` ohne Fehler, `node scripts/check-i18n.mjs`, `node scripts/check-umlaute.mjs`, `node scripts/check-hilfe.mjs`. Bei Geldregen-Änderungen zusätzlich `node scripts/check-serie.mjs 2027-11 <Referenz>` und `… 2027-12 <Referenz>`: alle identisch, 0 Fehler. Referenz ist `~/Downloads/01_Projekte/Telemedia/Spiele_2027/Geldregen_2027/_html`.
7. **Die Geldregen-Anzeigen Nov/Dez 2027 sind freigegeben und liegen in monday.** `src/lib/serie/generator.ts` nur ändern, wenn es nötig ist. Wenn ja, muss check-serie danach weiterhin 100 % identisch melden.
8. **Oberfläche zweisprachig (DE/EN)** über `T()` in `src/lib/i18n.ts`. Hilfetexte im Handbuch ergänzen.
9. Am Ende jeder Phase einen kurzen Eintrag in `ZWISCHENSTAENDE.md`: was geht, wie man es testet.

**Quellen für diesen Loop** liegen in `_quellen_loop_2026-10/` (nicht im Repo):
- `tnb/Teilnahmebedingungen SWMH und SWP (Text).txt`: Geldregen-Teilnahmebedingungen 2026 von Yasmina. Sie bestätigen den Wortlaut in `generator.ts → tnbText`.
- `tnb/jul_postkarte.html`, `tnb/kq_b4.html`: die korrigierten Dummies aus der Präsentation (Stand 07.10.2026). Daraus die Zeitfenster-Sätze wörtlich übernehmen.
- `praesentation/`: Generator der Präsentation (`gsp2027_verlag.js`, pptxgenjs 4.0.1), Bau-Skripte, `gsp_bilder/`, Verlags-Excel.

---

## Phase 1 – Juli-Spiele: Teilnahmebedingungen ohne Vorzählfaktor

Regel von Jenny und Yasmina: **Wo mit Zeitschienen gespielt wird (Geldregen, Kreuz & Quer April, alle Juli-Spiele), gibt es keinen Vorzählfaktor.** Bei den normalen Rätselspielen (Auszahlungsspiele) bleibt er erlaubt.

- [x] `src/lib/serie/spiele/tnb.ts`, Zweig `'jackpot'`: Statt des Vorzählfaktor-Texts kommt der **Geldregen-Wortlaut je Zeitung**. Am besten `tnbText()` aus `generator.ts` wiederverwenden, mit eigener Verlagsgruppe zuerst, Gender-Variante und Nürnberger Variante wie dort. Dabei:
  - Spielname ersetzen: „Das Gewinnspiel „<Spielname>“ kann jederzeit …“.
  - Aktionszeitraum = die Spielwoche.
  - Am Ende die Fussnote wörtlich wie in `tnb/jul_postkarte.html`: „* Für jeden Tag wird vor Spielbeginn für den Jackpot ein Zeitfenster unterschiedlicher Länge festgelegt, das dann von einem Zufallsgenerator auf einen Zeitpunkt im Laufe des jeweiligen Tages gesetzt wird.“
- [x] Die Juli-Wochen müssen überall gleich sein: **01.–11.07., 12.–18.07., 19.–25.07., 26.–31.07.2027**, so wie in der Präsentation (Folie 15) und in `juli.ts`. `scripts/_test_juli.mjs` erwartet noch 01.–10.07. usw. Die Erwartungen anpassen, damit der Test grün wird. Der Fehler „Aktionszeitraum fehlt in TNB“ muss verschwinden.
- [x] Neue Prüfung in `src/lib/serie/pruefen.ts` bzw. im Rahmen-Prüfer: Bei Mechanik `geldpakete` und `jackpot` darf **„Vorzählfaktor“ nicht vorkommen**. Sonst ist das ein Fehler.
- [x] Testen: `node scripts/_test_juli.mjs` ist grün. Auf der Prüfseite `_pruef/<id>.html` zeigt die Prüftabelle 0 echte Hinweise, die Teilnahmebedingungen passen ins Band und laufen nicht über.

## Phase 2 – Kreuz & Quer April: Zeitfenster-Satz in den Teilnahmebedingungen

Andreas G. wünscht das (06.10.2026), weil in der Anzeige wenig Platz ist.

- [x] `tnb.ts`, Zweig `'geldpakete'`: Direkt nach „Wochenende: Samstag 00:00 Uhr bis Sonntag 23:59 Uhr.“ diesen Satz einfügen (wörtlich wie in `tnb/kq_b4.html`): „Vor Spielbeginn wurden für alle Gewinne Zeitfenster unterschiedlicher Länge festgelegt, die per Zufallsgenerator über den Spieltag verteilt werden.“
- [x] `node scripts/_test_kreuzquer.mjs` ist grün. Die Prüfseite zeigt keine Überläufe, besonders bei den niedrigen Formaten 280 × 190 und 278 × 190.

## Phase 3 – Die anderen 11 Spiele sichtprüfen

Seit 06.10.2026 gilt im gemeinsamen Rahmen: Teilnahmebedingungen über die ganze Breite (2 mm Rand), keine Schatten. Schatten werden im Chrome-PDF als Bild gespeichert und erscheinen in der Mac-Vorschau als graue Kästen. Ausserdem gibt es den neuen SVG-Goldtitel.

- [x] Für jedes Spiel eine Prüfseite erzeugen (`scripts/serie-pruefseite.mjs` bzw. die `_test_*`-Skripte): Zeitungen ta, sz, shz, schwabo, swp · 2 Spieltage · A/B/C · 1 und 4 Gewinner. Im Browser öffnen (`npm run dev`): Die Prüftabelle muss **ECHTE HINWEISE: 0** zeigen. (HTML-Daten geprüft; Browser-Begutachtung macht Andreas.)
- [x] Im erzeugten HTML aller Spiele darf es kein `box-shadow`, kein `text-shadow` und kein `filter:` geben. Ausnahme: der Rahmen der Prüfseite selbst. Gefundene Stellen in `rahmen.ts` bzw. den Spieldateien entfernen. Das als automatische Prüfung in die Test-Skripte einbauen.
- [ ] Je Spiel 2 PDFs mit `scripts/serie-export.mjs` erzeugen und mit `pdftoppm -r 110` ansehen. Achten auf: abgeschnittene Unterlängen in Schlagzeilen, Teilnahmebedingungen bündig 2 mm, Namen und Orte einzeilig, keine grossen Leerräume, Gewinnerzahl passend zum Dateinamen (1 bzw. 4), 1. Spieltag nur dort ohne Gewinner, wo das Spiel neu beginnt. Funde beheben, Screenshots nach `_pruef/` legen. (PDF-Rendering macht Andreas am Mac – siehe `OFFENE_PUNKTE.md`.)
- [x] Die Ergebnistabelle (Spiel × Befund × behoben) in `ZWISCHENSTAENDE.md` eintragen.

## Phase 4 – Offene Punkte aktualisieren

`public/serie/OFFENE_PUNKTE.md` und `OFFENE_PUNKTE.md` auf den Stand vom 07.10.2026 bringen:

- [x] Nr. 8: Die Liste der teilnehmenden Verlage ist **bestätigt** (Vorlage Yasmina, Geldregen März/April 2026). Für 2027 kommt FUNKE Medien Thüringen dazu.
- [x] Nr. 9: **Erledigt.** Nov und Dez sind ein durchgehender Geldregen. Aktionszeitraum 01.11.–31.12.2027 (`zeitungen.json → aktionszeitraum`). Die Dezember-Spieltage zählen weiter (27–53).
- [x] Nr. 13 und 14: aktualisieren. „Heute startet der Geldregen!“ steht nur am 1. Spieltag einer Aktion. Die Datei heisst dann „ohne-Gewinner“, in monday liegt sie in beiden Spalten.
- [x] Neu: die Vorzählfaktor-Regel aus Phase 1.
- [x] Neu, offene Frage an Telemedia: Gilt die Anmeldefrist von 8 Wochen (Folie 6) auch für die Juli-Spiele?
- [x] Neu, Kleinigkeit: Im SWP-Hotline-Satz steht „·“ zwischen Nummer und „Keine Gewinnspielteilnahme“. Yasminas Vorlage hat dort einen Zeilenumbruch. Erst ändern, wenn Telemedia das bestätigt. Danach müssten die SWP-Anzeigen neu erstellt werden.
- [x] Veraltetes nach unten unter „Erledigt“ verschieben, nicht löschen.

## Phase 5 – Präsentationen per Knopfdruck

Heute baut Claude die Präsentation „Gewinnspielplan 2027“ mit Skripten ausserhalb des ContentCreators (`_quellen_loop_2026-10/praesentation/`). Daraus wird eine Funktion im ContentCreator.

- [ ] Neue Karte bzw. Seite **„Präsentationen“** (Kreis auf der Startseite, DE/EN).
- [ ] **Eingaben:**
  - (a) Verlagsliste aus Excel hochladen. Spalten wie `Übersicht der Verlage für Präsentation GWS-Plan 2027.xlsx`: Name, AZS €/Anruf, RSP-Anteil. Die Namensbereinigung wie in `gsp_verlage_build.py` übernehmen (Tabelle `NAMEN`/`KURZ`).
  - (b) Alternativ Varianten ohne Verlagsnamen: Liste aus „AZS-Cent / %-Anteil RSP & GR“, z. B. 26/60, 32/50 …
  - (c) Einzelne Präsentation mit frei eingegebenem Namen und Konditionen.
- [ ] **Erzeugen:** `gsp2027_verlag.js` als Modul nach `src/lib/praesentation/` portieren (pptxgenjs im Browser, Version 4.0.1). Ist pptxgenjs nicht installiert: klare Meldung und `npm i pptxgenjs@4.0.1` in `OFFENE_PUNKTE.md`. Bilder aus `gsp_bilder/` nach `public/praesentation/`.
  - Keine Klick-Animationen: Die Präsentation erscheint komplett, wie mit `OHNE_ANIM=1` in `gsp2027_anim.py`. Die eindeutigen Shape-IDs pro Folie aus diesem Skript übernehmen.
  - Die Rechenlogik unverändert lassen: AZS mit 120.000 Anrufen und 2.800 € Preisgeldanteil, RSP-Basis 72.400 €.
  - Ganze Monatskacheln auf Folie 7 sind Links (Stand 07.10.2026).
- [ ] **Ausgabe:** PPTX je Verlag oder Variante. Bei mehreren Dateien ein ZIP plus `Uebersicht_Verlage_Konditionen.xlsx`.
- [ ] **PDF:** Lokal über eine API-Route, die LibreOffice (`soffice --headless --convert-to pdf`) aufruft, falls es installiert ist (`/Applications/LibreOffice.app/Contents/MacOS/soffice`). Sonst eine klare Meldung, und die Installation als Punkt in `OFFENE_PUNKTE.md`.
- [ ] **Prüfen:**
  - Folien 17 und 19 zeigen die richtigen Beträge. Muster: 33 Cent / 70 % → 39.600 €, Verdienst 36.800 €, RSP 50.680 €.
  - Ohne Verlagsnamen steht auf der Titelfolie keine Zeile „Für …“.
  - Die Datei hat keine `<p:timing>`-Knoten.
  - Diese Prüfungen als Skript `scripts/check-praesentation.mjs` ablegen.

## Phase 6 – Anbindung des Korrekturportals

Das Korrekturportal (Wissensquiz) liegt auf dem Mac unter `~/Downloads/Wissensquiz/`: Skript `make_portal.py`, Deploy-Ordner `korrekturportal-deploy/`, Export-ZIPs `~/Downloads/Alle_Gruppen_PDF_*.zip`. Online läuft es auf Cloudflare.

Ziel: Korrekturen der Verlage aus dem Portal kommen in den ContentCreator. Was eindeutig ist, wird automatisch umgesetzt. Was unklar ist, erscheint als Rückfrage.

- [ ] **Erst nur lesen:** `make_portal.py` und den Deploy-Ordner analysieren. Wie werden Korrekturen gespeichert und abgerufen (Format, Endpunkt, Datei)? Das Ergebnis kurz in `docs/korrekturportal-anbindung.md` festhalten. Im Portal-Ordner nichts ändern.
- [ ] **Import:** API-Route `/api/korrekturen` (nur lokal), die Korrekturen aus dem Portal liest. Je nach Analyse ist das eine Export-Datei oder ein JSON-Endpunkt. Ein Token darf nur aus `.env.local` kommen, nie aus Repo oder Chat.
- [ ] **Einordnen mit der KI:** Je Korrektur bestimmen:
  - **was** geändert wird: Frage, Antwort, Name/Ort eines Gewinners, Telefonnummer, Logo, Text der Teilnahmebedingungen, Format;
  - **wo**: Zeitung, Monat, Spieltag, Vorschlag;
  - **wie sicher** die Zuordnung ist.
  Dafür `/api/dialog` (Claude) mit festem JSON-Schema verwenden.
- [ ] **Umsetzen:**
  - Eindeutige Korrekturen (Sicherheit ≥ 0,9, Feld eindeutig) direkt in den Seriendaten ändern, mit Verlauf und **Rückgängig**.
  - Unklare Korrekturen in einer Liste „Rückfragen“ zeigen, mit dem Originaltext aus dem Portal und einem Antwortfeld.
  - **Telefonnummern und Teilnahmebedingungen nie automatisch ändern.** Die kommen immer als Rückfrage, weil sie rechtlich relevant sind.
- [ ] **Danach:** Betroffene Spieltage als Tages-Update neu erzeugen (`serie-export.mjs` mit `auftrag.tage`) und auf Wunsch nach monday hochladen (`/api/monday-dateien` mit `ersetzen: true`).
- [ ] **Test:** mit 5 erfundenen Beispiel-Korrekturen in `scripts/_test_korrekturen.mjs`. Nur Testdaten, keine echten Verlagsdaten verändern.

---

## Abschluss

- [ ] Alle Prüf-Skripte grün. check-serie für 2027-11 und 2027-12 ist weiterhin 100 % identisch.
- [ ] `ZWISCHENSTAENDE.md`: Zusammenfassung je Phase, wie man es testet, offene Punkte.
- [ ] `OFFENE_PUNKTE.md`: alles, was Andreas am Mac tun muss, je als eine kopierbare Zeile.

## Entscheidungs-Log

| Datum | Phase | Entscheidung | Begründung |
|---|---|---|---|
