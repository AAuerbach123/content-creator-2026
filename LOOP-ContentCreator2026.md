# LOOP — ContentCreator2026

**Arbeitsanweisung für Claude Code:** Lies dieses Dokument vollständig. Arbeite die Phasen strikt in Reihenfolge ab: Nimm die erste nicht abgehakte Aufgabe `[ ]`, setze sie um, teste sie, hake sie ab `[x]` und committe mit aussagekräftiger Message. Verletze niemals die „Nicht verhandelbaren Regeln".

**Autonomer Modus (ab 2026-09-29, verbindlich):**
- Arbeite ohne Rückfragen und ohne Freigaben von Phase 0 bis Phase 6 durch. Am Ende einer Phase **nicht anhalten**.
- Stattdessen einen kurzen Demo-Stand in `ZWISCHENSTAENDE.md` notieren: was geht, wie man es testet, Screenshot-Pfad.
- Bei Unklarheit selbst die vernünftigste Lösung wählen und im Entscheidungs-Log begründen.
- Was Andreas später prüfen oder ausführen muss, kommt nach `OFFENE_PUNKTE.md` (kurz, mit Ein-Zeilen-Befehl).

**Einzige Grenzen:**
- Kein Deploy, kein `git push`, keine Secrets. Nur fertige Befehle in `OFFENE_PUNKTE.md` bereitlegen.
- Fehlt ein API-Schlüssel in `.dev.vars` bzw. `.env.local`: die Funktion mit klarer Fehlermeldung bauen, vermerken und weitermachen.

---

## 1. Vision (unveränderlich)

ContentCreator2026 ist das Werkzeug **eines Grafikers**, der Inhalte für **Zeitungen, Zeitschriften, Web und Social Media** produziert — Anzeigen, redaktionelle Grafiken, Banner, Posts, Karussells und **kurze Videos (bis 60 s)**. Nicht nur Gewinnspiele: jede Art von Inhalt in diesen Medien.

**Das Kernprinzip:** Die KI steht in der Mitte und führt den Prozess. Der Grafiker hat immer ein klares **Ziel** — eine visuelle Vorstellung oder Vorlage hat er **manchmal, aber nicht immer**. Der Dialog kennt deshalb drei gleichberechtigte Einstiege, und die KI erkennt selbst (oder fragt), welcher vorliegt:

**A — Nur ein Ziel, keine visuelle Vorstellung:** Die KI interviewt (Ziel, Zielgruppe, Botschaft, Pflichtelemente, Ton) und entwickelt dann SELBST **drei visuelle Richtungen** (kleine Vorschau-Entwürfe, klar unterschiedlich in Layout/Farbwelt/Tonalität). Der Grafiker wählt per Klick eine Richtung — ab da geht es mit Multiple-Choice-Verfeinerungen weiter. Die KI ist hier der kreative Vorschlagende, nie ratlos.

**B — Vorstellung im Kopf, keine Vorlage:** Die KI stellt **offene Fragen** (max. 5, eine nach der anderen), bis die Vorstellung greifbar ist, und setzt sie dann um.

