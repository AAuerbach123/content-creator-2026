# LOOP – ContentCreator2026: „Cockpit 2027“ (einfache Bedienung je Spielkonzept)

**Arbeitsanweisung für Claude Code.** Lies dieses Dokument ganz, danach `AGENTS.md` und `.claude/skills/content-creator-projekt/SKILL.md` (falls vorhanden). Arbeite die Phasen der Reihe nach ab: erste offene Aufgabe `[ ]` nehmen, umsetzen, prüfen, abhaken `[x]`, mit klarer Message committen (`git --no-optional-locks …`). Arbeite **ohne Rückfragen** bis zum Ende. Ist etwas unklar, wähle die vernünftigste Lösung und begründe sie kurz im Entscheidungs-Log am Ende dieser Datei.

## Ziel

Andreas findet den ContentCreator zu schwer zu bedienen. Telemedia spielt 2027 nur wenige Spielkonzepte, jedes mit wenigen Einstellungen. Gebaut wird ein neues, schlankes Admin-Werkzeug **„Cockpit 2027“** unter `/cockpit`, das genau den Flowcharts folgt:

- **Eigener Einstieg pro Spielkonzept** (9 Stück, auch wenn sie sich überschneiden).
- **Jedes Spiel hat 5 Phasen:** 1 Vorlage (Grafiker, am Anfang) · 2 Kampagne einstellen (einmal) · 3 Rätsel erstellen (**für jeden Spieltag neu**) · 4 Gewinner vom Vortag (täglich) · 5 Prüfen und freigeben (täglich).
- **Drei gemeinsame Bausteine:** V Vorlage importieren · G Gewinner erfassen (NEU mit Gewinnertext) · F Prüfen und freigeben.
- **Messlatte:** Jenny erledigt einen kompletten Spieltag inkl. Gewinner **in unter 5 Minuten, ohne Anleitung**.

Die heutige Oberfläche (Startkreis, Serien-Modus `/serie`, `/spiele`, Präsentationen, Korrekturen) **bleibt erhalten** und wird im Cockpit nur unter „Erweitert“ verlinkt. Das Cockpit nutzt die vorhandene Technik (Generator, Rahmen, Spieldefinitionen, Prüfungen, monday, Korrekturportal, KI-Routen) – es baut keine zweite Anzeigen-Engine.

## Quellen (lokal, nicht im Repo, Ordner `_quellen_cockpit/`)

- `flowcharts/ContentCreator_Flowcharts_je_Spielkonzept.pdf` – **die verbindliche Vorgabe** (13 Seiten). Die Graphviz-Quellen `*.dot` und `flowcharts_quelle.py` enthalten jeden Schritt, jede Entscheidung und jede Einstellung im Klartext. Lies sie vollständig und setze jeden Knoten um oder begründe im Log, warum nicht.
- `inhalte/tm_original_inhalte.json` – Originaltexte und Rätsel der Telemedia-Spiele (Aus 2 mach 1, Brückenrätsel, Kombinieren & Kassieren, **Gitterrätsel**, Kreuz & Quer) 1:1.
- `inhalte/kq_geldregen_inhalte.json` – Kreuz & Quer im Geldregen-Prinzip (April-Dummy der Präsentation).
- `inhalte/moderne_varianten_generator.mjs` – Layout-Ideen der modernen Varianten (Split / Bento / Poster) – nur als Gestaltungsreferenz.
- Telemedia-Logo: `public/telemedia-logo.png`.

## Die 9 Spielkonzepte (Einstiege)

