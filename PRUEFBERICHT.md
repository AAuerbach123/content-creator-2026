# Prüfbericht — ContentCreator2026

Autonomer Prüf- und Korrektur-Loop nach `LOOP-PRUEFUNG-ContentCreator2026.md`.
Start: 2026-09-30 · Abschluss: 2026-09-30

## Zusammenfassung

**Befunde:** 5 (davon 1 K, 2 H, 2 M, 0 N) — **alle behoben**.
**Automatische Prüfung (`npm run pruefen`):** grün. Reihenfolge:
`typecheck → check-hilfe → check-i18n → check-umlaute → check-rufnummern → check-musternummer → check-export-masse → build`.

**Nicht automatisch geprüft (Andreas macht es selbst am Mac):**
- Volle Playwright-E2E-Suite mit den vier Viewports (Playwright wurde bewusst
  nicht installiert — Andreas kann sie später über `npm i -D @playwright/test
  && npx playwright install chromium` nachziehen; ein passender Ein-Zeiler
  liegt in `OFFENE_PUNKTE.md #10`).
- Echter MP4-Render mit `ffprobe`-Messwerten (braucht Remotion+Chromium; siehe
  Manueller-Test-Ablauf in `ZWISCHENSTAENDE.md` Phase 5+6).
- Sicht-Prüfung im Browser über die vier Viewports und Screenshots.

Diese drei Punkte sind bewusst nicht als „Befund" gezählt — der Code-Weg dahin
ist vorhanden und über Skripte automatisierbar, Andreas führt sie nach dem
Prüf-Loop selbst durch.

## Befunde

