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


## Phase 8 — Korrekturen Oktober 2026 ✅ (laufend)

### Phase 1 — Juli-Spiele: Teilnahmebedingungen ohne Vorzählfaktor ✅

**Was geht:**
- `src/lib/serie/spiele/tnb.ts`, Zweig `'jackpot'`: nutzt den Geldregen-Wortlaut (je Verlag — SWMH-Standard, NUE-Variante, NOZ/NPG ohne Social Media), Spielname wird ersetzt und als Aktionszeitraum erscheint die jeweilige Spielwoche. Die Jackpot-Fussnote „* Für jeden Tag …“ wird wörtlich wie in `_quellen_loop_2026-10/tnb/jul_postkarte.html` am Ende angehängt. **Kein Vorzählfaktor** im Juli.
- Juli-Spielwochen übernommen: 01.–11., 12.–18., 19.–25., 26.–31.07.2027 (Jenny/Yasmina 07.10.2026, auch Folie 15 der Präsentation). `scripts/_test_juli.mjs → ERWARTET` nutzt jetzt diese Wochen.
- Neue Prüfung in `src/lib/serie/pruefen.ts`: `pruefeKeinVorzaehlfaktor(mechanikArt, html)` — bei `geldpakete` und `jackpot` löst ein „Vorzählfaktor“ im Text einen Fehler aus. Automatisch aufgerufen in `_test_juli.mjs` und `_test_kreuzquer.mjs`.

**Wie testen:**
1. `node scripts/_test_juli.mjs` → `OK – alle Datenprüfungen bestanden.`
2. `node scripts/_test_kreuzquer.mjs` → `ALLES OK` (inkl. Zeitfenster-Satz + kein Vorzählfaktor bei geldpakete).
3. `node scripts/check-serie.mjs 2027-11 ~/Downloads/01_Projekte/Telemedia/Spiele_2027/Geldregen_2027/_html` → 3213 identisch, 0 abweichend.
4. `node scripts/check-serie.mjs 2027-12 …/_html` → 3402 identisch, 0 abweichend.

### Phase 2 — Kreuz & Quer April: Zeitfenster-Satz in Teilnahmebedingungen ✅

**Was geht:**
- `tnb.ts`, Zweig `'geldpakete'`: Unmittelbar nach „Wochenende: Samstag 00:00 Uhr bis Sonntag 23:59 Uhr.“ wird wörtlich eingefügt: „Vor Spielbeginn wurden für alle Gewinne Zeitfenster unterschiedlicher Länge festgelegt, die per Zufallsgenerator über den Spieltag verteilt werden.“ (Quelle `_quellen_loop_2026-10/tnb/kq_b4.html`).
- Automatischer Check im `_test_kreuzquer.mjs`.

**Wie testen:**
- `node scripts/_test_kreuzquer.mjs` → Zeile „kreuzquer-april: Zeitfenster-Satz in Teilnahmebedingungen (06.10.2026)“ ist OK; die Prüfseite `_pruef/kreuzquer-april.html` zeigt den Satz vor dem Veranstalter.

### Phase 3 — Die anderen 11 Spiele sichtprüfen ✅ (ohne PDF)

**Was geht:**
- Schatten/Filter restlos entfernt aus `src/lib/serie/spiele/rahmen.ts` (6 Stellen in den Familien A/B/C, inkl. `.ant`, `.lw`, `.tile.tp`, `.hot`, `.rt`, `.hl text-shadow`) und `src/lib/serie/spiele/juli.ts` (Postkarte `.pk` + `.pk-sonne`). Erlaubt bleibt nur `box-shadow` am Prüfseiten-Rahmen `.zelle .ad` (ist nicht in den Anzeigen selbst).
- Neuer Check `pruefeKeineSchatten(html)` in `src/lib/serie/pruefen.ts`: lehnt `box-shadow`, `text-shadow` und `filter:` (ausser `backdrop-filter`) ab. Automatisch aufgerufen in `_test_juli.mjs`, `_test_kreuzquer.mjs`, `_test_bilderraetsel.mjs`, `_test_fehlerjagd.mjs` auf dem Ergebnis von `spielSeite(…)` (einzelne Anzeige, ohne Prüfseiten-Rahmen).
- Neues Skript `scripts/_test_fehlerjagd.mjs` – damit sind alle 11 Spiele automatisch abgedeckt (sommer-postkarte, wahr-oder-erfunden, sprichwort-raetsel, schattenraetsel, kreuzquer-april, kreuzquer-oktober, gitterraetsel, aus2mach1, kombinieren, brueckenraetsel, fehlerjagd).
- Prüfseiten `_pruef/<spiel>.html` neu geschrieben (Zeitungen ta/sz/shz, 2 Spieltage, A/B/C, 1 und 4 Gewinner; für Fehlerjagd zusätzlich schwabo+swp).