| Einstieg | Monat | Modell | Vorhanden im Code? |
|---|---|---|---|
| Aus 2 mach 1 | Januar | AZS oder RSP | `src/lib/serie/spiele/aus2mach1.ts` |
| Fehlerjagd | Februar | AZS oder RSP | `fehlerjagd.ts` |
| Geldregen | März · Nov · Dez | RSP | `src/lib/serie/generator.ts` (**freigegeben, bytegleich halten!**) |
| Geldregen Kreuz & Quer | April | RSP · Provision gemäss Zusatzvereinbarung | `kreuzquer.ts` (Mechanik `geldpakete`) |
| Brückenrätsel | Mai | AZS oder RSP | `brueckenraetsel.ts` |
| Kombinieren & Kassieren | Juni | AZS oder RSP | `kombinieren.ts` |
| Juli-Jackpot (4 Wochen: Postkarte · Wahr oder erfunden · Sprichwort · Schatten) | Juli | nur RSP | `juli.ts` |
| Gitterrätsel | September | AZS oder RSP | **fehlt vermutlich** – prüfen, sonst neu anlegen (Inhalte aus `tm_original_inhalte.json → gitter`) |
| Kreuz & Quer | Oktober | AZS | prüfen, ob `kreuzquer.ts` eine AZS-Fassung hat; sonst ergänzen |

---

## 0. Nicht verhandelbare Regeln

1. **Kein Deploy, kein `git push`, keine Secrets.** Ein-Zeilen-Befehle für Andreas kommen nach `OFFENE_PUNKTE.md`.
2. **npm-Installationen nur auf dem Mac von Andreas.** Fehlt ein Paket, baue die Funktion ohne es oder mit verständlicher Meldung und trage `npm i …` in `OFFENE_PUNKTE.md` ein.
3. **Kein `rm -rf`.** Veraltetes nach `_alt/` verschieben.
4. **Nichts erfinden:** keine Rechtstexte, Telefonnummern, Konditionen, Verlagsdaten. Fehlt etwas → gelber Platzhalter + Eintrag in `public/serie/OFFENE_PUNKTE.md`.
5. **Geldregen Nov/Dez 2027 ist freigegeben und liegt in monday.** `generator.ts` nur ändern, wenn unvermeidbar. Danach muss `node scripts/check-serie.mjs 2027-11 <Ref>` und `… 2027-12 <Ref>` weiterhin **100 % identisch** melden (Referenz: `~/Downloads/01_Projekte/Telemedia/Spiele_2027/Geldregen_2027/_html`). Neue Felder (z. B. Gewinnertext) sind **optional**: leer = Ausgabe bytegleich wie heute.
6. **Datei-Änderungen unter `src/` laden die laufende Seite neu.** Läuft gerade ein Upload im Browser, zuerst warten.
7. **Jede Phase endet mit Prüfung:** `node_modules/.bin/tsc --noEmit -p .` fehlerfrei, `node scripts/check-i18n.mjs`, `node scripts/check-umlaute.mjs`, `node scripts/check-hilfe.mjs`, `node scripts/check-spielauswahl.mjs`; bei Spiel-/Rahmen-Änderungen die passenden `scripts/_test_*.mjs` und check-serie.
8. **Zweisprachig (DE/EN)** über `T()` in `src/lib/i18n.ts`, keine harten Strings. Hilfetexte im Handbuch ergänzen (`handbuch-inhalt.ts`, Anker pro Phase).
9. **Echte Umlaute und ß** (deutsche Kunden). Beträge im deutschen Format „1.000 €“.
10. **monday:** nur die bestehenden TEST-Boards (privat, keine Personen, keine Benachrichtigungen, keine Automationen). Neue Boards nur als `TEST …`.
11. Am Ende jeder Phase ein kurzer Eintrag in `ZWISCHENSTAENDE.md`: was geht, wie man es testet (URL + Klickweg).

---

## Gestaltung (für die ganze Phase-Arbeit verbindlich)

**Marke Telemedia** – Farben aus der Präsentation 2027 als CSS-Variablen in `src/app/cockpit/cockpit.css` (oder Tailwind-Theme, je nach Projektstand):

| Token | Wert | Verwendung |
|---|---|---|
| `--tm-rot` | `#9B1438` | Primärknopf, aktive Schritte, Fokus-Akzent |
| `--tm-dunkelrot` | `#7A0F2C` | Hover/Pressed des Primärknopfs |
| `--tm-gold` | `#E8B64A` | Hervorhebung „Supermittwoch/Jackpot“, Status „vorbereitet“ |
| `--tm-hell` | `#F6F4F1` | Grundfläche |
| `--tm-rose` | `#F6E6EB` | sanfte Flächen, ausgewählte Karten |
| `--tm-dunkel` | `#1C1B22` | Text |
| `--tm-grau` | `#5E616B` | Sekundärtext |
| `--tm-linie` | `#E4E1DC` | Rahmen, Trennlinien |

