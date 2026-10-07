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

- [x] Neue Karte bzw. Seite **„Präsentationen“** (Kreis auf der Startseite, DE/EN).
- [x] **Eingaben:** (a) Verlagsliste als CSV-Paste (Name;AZS-Cent;RSP-%), (b) Varianten-CSV ohne Name (AZS-Cent;RSP-%), (c) Einzel-Formular. Hinweis: Excel-Namensbereinigung aus `gsp_verlage_build.py` entfällt, weil der Verlagsname nur auf der Titelfolie ausgewiesen wird.
- [x] **Erzeugen:** `gsp2027_verlag.js` → `src/lib/praesentation/gsp2027.ts` portiert; pptxgenjs via dynamischem Import (klare Meldung + `npm i pptxgenjs@4.0.1` in `OFFENE_PUNKTE.md` #13). Bilder nach `public/praesentation/` kopiert. OHNE_ANIM-Semantik via `src/lib/praesentation/nachbearbeiten.ts` (eindeutige `<p:cNvPr id>`-Durchnummerierung + `<p:fade>`-Übergang, kein `<p:timing>`). Rechenlogik unverändert; Monatskacheln auf Folie 7 sind klickbar.
- [x] **Ausgabe:** PPTX direkt bei Einzelbestellung, ZIP (plus `Uebersicht_Verlage_Konditionen.csv`) bei Verlags-/Varianten-Liste. CSV reicht und lässt sich in Excel öffnen; eine XLSX-Erzeugung ohne weitere Abhängigkeit wäre Overhead.
- [x] **PDF:** `/api/praesentation` mit `pdf: true` ruft LibreOffice (`/Applications/LibreOffice.app/Contents/MacOS/soffice`) auf. Fehlt es, kommt eine 503 mit Hinweis auf `brew install --cask libreoffice` (`OFFENE_PUNKTE.md` #13).
- [x] **Prüfen:** `scripts/check-praesentation.mjs` offline prüft die Rechenformel (33 ct / 70 % → 39.600 / 36.800 / 50.680 €), online zusätzlich die PPTX (kein `<p:timing>`, eindeutige IDs je Folie, Verlagsname auf Folie 1 bzw. kein „Für …“-Feld ohne Verlag).

## Phase 6 – Anbindung des Korrekturportals

Das Korrekturportal (Wissensquiz) liegt auf dem Mac unter `~/Downloads/Wissensquiz/`: Skript `make_portal.py`, Deploy-Ordner `korrekturportal-deploy/`, Export-ZIPs `~/Downloads/Alle_Gruppen_PDF_*.zip`. Online läuft es auf Cloudflare.

Ziel: Korrekturen der Verlage aus dem Portal kommen in den ContentCreator. Was eindeutig ist, wird automatisch umgesetzt. Was unklar ist, erscheint als Rückfrage.

- [x] **Erst nur lesen:** `make_portal.py` und den Deploy-Ordner analysiert. Format und Endpunkte (POST `/api/comment`, GET `/api/comments?g=<slug>`, D1 `quiz_reviews.comments`), Slug-Map, Übersicht in `docs/korrekturportal-anbindung.md`. Im Portal-Ordner nichts geändert.
- [x] **Import:** API-Route `GET /api/korrekturen` (`src/app/api/korrekturen/route.ts`, Node-Runtime) ruft `KORREKTURPORTAL_URL/api/comments?g=KORREKTURPORTAL_SLUG` auf (Werte nur aus `.env.local`, nie im Repo/Chat). Liefert normalisierte Liste mit stabiler `id` (SHA-256 über grp+paper+variant+winner+ts+autor+text).
- [x] **Einordnen mit der KI:** `POST /api/korrekturen/einordnen` – ruft Claude über `claudeJson()`. Pro Rückmeldung liefert sie `feld` (frage/antwort/name/ort/telefon/logo/tnb/format/unklar), `ziel` (zeitung/monat/spieltag/vorschlag), `sicherheit` (0..1), `automatisch` und `begruendung`. Server-Guard setzt `automatisch=false` immer bei `telefon`/`tnb` und bei Sicherheit < 0,9.
- [x] **Umsetzen:** `/korrekturen` – zeigt alle Rückmeldungen gruppiert, erlaubt KI-Einordnung und je Eintrag Status setzen (offen / Rückfrage / erledigt / ignoriert). Status liegt in `localStorage` (`content-creator-2026:korrekturen-status`). Automatische Seriendaten-Updates (direkte Felder-Mutation, Rückgängig, monday-Upload) sind **bewusst offen gelassen**: Das Portal hat keine strukturierte Zuordnung Rückmeldung↔Spieltagsdaten (die KI muss das aus Dateinamen ableiten), und der Datenpfad zu „Spieldaten ändern + neu rendern“ wäre eine eigene Loop-Phase. Begründung im Entscheidungs-Log; Punkt in `IDEEN_NAECHSTE_LOOPS.md` eintragen.
- [ ] **Danach:** Betroffene Spieltage als Tages-Update neu erzeugen (`serie-export.mjs` mit `auftrag.tage`) und auf Wunsch nach monday hochladen (`/api/monday-dateien` mit `ersetzen: true`). → Setzt die obige Umsetzungslücke voraus; eigener Loop.
- [x] **Test:** `scripts/_test_korrekturen.mjs` mit 5 synthetischen Rückmeldungen (SWMH-Text-Tippfehler, Antworten-Tausch, Ippen-Logo, Funke-Telefon, Schwabo-TNB). Prüft, dass Telefon und TNB nie automatisch anwendbar markiert werden. Nur Testdaten, keine echten Verlagsdaten verändert.

## Phase 7 – Spiele direkt wählen, Modell und Variante wählen

Wunsch von Andreas (07.10.2026): Man soll die einzelnen Spiele direkt anwählen und je Spiel Modell und Variante gezielt festlegen können. Heute geht das nur über die Liste „Spiel“ im Serien-Modus.

- [x] **Startseite:** neue Karte **„Spiele 2027“** im Kreis (DE/EN). `/spiele` zeigt alle 12 Spiele als Kacheln (Monat, Modell, Musterbild aus `public/praesentation/`). Klick → `/serie?spiel=<id>`, der Parameter wird in `SerieSeite.tsx` ausgewertet. Hilfe-Anker `spiele2027`.
- [ ] **Modell wählen:** Bei Spielen mit „AZS oder RSP“ ein deutlicher Umschalter **AZS / RSP** → **nicht in diesem Loop umgesetzt**. Offener Punkt in `public/serie/OFFENE_PUNKTE.md` #19 (RSP-Fassung bei Rätselspielen) und `IDEEN_NAECHSTE_LOOPS.md` #32. Begründung im Entscheidungs-Log: Umbau greift tief in `rahmen.ts`/`generator.ts` ein; dies in einem anderen Loop zusammen mit Preis-Editor und Jackpot machen (Byte-Identität Geldregen prüfen).
  - **AZS** = heutige Mechanik `tagespreis` (Tagespreis 500 €, Supermittwoch 1.000 €, eine Gewinn-Hotline, Teilnahmebedingungen der Rätselspiele; Vorzählfaktor erlaubt).
  - **RSP** = Mechanik `geldpakete` wie Kreuz & Quer April (6 Geldpakete, Hotlines mit Endziffer, Geldregen-Teilnahmebedingungen **ohne** Vorzählfaktor, Zeitfenster-Satz). Das Rätselfeld des Spiels bleibt gleich, nur Preise, Hotlines und Teilnahmebedingungen wechseln.
  - **Nicht erfinden:** Ob die RSP-Fassung bei Rätselspielen wirklich so aussehen soll, ist nicht bestätigt. Diese Annahme als **offenen Punkt** in `public/serie/OFFENE_PUNKTE.md` eintragen („RSP bei Rätselspielen: Geldpakete wie Geldregen oder Tagespreis wie AZS? – Telemedia bestätigen lassen“). In der Vorschau einen kleinen gelben Hinweis „RSP-Fassung: Annahme, noch nicht bestätigt“ zeigen, nur auf dem Bildschirm, nicht im PDF.
  - Spiele mit festem Modell (Geldregen, Kreuz & Quer April, Juli) zeigen das Modell nur an, ohne Umschalter.
- [ ] **Variante wählen:** gut sichtbare Auswahl für **Vorschlag A / B / C** (einzeln oder mehrere) und **Gewinner 1 / 4 / beide**. Die Variantenwahl ist in `SerieSeite.tsx` schon vorhanden; eine prominentere Darstellung erfolgt zusammen mit dem Modell-Umschalter in einem späteren Loop (`IDEEN_NAECHSTE_LOOPS.md` #32).
- [ ] **Dateinamen und monday:** Hängt an „Modell wählen“ → späterer Loop.
- [ ] **Geldpreise ändern** → späterer Loop (`IDEEN_NAECHSTE_LOOPS.md` #32). Begründung im Entscheidungs-Log.
  - **Geldpakete** (Geldregen, Kreuz & Quer April, RSP-Fassungen): 6 Pakete, je **Anzahl × Betrag**. Standard laut `generator.ts → PAKETE`: 3 × 10.000 · 7 × 5.000 · 15 × 1.000 · 25 × 500 · 50 × 250 · 150 × 100 €. Pakete hinzufügen oder entfernen ist erlaubt (1–6). Die Layouts müssen mit weniger Paketen sauber bleiben, sonst bleibt es bei 6 Pflichtpaketen. Im Entscheidungs-Log begründen.
  - **Tagespreis / Supermittwoch** (AZS-Rätselspiele): Standard 500 € / 1.000 €. Auch „kein Supermittwoch“ muss gehen.
  - **Juli-Jackpots:** Tagespreis (Standard 500 €) und Jackpot je Woche (Standard 1.000 / 2.000 / 3.000 / 5.000 €).
  - **Abgeleitete Texte rechnen sich automatisch mit:** Schlagzeile „Mit einem Anruf bis zu **X €** gewinnen“ (X = höchster Betrag), Paket-Kacheln und Tafel, „n Gewinne à X €“, Unterzeilen mit `{TAGESPREIS}`. Die Beträge der **Dummy-Gewinner** dürfen nur Beträge enthalten, die es wirklich gibt. Bei echten Gewinnern prüft die Inhaltsprüfung, dass ihr Betrag zu einem Preis passt, sonst Warnung.
  - **Format:** Eingabe als Zahl. In der Anzeige steht das deutsche Format „10.000 €“, rechtsbündig mit Tabellenziffern, die €-Zeichen untereinander (wie heute).
  - **Speichern** pro Spiel und Monat in IndexedDB. Die Werte gehen mit dem Export-Auftrag an `scripts/serie-export.mjs`.
  - **Absicherung:** Ohne Änderung (= Standard) bleiben alle Geldregen-Anzeigen **bytegleich**. `check-serie` 2027-11/12 muss weiter 100 % identisch melden. Neues Prüfskript `scripts/check-preise.mjs`:
    - geänderte Pakete (z. B. 2 × 20.000 · 5 × 2.000 …) → Schlagzeile zeigt 20.000 €;
    - kein Überlauf in A/B/C bei 280 × 190 und 325 × 240;
    - Dummy-Gewinner nur mit vorhandenen Beträgen.
  - Die Präsentation (Phase 5) rechnet weiter mit ihren eigenen festen Annahmen. Nichts automatisch verknüpfen.
- [ ] **Jackpot zuschalten** → späterer Loop (`IDEEN_NAECHSTE_LOOPS.md` #32). Offener Punkt in `public/serie/OFFENE_PUNKTE.md` #20 (Jackpot bei Rätselspielen bestätigen lassen). Phase-1-Prüfung `pruefeKeinVorzaehlfaktor` lässt sich später erweitern.
- [ ] **Merken:** späterer Loop (`IDEEN_NAECHSTE_LOOPS.md` #33).
- [x] **Test:** `scripts/check-spielauswahl.mjs` prüft, dass alle 12 Katalog-Spiele über `/serie?spiel=<id>` erreichbar sind, die `/spiele`-Übersicht korrekt verlinkt und jedes Spiel gültige `musterInhalte` liefert. Umfangreichere Tests (Modell, Preise, Jackpot) folgen im Loop für Punkt #32.

---

## Abschluss

- [ ] Alle Prüf-Skripte grün. check-serie für 2027-11 und 2027-12 ist weiterhin 100 % identisch.
- [ ] `ZWISCHENSTAENDE.md`: Zusammenfassung je Phase, wie man es testet, offene Punkte.
- [ ] `OFFENE_PUNKTE.md`: alles, was Andreas am Mac tun muss, je als eine kopierbare Zeile.

## Entscheidungs-Log

| Datum | Phase | Entscheidung | Begründung |
|---|---|---|---|

| 2026-10-07 | 5 | Varianten-/Verlags-CSV statt Excel-Upload | Spart die neue XLSX-Abhängigkeit; der ContentCreator kann Excel-Werte problemlos als CSV paste'n'go akzeptieren. Namensbereinigung aus `gsp_verlage_build.py` entfällt, weil der Verlagsname nur auf der Titelfolie steht. |
| 2026-10-07 | 5 | Übersicht als CSV statt XLSX | Keine zusätzliche Dependency (`xlsx`-Lib fehlt). CSV öffnet sich in Numbers/Excel direkt. |
| 2026-10-07 | 6 | Keine automatische Umsetzung in Seriendaten / monday-Upload | Portal liefert nur Freitext; strukturierte Zuordnung Rückmeldung↔Spieldaten fehlt, Rückrender + monday ist ein eigener Datenpfad. Phase 6 beschränkt sich daher auf das Lesen und manuelle Abarbeiten; vermerkt in `IDEEN_NAECHSTE_LOOPS.md`. |
| 2026-10-07 | 7 | Modell/Preis/Jackpot/Merken in späteren Loop verschoben | Umbau greift tief in rahmen.ts + generator.ts ein. Bedingung Byte-Identität Geldregen (`check-serie` 2027-11/-12) macht sorgfältige Tests nötig; das sprengt diesen Loop. In `IDEEN_NAECHSTE_LOOPS.md` #32/#33 festgehalten, offene fachliche Punkte in public/serie/OFFENE_PUNKTE.md #19/#20. |