**Ergebnistabelle (Code-Prüfung, HTML):**

| Spiel | Schatten gefunden | Status |
|---|---|---|
| Fehlerjagd | nur Rahmen-Schatten geerbt | ✅ (behoben in rahmen.ts) |
| Kreuz & Quer April | wie oben | ✅ |
| Brückenrätsel | wie oben | ✅ |
| Kombinieren & Kassieren | wie oben | ✅ |
| Sommer-Postkarte | `.pk` + `.pk-sonne` (juli.ts) | ✅ (durch 1-px-Rand ersetzt) |
| Wahr oder erfunden? | wie oben | ✅ |
| Sprichwort-Rätsel | wie oben | ✅ |
| Schattenrätsel | wie oben | ✅ |
| Gitterrätsel | wie oben | ✅ |
| Kreuz & Quer Oktober | wie oben | ✅ |
| aus 2 mach 1 | wie oben | ✅ |

**Wie testen:**
1. `node scripts/_test_juli.mjs` → `OK – alle Datenprüfungen bestanden.`
2. `node scripts/_test_kreuzquer.mjs` → `ALLES OK`.
3. `node scripts/_test_bilderraetsel.mjs` → `ALLE PRÜFUNGEN OK`.
4. `node scripts/_test_fehlerjagd.mjs` → `ALLE PRÜFUNGEN OK`.
5. `node scripts/check-serie.mjs 2027-11 …/_html` und `… 2027-12 …/_html` → weiterhin 3213 bzw. 3402 identisch, 0 abweichend.

**Grenze:**
- PDFs mit `scripts/serie-export.mjs` + `pdftoppm -r 110` muss Andreas am Mac erzeugen (headless-chrome im Worker-Build; Puppeteer-Pfad in `.command`-Skripten) — Punkt in `OFFENE_PUNKTE.md`.

### Phase 5 — Präsentationen per Knopfdruck ✅

**Was geht:**
- Neue Startkarte **„Präsentationen“** (Kreis-Position 5, DE/EN, blasses Thema) führt zu `/praesentationen`.
- `src/app/praesentationen/PraesentationenSeite.tsx` mit drei Modi: **Einzel** (Formular Verlag/AZS-Cent/RSP-%), **Verlagsliste (CSV)** (Name;AZS;RSP je Zeile), **Varianten (CSV)** (AZS;RSP je Zeile). Optionen „ohne Sprechernotizen“ und „zusätzlich als PDF (benötigt LibreOffice)“.
- API-Route `POST /api/praesentation` (`src/app/api/praesentation/route.ts`, Node-Runtime) erzeugt je Variante eine PPTX und liefert bei >1 Variante ein ZIP mit `Uebersicht_Verlage_Konditionen.csv`. Mit `pdf: true` konvertiert LibreOffice headless jede PPTX zu PDF; fehlt der Pfad `/Applications/LibreOffice.app/Contents/MacOS/soffice`, kommt eine 503 mit Hinweis.
- `src/lib/praesentation/gsp2027.ts` ist der 1:1-Port von `_quellen_loop_2026-10/praesentation/gsp2027_verlag.js` (pptxgenjs 4.0.1); drei Umgebungsvariablen sind jetzt Funktionsargumente, Bilder werden als `data:`-URLs eingereicht. Rechenlogik komplett unverändert.
- `src/lib/praesentation/nachbearbeiten.ts` setzt die OHNE_ANIM-Semantik aus `gsp2027_anim.py` um: eindeutige `<p:cNvPr id>`-Durchnummerierung je Folie und `<p:fade>`-Übergang; **kein `<p:timing>`**.
- Bilder liegen nun unter `public/praesentation/` (einmaliger Copy-Schritt im Loop).
- Hilfe-Anker `praesentationen` im Handbuch, Kopfzeilen-Hilfeknopf auf der Seite.
- Prüfskript `scripts/check-praesentation.mjs`: offline prüft die Rechenformel (33 ct / 70 % → 39.600 / 36.800 / 50.680 €); online (bei laufendem Dev-Server) zusätzlich die PPTX-XMLs auf fehlendes `<p:timing>`, Verlagsname bzw. kein „Für …“-Feld und eindeutige IDs je Folie.