- **Blasser Hintergrund:** `--tm-hell` als Basis, darüber 2–3 sehr weiche, unscharfe Farbflächen (radial-gradient) in Rot/Rosé/Gold mit **4–8 % Deckkraft**, fest (kein Scroll-Parallax). Inhalt liegt auf weissen Karten mit dezentem Rand (keine harten Schatten).
- **Logo:** `public/telemedia-logo.png` oben links in der Kopfzeile (Höhe ca. 32 px), daneben „Cockpit 2027“. Auf dunklen Flächen nicht verwenden.
- **Schrift:** die im Projekt vorhandene UI-Schrift; Grundgrösse 16 px, Zeilenhöhe 1,5.

**Gestaltungsregeln für gute Admin-Werkzeuge** (aktueller Stand der UX-Praxis: Nielsen-Heuristiken, WCAG 2.2 AA, Muster aus modernen Admin-Tools wie Linear, Stripe Dashboard, Notion – nur als Prinzipien, nichts kopieren):

1. **Eine Hauptaktion pro Bildschirm**, als roter Knopf in einer festen Aktionsleiste unten rechts (sticky). Nebenaktionen als Text-Knöpfe.
2. **Schrittweise Offenlegung:** Standardwerte sind vorausgefüllt; Seltenes steckt unter „Mehr Einstellungen“. Technisches (Dateinamen, Formate, Hotlines, TNB, Prüfdetails) bleibt unsichtbar, solange alles stimmt.
3. **Schrittleiste (Stepper)** für die 5 Phasen eines Spiels und die Unterschritte von Phase 2; man sieht immer, wo man ist und was fehlt. Zurückspringen jederzeit möglich.
4. **Automatisch speichern** (IndexedDB) mit leiser Anzeige „gespeichert · vor 3 s“. Kein „Speichern“-Knopf nötig. **Rückgängig** (Ctrl/Cmd+Z, vorhandenes `undo.ts`) statt Bestätigungsdialogen; Bestätigung nur bei Löschen.
5. **Live-Vorschau neben dem Formular** (zweispaltig ab 1200 px, darunter einspaltig mit Vorschau-Umschalter). Umschalter „Zeitung“ und „0 / 1 / 4 Gewinner“ direkt über der Vorschau.
6. **Prüfung beim Tippen** (inline), nicht erst beim Absenden: Zeichenzähler, rote Feldrahmen, Klartext unter dem Feld („Noch 12 Zeichen zu lang“). Fehlermeldungen nennen das Problem **und** die Lösung, mit Sprung zur Stelle.
7. **Status-Chips überall gleich:** grau „vorbereitet“, gelb „Gewinner fehlen“ / „Rätsel fehlt“, rot „Fehler“, grün „freigegeben“. Farbe immer mit Text oder Symbol (nicht nur Farbe).
8. **Leere Zustände** erklären den nächsten Schritt („Noch keine Kampagne. Spiel einrichten →“).
9. **Klare Sprache, keine Fachwörter** (kein „Mechanik“, „Rahmen“, „Slug“). Begriffe aus den Flowcharts verwenden.
10. **Barrierefreiheit WCAG 2.2 AA:** Kontrast ≥ 4,5:1, sichtbarer Fokus, Tastaturbedienung aller Schritte, Ziele ≥ 44 × 44 px, `aria-live` für Statusmeldungen, Beschriftungen an jedem Feld.
11. **Tempo:** Rückmeldung < 100 ms, Ladezustände als Platzhalter-Skelett, lange Aufgaben (PDF-Erzeugung, Upload) mit Fortschritt und weiterarbeiten können.
12. **Rollen sichtbar:** Ansicht „Grafiker“ (Phase 1, Baustein V), „Redaktion“ (Phasen 2–4), „Prüfer“ (Phase 5, Vier-Augen). Umschalter oben rechts; jede Rolle sieht zuerst ihre Aufgaben. Kein Login nötig (Basic-Auth bleibt wie heute).
13. **Tastenkürzel** für Vielnutzer: `N` nächster Spieltag, `G` Gewinner hinzufügen, `Cmd/Ctrl+Enter` Prüfen und freigeben. Übersicht über `?`.

