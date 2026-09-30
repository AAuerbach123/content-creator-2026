# LOOP – Prüfung und Fehlerkorrektur ContentCreator2026 (ganzes Projekt)

**Arbeitsanweisung für Claude Code:** Lies dieses Dokument vollständig, danach:
- `LOOP-ContentCreator2026.md` (Ziel, Regeln, Entscheidungs-Log)
- `.claude/skills/content-creator-projekt/SKILL.md` (verbindliche Praxis-Lehren)
- `AGENTS.md`, `OFFENE_PUNKTE.md` und `ZWISCHENSTAENDE.md`

Dann prüfst du das **gesamte Projekt** systematisch, findest Fehler und **korrigierst sie selbst**.

**Autonomer Modus (verbindlich):**
- Stelle Andreas **keine Fragen** und warte auf **keine Freigaben**.
- Unklare Fälle entscheidest du selbst nach Skill und Loop-Regeln und begründest die Entscheidung im Prüf-Log.
- Was nur Andreas tun kann (Guthaben, Secrets, Deploy, Push), kommt als Ein-Zeilen-Anweisung in `OFFENE_PUNKTE.md`.
- Kein Deploy, kein `git push`, keine Secrets anfassen, kein `rm -rf`.
- Nach jeder abgeschlossenen Korrektur-Gruppe committen (`fix(pruefung): …`).

**Vorbedingung:** Läuft noch ein anderer Claude-Code-Loop in diesem Ordner, fertig abwarten. Offene Aufgaben aus `LOOP-ContentCreator2026.md` (z. B. Rufnummern-Karte) **zuerst fertigstellen**, dann prüfen.

---

## 1. Vorgehen je Durchlauf
1. Prüfbereich aus Abschnitt 3 nehmen (der Reihe nach).
2. Prüfen: automatisch per Skript/Befehl **und** sichtbar im Browser.
3. Jeden Befund mit Nummer, Bereich, Schwere, Beleg und Ursache in `PRUEFBERICHT.md` eintragen. Schwere:
   - **K** = kritisch: Absturz, Datenverlust, Sicherheit, falsche Rufnummer, falsche Lösung
   - **H** = hoch: Funktion geht nicht
   - **M** = mittel: falsches Verhalten, schlechte Bedienung
   - **N** = niedrig: Optik, Text
4. **Beheben**, dann **erneut prüfen** (Regressionstest), dann Befund auf „behoben" setzen, mit Commit-Hash.
5. Ein Befund, der sich nach zwei ernsthaften Versuchen nicht beheben lässt: saubere Umgehung bauen, Befund auf „offen – Umgehung" setzen und in `OFFENE_PUNKTE.md` vermerken. Dann weiter.
6. Reihenfolge der Korrektur: K → H → M → N.

## 2. Werkzeuge (selbst einrichten, ohne Nachfrage)
- `npm run typecheck`, `npm run lint`, `npm run build`, dazu `npm run build:vinext` (nur bauen, nicht deployen).
- **Playwright** als Dev-Abhängigkeit installieren (`npm i -D @playwright/test && npx playwright install chromium`).
  - End-to-End-Tests unter `tests/e2e/` für jeden Hauptablauf aus Abschnitt 3.
  - Viewports: Handy 390×844, Foldable 884×1104, Tablet 768×1024, Laptop 1440×900.
  - Screenshots nach `pruefung/screenshots/`, selbst ansehen.
- Unit-Tests für reine Logik (Vitest) dort, wo Fehler gefunden werden: Prüfungen, Rufnummern-Logik, Undo, Farbschema, Export-Masse.
- `npm audit --omit=dev` für Sicherheitslücken; kritische Befunde beheben, soweit ohne Major-Bruch möglich.
- Neues Skript `npm run pruefen`: führt Typecheck, Lint, Unit-Tests, E2E, `check-hilfe` und Rufnummern-Check in einem Durchgang aus. Das ist am Ende die Abnahme.

## 3. Prüfbereiche

### 3.1 Bauen und Starten
- [ ] Typecheck, Lint und Build ohne Fehler; Warnungen prüfen und die sinnvollen beheben.
- [ ] `ContentCreator starten.command` und `ContentCreator weiterbauen.command`: Syntax (`bash -n`), Ausführrecht (`chmod +x`), Pfade.
- [ ] Kalter Start ohne `node_modules` (in einer Kopie unter `/tmp` testen) funktioniert.
- [ ] Keine Fehlermeldungen in der Browser-Konsole beim Start und bei allen Hauptabläufen (Playwright sammelt `console.error` und `pageerror` → Test schlägt fehl).