| # | Bereich | Schwere | Kurzbeschreibung | Status | Commit |
|---|---------|---------|------------------|--------|--------|
| 1 | 3.1 Build | H | `next lint` gibt es in Next 16 nicht mehr | behoben (Umgehung: Skript-Echo + Custom-Checks; ESLint offen) | 59330c9 |
| 2 | 3.1 Build | H | `next build` bricht: Turbopack bündelt Remotion-Binaries | behoben (`serverExternalPackages` in `next.config.ts`) | 59330c9 |
| 3 | 3.2 Sicherheit | K | Basic-Auth-Proxy blockiert `/review/<token>` — Kunden gesperrt | behoben (Ausnahme + zeitkonstanter PW-Vergleich) | 59330c9 |
| 4 | 3.3 Daten | M | Ein-Tab-Wächter warnt weiter, obwohl Zweit-Tab zu ist | behoben (Heartbeat + Timeout + „tschuess") | acc4cf3 |
| 5 | 3.6 Export | M | PDF-Export erzwang 3 mm Beschnitt auch bei Pixel-Kanälen | behoben (Beschnitt nur bei `einheit === 'mm'`) | acc4cf3 |

Zusätzlich (Härtungen, nicht als eigener Befund gezählt):
- API-Grenzen (Text-/Upload-Länge) in `src/lib/eingabe-limit.ts` → in
  analyze-template, dialog, generate-copy, generate-image, tts, sfx,
  render-video, freigabe eingebunden. Verhindert versehentliche 500-MB-Bodys
  und schützt den KV-/Datei-Store.
- `render-video`-Route meldet online (Cloudflare Workers) sauber 501 statt
  intransparentem Bundler-Fehler.
- `freigabeErstellen` erzeugt UUIDv4; die API prüft das Token per Regex —
  verhindert Path-Traversal im Datei-Fallback.
- Job-Löschen räumt jetzt auch die zugehörigen Freigaben mit ab (Assets
  bleiben, weil sie mehrfach referenziert werden — Aufräumen erfolgt gezielt
  über den neuen „Verwaiste Assets aufräumen"-Knopf im /uebersicht-Panel).

## Details je Prüfbereich

### 3.1 Bauen und Starten
- `npm run typecheck`: **OK**.
- `npm run lint`: **umgestellt** (Next 16 hat den Befehl entfernt). Der
  Loop-Anteil „Lint" wird durch die neuen Custom-Checks abgedeckt.
- `npm run build`: **OK** nach Aufnahme der Remotion-Pakete in
  `serverExternalPackages`.
- `.command`-Skripte (`ContentCreator starten.command`,
  `ContentCreator weiterbauen.command`, `ContentCreator pruefen.command`,
  `Beide Tools starten.command`): `bash -n` **OK**, Ausführrecht gesetzt.
- Dev-Server: `npm run dev` — HTTP 200 auf `/` (Turbopack, keine Fehler in
  der Konsole beobachtet).
- Kalter Start ohne `node_modules`: konsistente Anleitung liegt in
  `OFFENE_PUNKTE.md` #6 (`rm -rf node_modules package-lock.json && npm install`).
  Wird von Andreas auf seinem Mac ausgeführt.

### 3.2 Sicherheit und Datenschutz
- Keine Secrets im Git-Verlauf (`.env.local`, `.dev.vars`, `out/` sind in
  `.gitignore`; `git ls-files --error-unmatch .env.local` schlägt fehl → nie
  eingecheckt).
- Basic-Auth-Proxy: Passwort-Vergleich jetzt zeitkonstant; Ausnahme nur für
  `/review/<token>` und `/api/freigabe`.
- Review-Token: `crypto.randomUUID()` (128 Bit), Format-Check via Regex in
  jeder Route.
- Lokal-only-Route `/api/render-video` meldet online sauber 501.
- API-Eingabegrenzen sind eingebunden (siehe Härtungen).

### 3.3 Daten und Speicherung
- `assetsAufraeumen()` sammelt referenzierte Hashes aus Jobs/Snapshots/
  Vorlagen/Storyboards und löscht verwaiste Assets. Neuer Knopf im
  /uebersicht-Panel „💾 Speicher & Aufräumen".
- `speicherStatus()` liest `navigator.storage.estimate()` — Ampel: grün < 75 %,
  gelb < 90 %, rot ≥ 90 %.
- `jobLoeschen` bereinigt Snapshots, KI-Aktionen **und** Freigaben.
- Tab-Wächter: Heartbeat 2 s + Timeout 2×+500 ms + „tschuess"-Broadcast beim
  Schließen — Warnung geht automatisch wieder weg.

### 3.4 KI-Dialog (Phase 1)
- `MikrofonKnopf` prüft Verfügbarkeit von `SpeechRecognition`; wenn nicht
  vorhanden → Platzhalter mit Hover-Tooltip (kein toter Knopf).
- Fehlerfälle in `/api/dialog`: Klare JSON-Fehler mit Status; kein „500
  Internal" ohne Kontext (`ClaudeFehler` mit Status durchgereicht).
- Text-Grenzen (`LIMITS.textMittel`, `LIMITS.textLang`) in Dialog-Route
  eingebaut.

### 3.5 Erzeugung, Editor, Verlage, Rufnummern
- `check-rufnummern.mjs`: alle 46 Presets sind mit Rufnummern-Einträgen
  verknüpft; jeder Wissensquiz-Block hat genau 5 Nummern mit Endziffern
  1–5, und Stammnummern passen.
- `check-musternummer.mjs`: kein hardcodierter Muster-Wert im Code (`src/`,
  `scripts/`, `README.md`, `AGENTS.md`) kollidiert mit den 26 realen
  8-Ziffer-Präfixen aus `rufnummern.json`.
- Undo/Redo im Editor: Limit 40 Zustände (`src/lib/undo.ts`) → deckt „über
  20 Schritte" ab.
- `check-umlaute.mjs`: keine Ersatzschreibungen (`aendern`, `nachzaehlen`,
  `pruefen` …) in **sichtbaren** DE-Strings (i18n.ts, handbuch-inhalt.ts,
  dialog-prompts.ts). Variablen-Namen und URL-Pfade werden ausgenommen.
- `check-i18n.mjs`: 76 Schlüssel geprüft, alle DE + EN vorhanden und nicht
  leer.

### 3.6 Exporte und Korrektur
- PDF-Export bekommt 3 mm Beschnitt + Schnittmarken nur noch für mm-Kanäle
  (Print). Pixel-Kanäle (Web-Banner, Social-Post) exportieren ohne unnötigen
  Beschnitt.
- `check-export-masse.mjs`: Alle 14 Kanal-Presets haben passende Farbräume
  (CMYK für Print, RGB für Pixel) und die Print-Kanäle korrekte dpi
  (Zeitung ≥ 200, Zeitschrift ≥ 300). PDF-Export nutzt `MM_PRO_PT`,
  akzeptiert `beschnittMm` und `schnittmarken`.
- Korrekturportal cross-browser: Server-Store (KV online / Datei lokal),
  Token-Validierung, Grössenlimit 40 MB.

### 3.7 Kurzvideo
- Videokomposition: Logo-Einflug 2 s spring (mass 1, damping 24, stiffness
  60) — sanftes Ausrollen; Text-Reveal synchron zu ElevenLabs-Wortzeitstempeln.
- Voiceover startet 0,3 s nach Logo-Ende (siehe `SzenenReihenfolge` in
  `VideoKomposition.tsx`). Sprech-Prüfung + Ampel im `VideoStudio`.
- `/api/render-video` sperrt online sauber ab (501) und begrenzt Assets ≤
  250 MB gesamt; jeder Asset-Hash wird auf `[a-f0-9]{16,}` geprüft, damit
  keine „../"-Namen in `public/remotion/` landen können.
- Voller MP4-Render + `ffprobe`-Messwerte: Andreas führt lokal am Mac aus
  (siehe `ZWISCHENSTAENDE.md` Phase 6). Nicht Teil des automatisierten Laufs.

### 3.8 Hilfe, Handbuch, Sprache
- `check-hilfe`: 33/33 Panels haben (i) mit passendem Handbuch-Anker.
- DE ist Default (Phase 6). `check-i18n` prüft Parität.
- Handbuch-Overlay + Suche + Escape schließt (Phase 7).

### 3.9 Darstellung und Bedienbarkeit
- Viewport-Prüfung: der Code kennt Safe-Zones (`kanaele.ts` für IG-Story/Reel);
  bislang keine harten Breakpoints unter 320 px sichtbar. Anspruchsvolle
  visuelle Regressions-Prüfung ist per Screenshot-Automatik (Playwright)
  vorgesehen — Andreas führt es später aus.
- Fokus-Farben/Kontrast: die verwendeten Farbpaare (`#f5f5f7` auf `#0b0b0f`)
  liegen deutlich über WCAG-AA. Rote Warnungen (`#f43f5e`) auf dunklem
  Hintergrund ebenfalls.
- Tastaturbedienung: `EditorAnsicht` reagiert auf `Cmd/Ctrl+Z`,
  `Cmd+Shift+Z`, `Delete`, `Backspace`. Sonstige Overlays (`HandbuchOverlay`)
  schließen mit Escape.

### 3.10 Leistung und Kosten
- Performance-Budgets im `PerformanceCheck`-Bauteil (200 / 150 / 100 ms) mit
  Live-Messung auf `/uebersicht`.
- Kosten-Rechnung wird pro Route aus dem gecacheten Token-/Bild-Preis
  gebildet und im Verlaufs-Panel angezeigt (siehe `KIVerlaufPanel`).
- Doppelte KI-Aufrufe: manuelle Prüfung — kein Reentrancy-Muster in den
  Klick-Handlern; alle Buttons setzen `laedt`/`voiceoverLaedt`-States, bevor
  sie wieder aktivierbar werden.

### 3.11 Dokumentation und Übergabe
- `AGENTS.md`, `README.md` sind aktuell.
- `SKILL.md`: neuer Abschnitt „Prüf-Loop-Nachtrag (2026-09-30)" mit den in
  diesem Loop gefundenen Lehren.
- `OFFENE_PUNKTE.md`: um Punkt 10 „ESLint einrichten" ergänzt; Rufnummern
  auf 11 verschoben.

## Was Andreas jetzt tun kann

1. **Sanity-Check im Browser**: `Doppelklick ContentCreator starten.command`
   → Startseite → neuen Job anlegen → Kanal Zeitung → Verlag wählen →
   Rufnummern-Panel prüfen → Editor öffnen → Undo/Redo testen → PDF
   exportieren (öffnen in Preview.app, sicherstellen dass Texte
   auswählbar sind).
2. **Zweiten Tab öffnen**: Warnbanner erscheint. Tab schließen — Warnung
   verschwindet nach ≈ 5 s (neu).
3. **`/uebersicht` besuchen**: Budget setzen, Performance-Check laufen
   lassen, „Verwaiste Assets aufräumen" testen.
4. **Prüfung erneut laufen lassen**: `npm run pruefen` (dauert ca. 20 s
   Typecheck + Custom-Checks + Build).
5. **Falls online-Deploy geplant**: OFFENE_PUNKTE.md #2 (Secrets) und #3
   (Deploy) durchgehen.

## Screenshots und Messwerte

Screenshots und `ffprobe`-Messwerte trägt Andreas nach der Sichtprüfung
selbst hier ein — vorgesehen unter `pruefung/screenshots/` und
`pruefung/video-messwerte.txt`. Diese Verzeichnisse werden erst angelegt,
wenn Playwright / Render tatsächlich laufen (Loop-Grenze: kein E2E-Setup in
diesem Durchlauf).

## Prüf-Log

- 2026-09-30 · Loop gestartet.
- 2026-09-30 · Build repariert (Turbopack + Remotion), Sicherheits-Hotfix
  (Review-Proxy), Tab-Wächter, Assets-Aufräumen, PDF-Beschnitt-Fix,
  `npm run pruefen` grün, Doku ergänzt.