**C — Vorlage hochgeladen** (z. B. ein Quiz-PDF, ein Konkurrenz-Inserat, ein Screenshot): Die KI analysiert sie und stellt **Multiple-Choice-Fragen** je Gestaltungsmerkmal („Farben übernehmen? ○ aus Vorlage ○ aus CI-Kit ○ neu wählen").

Danach ist der Ablauf für alle drei Wege gleich:

1. Die KI zeigt einen **Schrittplan** (Checkliste) und arbeitet ihn mit dem Grafiker Schritt für Schritt ab. Jeder Schritt: KI macht einen Vorschlag → Grafiker wählt **Annehmen / Ändern (Anweisung) / Selbst machen (Editor)**.
2. Am Ende steht das **abgabefertige Endprodukt** im richtigen Format für den Zielkanal.

**Grenze der KI = Hand des Grafikers:** Alles, was die KI erzeugt, liegt als editierbare Ebenen im eingebauten Canvas-Editor. Wenn die KI etwas nicht (gut genug) kann, greift der Grafiker selbst ein — nie ist er blockiert.

---

## 2. Nicht verhandelbare Regeln (Lehren aus dem Vorgängerprojekt Ad-Creator)

1. **npm/Node-Installationen laufen NUR auf dem Mac von Andreas** — nie aus einer Claude-Sandbox (Plattform-Konflikt bei nativen Paketen; Heilung: `rm -rf node_modules package-lock.json && npm install` am Mac).
2. **Große Binärdaten (Bilder, Video, Audio) NIE in einen Monolith-Datensatz.** Von Tag 1: IndexedDB-Store `assets`, inhaltsadressiert (Hash), Jobs referenzieren nur Hashes. (Im Ad-Creator kostete das Nachrüsten einen Tag; 128 MB → 0,07 MB pro Speichervorgang.)
3. **Backup eingebaut:** Job-Export als JSON (+ Assets als ZIP) mit einem Klick; automatischer Snapshot der letzten 5 Stände in einem eigenen IDB-Store.
4. **Ein-Tab-Wächter:** Warnbanner, wenn das Tool in einem zweiten Tab desselben Browsers offen ist (IndexedDB-Konflikte).
5. **Online = Passwortschutz** (Basic-Auth-Middleware, aktiv nur wenn Secret `APP_PASSWORD` gesetzt); API-Schlüssel ausschließlich als Cloudflare-Secrets, nie im Repo/Chat.
6. **Zweisprachig DE/EN** ab dem ersten Screen (zentrales Wörterbuch, T()-Muster) und **Sprachbedienung** (Web Speech API) in der KI-Leiste.
7. **Nutzerführung für Nicht-Techniker:** Ein-Klick-Start (.command mit Selbst-Setup), alle Terminal-Anweisungen als EINE kopierbare Zeile, nie Befehle in ein laufendes Server-Fenster.
8. **Jede KI-Aktion sichtbar:** Verlaufs-Panel (was wurde generiert, mit welchem Prompt, welche Kosten geschätzt); destruktive Aktionen mit Bestätigung und Undo.
9. **Kein Text als Pixel, wo Vektor möglich ist:** Print-Abgaben als Vektor-PDF (Texte/Flächen Vektor, Fotos eingebettet) über headless Chrome lokal bzw. Cloudflare-BROWSER-Binding online.
10. **Bild-Prompts motiv-neutral und full-bleed** formulieren (die 17 erprobten Stil-Presets aus dem Ad-Creator übernehmen).

---

## 3. Architektur

- **Stack:** Next.js 16 (App Router) + vinext → Cloudflare Workers (`npm run build:vinext && npm run deploy:vinext`); lokal `npm run dev` auf Port 3000. Repo neu: `content-creator-2026` (legt Andreas an).
- **Startbildschirm = KI in der Mitte** (bewährtes Muster): großes Dialogfenster („Was produzieren wir heute?") mit Text + Mikrofon; darum herum Karten: *Neuer Job*, *Laufende Jobs*, *Brand-Kits*, *Vorlagen*, *Asset-Bibliothek*, *Exporte*.
- **Datenmodell:** `Job { id, titel, kanal, ziel, briefing: FrageAntwort[], vorlageRef?, schrittplan: Schritt[], artefakte: Artefakt[], status }` · `Artefakt { id, format, ebenen: Ebene[], assetRefs }` · Assets separat (Regel 2).
- **KI-Routen:**
  - `/api/dialog` (Claude Sonnet): führt Briefing-Interview, erzeugt Fragen (offen oder Multiple Choice), baut/aktualisiert den Schrittplan, übersetzt freie Befehle in Editor-Aktionen.
  - `/api/analyze-template` (Claude Vision): Vorlage (PDF/PNG/JPG) → Struktur, Farben, Schriften, Text-Gefäße, Format — Basis der MC-Fragen. (Prompt-Grundlage aus dem Ad-Creator übernehmen und verallgemeinern.)
  - `/api/generate-image` (OpenAI gpt-image-Kette): Motive/Hintergründe, Stil-Presets, Format-Ratio je Kanal.
  - `/api/generate-copy` (Claude): Headlines, Captions, CTA-Varianten, Hashtags — immer 3 Vorschläge.
  - `/api/tts` (ElevenLabs, Konto vorhanden): Voiceover für Videos.
  - `/api/print-pdf`: Vektor-PDF (Dual-Mode lokal/BROWSER-Binding — Code aus Ad-Creator übernehmen).
- **Canvas-Editor:** Konva.js. Jedes Artefakt = Ebenenliste (Text, Bild, Form, Logo, Video-Platzhalter). Funktionen: verschieben, skalieren (mit proportionaler Schrift), drehen, ausrichten/verteilen, Ebenen-Reihenfolge, Farbwähler mit CI-Farben zuerst, Undo/Redo. Die KI editiert über dieselben Ebenen-Operationen wie der Mensch.
- **Video:** Remotion (React-basiert, gleicher Stack). Szenen-Templates + Timeline-Ansicht; Rendern lokal über `npx remotion render` (Knopf im Tool startet Anleitung/Befehl), später optional Cloud-Rendering.
- **Konnektoren-Panel:** OpenAI, Anthropic, ElevenLabs (Schlüssel-Status sichtbar); Stock nur lizenzfrei (Unsplash/Pexels/Wikimedia, Premium-Inhalte herausfiltern); Übergabe an Adobe: „Als InDesign-Paket" (PDF→INDD über den Adobe-Connector in Claude, dokumentierter 2-Klick-Upload durch den Nutzer).

---

## 4. Kanal-Wissen (gehört in die System-Prompts von `/api/dialog` — die KI MUSS diese Punkte je Kanal aktiv abfragen bzw. beachten)

### 4.1 Zeitung (Print)
Anzeigenmaß in **mm** laut Verlagsspezifikation (nachfragen!); Anschnitt/Beschnitt (üblich 3 mm) nur wenn gefordert; effektive Bildauflösung ≥ 200 dpi (Zeitungsdruck), keine Schrift < 7 pt, keine feinen Negativlinien; Farben CMYK-tauglich denken (kein Neon-RGB, Tiefen begrenzen), Verlags-CI (Brand-Kit) anwenden; Pflichtelemente: „Anzeige"-Kennzeichnung, Impressums-/Teilnahme-Texte falls Gewinnspiel; Abgabe: **Vektor-PDF in exakter mm-Größe**, Bilder zusätzlich als TIFF; Dateinamen-Konvention mit Titel/Format/Datum.

### 4.2 Zeitschrift (Print)
Wie Zeitung, aber: 300 dpi, echter Beschnitt + Schnittmarken auf Wunsch, feinere Typografie (Laufweite, Ligaturen), Glanzpapier verträgt sattere Farben; PDF/X-Kompatibilität anstreben; Platzierung (rechte/linke Seite, U2/U4) abfragen.

### 4.3 Web (Banner, Hero-Grafiken, Content-Bilder)
**Pixelmaße** statt mm (IAB-Standards: 300×250, 728×90, 160×600, 970×250 + individuelle Maße abfragen); Dateigewicht-Budget (Banner oft ≤ 150 KB) → Export WebP/AVIF + JPG-Fallback; Responsive-Varianten (Desktop/Mobile); Text möglichst NICHT ins Bild (SEO/Barrierefreiheit) — wenn doch: Kontrast nach WCAG AA; CTA klar; Alt-Text von der KI mitliefern lassen; Retina = 2×-Export.

### 4.4 Social Media
Formate pro Plattform (abfragen, dann automatisch alle gewählten erzeugen): Instagram Feed 1080×1350 (4:5) / 1080×1080, Story+Reel-Cover 1080×1920 mit **Safe-Zones** (oben ~250 px, unten ~310 px UI-frei), Karussell (bis 10 Kacheln, durchlaufende Motive möglich); Facebook 1200×630; LinkedIn 1200×627 (nüchterner Ton); X 1600×900. Regeln: Hook in den ersten Worten, wenig Text pro Kachel, Marken-Wiedererkennung (Logo-Platz, CI-Farben), Serien-Konsistenz; Caption + Hashtags von der KI in 3 Varianten; ein Job erzeugt auf Wunsch **alle Plattform-Formate gleichzeitig** aus einem Master-Layout.

### 4.5 Kurzvideo (bis 60 s)
Immer zuerst **Storyboard**: Hook (0–3 s) → Kern → CTA; Formate 9:16 (Reel/Story/TikTok), 1:1, 16:9 aus denselben Szenen; **Untertitel eingebrannt** (viele schauen stumm); Voiceover via ElevenLabs (Stimme wählen, Rechte geklärt) oder stumm mit Musik-Hinweis (Musik-Lizenz ist Sache des Grafikers — Tool weist darauf hin, liefert keine geschützte Musik); Marken-Intro/-Outro aus dem Brand-Kit; Szenen aus Artefakten des Jobs wiederverwenden (Bild-Kacheln animieren: Ken-Burns, Einflüge, Text-Reveals); Export H.264 MP4 (+ WebM), Zielgröße je Plattform beachten.

---

## 5. Phasen

### Phase 0 — Fundament
- [x] Repo `content-creator-2026` initialisieren (Andreas legt GitHub-Repo an); Next.js 16 + vinext + wrangler.jsonc (BROWSER/ASSETS-Bindings), Basic-Auth-Middleware (Regel 5)
- [x] Ein-Klick-Start `ContentCreator starten.command` (Muster aus Ad-Creator; danach `chmod +x` durch Andreas)
- [x] Datenmodell + IndexedDB: Stores `jobs`, `assets` (contentadressiert), `snapshots`; Ein-Tab-Wächter
- [x] App-Shell: Start-Ansicht mit KI-Zentrum + Karten, DE/EN-Umschalter, T()-Wörterbuch
- [x] Leeres Deployment auf Workers (Passwort gesetzt) — **nur vorbereiten**: Befehle (`npx wrangler secret put APP_PASSWORD`, `npm run build:vinext && npm run deploy:vinext`) in `OFFENE_PUNKTE.md` eintragen, dann abhaken und weiter
- **FERTIG WENN:** Tool startet per Doppelklick, leerer Job lässt sich anlegen/speichern/exportieren, Online-Version fragt nach Passwort.

### Phase 1 — KI-Dialog-Kern
- [x] `/api/dialog`: Einstiegs-Erkennung (Weg A/B/C aus Abschnitt 1) — die KI fragt zu Beginn höchstens EINMAL nach, ob es eine Vorlage/Vorstellung gibt, und verzweigt dann
- [x] Weg B: Briefing-Interview (offene Fragen, max. 5, eine nach der anderen); Antworten strukturiert im Job speichern
- [x] Weg A: **Drei-Richtungen-Vorschlag** — nach dem Interview generiert die KI drei klar unterschiedliche Mini-Entwürfe (Layout-Skizze + Farbwelt + Beispiel-Headline) als klickbare Karten; Wahl einer Richtung startet die MC-Verfeinerung (Enger/lockerer? Farbklima? Schriftcharakter?)
- [x] Weg C: Vorlagen-Upload + `/api/analyze-template`; aus der Analyse **Multiple-Choice-Fragen** generieren (je Gestaltungsmerkmal: aus Vorlage / aus Brand-Kit / neu) — UI als Karten mit Vorschau-Chips
- [x] Schrittplan-Generator: KI erstellt Checkliste zum Ziel; jeder Schritt mit Status (offen/KI-Vorschlag liegt vor/angenommen/manuell erledigt)
- [x] Spracheingabe (Web Speech, de/en) in der KI-Leiste; Mehrfach-Aktionen pro Befehl
- [x] KI-Verlaufs-Panel (Regel 8)
- **FERTIG WENN:** Kompletter Dialog vom „Worum geht's?" bis zum bestätigten Schrittplan funktioniert — auf allen drei Wegen: ohne jede Vorstellung, mit Vorstellung im Kopf, mit Vorlage.

### Phase 2 — Erzeugung: Bild, Layout, Text
- [x] Format-Presets je Kanal (Abschnitt 4) als Datenbasis; Job wählt Kanal → korrektes Artefakt-Format inkl. Einheiten (mm/px), Safe-Zones als Overlay
- [x] `/api/generate-image` mit den 17 Stil-Presets (aus Ad-Creator übernehmen: motiv-neutral, full-bleed) + Format-Ratio; Bild-Varianten (3 auf einmal, eine wählen)
- [x] `/api/generate-copy`: Headline/Sub/CTA/Caption/Hashtags, je 3 Varianten, Ton wählbar (nüchtern/frech/seriös)
- [x] Brand-Kits: Farben, Schriften, Logos, Abstände; Import der 46 Verlags-CIs aus `~/Desktop/wissensquiz/public/verlage-presets.json` samt Logo-PNGs (`verlag-logos/`) — Datenmodell erweitert um `hotlines`, `logoPfad`, `gruppe`, `titelKanonisch`
- [x] Artefakt-Renderer: Ebenen → Canvas-Vorschau in Echtgröße/Zoom
- **FERTIG WENN:** Aus einem Briefing entsteht ein erstes komplettes Artefakt (z. B. IG-Post + Zeitungsanzeige aus demselben Job) ohne manuelles Eingreifen.

### Phase 3 — Manueller Editor (die „eigene Hand")
- [ ] Konva-Editor: Ebenen-Panel, Auswahl, Verschieben/Skalieren/Drehen mit Snapping, Ausrichten/Verteilen, Z-Reihenfolge
- [ ] Text-Ebenen: Inline-Editing, Schriftgrößen-Stepper, CI-Farben zuerst im Farbwähler
- [ ] Bild-Ebenen: Ersetzen (Upload/Bibliothek/KI-neu mit Prompt), Zuschnitt, Filter (Helligkeit/Kontrast/Sättigung)
- [ ] Undo/Redo über alles; „Zurück zum KI-Vorschlag" je Schritt
- [ ] KI-Editor-Brücke: freie Befehle („mach die Headline größer und rück das Logo nach rechts") werden zu Ebenen-Operationen
- **FERTIG WENN:** Jedes von der KI erzeugte Artefakt lässt sich vollständig von Hand umbauen, und ein KI-Sprachbefehl verändert dieselben Ebenen sichtbar.

### Phase 4 — Exporte & Abgabe
- [ ] Raster: PNG/JPG/WebP in exakter Pixelgröße (1× und 2×), Gewichts-Anzeige gegen Budget
- [ ] Print: Vektor-PDF in mm (Dual-Mode-Route), optional Beschnitt+Schnittmarken; Bilder als TIFF
- [ ] Social-Paket: alle Formate eines Jobs als benanntes ZIP (`<Job>_<Plattform>_<Maß>.png` …) + Captions als Textdatei
- [ ] Adobe-Übergabe: „Als InDesign-Paket" (dokumentierter Weg über den Adobe-Connector)
- [ ] Job-Backup: JSON + Assets-ZIP; Auto-Snapshots
- [ ] **Korrekturportal** für Verlage/Kunden: pro Artefakt eine teilbare Review-Ansicht (Token-Link, kein Login) — der Empfänger klickt auf eine Stelle der Anzeige und hinterlässt einen Änderungswunsch (Text + optional Skizze). Alle Anmerkungen kommen als Pins mit Koordinaten und Kommentar-Thread zurück; Status je Pin (offen/erledigt/abgelehnt). Grafiker sieht Pins live im Editor.
- **FERTIG WENN:** Ein Job liefert druckfertige UND webfertige Abgaben in einem Rutsch, Dateinamen sauber; Verlags-Freigabe läuft über das Korrekturportal.

### Phase 5 — Kurzvideo
- [ ] Storyboard-Schritt im Dialog (Hook/Kern/CTA, Szenen aus Job-Artefakten vorschlagen)
- [ ] Remotion-Setup + 4 Szenen-Templates: Text-Reveal, Bild mit Ken-Burns, Karussell-Swipe, Logo-Outro; Timeline-UI (Szenen ordnen, Dauern ziehen)
- [ ] Untertitel-Spur (aus Voiceover-Text, eingebrannt, Safe-Zones beachtet)
- [ ] ElevenLabs-Voiceover (`/api/tts`): Stimme wählen, Vorschau, Länge an Szenen anpassen
- [ ] Render-Fluss: 9:16/1:1/16:9 aus denselben Szenen; lokaler Render-Befehl als Ein-Zeilen-Anleitung im Tool
- [ ] Logo-Einflug als Szenen-Template: Logo kommt aus der Tiefe, **2,0 s**, sanft abbremsend, mit vollem „Woooosch" (ElevenLabs Sound Effects, Fallback ffmpeg), Ton endet exakt beim Stopp; Stimme startet danach (≈ 2,3 s)
- [ ] Einflug-Animation für Aufzählungspunkte/Textelemente **synchron zur Stimme** (Zeiten aus ElevenLabs-Wortzeitstempeln, nicht geschätzt)
- [ ] Stimm-Auswahl im Tool: Standard **Anneke** (`m1xJVQ4AuvhAWXoSQdeA`); „Stimmproben erzeugen" liefert 3 Frauen- + 3 Männerstimmen (neutrales Hochdeutsch, trocken, ohne Hall) mit demselben zusammenhängenden Text aus dem Job; −16 LUFS, kein Hall
- [ ] Sprechtext-Assistent: Voiceover **liest nicht ab**, was im Bild steht (max. 4 gleiche Wörter in Folge), jeder Satz nur einmal, Längen-Ziel wählbar (z. B. max. 30 s / 60 s / 150 s) mit Live-Zähler
- [ ] Prüfung vor Export: Dauer gemessen, Ton-/Animations-Synchronität (≤ 50 ms), Untertitel-Safe-Zones, echte Umlaute; Ergebnis als kurzer Prüfbericht im Tool
- **FERTIG WENN:** Ein 20–30-s-Reel mit Logo-Einflug + Woooosch, Voiceover (Anneke), synchron einfliegenden Textelementen und Untertiteln entsteht komplett im Tool und liegt als MP4 vor (9:16, 1:1, 16:9).

### Phase 6 — Feinschliff & Übergabe
- [ ] Onboarding-Tour (5 Schritte) + „?"-Hilfe je Bereich; alle Texte DE/EN
- [ ] Grafiker-Handbuch als Seite im Tool (Start, Jobs, Kanäle, Exporte, Grenzen der KI)
- [ ] Kosten-Übersicht (KI-Aufrufe je Job, geschätzt)
- [ ] Performance-Check nach Playbook (messen: Start, Job-Wechsel, Save; Budgets als Test festschreiben)
- [ ] Finales Deployment + AGENTS.md im Repo (Architektur, Stolperfallen, Betrieb) + Projekt-Skill `content-creator-projekt` aktualisieren
- **FERTIG WENN:** Ein fachfremder Nutzer legt ohne Hilfe einen Job an und exportiert ein Ergebnis; Andreas hat abgenommen.

---

## 6. Loop-Regeln (bei jedem Durchlauf)

1. Erst dieses Dokument, dann `.claude/skills/content-creator-projekt/SKILL.md` (Praxis-Lehren aus Ad-Creator und Telemedia-Präsentation 2027 – verbindlich bei Design, Bildern, Stimme, PPTX, Web), dann `AGENTS.md` des Repos (sobald vorhanden).
2. Eine Aufgabe pro Durchlauf; nach Umsetzung: im Browser testen (visuell!), dann abhaken und committen.
3. Andreas will **live mitschauen** können: sichtbare Zwischenstände in `ZWISCHENSTAENDE.md`, aber **nicht auf ihn warten**.
4. `npm install` für benötigte Pakete darfst du selbst ausführen. Push und Deploy führt Andreas aus; dafür fertige Ein-Zeilen-Befehle in `OFFENE_PUNKTE.md` liefern.
5. Neue Erkenntnisse und Entscheidungen sofort unten in „7. Entscheidungs-Log" nachtragen.

## 7. Entscheidungs-Log
- 2026-09-24: Projektstart. Name: ContentCreator2026. Stack analog Ad-Creator (Next 16 + vinext + Cloudflare), Editor Konva.js, Video Remotion, Voice ElevenLabs.
- 2026-09-24: „vinext" = `@opennextjs/cloudflare` (v1). Wrangler-Bindings ASSETS (statisch) + BROWSER (Rendering für Vektor-PDF, Regel 9); Secrets ausschließlich per `wrangler secret put`.
- 2026-09-24: Basic-Auth liegt in `src/proxy.ts` (Next.js 16 nennt die frühere „middleware"-Konvention nun „proxy") und ist **nur aktiv, wenn `APP_PASSWORD` gesetzt ist** — lokale Entwicklung bleibt offen, online schützt es (Regel 5).
- 2026-09-24: `tsconfig.json` wird von Next 16 automatisch nachgezogen (`jsx: "react-jsx"`, `.next/dev/types/**/*.ts` im include) — Änderungen akzeptieren, nicht rückgängig machen.
- 2026-09-24: IndexedDB via **Dexie** (v4). Datenbank heißt `ContentCreator2026`, Version 1, drei Stores: `jobs` (Primärschlüssel `id`), `assets` (Primärschlüssel = SHA-256-`hash`, dedupliziert), `snapshots` (letzte 5 pro Job, Rotation im `jobSpeichern`).
- 2026-09-24: Ein-Tab-Wächter läuft über `BroadcastChannel("content-creator-2026:tabguard")`; Banner erscheint einmal und bleibt bis Reload — bewusst simpel, weil wir „anderer Tab schließt" nicht zuverlässig erkennen können.
- 2026-09-24: DE/EN via React-Context (`SpracheProvider`) + `localStorage['content-creator-2026:sprache']`; zentrales Wörterbuch in `src/lib/i18n.ts` — jeder sichtbare Text bekommt einen Schlüssel + `T('key')`, harte Strings sind verboten (Regel 6). Anfangssprache = gespeichert → sonst `navigator.language` → sonst DE.
- 2026-09-24: Startbildschirm-Struktur festgezurrt: Header (Phase-Label · Marke · DE/EN) — großes KI-Zentrum in der Mitte — Karten-Grid darunter (6 Karten, „Neuer Job" aktiv, Rest visuell mit „kommt bald"-Marker) — Debug-Sektion „IndexedDB-Test" ganz unten, bleibt bis Phase 1.
- 2026-09-24: Ein-Klick-Start `ContentCreator starten.command` mit Self-Setup (npm install beim ersten Start) und Browser-Auto-Open. Einmalig `chmod +x` durch Andreas.
- 2026-09-29: Umstellung auf **autonomen Modus** (Andreas): keine Freigabe-Stopps am Phasenende, keine Rückfragen; offene Punkte → `OFFENE_PUNKTE.md`, Demo-Stände → `ZWISCHENSTAENDE.md`. Deploy/Push weiterhin nur durch Andreas.
- 2026-09-29 (Andreas): Video ist Kernbestandteil. Phase 5 um die Lehren aus der Telemedia-Präsentation erweitert (Logo-Einflug 2 s + Woooosch, Einflüge synchron zur Stimme, Anneke als Standardstimme, Stimmproben 3+3, nicht ablesen, Längenziel, Prüfbericht). Details: `.claude/skills/content-creator-projekt/SKILL.md`.
- 2026-09-29: `OFFENE_PUNKTE.md` und `ZWISCHENSTAENDE.md` angelegt. Deploy-Befehle (`wrangler secret put …` verkettet + `build:vinext && deploy:vinext`) stehen als Ein-Zeiler bereit. Phase 0 damit abgeschlossen, Loop läuft direkt in Phase 1.
- 2026-09-29 (Andreas): **Korrekturportal muss wieder rein.** Nachfolger des Verlags-Freigabe-Tools aus dem Ad-Creator. Kunden bekommen einen Token-Link zur Anzeige, klicken auf eine Stelle und hinterlassen den Änderungswunsch (Text, später auch Skizze). Der Grafiker sieht die Pins mit Koordinaten und Status (offen/erledigt/abgelehnt) direkt im Editor. Aufgabe steht in Phase 4.
- 2026-09-29 (Andreas): **Verlage komplett übernehmen.** Alle 46 Verlags-Einträge aus `~/Desktop/wissensquiz/public/verlage-presets.json` (Titel, Verlag, Schrift, Hausfarben, Format, Logo-Pfad, Hotlines) plus die Logo-PNGs aus `~/Desktop/wissensquiz/public/verlag-logos/` in Phase 2 als Brand-Kits importieren. Datenmodell erweitert um `hotlines`, `logoPfad`, `gruppe`, `titel/verlag/titelKanonisch`.
- 2026-09-29: Phase 1 fertig. `/api/dialog` (Router / Briefing / drei Richtungen / MC-Vorlage / Schrittplan / Editor-Befehl) und `/api/analyze-template` (Claude Vision) laufen mit Claude Sonnet 4.6. Kosten je Aktion landen im IndexedDB-Store `kiAktionen` (Regel 8). UI: `WegAuswahl`, `KIDialog`, `RichtungenPanel`, `MCFragenPanel`, `SchrittplanPanel`, `KIVerlaufPanel`, `VorlagenUpload`, `MikrofonKnopf` (Web Speech). Startbildschirm-Prompt „Was produzieren wir heute?" ruft den Router und öffnet den JobEditor.
- 2026-09-29: Phase 2 fertig. `/api/generate-image` (gpt-image-2 → 1.5 → 1 Kette, 17 Stil-Presets aus Ad-Creator übernommen, IP-Sanitizer) und `/api/generate-copy` (Claude Sonnet, 6 Slots × 3 Varianten). ArtefaktRenderer skaliert Layer-Modell in Echtzeit. 46 Verlags-Presets + Logos aus wissensquiz sind unter `/public/verlage-presets.json` + `/public/verlag-logos/` verfügbar. „✨ KI schlägt komplettes Design vor"-Knopf feuert Bild + Headline + Sub + CTA parallel und schreibt sie in die passenden Ebenen. OpenAI-Konto hat kein Guthaben mehr → Notiz in `OFFENE_PUNKTE.md` #7.