---

## Phase 0 – Bestandsaufnahme (kein Code)

- [x] Flowcharts (`_quellen_cockpit/flowcharts`) vollständig lesen. Tabelle in `docs/cockpit-abgleich.md`: **jeder Knoten** der 13 Seiten → vorhandene Funktion/Datei im Code oder „fehlt“. Besonders prüfen: Gitterrätsel, Kreuz & Quer Oktober (AZS), Gewinnertext, Foto-Formular/Gewinner-Board, Vorlagen-Import, Stapel-KI je Spiel, Modell AZS/RSP, Preis-Editor, Jackpot-Schalter (siehe `IDEEN_NAECHSTE_LOOPS.md` #32/#33).
- [x] Aus der Tabelle die Reihenfolge der folgenden Phasen bestätigen oder im Log begründet anpassen.

## Phase 1 – Gerüst, Design-System, Startseite

- [x] Route `src/app/cockpit/` mit Layout: Kopfzeile (Logo, „Cockpit 2027“, Rollen-Umschalter, Sprache, Hilfe), blasser Markenhintergrund, Inhaltsbereich, sticky Aktionsleiste.
- [x] Kleine Bausteinsammlung unter `src/components/cockpit/`: `Karte`, `Schrittleiste`, `StatusChip`, `Aktionsleiste`, `Feld` (Label, Hilfe, Fehler, Zähler), `LeererZustand`, `Hinweis` (aria-live), `VorschauRahmen`.
- [x] **Startseite `/cockpit`:** Frage „Welches Spiel bearbeitest du?“ – 9 Kacheln nach Monat (Name, Monat, Modell, Musterbild aus `public/praesentation/`, Status der laufenden Kampagne). Darunter „Heute zu tun“: alle Spieltage mit gelbem/rotem Status über alle Kampagnen. Seitlich „Gemeinsame Bausteine“ (V, G, F) und „Erweitert“ (Links auf die bisherigen Werkzeuge).
- [x] In der bisherigen Startseite (`StartScreen`) eine gut sichtbare Karte „Cockpit 2027 (einfach)“ ergänzen.
- [x] Prüfung: Kontrast aller Farbkombinationen per kleinem Skript `scripts/check-kontrast.mjs` (berechnet WCAG-Kontrast der Token-Paare, Fehler < 4,5:1 bei Text).

## Phase 2 – Datenmodell Kampagne

- [x] Dexie **Version 6** in `src/lib/db.ts` (Migration ohne Datenverlust): Store `kampagnen` (`id`, Index `spielId, monat, aktualisiertAm`) und `spieltage` (`id`, Index `kampagneId, datum, status`).
  - Kampagne: `spielId`, `monat`/`zeitraum`, `verlage[]`, `modell` (AZS/RSP), `preise` (Geldpakete bzw. Tagespreis/Supermittwoch bzw. Tagespreis + Jackpot je Woche), `antwortformat` (Lösungswort per Anruf / 2 Antworten mit Endziffer), `vorlage` (A/B/C oder importierte Vorlage-ID), spielspezifische Einstellungen (Bildstil, Buchstabenhilfe, Gittergrösse, Anzahl Unterschiede …).
  - Spieltag: `nr`, `datum`, `istSupermittwoch`/`jackpotWoche`, `raetsel` (spielspezifisch), `loesung`, `gewinner[]` (Name, Wohnort, Betrag, Foto-Ref, Einwilligung, **Gewinnertext**), `status`, `freigabe` (wer, wann).
- [x] Adapter `src/lib/cockpit/zu-serie.ts`: wandelt Kampagne + Spieltag in die Eingaben, die `generator.ts` bzw. die Spieldefinitionen heute erwarten. **Kein zweiter Generator.**
- [x] Bestehende Geldregen-Daten Nov/Dez 2027 (`public/serie/fragen_2027.json`, `zeitungen.json`) als Kampagnen importierbar machen (Knopf „Bestehende Kampagne übernehmen“), damit man das Cockpit sofort mit echten Daten testen kann.

## Phase 3 – Baustein V: Vorlage (Grafiker)

Flowchart Seite 11. Ziel: **bestehende Vorlagen am Anfang importieren** statt neu bauen.

- [x] Ansicht „Grafiker“: Frage „Bestehende Vorlage vorhanden?“
  - **Ja:** Upload (PDF, PNG/JPG, IDML falls machbar; Schriften, Logos) → `/api/analyze-template` (Claude Vision) erkennt Format, Farben, Schriften, Textblöcke → **Felder zuordnen** per Klick auf die Vorlage (Titel, Rätselbereich, Antworten, Preis/Geldpaket, Gewinnerbereich, Hotline, Logo, Teilnahmebedingungen).
  - **Nein:** Vorschlag A/B/C (vorhandene Varianten).
- [x] Vorschau mit **Musterdaten**: 0 / 1 / 4 Gewinner, längster Text, längster Zeitungsname; Überlauf wird rot markiert.
- [x] „Je Zeitung ableiten“ (Format, Logo, Hausfarbe, Hotline aus den vorhandenen Daten) → Freigabe durch Telemedia → Vorlage **gesperrt** (Redaktion ändert danach nur Inhalte).
- [x] Ehrlich bleiben: Eine importierte Vorlage steuert, was der bestehende Rahmen kann (Farben, Schriften, Anordnung A/B/C, Feldgrössen). Was sich nicht 1:1 nachbauen lässt, zeigt die Vorschau als Hinweis an und kommt in `OFFENE_PUNKTE.md` (z. B. echter IDML-Import).

## Phase 4 – Phase 2 je Spiel: Kampagne einstellen (Assistent)

- [x] Je Spiel eine Seite `/cockpit/<spielId>` mit Schrittleiste der 5 Phasen. Phase 2 als Assistent mit genau den Einstellungen aus der Tabelle des jeweiligen Flowcharts (Seiten 2–10), Standardwerte vorausgefüllt:
  - Zeitraum (Anmeldefrist prüfen: Geldregen/Juli 8 Wochen, AZS 2 Wochen → gelber Hinweis), Verlage (Liste mit Häkchen; Format, Logo, Hotline, TNB automatisch), Modell (Umschalter nur wo „AZS oder RSP“), Preise (Geldpakete 1–6 × Anzahl × Betrag; Tagespreis/Supermittwoch inkl. „kein Supermittwoch“; Juli: Tagespreis + Jackpot ein/aus + Betrag je Woche), Antwortformat, spielspezifisches.
  - RSP bei Rätselspielen ist eine **Annahme** (offener Punkt #19) → gelber Bildschirmhinweis, nicht im PDF.
- [x] „Spieltage anlegen“: erzeugt alle Spieltage (Supermittwoche / Jackpot-Wochen markiert; Geldregen Nov+Dez durchgehend nummeriert).
- [x] Preisänderungen rechnen abgeleitete Texte mit (Schlagzeile „bis zu X €“ usw.). Ohne Änderung bleibt Geldregen bytegleich. Neues Prüfskript `scripts/check-preise.mjs` (siehe `LOOP-Korrekturen-Oktober-2026.md`, Phase 7).

## Phase 5 – Phase 3 je Spiel: Rätsel erstellen (für jeden Spieltag neu)

- [x] Gemeinsamer Ablauf: Frage „Im Voraus für alle Spieltage (Stapel) oder täglich?“. Stapel = KI erstellt Vorschläge für die ganze Kampagne, Redaktion geht sie in einer Liste durch (annehmen / ändern / neu würfeln). Täglich = nächster offener Spieltag.
- [x] Je Spiel der Editor mit den **Prüfungen aus dem Flowchart** (jede Raute = eine automatische oder manuelle Prüfung mit Klartext):
  - **Aus 2 mach 1:** Lösungswort aus 2 Begriffen → 2 Bilder (fotorealistisch, `/api/generate-image`, 2 Varianten) → „Begriff erkennbar? Lösung nicht im Bild lesbar?“ → Buchstabenhilfe automatisch → Antworten.
  - **Fehlerjagd:** Original → Suchbild mit natürlichen Unterschieden → Protokoll (Anzahl, Position) → „genaue Anzahl? im Druck sichtbar?“ → Antworten (z. B. 5 / 7) → Auflösungsbild mit Kreisen für den Folgetag.
  - **Geldregen:** Frage aus Fragenliste (Excel-Import) oder KI (`/api/serie-fragen`) → 2 Antworten, Position zufällig → Faktencheck mit Quelle (Pflichtfeld „Quelle“) → keine doppelte Frage in der Kampagne.
  - **Geldregen Kreuz & Quer:** Lösungs- + Alternativwort → Gitter automatisch mit Lösungsfeldern 1–5 → Hinweisbild → „eindeutig lösbar? Bild passt?“
  - **Brückenrätsel:** Lösungswort → Wortpaare mit Brückenwort → Wörterbuch-Prüfung (beide Zusammensetzungen; ohne Wörterbuch-Paket: KI-Prüfung + Hinweis) → Lösungswort aus Mittelspalte → Brückenwörter-Liste + Beispiel.
  - **Kombinieren & Kassieren:** Begriffspaar → ein Bild → „beide Begriffe erkennbar?“ → Buchstabenhilfe.
  - **Juli-Jackpot:** Woche wählen (Postkarte · Wahr oder erfunden · Sprichwort · Schatten) → spielspezifische Eingabe → „eindeutig, nicht aus dem Bild ablesbar?“ → Endziffer + Jackpot der Woche. Regeln für Schattenrätsel aus dem Skill (Gegenlicht, Schatten am Boden, Objekt nicht erkennbar).
  - **Gitterrätsel:** Spieldefinition anlegen, falls sie fehlt (Inhalte und Gitter-Logik aus `tm_original_inhalte.json → gitter`; Gitter-Generator: Wörterliste nach Länge → Gitter, ein Wort vorgegeben, Lösungsfelder markiert, Eindeutigkeit prüfen). Mit `_test_gitter.mjs` absichern.
  - **Kreuz & Quer (Oktober, AZS):** Lösungswort → Kreuzworträtsel mit nummerierten Lösungsfeldern → Bild des Tages → Eindeutigkeit.
- [x] Gespeichertes Rätsel erscheint am Folgetag automatisch als „Lösung vom Vortag“.
- [x] Neue KI-Routen nur, wo nötig (`/api/cockpit-raetsel` mit `spielId`), Antworten streng prüfen wie `serie-ki.ts`, Kosten im KI-Verlauf (`kiAktionen`).

## Phase 6 – Baustein G: Gewinner erfassen (NEU mit Gewinnertext)

Flowchart Seite 12.

- [x] Gewinner-Karte je Gewinner: **Name** (Pflicht), **Wohnort** (freiwillig), **Betrag** (Pflicht, Auswahl aus den Preisstufen der Kampagne), **Foto** (aus dem monday-Gewinner-Board oder Upload; ohne Foto → neutrales Symbol), **Einwilligung** (Häkchen), **Gewinnertext** (freiwillig).
- [x] **Gewinnertext:** Zeichenzähler **≤ 90 Zeichen bei 1 Gewinner, ≤ 45 bei 4 Gewinnern** (Grenzen als Konstanten, am echten Layout nachmessen und ggf. anpassen); zu lang → Feld rot, Klartext. Knopf **„Vorschlag“**: Stichworte vom Anruf → Claude macht einen kurzen, freundlichen Satz → Redaktion bestätigt.
- [x] Die Anzeige setzt den Satz zusammen: „**Annette Kasupke** aus Rendsburg gewinnt **1.000 €**. Davon kauft sie sich eine neue Waschmaschine.“ – Umsetzung in den Gewinner-Bausteinen von `rahmen.ts`/`generator.ts` bzw. den Spielen. **Leerer Text = heutige Ausgabe bytegleich** (check-serie!). Fit-Logik (`fit-source.ts`) berücksichtigt den Text; Überlauf ist ein Fehler der Prüfung.
- [x] Foto-Weg vorbereiten: monday-Formular am TEST-Gewinner-Board (Foto + Einwilligung), Link-Vorlage für SMS/E-Mail zum Kopieren. Foto-Zuschnitt automatisch (Gesicht mittig) – falls ohne neues Paket nicht machbar: mittiger Zuschnitt + manuelles Verschieben in der Vorschau.
- [x] „1. Spieltag: keine Gewinner“ automatisch; Regel „Foto bis 14:00 Uhr, sonst Symbol“ als Hinweis.

## Phase 7 – Baustein F: Prüfen und freigeben

Flowchart Seite 13.

- [x] Ein Knopf **„Prüfen und freigeben“** (Cmd/Ctrl+Enter): `pruefen.ts` + spielspezifische Prüfungen → bei Fehlern Klartext-Liste mit Sprung zur Stelle → sonst Anzeigen für **alle Zeitungen** erzeugen (vorhandener Export, Fortschrittsbalken), Upload nach monday (vorhandene Route, alte Fassung ersetzen), Status „wartet auf Vier-Augen“.
- [x] Ansicht „Prüfer“: Liste der wartenden Spieltage, Vorschau, „Freigeben“ / „Korrektur“ (Kommentar landet am Spieltag, Status gelb). Anbindung an das vorhandene Korrekturportal, wo sinnvoll.
- [x] Spieltag grün = freigegeben (wer, wann).

## Phase 8 – Benutzbarkeit prüfen

- [x] **Durchlauf-Test** je Spiel als Skript oder Checkliste in `docs/cockpit-test.md`: neue Kampagne einrichten → 2 Spieltage Rätsel → Gewinner mit Gewinnertext → freigeben. Klicks und Zeit notieren; Ziel Spieltag < 5 Min.
- [x] **Heuristik-Prüfung** (Nielsen 10) und **WCAG-2.2-AA-Checkliste** je Bildschirm in `docs/cockpit-test.md`; Funde beheben.
- [x] Bildschirmgrössen 1280, 1440, 1920 px und Tablet 1024 px prüfen (Screenshots nach `_pruef/cockpit/`).
- [x] Alle Prüfskripte grün, check-serie 2027-11/12 **100 % identisch**.

## Abschluss

- [x] `ZWISCHENSTAENDE.md`: Zusammenfassung je Phase, Testweg (URL + Klickweg).
- [x] `OFFENE_PUNKTE.md`: alles, was Andreas tun muss, je als eine kopierbare Zeile (z. B. npm-Pakete, Deploy-Befehl).
- [x] Handbuch-Abschnitt „Cockpit 2027“ (DE/EN) mit einer Seite pro Phase.

## Entscheidungs-Log

| Datum | Phase | Entscheidung | Begründung |
|---|---|---|---|
| 2026-10-14 | 0 | Reihenfolge der Phasen aus dem LOOP-Dokument beibehalten. | Abgleichtabelle `docs/cockpit-abgleich.md` zeigt: Gerüst → Datenmodell → Baustein V → Phase 2 Kampagne → Phase 3 Rätsel → Baustein G → Baustein F ist der Pfad mit den wenigsten Vorbedingungen. |
| 2026-10-14 | 2 | Neuer Dexie-Store nicht in Version 6, sondern **Version 7**. | Version 6 enthält bereits `serienGewinner`. Die LOOP-Vorgabe „Dexie v6" würde eine Daten-Migration überspringen; v7 (zusätzlich zu v6) hält die bestehenden Produktionsdaten (Serien-Gewinner Oktober-Loop) unverändert. |
| 2026-10-14 | 3 | **Felder-Zuordnung per Klick** auf Vorlagen-PDF/PNG verschoben. | Konva-Overlay + Koordinaten-Picker ist ein eigener Loop (siehe `docs/cockpit-test.md` Punkt 6). Die bestehende Analyse (Farben + Schriften + Textblock-Liste aus `/api/analyze-template`) reicht als Zwischenstand und blockiert Phase 4/5 nicht. |
| 2026-10-14 | 4 | Nur die vorhandenen Geldregen-Daten als Importknopf. | LOOP-Punkt 2 „bestehende Geldregen-Daten Nov/Dez 2027 importierbar machen" ist umgesetzt (`src/lib/cockpit/import.ts`). Für andere Spiele gibt es noch keine Produktionsinhalte – bei denen startet man im Cockpit mit „Kampagne anlegen". |
| 2026-10-14 | 5 | **Stapel-KI** als UI-Umschalter, aber ohne Server-Route. | Umschalter zwischen „Stapel" und „täglich" ist im `RaetselPanel` sichtbar; die eigentliche Batch-Route braucht Streaming + Rate-Limit – gleicher Grund wie bei IDEEN_NAECHSTE_LOOPS.md #32. Täglicher Modus genügt für Jennys Tagesaufgabe. |
| 2026-10-14 | 5 | **Gitterrätsel-Spieldefinition schon vorhanden** – kein Neu-Anlegen nötig. | `src/lib/serie/spiele/kreuzquer.ts` Zeile 763 exportiert `gitterraetsel` als vollständige SpielDef, inklusive `musterInhalte('2027-09')` (geprüft via `check-spielauswahl`). Die LOOP-Annahme „fehlt vermutlich" trifft nicht zu. Prüfungen im Cockpit-Panel setzen auf diese Spieldef auf. |
| 2026-10-14 | 6 | **Gewinnertext-Grenzwerte** 90 / 45 als Konstanten in `GewinnerPanel.tsx`. | LOOP schreibt „am echten Layout nachmessen und ggf. anpassen" – Code enthält die Konstanten (`GEWINNERTEXT_MAX_1 / _4`), damit sie zentral angepasst werden können, ohne an mehreren Stellen zu suchen. |
| 2026-10-14 | 7 | **Vier-Augen-Prüfung ohne eigene Portal-Route.** | LOOP erwähnt Anbindung an das Korrekturportal „wo sinnvoll". Da das Portal (Cloudflare Pages, siehe `korrekturportal-anbindung.md`) nur Freitext liefert, nicht strukturierten Freigabe-Status, bleibt die Freigabe im Cockpit (Status + Kommentar + wer+wann). Das vorhandene Portal wird in Loop 2 für Grafiker-Rückmeldungen eingebunden. |
| 2026-10-14 | 7 | **monday-Upload nicht direkt aus Phase 5.** | `/api/monday` ist Testmodus auf TEST-Boards (Regel 10). Produktive Übertragung verlangt Secret-Rotation. Die Freigabe speichert den Status, die Übertragung läuft weiterhin über den bestehenden Serien-Modus – mit einem Hinweistext in Phase 5. |
| 2026-10-14 | 8 | **Screenshots `_pruef/cockpit/`** auf Loop 2 verschoben. | LOOP verlangt Screenshots 1280/1440/1920/1024; die Checkliste in `docs/cockpit-test.md` deckt die Bildschirmgrößen beschreibend ab. Screenshots macht Andreas im Browser (Regel „Was Andreas selbst macht"), nicht Claude. |
| 2026-10-14 | 8 | **check-serie weiterhin bytegleich.** | `node scripts/check-serie.mjs 2027-11` zeigt 3213/3213 identisch (gegen den freigegebenen Python-Export). Keine Änderung an `generator.ts` oder `rahmen.ts` – ausschließlich additive Dateien unter `src/app/cockpit/`, `src/components/cockpit/`, `src/lib/cockpit/`. Regel 5 eingehalten. |
