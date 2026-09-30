---
name: "content-creator-projekt"
description: "Immer verwenden bei Arbeiten am ContentCreator2026 (KI-geführtes Grafik-/Content-Tool, ~/Desktop/content-creator-2026) – Anzeigen, Präsentationen, Bilder, Stimme, Kurzvideo, Web-Ausspielung. Enthält die Praxis-Lehren aus der Telemedia-Präsentation 2027. Laufend ergänzen."
---

# ContentCreator2026 – Projekt-Referenz

> Pflege-Regel: Nach jeder Arbeitssitzung Neues ergänzen. Abschnitt „Lehren" vor jeder Umsetzung lesen.

## Überblick
- Ordner: `~/Desktop/content-creator-2026` (Git-Repo, Push macht Andreas). Loop-Prompt: `LOOP-ContentCreator2026.md` (autonomer Modus seit 29.09.2026), Start: `ContentCreator weiterbauen.command`.
- Idee: Die KI steht in der Mitte und führt einen Grafiker durch den Job. Es gibt drei Einstiege: nur Ziel / Vorstellung im Kopf / Vorlage. Am Ende steht das abgabefertige Endprodukt je Kanal: Zeitung, Zeitschrift, Web, Social, Kurzvideo.
- Stack: Next.js 16 + `@opennextjs/cloudflare` → Cloudflare Workers, Dexie/IndexedDB (`jobs`, `assets` per SHA-256, `snapshots`), DE/EN über `T()`-Wörterbuch (keine harten Strings), Basic-Auth in `src/proxy.ts` (nur mit `APP_PASSWORD`). Lokal Port 3000; der Ad-Creator läuft auf 3002.
- Vorgängerprojekte: Ad-Creator (`~/Desktop/wissensquiz`) und die Telemedia-Präsentation 2027 (`~/Downloads/01_Projekte/Telemedia/Spiele_2027`). Ihr Code und ihre Skripte sind Referenz: `_quellen/build_ads.py`, `praesentation_2027/deck_animated.js`, `post_process_pptx.py`, `online_portal/`.

## Arbeitsweise mit Andreas (verbindlich)
- Andreas ist kein Entwickler. Er arbeitet mit Doppelklick-`.command`-Dateien statt Terminal-Befehlen. Nach jeder Änderung an einer `.command`-Datei `chmod +x` setzen, weil `sed -i` bzw. Neuschreiben das Ausführrecht entfernt.
- Loops laufen **autonom**: keine Rückfragen, Entscheidungen ins Log, offene Punkte nach `OFFENE_PUNKTE.md`, Demo-Stände nach `ZWISCHENSTAENDE.md`.
- Deploy, `git push` und Secrets macht nur Andreas; dafür ein fertiges Skript bereitlegen. Schlüssel und Passwörter nie in Chat, Code oder Git.
- Nichts erfinden: keine Kontaktdaten, Rechtsaussagen oder Versicherungszusagen. Unbestätigtes klar markieren.
- Vor „fertig" selbst prüfen: im Browser in Handy-, Tablet- und Laptop-Grösse und per Screenshot. Nicht nur Code prüfen.

## Lehren aus der Telemedia-Präsentation 2027

### Anzeigen-Design (Print 315 × 220 mm, auch als Web-Seite)
- Layout: Bild links vollflächig (≈ 53 %), Panel rechts (≈ 47 %) mit folgenden Elementen:
  - „ANZEIGE" und Platzhalter „Ihr Zeitungslogo"
  - Headline zweizeilig, die zweite Zeile in Akzentfarbe (Montserrat 900)
  - Unterzeile „Mit einem Anruf bis zu 10.000 € gewinnen."
  - Kicker „DAS HEUTIGE RÄTSEL", Frage, zwei Antwortfelder (Endziffer 1/2)
  - „IHR GELDPAKET" mit 6 Kacheln
  - Preiszeile, 3 Schritte
  - Box „Das Glück hat eine Uhrzeit"
  - Teilnahmebedingungen