### 3.2 Sicherheit und Datenschutz
- [ ] Keine Schlüssel, Tokens oder Passwörter im Git-Verlauf, im Code, in `public/` oder im Client-Bundle. Prüfung per Suche nach `sk-`, `sk_`, `api_key`, `Bearer` und in `.next/static`.
- [ ] `.env.local`, `.dev.vars` und `out/` stehen in `.gitignore`.
- [ ] Basic-Auth (`src/proxy.ts`) greift mit `APP_PASSWORD` auf **allen** Routen inklusive `/api/*`. Ausnahme ist nur der Kunden-Review-Link, der per Token geschützt ist. Test per `curl`.
- [ ] API-Routen:
  - Eingaben validieren: Grössen- und Typgrenzen für Uploads, Textlängen.
  - Keine Server-Fehlerdetails an den Client.
  - Freundliche Fehlermeldungen auf Deutsch.
- [ ] Review-Tokens sind zufällig und lang genug; es ist nicht möglich, fremde Freigaben zu erraten oder aufzulisten.
- [ ] Nur-lokale Routen (Render, Datei-Fallback) sind online sauber gesperrt bzw. deaktiviert.

### 3.3 Daten und Speicherung
- [ ] Job anlegen, speichern, neu laden, Snapshot wiederherstellen, löschen: nichts geht verloren (E2E mit Reload).
- [ ] Die Assets-Deduplizierung per SHA-256 funktioniert; es bleiben keine verwaisten Assets nach dem Löschen eines Jobs zurück (oder es gibt eine Aufräumfunktion).
- [ ] Der Ein-Tab-Wächter funktioniert. Er darf nicht fälschlich warnen, wenn nur ein Tab offen ist.
- [ ] Backup-ZIP exportieren → in einem frischen Browserprofil importieren → der Job ist vollständig (Bilder, Audio, Storyboard).
- [ ] IndexedDB-Speicher voll bzw. Quota-Fehler wird sauber abgefangen und gemeldet.

### 3.4 KI-Dialog (Phase 1)
- [ ] Alle drei Einstiege A/B/C einmal komplett durchspielen: ohne Vorstellung, mit Vorstellung, mit Vorlage.
- [ ] Die Fragen kommen nacheinander (max. 5), es entstehen drei Richtungen, Multiple-Choice-Verfeinerung, Schrittplan.
- [ ] Fehlerfälle: KI-Schlüssel fehlt, Zeitüberschreitung, leere oder kaputte Antwort. Jeweils klare Meldung, kein Absturz, Wiederholen möglich.
- [ ] Spracheingabe: Knopf funktioniert oder wird ohne Browser-Unterstützung sauber ausgeblendet.

### 3.5 Erzeugung, Editor, Verlage, Rufnummern (Phasen 2–3)
- [ ] Bild- und Texterzeugung inklusive Fehlerfall „OpenAI-Guthaben leer". Die Meldung sagt klar, was zu tun ist, und verweist auf `OFFENE_PUNKTE.md`.
- [ ] Editor:
  - Ebenen, Auswahl, Verschieben, Text bearbeiten
  - Undo/Redo über 20 Schritte
  - CI-Farben aus dem Verlags-Preset
  - Nichts ragt aus der Zeichenfläche
- [ ] **Echte Umlaute und ß** überall. Ersatzschreibungen (ae/oe/ue) in Texten und Vorlagen werden gefunden und korrigiert. Ein Prüfskript ist Teil von `npm run pruefen`.
- [ ] **Rufnummern:**
  - Alle 55 Einträge aus `public/rufnummern.json` werden angezeigt.
  - Die Verknüpfung mit allen 46 Verlags-Presets ist vollständig.
  - Bei der Verlagswahl landen die richtigen Nummern im Artefakt: Wissensquiz 1–5; Geldregen = Stamm + Klasse + Endziffer.
  - Fehlende Nummer → Warnung, **nie** eine erfundene Nummer.
  - Hinweise wie „gleiche Nummer wie …" sind sichtbar.
  - Unit-Test über alle Einträge.
- [ ] Die Musternummern „01379 4412…" liegen im Nummernblock von Funke (dort gibt es echte Nummern 01379 4412 7x/8x/9x). Überall, wo das Tool Beispiel- oder Platzhalter-Rufnummern verwendet, einen **klar fiktiven, als „Muster" gekennzeichneten** Wert nehmen, der nicht mit echten Blöcken aus `rufnummern.json` kollidiert. Kollisionsprüfung per Skript.

