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