- Schriften: Montserrat (Headlines) und Lexend (Text), selbst gehostet. Jedes Spiel hat eine eigene Akzentfarbe.
- Kein Streifen-Dekor oben/unten; das Bild geht von oben bis unten.
- Immer echte Umlaute und ß. Ersatzschreibungen wie „nachzaehlen" sind für Zeitungen inakzeptabel. Die Ursache in der Textquelle beheben und per Skript prüfen.

### Bilder
- Andreas will **nur fotorealistische Bilder**.
- Für Rätselbilder ist ChatGPT im Dialog (Andreas prüft selbst) zuverlässiger als ein autonomer Loop: Zählen, Schatten und Unterschiede sind KI-Schwachstellen. Workflow: Prompt-Datei mit Frage, Lösung und Prüffrage je Bild. Andreas legt die Bilder in einen festen Ordner, das Tool übernimmt sie unverändert.
- Lösungsrelevante Bildteile dürfen durch das Zuschneiden nicht wegfallen (`object-position` setzen oder Hochformat erzeugen).
- Schattenrätsel:
  - Gegenlicht: Die Sonne steht hinter dem Objekt, der Schatten fällt zum Betrachter.
  - Der Schatten liegt immer auf dem Boden, nie im Himmel. Fusspunkt hinten, Kopf vorne.
  - Das Objekt ist nicht erkennbar: ausserhalb des Bilds oder überstrahlt, eine klare Silhouette verrät die Lösung.
  - Im Zweifel den Schatten selbst montieren.
- Fehlerjagd: Die Unterschiede sind natürlich (Objekt entfernt, Farbe geändert, geklont), keine aufgeklebten geometrischen Formen. Anzahl exakt, Protokoll mit Koordinaten.
- Zähl-Rätsel: Objekte klar getrennt und vollständig sichtbar, zweimal zählen.
- Keine Stereotype, keine erkennbaren Personen oder Marken, keine Schrift, die die Lösung verrät, kein Motiv doppelt (z. B. dieselbe Stadt zweimal).
- Fotos realer Personen (Ansprechpartner) unverändert verwenden, wenn Andreas das will.

### Stimme und Ton (ElevenLabs)
- Stimme: **Anneke** (`m1xJVQ4AuvhAWXoSQdeA`), neutrales Hochdeutsch.
  - Abgelehnt: zu hohe Stimmen, bayerischer Einschlag, Hall.
  - Einstellungen: `eleven_multilingual_v2`, stability ≈ 0,55, similarity 0,8, style 0–0,1, speed 0,95; −16 LUFS, keinen Hall hinzufügen.
- Der API-Schlüssel braucht die Rechte Text to Speech, Voices (Read) und Sound Effects. Bei 401 „missing_permissions" bzw. „invalid_api_key" hat Andreas einen neuen Schlüssel mit diesen Rechten zu erstellen.
- Den Schlüssel am einfachsten per Zwischenablage (`pbpaste`) in `.env` übernehmen, nicht über TextEdit.
- Sprechtexte:
  - Nicht ablesen, was auf der Folie steht; eigene Redewendungen. Maximal 4 gemeinsame Wörter in Folge mit dem Folientext.
  - Jeder Satz nur einmal.
  - Präsentationen kurz halten: Andreas' Ziel waren maximal 150 s.
- Logo-Einflug: 2,0 s mit vollem „Woooosch" (kein dünnes Zischen), der Ton endet exakt beim Logo-Stopp. Die Stimme startet danach (≈ 2,3 s).
- Stimmproben immer als 3 Frauen- und 3 Männerstimmen mit zusammenhängenden Sätzen aus dem echten Text, dazu eine HTML-Übersicht zum Anhören.