**Wie testen:**
1. Einmalig auf Andreas' Mac installieren (`OFFENE_PUNKTE.md` #13): `npm i pptxgenjs@4.0.1`.
2. `npm run dev`, Startseite → Karte „Präsentationen“, Modus „Einzel“, Verlag „SWMH“, AZS 33, RSP 70, „Präsentation erzeugen“ → Datei `Gewinnspielplan_2027_SWMH.pptx` lädt sich herunter.
3. Modus „Varianten“ mit Inhalt `26;60\n32;50\n33;70` → ZIP mit drei PPTX + CSV-Übersicht.
4. `node scripts/check-praesentation.mjs offline` → alle Rechenpunkte grün. Mit laufendem Dev-Server zusätzlich `node scripts/check-praesentation.mjs`.

**Grenzen:**
- **pptxgenjs ist nicht committet** (Rule 2: npm nur auf Andreas' Mac). Vor dem ersten Aufruf einmalig installieren.
- LibreOffice ist optional; ohne klare Fehlermeldung.
- XLSX-Übersicht wurde durch CSV ersetzt (kein zusätzliches Dependency).

### Phase 6 — Korrekturportal anbinden ✅ (lesender Teil)

**Was geht:**
- `docs/korrekturportal-anbindung.md`: Beschreibung der Portal-Architektur (Cloudflare Pages + D1 `quiz_reviews.comments`), Endpunkte, Slug-Map (10 Verlagsgruppen + Master `be5ff27040`) und Konfiguration in `.env.local`.
- **`GET /api/korrekturen`** (`src/app/api/korrekturen/route.ts`, Node-Runtime) ruft `KORREKTURPORTAL_URL/api/comments?g=KORREKTURPORTAL_SLUG` auf, normalisiert die Liste und erzeugt für jede Rückmeldung eine stabile `id` (SHA-256 über grp+paper+variant+winner+ts+autor+text). URL/Slug nur aus `.env.local`.
- **`POST /api/korrekturen/einordnen`**: schickt die Rückmeldungen an Claude (`claudeJson`) und erzwingt JSON-Antwort mit Feld/Ziel/Sicherheit/begründung. Server-Guard: `telefon` und `tnb` sind **nie** `automatisch`, egal was die KI sagt; auch Sicherheit < 0,9 setzt `automatisch=false`.
- **Startkarte „Korrekturen“** auf dem Kreis (Pos. 3, rot), DE/EN.
- **Seite `/korrekturen`** (`src/app/korrekturen/KorrekturenSeite.tsx`): Liste, „Neu laden“, „KI einordnen lassen“, Filter (offen/Rückfrage/erledigt/alle). Je Eintrag Status setzen (offen/Rückfrage/erledigt/ignoriert) – Status liegt in `localStorage` (`content-creator-2026:korrekturen-status`).
- Handbuch-Anker `korrekturen` (DE/EN).
- Testskript `scripts/_test_korrekturen.mjs`: 5 synthetische Rückmeldungen (SWMH-Text, Antworten-Tausch, Logo, Telefon, TNB). Prüft, dass die beiden rechtlich sensiblen Felder nie automatisch anwendbar sind.

**Wie testen:**
1. `.env.local` ergänzen: `KORREKTURPORTAL_URL=https://quiz-review.pages.dev` (Beispiel) und `KORREKTURPORTAL_SLUG=be5ff27040`.
2. `npm run dev`, Startseite → „Korrekturen“ → „Neu laden“ zeigt die Portal-Rückmeldungen → „KI einordnen lassen“ fügt je Eintrag Feld/Ziel/Sicherheit hinzu.
3. `node scripts/_test_korrekturen.mjs` (bei laufendem Dev-Server) → 5 Einordnungen, kein `automatisch` bei Telefon/TNB.

**Bewusst offen (Entscheidungs-Log):**
- **Keine automatische Übernahme in Seriendaten + kein monday-Upload im selben Loop.** Grund: Das Portal liefert nur Freitext ohne strukturierten Bezug zu konkreten Spieldaten (Zeitung + Monat + Spieltag + Feld). Der Datenpfad „Seriendaten ändern + neu rendern + hochladen“ wäre ein eigenständiger Loop. Status-Verfolgung reicht erstmal, um die Verlags-Rückmeldungen abzuarbeiten; die eigentliche Änderung macht Andreas weiterhin per Hand im Serien-Modus. Vermerkt in `IDEEN_NAECHSTE_LOOPS.md`.

### Phase 7 — Spiele direkt wählen (Teil 1) ✅

**Was geht:**
- Neue Startkarte **„Spiele 2027“** (Kreis-Position 7, dunkelrot, DE/EN) → `/spiele`.
- Seite `src/app/spiele/SpieleUebersicht.tsx` zeigt alle 12 Spiele als Kacheln (Monat, Spielname, Modell, Beschreibung, Musterbild aus `public/praesentation/`). Jede Kachel verlinkt auf `/serie?spiel=<id>`.
- `SerieSeite.tsx` wertet den Query-Parameter `?spiel=<id>` aus und setzt beim Öffnen das vorausgewählte Spiel plus den passenden Startmonat.
- Hilfe-Anker `spiele2027`, DE/EN-i18n (`spiele2027Titel`, `cardSpiele2027*`).
- Prüfskript `scripts/check-spielauswahl.mjs` – stellt sicher, dass alle Katalog-Spiele die Pflichtfelder haben, `musterInhalte(spiel.monate[0])` Einträge liefert, die Übersicht korrekt verlinkt und `SerieSeite.tsx` den Query-Parameter liest.

**Wie testen:**
1. `npm run dev` → Karte „Spiele 2027“ auf der Startseite → Übersicht öffnet sich.
2. Klick auf ein Kachel-Spiel → `/serie?spiel=<id>` lädt den Serien-Modus mit dem Spiel vorausgewählt.
3. `node scripts/check-spielauswahl.mjs` → `ALLES OK`.

**Bewusst verschoben (Entscheidungs-Log):**
- **Modell-Umschalter AZS/RSP, Preis-Editor pro Spiel/Monat, Jackpot-Schalter, Dateinamen mit Modell, Merken der letzten Kombination.** Diese Teile greifen tief in `rahmen.ts` + `generator.ts` ein, und Geldregen 2027-11/-12 muss weiter 100 % bytegleich bleiben (`check-serie`). Darum als eigener, zusammenhängender Loop vermerkt: `IDEEN_NAECHSTE_LOOPS.md` #32 (Umschalter+Preise+Jackpot), #33 (Merken). Offene fachliche Rückfragen stehen in `public/serie/OFFENE_PUNKTE.md` #19 (RSP bei Rätselspielen) und #20 (Jackpot bei Rätselspielen).

### Phase 8 — Cockpit 2027 (einfache Bedienung je Spielkonzept) ✅

**Was geht:**
- Neue Route `/cockpit` mit eigenem Layout (`src/app/cockpit/layout.tsx`, `cockpit.css`): Markenfarben Telemedia (`--tm-rot` #9B1438, Gold #E8B64A u. a.), blasser Markenhintergrund (radiale Gradienten mit 4–8 % Deckkraft), weiße Karten mit `--cockpit-schatten-weich`, sticky Kopfzeile und sticky Aktionsleiste.
- **Startseite `/cockpit`** (`CockpitStartseite.tsx`): Frage „Welches Spiel bearbeitest du?" + 9 Kacheln nach Monat (Geldregen + 8 weitere Spielkonzepte, sortiert nach `monate[0]`). Daneben „Heute zu tun" (leerer Zustand – zieht später aus Status-Chips der Spieltage) und „Gemeinsame Bausteine V/G/F".
- **Startkarte „Cockpit 2027 (einfach)"** auf dem Kreis (Pos. 1, rot, DE/EN) → ergänzt die bestehende Kachelsammlung ohne irgendwas zu entfernen.
- **Design-System** unter `src/components/cockpit/`: `Karte`, `Schrittleiste`, `StatusChip` (grau/gelb/rot/grün mit Symbol), `Aktionsleiste`, `Feld` (Label + Zähler + Fehler + aria-describedby), `LeererZustand`, `Hinweis` (aria-live), `VorschauRahmen`, `RollenUmschalter` (Grafiker / Redaktion / Prüfer, persistiert in localStorage).
- **Datenmodell** (`src/lib/cockpit/typen.ts`): `Kampagne`, `Spieltag`, `CockpitVorlage`, `Preise` (geldpakete / tagespreis / juli), `SpieltagRaetsel`, `SpieltagGewinner`. **Dexie v7** in `src/lib/db.ts` erweitert um `kampagnen`, `spieltage`, `cockpitVorlagen` – Migration ohne Datenverlust über Dexie-Versionen.
- **Adapter** `src/lib/cockpit/zu-serie.ts`: wandelt Kampagne + Spieltage in die bestehenden Serien-Eingaben (`fragen_2027.json`-Struktur und `Inhalt[]`) – kein zweiter Generator, nur Übersetzung.
- **Import** `src/lib/cockpit/import.ts`: liest `public/serie/*.json` und legt eine Geldregen-Kampagne 2027-11 oder -12 mit allen 30 Spieltagen an. Erlaubt sofortigen Test mit echten Daten.
- **Spiel-Seite `/cockpit/<spielId>`** (`SpielSeite.tsx` + Dynamic-Route): 5-Phasen-Stepper (Vorlage / Kampagne / Rätsel / Gewinner / Freigabe). Phasen tauschen den Inhaltsbereich; Zurück/Weiter unter dem Inhalt.
- **Phase 1 Vorlage** (`VorlagePanel.tsx`): Weg „Ja, Datei hochladen" ↔ „Nein, Vorschlag A/B/C". Upload geht via `assetSpeichern` (Regel 2 – kein Blob im Job-JSON) und ruft `/api/analyze-template` auf; A/B/C speichert ohne Datei. „Vorlage freigeben und sperren" setzt `gesperrt=true`.
- **Phase 2 Kampagne** (`KampagnePanel.tsx`): Monat (vorbelegt), Modell (AZS/RSP) nur bei „AZS oder RSP"-Spielen, Antwortformat (Lösungswort / Endziffer), Tagespreis + Supermittwoch. Für **Geldregen** erscheint zusätzlich ein Knopf **„Bestehende Kampagne übernehmen"**, der die 30 Nov- bzw. Dez-Spieltage sofort anlegt.
- **Phase 3 Rätsel** (`RaetselPanel.tsx` + `raetsel-regeln.ts`): Spieltag-Auswahl, Formular passend zum Antwortformat (Frage/Antwort 1+2/richtig oder Lösungswort). Prüfregeln je Spielkonzept als Klartext-Liste (`geldregen` prüft Pflichtfeld „Quelle" + doppelte Frage, `aus2mach1` prüft Lösungswort+Begriffe, `fehlerjagd` prüft Anzahl, `brueckenraetsel` prüft Wortpaare, `gitterraetsel` prüft Wörterliste …). Stapel-/Tagesmodus-Umschalter (Stapel-KI selbst folgt in Loop 2).
- **Phase 4 Gewinner** (`GewinnerPanel.tsx`): Gewinnerkarten mit Name (Pflicht), Wohnort (freiwillig), Betrag (Auswahl aus den Preisstufen der Kampagne), Foto-Upload (als Asset-Hash, Regel 2), Einwilligung (Pflicht vor Freigabe), **Gewinnertext mit Zeichenzähler** (max. 90 Zeichen bei 1 Gewinner, max. 45 bei ≥ 2 – Grenzen als Konstanten `GEWINNERTEXT_MAX_1 / _4`). Knopf **„Vorschlag"** schickt Stichworte an `/api/dialog` und füllt das Feld. 1. Spieltag zeigt automatisch den Hinweis „keine Gewinner".
- **Phase 5 Freigabe** (`FreigabePanel.tsx`): sammelt alle Prüffehler (Rätselregeln + Gewinnerpflicht + Zeichenzähler), roter Knopf „Prüfen und freigeben" (**Cmd/Ctrl+Enter** als Shortcut); Rolle „Prüfer" sieht zusätzlich „Korrektur anmerken". Freigabe setzt `status='freigegeben'` + `freigabe={wer,wann,kommentar}`.
- **Gemeinsame Bausteine** `/cockpit/baustein/v`, `/g`, `/f`: eigenständige Seiten, die unabhängig vom Spiel-Flow Vorlagen verwalten (Bibliothek), Gewinner nachtragen und Spieltage freigeben.
- **i18n** komplett DE/EN (`cockpit*`-Schlüssel in `src/lib/i18n.ts`). Harte Strings mit kleinen Erklärungen (zeichnet Rolle „Grafiker/Redaktion/Prüfer") bewusst in Komponenten (Hilfetexte, keine Fachbegriffe für Nutzer).
- **Handbuch-Anker** `cockpit` (DE/EN) – wird von der neuen Startkarte angesprungen; `check-hilfe.mjs` grün.
- **Prüfskript** `scripts/check-kontrast.mjs`: berechnet WCAG-Kontraste aller `--tm-*`-Paare → `✓ Alle textrelevanten Paare erreichen die WCAG-2.2-AA-Mindestkontraste.`
- **Abgleichtabelle** `docs/cockpit-abgleich.md`: jeder Knoten der 13 Flowchart-Seiten → vorhandene Datei im Code oder „fehlt". Zehn Lücken identifiziert (Quelle-Pflichtfeld, Doppelte-Frage-Prüfung, Felder-Zuordnung, Musterdaten-Vorschau, Gewinnertext, Rollen-Umschalter, Status-Chips, Stapel-KI, Jackpot-Schalter, Preis-Editor); Punkte 1–7 im Cockpit umgesetzt, 8–10 in Loop 2.
- **Durchlauf-Test** `docs/cockpit-test.md`: 12-Schritt-Checkliste mit Zielzeit ≈ 2:40 min. Heuristik-Prüfung (Nielsen 10) und WCAG 2.2 AA abgehakt.
- `tsc --noEmit` 0 Fehler · `check-i18n.mjs` 317 Schlüssel · `check-umlaute.mjs` grün · `check-hilfe.mjs` 39 Panels · `check-spielauswahl.mjs` 12 Einträge · **`check-serie.mjs 2027-11` 3213/3213 identisch** (Geldregen-Regel 5 eingehalten).

**Wie testen:**
1. `npm run dev` → Startseite → neue Karte **„Cockpit 2027 (einfach)"** (Position 1) → `/cockpit`.
2. Kachel **„Geldregen"** → Phase 1 „Nein, Vorschlag A/B/C" → A → „Vorlage übernehmen".
3. Weiter → Phase 2 → **„Bestehende Kampagne übernehmen"** (für 2027-11): legt 30 Spieltage an.
4. Weiter → Phase 3 → ersten Spieltag öffnen, Quelle eintragen (zeigt dann grüne Prüfung).
5. Weiter → Phase 4 → Spieltag 2 wählen, „+ Gewinner hinzufügen", Felder füllen, Gewinnertext tippen (Zähler beobachten), optional „Vorschlag" mit Stichwort „neue Waschmaschine" testen.
6. Weiter → Phase 5 → **Cmd/Ctrl+Enter** → Status wird grün.
7. Für andere Spiele: `/cockpit/aus2mach1`, `/cockpit/fehlerjagd`, `/cockpit/kreuz-quer-april` etc. – Rätsel-Panel passt sich an.
8. `node scripts/check-kontrast.mjs` → alle Paare grün. `node scripts/check-serie.mjs 2027-11` → 3213 identisch.

**Bewusst in Loop 2 verschoben (Entscheidungs-Log):**
- **Felder-Zuordnung per Klick** auf hochgeladene PDF/PNG-Vorlage. Grund: braucht Konva-Overlay + Koordinaten-Picker; der analysierte Textblock-Liste reicht als Zwischenstand.
- **Stapel-KI für die ganze Kampagne auf einen Rutsch.** Grund: braucht Serverroute mit Streaming + Rate-Limit; der tägliche Modus deckt den Alltag ab.
- **Jackpot-Schalter je Juli-Woche + Preis-Editor mit abgeleiteten Texten.** Grund: greift in `rahmen.ts` / `generator.ts` ein – gleicher Grund wie IDEEN_NAECHSTE_LOOPS.md #32/#33.
- **monday-Upload direkt aus Phase 5.** Grund: `/api/monday` ist Testmodus auf TEST-Boards; produktive Übertragung verlangt Secret-Rotation. Übergabe läuft weiterhin über den Serien-Modus (Phase 5 verweist darauf).
- **Foto-Zuschnitt automatisch** (Gesicht mittig). Grund: braucht Face-Detection-Paket (nur Mac-npm) – mittlerer Zuschnitt + manuell nachjustieren im Vorschau-Rahmen reicht erstmal.
- **Shortcut-Übersicht** (`N` nächster Tag, `G` Gewinner, `?` Hilfe). Grund: nur Cmd/Ctrl+Enter ist belegt – der Rest wird mit mehr Nutzung priorisiert.


## 14.10.2026 · Cockpit „Team, Kunden, monday“ (LOOP-Cockpit-Ausbau-Team.md)

- Zentraler Speicher (alle Eingeloggten sehen denselben Stand), Konflikthinweis, Protokoll, Rollen, Cloudflare-Access-Login.
- Startseite „Heute zu tun“ mit Ampel und Fristen-Countdown, Kalender, Spieltag-Leiste, Live-Vorschau neben dem Formular, „Alle Zeitungen prüfen“ vor der Freigabe, Foto zuschneiden, Gewinnplan-Prüfung, Zeitungsauswahl beim Gewinner, Auszahlungsliste mit CSV.
- Kundenportal je Verlagsgruppe: Markierungen in der Anzeige, Freigabe/Korrektur, ganze Woche freigeben, vorher/nachher, Frist, Druck-PDF. Verwaltung mit Links, QR, Sperren, Antworten.
- monday: Boards verbinden, Abgleich je Bereich (Dreiwege-Vergleich für Status), Deadline zurück ins Cockpit, Rufnummern aus „Projektdetails“, PDFs als ZIP oder in die Datei-Spalten.
- Foto-Link für Gewinner, Glocke + E-Mail/Teams-Benachrichtigungen (Versand nach Einrichtung), Einführungstour, Handbuch-Abschnitte, Handy-Menü.
- Zeitungs-Pool um 29 Wissensquiz-Juli-Titel erweitert; Geldregen Nov+Dez als eine Kampagne (53 Spieltage).
- Prüfungen: tsc 0 Fehler · check-i18n · check-umlaute · check-hilfe · check-kontrast · check-spielauswahl · check-rufnummern · check-musternummer · check-export-masse grün · check-serie 2027-11 3213/3213 und 2027-12 3402/3402 bytegleich.
- Getestet im Browser (lokal): Speichern/Konflikt, Zuschneiden, Live-Vorschau, Gesamtprüfung (21 Anzeigen), Portal mit Markierung + Korrektur + PDF, monday-Abgleich nur lesend gegen TEST-Boards, Projektdetails-Import, Tour, Handy-Ansicht.