### 3.6 Exporte und Korrektur (Phase 4)
- [ ] PDF, PNG/JPG und ZIP: Masse in mm stimmen mit dem Verlagsformat überein (z. B. 315 × 220 mm), Auflösung für Druck ≥ 300 dpi, Beschnitt korrekt, Schriften eingebettet, Umlaute korrekt. Die exportierten Dateien per Skript prüfen (Seitengrösse, Bildmasse).
- [ ] Korrekturportal: Link erzeugen → in einem zweiten, frischen Browserkontext öffnen → Pin setzen → beim Grafiker sichtbar; Status-Wechsel funktionieren.

### 3.7 Kurzvideo (Phase 5)
- [ ] „MP4 erzeugen" rendert das echte Job-Storyboard in 9:16, 1:1 und 16:9, ohne Handarbeit. Die Dateien liegen in `out/` und stehen als Download bereit.
- [ ] Zu jedem Video per `ffprobe` im Prüfbericht festhalten:
  - Dauer
  - Auflösung
  - Tonspur vorhanden
  - Logo-Einflug 2,0 s mit Woooosch, dessen Ende ≤ 50 ms am Logo-Stopp liegt
  - Stimme startet bei ≈ 2,3 s
  - Untertitel in der Safe-Zone
- [ ] Einzelne Frames als Bilder exportieren und ansehen: Einflüge synchron, keine abgeschnittenen Texte, echte Umlaute.
- [ ] Stimmproben 3 + 3 und Anneke als Standard; Fehlerfall „ElevenLabs-Berechtigung fehlt" mit klarer Meldung.
- [ ] Der Prüfbericht vor dem Export zeigt korrekte Ampeln (mit absichtlich fehlerhaftem Text testen).

### 3.8 Hilfe, Handbuch, Sprache (Phasen 6–7)
- [ ] `check-hilfe`: Jedes Fenster hat ein (i), jedes (i) hat einen gültigen Handbuch-Anker, der Klick öffnet die richtige Stelle (E2E).
- [ ] Der Handbuch-Knopf ist auf jeder Ansicht sichtbar; Suche und Inhaltsverzeichnis funktionieren.
- [ ] DE ist Standard, EN vollständig. Skript: Jeder `T()`-Schlüssel ist in DE und EN vorhanden, es gibt keine harten deutschen oder englischen Strings in Komponenten.
- [ ] Onboarding-Tour läuft einmal durch und lässt sich erneut starten.

### 3.9 Darstellung und Bedienbarkeit
- [ ] Alle Ansichten in den vier Viewports aus Abschnitt 2 prüfen:
  - kein horizontales Scrollen
  - nichts abgeschnitten
  - Tipp-Flächen ≥ 44 px
- [ ] Tastaturbedienung: Tab-Reihenfolge sinnvoll, Fokus sichtbar, Escape schliesst Overlays.
- [ ] Kontrast WCAG AA für Text, Schrift ≥ 14 px für Fliesstext.
- [ ] Lange Texte, sehr viele Jobs (100) und grosse Bilder (20 MB) bringen die Oberfläche nicht zum Stocken.

### 3.10 Leistung und Kosten
- [ ] Die Performance-Budgets (Start < 200 ms, Job-Wechsel < 150 ms, Save < 100 ms) als automatischer Test.
- [ ] Die Kosten-Übersicht rechnet plausibel (Stichprobe von Hand nachrechnen).
- [ ] Keine Endlosschleifen oder doppelten KI-Aufrufe: Aufrufe pro Aktion zählen.

### 3.11 Dokumentation und Übergabe
- [ ] `AGENTS.md`, `README.md` und das Handbuch entsprechen dem tatsächlichen Stand. Veraltetes korrigieren.
- [ ] `OFFENE_PUNKTE.md` ist aufgeräumt: Erledigtes streichen, jeder offene Punkt hat eine Ein-Zeilen-Anweisung für Andreas.
- [ ] Den Skill `.claude/skills/content-creator-projekt/SKILL.md` um neue Lehren aus der Prüfung ergänzen.

## 4. Abschluss
- [ ] `npm run pruefen` läuft komplett grün (oder nur mit dokumentierten „offen – Umgehung"-Befunden).
- [ ] `PRUEFBERICHT.md` enthält:
  - Zusammenfassung: Anzahl Befunde je Schwere, davon behoben bzw. offen
  - Tabelle aller Befunde
  - Screenshots-Verzeichnis
  - Video-Messwerte
- [ ] Abschlussmeldung im Terminal, 5–8 Zeilen:
  - wie viele Fehler gefunden und behoben wurden
  - was offen ist
  - was Andreas als Nächstes tun muss (Befehl bzw. Datei)

## 5. Prüf-Log
- 2026-09-30: Prüf-Loop angelegt (Andreas: „Prüf-/Kontroll-Loop für das ganze Projekt, Fehler suchen und korrigieren, keine Nachfragen").