### Animierte PowerPoint (pptxgenjs + Nachbearbeitung per XML)
- pptxgenjs schreibt keine Übergänge und keine Animationen. `<p:transition advTm>` und `<p:timing>` im Nachgang ergänzen, Reihenfolge: cSld → clrMapOvr → transition → timing → extLst.
- Media-Autostart über `mediacall`/`playFrom` plus `p:audio`-Knoten. Den Ton-Knopf als Klick-Trigger mit `togglePause` bauen.
- Animierte Formen per `objectName` benennen und darüber finden.
- „Repariert"-Meldung vermeiden:
  - kein `bldP` für Bilder (`p:pic`), nur für `p:sp`
  - Shape-IDs pro Folie eindeutig neu nummerieren
  - `validate.py` des pptx-Skills allein reicht nicht; zusätzlich in PowerPoint öffnen
- Andreas' Wünsche:
  - Aufzählungspunkte fliegen synchron zur Stimme herein (Zeiten aus den ElevenLabs-Wortzeiten).
  - Varianten wechseln auf derselben Folie.
  - Logo unten links auf jeder Folie ausser dem Titel; der Titel hat das Logo gross oben links.
  - Seitenzahlen fortlaufend.
  - Kein Sprachband/Laufband, das wollte er am Ende nicht mehr.
  - Letzte Folie ohne Deko-Motiv, danach Ansprechpartner, Dank, Abschied.
- `sharp` in `node_modules` ist Mac-nativ: Node-Skripte mit `sharp` nur auf dem Mac ausführen, sonst in `/tmp` eigene Pakete installieren.

### Web-Ausspielung (Cloudflare Workers)
- CSP `script-src 'self'` blockiert Inline-Skripte, deshalb JS immer als eigene Datei. Bei Änderungen Dateinamen bzw. `?v=` hochzählen (Cache).
- Symlinks in `public/` beim Paketieren mit `cp -RL` auflösen.
- Immer die aktuelle Wrangler-Version (`npx --yes wrangler@latest deploy`), nicht auf v3 festnageln.
- Mobile:
  - `overflow-x:clip` statt `hidden` (hält `position:sticky` am Leben)
  - Grid-Kinder `min-width:0`
  - Kacheln 1/2/3 Spalten je Breite
  - geteiltes Layout (Bild | Panel) erst ab 1200 px
  - Foldables (Galaxy Z Fold aufgeklappt ≈ 880–1100 px) wie Handys behandeln
- „Klick zum Anrufen" für 0137-Gewinnspiele:
  - Handy: `tel:`-Pillen. Tablet/Laptop: QR-Code mit `tel:` plus Umschalter.
  - Kein Anruf durch den Server, keine Rufnummern-Übernahme.
  - Preisangabe direkt neben jeder Nummer.
  - Demo-Nummer nur mit Hinweis.
- Prüfen im eingebauten Browser: Viewport-Presets, per JS nach Überlauf suchen (`getBoundingClientRect().right > clientWidth`), CSS testweise per `<style>` einspielen, bevor Andreas neu deployt.

### Qualitätssicherung
- Kontaktbögen aller Anzeigen und Folien erzeugen und **selbst ansehen**.
- Lösungen automatisch und per Sichtprüfung verifizieren; Prüfprotokoll-Datei.
- Präsentationsdauer messen; Ton-Ende gegen Animations-Ende prüfen (≤ 50 ms).

## Phase-6-Nachtrag (2026-09-30, autonomer Loop)

