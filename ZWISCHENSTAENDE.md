# Zwischenstände — ContentCreator2026

> Kurzer Demo-Stand pro Phase: **was geht**, **wie man es testet**, **Screenshot-Pfad**.
> Andreas kann jederzeit reinschauen, ohne den Loop zu unterbrechen.

---

## Phase 0 — Fundament ✅

**Was geht:**
- Ein-Klick-Start via `ContentCreator starten.command` (Self-Setup + Browser-Auto-Open).
- Startbildschirm mit KI-Zentrum („Was produzieren wir heute?"), 6 Karten, DE/EN-Umschalter.
- „Neuer Job" legt einen Job in IndexedDB an (Store `jobs`), Debug-Sektion listet Jobs, `Löschen` funktioniert.
- IndexedDB-Stores `jobs`, `assets` (contentadressiert per SHA-256), `snapshots` (letzte 5 pro Job).
- Ein-Tab-Wächter via `BroadcastChannel`.
- Basic-Auth-Proxy (`src/proxy.ts`) — nur aktiv, wenn `APP_PASSWORD` gesetzt.
- Deploy-Befehle in `OFFENE_PUNKTE.md`.

**Wie testen:**
1. Doppelklick auf `ContentCreator starten.command`.
2. Browser öffnet http://localhost:3000.
3. Auf „Neuer Job" klicken → in der Debug-Sektion erscheint der Job.
4. Reload → Job ist noch da (Persistenz-Beleg).
5. Zweiten Tab öffnen → gelbes Warnbanner.
6. Rechts oben DE/EN wechseln.

**Screenshot-Pfad:** (noch keine)

---

## Phase 1 — KI-Dialog-Kern ✅

**Was geht:**
- `/api/dialog` (Claude Sonnet 4.6) mit sechs Aktionen: `einstieg-erkennen`, `briefing-frage`, `drei-richtungen`, `mc-vorlage`, `schrittplan`, `editor-befehl`.
- `/api/analyze-template` (Claude Vision) für Weg C — Farben, Schriften, Textgefäße, Format.
- Start-Prompt „Was produzieren wir heute?" → KI erkennt Kanal + Einstieg (A/B/C) und öffnet den JobEditor.
- JobEditor mit Chat-Dialog, Web-Speech-Mikro, drei-Richtungen-Karten, Vorlagen-Upload, MC-Fragen, Schrittplan mit Status je Schritt.
- KI-Verlaufs-Panel: jede KI-Aktion mit Tokens + Kosten in USD (Regel 8), im IndexedDB-Store `kiAktionen`.
- Jobs überleben Reload, Status wandert `briefing → in-arbeit`, Snapshot-Rotation läuft weiter.

**Wie testen:**
1. `ContentCreator starten.command` doppelklicken (öffnet http://localhost:3000).
2. Auf dem Startbildschirm ins große Feld z. B. tippen: „Ich brauche eine Anzeige für die Zeitung zum Thema Nachhaltigkeit." → „Los".
3. Der Job öffnet sich; die KI stellt die erste Frage — beantworten (Text oder Mikro).
4. Nach 2–3 Antworten schließt die KI das Briefing ab; bei Weg A erscheint der Knopf „Weiter zu den Richtungen" → drei Karten.
5. Auf eine Richtung klicken → KI erzeugt den Schrittplan rechts.
6. Weg C testen: neuen Job anlegen, unten in der Übersicht öffnen, im Editor „Vorlage hochladen" wählen und ein PNG/JPG droppen → Analyse-Ergebnis als MC-Fragen.
7. Rechte Seite: der KI-Verlauf zeigt jede Anfrage mit Modell, Tokens, geschätzten Kosten.
8. Persistenz-Check: Reload → Job und Dialog stehen noch da.

**Screenshot-Pfad:** (noch keine — Andreas macht bitte einen Screenshot, wenn er einen Job gestartet hat)

**API-Tests direkt (curl):**
- `/api/dialog` (Router): Antwortet in ≈ 3 s mit strukturiertem JSON (Beispiel: „Nachhaltigkeit"-Prompt → Weg A, kanal=zeitung, Frage nach Absender/Wirkung).
- `/api/dialog` (drei-richtungen): Liefert drei klar unterschiedliche Richtungen (getestet mit Solar-Genossenschaft-Kontext: „Heimat & Vertrauen", „Zukunft Klar", „Gemeinschaft & Wärme").

---

## Phase 2 — Erzeugung: Bild, Layout, Text ✅

**Was geht:**
- `/api/generate-image` mit den 17 Stil-Presets aus dem Ad-Creator (Aquarell, Fotorealistisch, Ghibli, Pixar, Disney, Retro-Anime, Claymation, Filz, Lego, Muppet, Cyberpunk, Pop Art, Bauhaus, Jugendstil, Tusche, Wes Anderson, Charlie & Lola). Motiv-neutral + full-bleed. Fallback-Kette gpt-image-2 → 1.5 → 1. IP-Sanitizer für Markenbegriffe.
- `/api/generate-copy` (Claude Sonnet 4.6): sechs Slots (Headline, Subline, CTA, Body, Caption, Hashtags), je 3 Varianten, 5 Töne (nüchtern, frech, seriös, werblich, empathisch).
- Kanal-Wahl: 11 Presets (Zeitung, Zeitschrift, 2× Web, 5× Social, Kurzvideo) mit korrekten Maßen, Safe-Zones (IG Story/Reel oben 250 px / unten 310 px).
- Verlags-Auswahl: 46 CIs aus dem Ad-Creator (Farben, Schrift, Logo-URL, Hotlines) unter `/public/verlage-presets.json` samt Logos in `/public/verlag-logos/`. UI mit Suche und Gruppierung nach Verlag; ein Klick färbt Headline/Sub um, wechselt Schrift und legt das Logo in den Asset-Store.
- Artefakt-Modell: `neuesArtefakt(kanal)` erzeugt ein Standard-Layout mit vier Ebenen (Hintergrund, Headline, Subline, CTA) + Logo, richtig positioniert je Kanal-Orientierung.
- `ArtefaktRenderer`: skaliert das Artefakt auf die verfügbare Breite, zeigt Text- und Bild-Ebenen, Assets kommen aus IndexedDB (per Blob-URL).
- „✨ KI schlägt komplettes Design vor"-Knopf: schießt Bild + Headline + Sub + CTA parallel und schreibt sie in die passenden Layer.

**Wie testen:**
1. Job wie in Phase 1 anlegen, Briefing durchspielen, Schrittplan erzeugen.
2. Unter dem Schrittplan erscheint jetzt der Bereich „Artefakt". Kanal wählen (z. B. „Instagram Feed 4:5").
3. Auf „✨ KI schlägt komplettes Design vor" klicken — nach ~15 s stehen Bild + drei Textzeilen in der Vorschau.
4. Alternativ die Aufklapper „Bilder erzeugen" und „Text erzeugen" benutzen, um gezielt einzelne Ebenen zu füllen.
5. „Verlag / Brand-Kit anwenden" → Verlag suchen (z. B. „NOZ") → Farben und Schrift werden auf Headline/Sub übernommen, Logo landet oben.
6. „Kanal wechseln" ersetzt das Artefakt durch eines im neuen Format — sinnvoll, um denselben Job als Zeitungsanzeige UND als IG-Post zu prüfen.

**Screenshot-Pfad:** (noch keine)

**Bekannte Grenze:** Das OpenAI-Konto hat derzeit kein Guthaben (`insufficient_quota`). Text-, Analyse- und Dialog-Aufrufe (Claude) laufen; Bilder erzeugen erst nach Aufladen — siehe `OFFENE_PUNKTE.md` #7.

---

## Phase 3 — Manueller Editor (Konva) ✅

**Was geht:**
- Umschaltknopf im Artefakt-Bereich: Vorschau ↔ **Editor**.
- Konva-Stage im Editor: alle Ebenen sind auswählbar, verschieben/skalieren/drehen via Transformer, Schrift skaliert proportional mit.
- Doppelklick auf eine Text-Ebene öffnet ein Inline-Textfeld direkt am Ort — Enter speichert, Escape verwirft.
- **Ebenen-Panel** (rechts): Reihenfolge (↑/↓), Sichtbarkeit-Toggle (● / ◌), Löschen (✕), Auswahl per Klick.
- **Eigenschafts-Inspektor** (darunter): X/Y/Breite/Höhe/Drehung; für Text zusätzlich Text, Schriftgröße, Gewicht (400/600/700/900), Textfarbe, Hintergrund. **CI-Farben zuerst** im Farbwähler (aus den ersten Verlags-Presets gesammelt).
- **Undo/Redo**: Stapel bis 40 Zustände, `Cmd/Ctrl+Z` / `Cmd+Shift+Z` (bzw. `Ctrl+Y`), `Delete` / `Backspace` löscht die aktuelle Ebene.
- **KI-Editor-Brücke** unter dem Canvas: Freitext-Feld + Mikro. „mach die Headline größer und rück das Logo nach rechts" → `/api/dialog` Aktion `editor-befehl` → strukturierte Operationen werden auf die Ebenen angewendet.
- Konva wird nur im Browser geladen (`dynamic(..., ssr:false)`), das SSR-Bundle bleibt schlank.

**Wie testen:**
1. Job wie in den vorigen Phasen bis zum Schrittplan.
2. Kanal wählen und „✨ KI schlägt komplettes Design vor" laufen lassen (bzw. manuell füllen).
3. Über dem Artefakt „Editor" wählen — Canvas erscheint links, Ebenen-Panel + Inspektor rechts.
4. Ein Element anklicken → mit Transformer-Handles ziehen/skalieren/drehen.
5. Doppelklick auf die Headline → Inline-Edit.
6. Farbwähler im Inspektor: erste Palette sind CI-Farben.
7. Cmd/Ctrl+Z rückgängig, Cmd+Shift+Z wiederholen.
8. Unten im Freitext: „mach die Headline größer und schieb das Logo nach rechts" → KI setzt die Operationen um.

**Screenshot-Pfad:** (noch keine)

---

## Phase 4 — Exporte + Korrekturportal ✅

**Was geht:**
- Neuer Bereich „Exporte" im Artefakt-Panel:
  - **PNG / JPG / WebP** je 1× und 2×, mit Größenanzeige direkt nach dem Download (Gewichts-Check gegen 150-KB-Banner-Budget).
  - **Vektor-PDF** (pdf-lib): Texte werden als echte Font-Objekte gesetzt, Bilder als JPG/PNG eingebettet — bei mm-Kanälen kommt automatisch 3 mm Beschnitt + Schnittmarken dazu.
  - **Adobe-Paket**: ZIP mit PDF + `ANLEITUNG.txt`.
  - **Social-Paket**: ZIP mit allen Artefakten des Jobs + `<Job>_captions.txt`.
  - **Job-Backup**: JSON + `assets/<hash>.<ext>` — alle Blobs im ZIP.
- Neuer Bereich „Korrekturportal":
  - Grafiker legt eine Freigabe an → Link `http://localhost:3000/review/<token>` (Kopier-Knopf).
  - `/review/<token>` zeigt das Artefakt; Klick platziert Pin (Name + Änderungswunsch).
  - Zurück im Editor sieht der Grafiker unter „Kundenkorrekturen" alle Pins live, kann antworten und Status setzen (offen/erledigt/abgelehnt).
  - IndexedDB-Store `freigaben` (DB Version 3) — Pins bleiben persistent.

**Wie testen (im selben Browser):**
1. Job bis zum fertigen Artefakt (Phasen 1–3).
2. „Exporte" ausklappen → alle Format-Knöpfe drücken.
3. Vektor-PDF in Preview.app öffnen: Texte sind auswählbar.
4. „Korrekturportal" → „+ Freigabe" → Link kopieren → neuer Tab → Pin setzen.
5. Zurück in Grafiker-Tab: Pin taucht auf, antworten und Status ändern.

**Grenze:** Freigaben liegen in IndexedDB → funktioniert nur im gleichen Browser. Für echte Kunden-Reviews braucht es Cloudflare KV — siehe `OFFENE_PUNKTE.md` #8.

**Screenshot-Pfad:** (noch keine)

---

## Phase 5 — Kurzvideo (Remotion + ElevenLabs) ✅

**Was geht:**
- Neuer Bereich „🎬 Video-Studio" erscheint, sobald der Kanal auf **Kurzvideo** steht.
- Live-Player im Tool (@remotion/player), 9:16 / 1:1 / 16:9 umschaltbar.
- Fünf Szenen-Templates: Logo-Einflug (2 s spring-Animation, sanft abbremsend), Text-Reveal (Aufzählung fliegt synchron zu Wortzeitstempeln ein), Bild-Ken-Burns (Richtung + Zoom), Karussell-Swipe, Logo-Outro. Reihenfolge per ↑/↓, Dauer per Zahleneingabe.
- **ElevenLabs-Voiceover** (`/api/tts`): Standard-Stimme **Anneke** (`m1xJVQ4AuvhAWXoSQdeA`), Modell `eleven_multilingual_v2`, stability 0.55, similarity 0.8, style 0.05 — Werte aus dem Skill.
- **Stimmproben (3+3):** ruft die Voice-Liste ab, filtert deutschsprachige Frauen- und Männerstimmen ohne Bayern-Akzent, erzeugt für jede eine kurze Probe mit demselben Text; ein Klick übernimmt die Stimme für das Voiceover.
- **Woooosch** (2 s): `/api/sfx` mit fixiertem Prompt „cinematic whoosh, ends abruptly" — für den Logo-Einflug.
- **Untertitel-Spur** eingebrannt, kompakt (6 vorangegangene + aktuelles + 2 folgende Wörter), 9:16-Safe-Zone unten (310 px + 40 px Puffer) beachtet.
- **Sprechtext-Assistent:** Live-Längen-Schätzung (150 Wörter/min), Prüfregeln — max. 4 gemeinsame Wörter mit Folientext, Satz-Wiederholungen, Umlaut-Ersatzschreibungen (ae/oe/ue) — im „Prüfbericht" vor Export.
- **Voiceover-Sync:** Voiceover startet 0,3 s nach dem Logo-Einflug-Ende (also bei ≈ 2,3 s), damit das Woooosch ausklingt bevor Anneke spricht.
- **Lokaler Render-Befehl** im Tool: `npx remotion render src/remotion/index.tsx Reel out/<Job>.mp4`.

**Wie testen:**
1. Neuen Job „Reel-Test" anlegen, Kanal auf **Kurzvideo** stellen.
2. Der Bereich „🎬 Video-Studio" erscheint. Sprechtext ins Feld tippen (z. B. „Guten Tag, hier ein kleines Beispiel für unser neues Produkt.").
3. „Voiceover erzeugen (Anneke)" klicken → Audio erscheint direkt darunter mit Player.
4. „Stimmproben (3+3)" klicken → sechs Karten mit Vorschau-Play; „Nehmen" wählt die Stimme.
5. Szenen-Reihenfolge anpassen, Dauern ändern → der Player oben zeigt live die neue Animation.
6. Unter „Prüfbericht" auf „Vor Export prüfen" klicken → Ampel-Liste.
7. Für den finalen Export den Remotion-Befehl kopieren und im Terminal ausführen (siehe OFFENE_PUNKTE.md #9 zum Reingeben des echten Storyboards).

**API-Tests direkt (curl):**
- `/api/tts` mit „Guten Tag, ich bin Anneke." → 1,63 s Audio, 5 Wortzeitstempel, ~35 KB MP3 in ≈ 3 s.
- `/api/tts-voices` liefert die komplette Voice-Liste (gecached 5 min).

**Grenze:** Der CLI-Render nutzt aktuell das Beispiel-Storyboard aus `Root.tsx` — echtes Job-Storyboard reingeben ist der letzte manuelle Schritt (siehe `OFFENE_PUNKTE.md` #9).

**Screenshot-Pfad:** (noch keine)

---

## Phase 6 — Feinschliff & Übergabe ✅

**Was geht:**
- **MP4-Ein-Klick-Export:** Neuer Knopf „💾 MP4 erzeugen" im Video-Studio schickt Storyboard + Assets (Base64) an `/api/render-video` (Node-Runtime), rendert per `@remotion/bundler`+`@remotion/renderer` und liefert Download-Links für 9:16 / 1:1 / 16:9. Assets landen in `public/remotion/<hash>.<ext>`, MP4 in `public/renders/` + Kopie in `out/`. Eine Composition „Reel" mit `calculateMetadata` erzeugt alle drei Ratios aus denselben inputProps. Bundle-Cache-Tipp: der erste Aufruf dauert 30–60 s, danach schnell.
- **Korrekturportal cross-browser:** Beim Anlegen einer Freigabe wird das Artefakt + Assets als Snapshot an `/api/freigabe` gepostet. Speicher: Cloudflare KV Binding `FREIGABEN`, lokal Datei-Fallback `.freigaben/<token>.json`. `ReviewSeite` lädt die Freigabe aus dem Server und rendert Artefakt via `assetUrlOverride` (kein IndexedDB-Bezug mehr). Neuer „Pins neu laden"-Knopf im KorrekturportalPanel.
- **Standardsprache DE:** Neue Nutzer starten auf Deutsch, unabhängig von der Browser-Sprache. Der Umschalter EN bleibt (localStorage-Persistenz).
- **Onboarding-Tour + Hilfe-Popover:** Fünf-Schritte-Tour beim ersten Öffnen, „?"-Icon im JobEditor-Header + „★"-Knopf zum manuellen Neustart. Vier weitere `HilfePopover` in ArtefaktWerkstatt, VideoStudio, ExportPanel, KorrekturportalPanel — DE/EN.
- **Handbuch vollständig DE/EN** (`/handbuch`).
- **Kosten-Übersicht** (`/uebersicht`): Monatsbudget mit Ampel (grün < 75 %, gelb < 100 %, rot), Route-Aufschlüsselung, Kosten je Job.
- **Performance-Check** (`/uebersicht`): Knopf misst Start (`alleJobsLaden`), Job-Wechsel (`jobLaden`) und Save (`jobSpeichern`+Snapshot) und prüft gegen Budgets 200 / 150 / 100 ms.

**Wie testen:**
1. `ContentCreator starten.command` doppelklicken. Beim ersten Öffnen läuft die Tour — durchklicken.
2. Neuen Job „Reel-Test" anlegen, Kanal Kurzvideo, Sprechtext eintippen, Voiceover erzeugen, Szenen ordnen.
3. Bei „💾 MP4 erzeugen" 9:16 + 1:1 + 16:9 anhaken → Knopf drücken → nach 60–120 s erscheinen drei Download-Links.
4. Zweiten Browser (z. B. Firefox statt Chrome) öffnen → Freigabe-Link kopieren → in Firefox öffnen → Pin setzen → im Chrome-Grafiker-Panel „Pins neu laden" → Pin taucht auf.
5. `/uebersicht` öffnen → Monats-Budget eintragen → Performance-Check „Messen" starten.
6. Hilfe-Popover im Editor-Header, in Artefakt, Video-Studio, Exporte, Korrekturportal jeweils antesten (Klick auf „?").

**Screenshot-Pfad:** (noch keine — Andreas macht Screenshots nach der Testrunde)

**Grenze:** Für den KV-Modus muss Andreas den Namespace einmalig anlegen (Ein-Zeiler in `OFFENE_PUNKTE.md` #8). Lokal läuft alles ohne Extra-Setup.

---

## Phase 7 — Hilfe überall + Rufnummern ✅

**Was geht:**
- **Handbuch überall anklickbar:** Kopfzeilen-Knopf „📖 Handbuch" auf jeder Ansicht (Start, JobEditor, /uebersicht, /review, /handbuch, /rufnummern). Öffnet ein Overlay mit Inhaltsverzeichnis (32 Abschnitte), Live-Suche und Sprung zum Anker — Escape/Rand-Klick schließt. Ohne den laufenden Job zu verlassen. Vollständig DE/EN, einzelne Quelle in `src/lib/handbuch-inhalt.ts` (auch für die eigene Seite `/handbuch`).
- **(i)-Symbol an jedem Panel:** 33 Panels/Ansichten mit Kurzerklärung (2 – 4 Sätze) + Link „Mehr im Handbuch →". Das (i) rendert der bekannte `HilfePopover` (aus Phase 6), jetzt mit optionalem `anker`. Bereiche mit (i): StartScreen, KI-Zentrum, jede Startkarte einzeln, Weg-Auswahl, KI-Dialog, Richtungen, Vorlagen-Upload, MC-Fragen, Schrittplan, KI-Verlauf, JobEditor, Artefakt-Werkstatt, Editor, Ebenen-Panel, Ebenen-Inspektor, KI-Editor-Befehl, Bild-Erzeugung, Copy-Erzeugung, Kanal-Wahl, Verlag/Brand-Kit, Rufnummern-Info, Exporte, Korrekturportal, Grafiker-Pin-Ansicht, Video-Studio inkl. Szenen/Stimmproben/Sprechtext/Prüfbericht/MP4, Werkzeuge, Kosten, Performance, Sprach-Umschalter (Einstellungen), Übersicht, Kunden-Review, Handbuch-Seite, Rufnummern-Seite.
- **Prüfskript:** `npm run check-hilfe` → `scripts/check-hilfe.mjs`. Läuft grün (33/33). Meldet fehlende (i)/Handbuch-Knöpfe und ungültige Anker.
- **Karte „☎ Rufnummern"** auf der Startseite. Route `/rufnummern` mit Tabelle nach Verlagsgruppe (SWMH, IPPEN, FUNKE, …), Freitext-Suche (Titel/Gruppe/Nummer/Preset-ID), Hinweis-Kästen, Quellen-Link zum monday-Board. Status „zu bestätigen" ist oben deutlich sichtbar (gelbes Warnbanner).
- **Nummern bei Verlagswahl im Job:** Wähle im Job einen Verlag → direkt unter der Wahl erscheint das Panel „☎ Rufnummern <Zeitung>" mit den passenden Wissensquiz-Nummern (1–5 + Servicehotline) und Geldregen-Nummern (MWN Print/Web). Klick auf eine Nummer setzt sie in die CTA-Ebene, „Als Notiz speichern" hängt eine Notiz mit allen Nummern an den Job. Fehlt der Eintrag, kommt eine klare rote Warnung mit Verweis auf `/rufnummern` und Yasmina Salah — **nie eine erfundene Nummer**.

**Wie testen:**
1. `ContentCreator starten.command` doppelklicken.
2. Oben rechts auf „📖 Handbuch" klicken → Overlay öffnet sich mit Inhaltsverzeichnis. In der Suche „Woooosch" tippen → Video-Abschnitt bleibt sichtbar. Escape schließt.
3. Auf ein beliebiges (i) klicken (z. B. bei „Neuer Job", im KI-Zentrum, im Dialog nach Job-Öffnung) → Erklärung erscheint, unten „Mehr im Handbuch →" → springt genau zum Anker.
4. Auf die neue Karte „☎ Rufnummern" klicken → Tabelle mit 55 Zeitungen erscheint. Suche z. B. „Schwarzwälder" → drei Zeilen.
5. Im Job Kanal „Zeitung" wählen, dann „Verlag / Brand-Kit anwenden" aufklappen und einen Verlag klicken → Farben/Font/Logo werden angewendet UND das Rufnummern-Panel erscheint. Klick auf Nummer „01378 408171" → landet in der CTA-Ebene (in der Vorschau/Editor sichtbar). „Als Notiz speichern" → im WerkzeugePanel unter „Notizen" auftauchend.
6. `npm run check-hilfe` im Terminal → 33/33 grün.

**Screenshot-Pfad:** (Andreas macht Screenshots nach Testrunde)

**Grenzen:**
- Alle Rufnummern haben Status „zu bestätigen" (alte Listen aus Ad-Creator + monday-Board 2. Projektdetails). Yasmina Salah bestätigt final.
- Getrennte Online-Nummern für Handy / Laptop-QR liegen noch nicht vor (Feld in `rufnummern.json` ist `null`).
- Presets ohne Rufnummer-Eintrag zeigen im Job die rote Warnung; das ist gewollt.

---