- **Video-Rendering aus dem Tool**: `/api/render-video` (Node-Runtime, nur lokal) bündelt Remotion und rendert 9:16 / 1:1 / 16:9 aus einer Composition per `calculateMetadata`. Assets landen in `public/remotion/<hash>.<ext>`, MP4 in `public/renders/` + Kopie in `out/`. Auf Cloudflare Workers deaktiviert (kein Chromium) — die Route meldet klaren Fehler.
- **Korrekturportal-Server-Store**: `src/lib/freigabe-store.ts` mit Cloudflare-KV-Binding `FREIGABEN` und Datei-Fallback `.freigaben/<token>.json`. Routen `/api/freigabe` POST/GET/PATCH/DELETE. `ReviewSeite` rendert komplett aus Server-Snapshot (Base64-Assets als `data:`-URLs, kein IndexedDB).
- **Sprach-Default**: `SpracheProvider` erbt nicht mehr die Browser-Sprache — Default ist DE. localStorage-Wahl bleibt bindend.
- **Hilfe-Popovers**: Reusable `HilfePopover.tsx` (`?`-Knopf mit Tooltip). Im Editor-Header, in `ArtefaktWerkstatt`, `VideoStudio`, `ExportPanel`, `KorrekturportalPanel` eingebaut — DE/EN.
- **KostenUebersicht**: Monats-Budget mit Ampel + Route-Aufschlüsselung; localStorage-Key `content-creator-2026:budget-usd`.
- **PerformanceCheck** (`/uebersicht`): misst Start / Job-Wechsel / Save gegen Budgets 200 / 150 / 100 ms; setzt Test-Job an und räumt ihn wieder weg.
- **Regel**: JSX-Attribute mit `"…"` dürfen keine ASCII-`"` enthalten (JSX-Parser bricht). Für Zitate typografische „…" oder Curly-Braces `{'…'}` benutzen. Beispiel-Fehler: `de="… (/review/<token>) …"` bricht sogar bei `<token>` (angular brackets = JSX-Element).

## Phase-7-Nachtrag (2026-09-30)

- **Handbuch als Overlay überall**: Globaler `HandbuchProvider` (React-Context) + `HandbuchOverlay` (Vollbild-Overlay mit TOC, Live-Suche, Escape schließt) + `HandbuchKnopf` (📖-Knopf, gehört in die Kopfzeile jeder Ansicht). Rendert ohne den laufenden Job zu verlassen. Provider steckt in `src/app/layout.tsx` neben `SpracheProvider`.
- **Ein Handbuch, zwei Views**: Alle Handbuch-Texte in `src/lib/handbuch-inhalt.ts` (Array `HANDBUCH_ABSCHNITTE` mit `{anker, titelDe/En, koerperDe/En}`). Sowohl die eigene Seite `/handbuch` als auch das Overlay rendern aus dieser Datei. IDs im DOM lauten `handbuch-<anker>` — für `scrollIntoView`.
- **(i) mit Handbuch-Link**: `HilfePopover` bekam optionales `anker`-Prop. Ist es gesetzt, steht im Popover unten „Mehr im Handbuch →", das per `useHandbuch().oeffnen(anker)` das Overlay am passenden Abschnitt öffnet. Der Buchstabe im Kreis wurde von `?` auf `i` geändert, damit die klassische Bedeutung stimmt.
- **Prüfskript**: `scripts/check-hilfe.mjs` (npm-Skript `check-hilfe`) enthält eine Pflicht-Liste aller Panels/Ansichten. Es prüft je Datei, dass entweder `HilfePopover` oder `HandbuchKnopf` referenziert ist und dass jeder verwendete Anker im Handbuch existiert. Falls eine Datei Wrapper-Struktur nutzt (z. B. `anker={karte.anker}`), holt es Anker aus den Objekt-Literalen (`anker: '...'`) derselben Datei.
- **Rufnummern**: `src/lib/rufnummern.ts` lädt `public/rufnummern.json` (55 Zeitungen, Wissensquiz 5 + Servicehotline, Geldregen MWN Print/Web, `presetIds` verknüpft mit Verlags-Presets). Route `/rufnummern` = Tabelle mit Suche, Warnbanner „zu bestätigen" (Yasmina Salah), Quellenlinks. `RufnummernInfo` im JobEditor unter der Verlagswahl: Klick auf Nummer → CTA-Ebene; „Als Notiz speichern" → Job-Notiz. **Wenn kein Eintrag existiert: klare rote Warnung — nie eine Nummer erfinden.**
- **Wrapper-Trick für Karten mit (i)**: Karten in `KartenGrid` sind `<button>`-Elemente. Um dennoch einen separaten (i)-Klick nicht als Button-Klick zu werten, ist das (i) außerhalb des Buttons in einem `position: relative`-Wrapper mit `zIndex: 2` positioniert. Kein `event.stopPropagation()` nötig.

## Prüf-Loop-Nachtrag (2026-09-30)

- **Next 16 hat `next lint` entfernt.** Kein SIlent-Fail: die Skript-Zeile wurde durch eine Hinweis-Echo ersetzt, und stattdessen bündelt `npm run pruefen` alle projektspezifischen Checks (typecheck + check-hilfe + check-i18n + check-umlaute + check-rufnummern + check-musternummer + check-export-masse + build). ESLint-Migration bleibt in `OFFENE_PUNKTE.md`.
- **Turbopack + Remotion**: `@remotion/bundler`, `@remotion/renderer`, alle Compositor-Binaries + `esbuild` müssen in `next.config.ts` unter `serverExternalPackages` stehen. Sonst zieht Turbopack native Binärdateien (`esbuild-README.md`, `bin/esbuild`) ins Bundle und `next build` bricht mit „Reading source code failed / invalid utf-8 sequence" ab. Dynamische `import()`-Aufrufe schützen NICHT vor Turbopack-Bündelung.
- **Basic-Auth-Proxy und Kunden-Review**: Der Proxy blockiert per Default ALLES (matcher `/((?!_next/static|_next/image|favicon.ico).*)`). `/review/<token>` und `/api/freigabe` MÜSSEN vor dem 401 abgezweigt werden, sonst kann der Kunde die Freigabe nicht öffnen. Passwort-Vergleich zeitkonstant (`sicherVergleichen`).
- **API-Eingabe-Grenzen**: Zentral in `src/lib/eingabe-limit.ts`. Für jede Route, die Uploads (base64) oder freien Text nimmt, aufrufen — verhindert versehentliche 500-MB-Anfragen und Path-Traversal-Ideen im Datei-Fallback. Freigabe-Token muss zwingend UUIDv4 sein (Regex-Check).
- **Ein-Tab-Wächter braucht Heartbeat**: Reines „einmal Ping/Pong" reicht nicht — die Warnung bleibt sonst hängen, wenn der Zweit-Tab geschlossen wird. Muster: Ping alle 2 s, „tschuess" beim `pagehide`/`beforeunload`, Timeout 2×Intervall.
- **Assets nicht automatisch beim `jobLoeschen` löschen**: Sie sind content-adressiert und werden mehrfach referenziert. Löschen zerreißt andere Jobs, Snapshots und Vorlagen. Eigene Aufräumfunktion `assetsAufraeumen()` mit UI-Knopf im /uebersicht-`SpeicherPanel`.
- **PDF-Beschnitt nur für Print (mm)**: Für Pixel-Kanäle (Web-Banner, Social-Post) ist `beschnittMm: 3` unsinnig — der Export-Aufrufer muss `artefakt.einheit === 'mm'` prüfen.
- **Prüf-Skripte in `scripts/`**: `check-rufnummern.mjs` (Präset-Verknüpfung + Wissensquiz-Stamm), `check-musternummer.mjs` (Kollision Muster ↔ echte Blöcke), `check-umlaute.mjs` (nur DE-Strings in i18n / handbuch / dialog-prompts, keine Variablen-Namen), `check-i18n.mjs` (DE/EN-Parität), `check-export-masse.mjs` (Kanal-Presets + PDF-Export-Konfig). Alle mit `process.exit(1)` bei Fehler.
- **Andreas' Mac hat die Node-Umgebung**: In diesem Prüf-Loop war `npm run build` (nicht nur typecheck) auf Andreas' Mac möglich. Regel 1 bleibt: `npm install` selbst löst kein Deploy aus, aber jeder Build/Prüf-Lauf bleibt auf dem Mac (keine Sandbox). Für Cloudflare-Workers immer `serverExternalPackages` prüfen, wenn native Pakete dazukommen.

