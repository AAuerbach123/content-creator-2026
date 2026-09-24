# LOOP — ContentCreator2026

**Arbeitsanweisung für Claude Code:** Lies dieses Dokument vollständig. Arbeite die Phasen strikt in Reihenfolge ab: nimm die erste nicht abgehakte Aufgabe `[ ]`, setze sie um, teste sie, hake sie ab `[x]`, committe mit aussagekräftiger Message. Am Ende jeder Phase: Demo-Zustand herstellen, Andreas zeigen, Freigabe abwarten. Verletze niemals die „Nicht verhandelbaren Regeln". Bei Unklarheit: EINE präzise Frage stellen, nicht raten.

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
- [ ] Ein-Klick-Start `ContentCreator starten.command` (Muster aus Ad-Creator; danach `chmod +x` durch Andreas)
- [ ] Datenmodell + IndexedDB: Stores `jobs`, `assets` (contentadressiert), `snapshots`; Ein-Tab-Wächter
- [ ] App-Shell: Start-Ansicht mit KI-Zentrum + Karten, DE/EN-Umschalter, T()-Wörterbuch
- [ ] Leeres Deployment auf Workers (Passwort gesetzt) — Andreas führt Deploy/Secrets selbst aus
- **FERTIG WENN:** Tool startet per Doppelklick, leerer Job lässt sich anlegen/speichern/exportieren, Online-Version fragt nach Passwort.

### Phase 1 — KI-Dialog-Kern
- [ ] `/api/dialog`: Einstiegs-Erkennung (Weg A/B/C aus Abschnitt 1) — die KI fragt zu Beginn höchstens EINMAL nach, ob es eine Vorlage/Vorstellung gibt, und verzweigt dann
- [ ] Weg B: Briefing-Interview (offene Fragen, max. 5, eine nach der anderen); Antworten strukturiert im Job speichern
- [ ] Weg A: **Drei-Richtungen-Vorschlag** — nach dem Interview generiert die KI drei klar unterschiedliche Mini-Entwürfe (Layout-Skizze + Farbwelt + Beispiel-Headline) als klickbare Karten; Wahl einer Richtung startet die MC-Verfeinerung (Enger/lockerer? Farbklima? Schriftcharakter?)
- [ ] Weg C: Vorlagen-Upload + `/api/analyze-template`; aus der Analyse **Multiple-Choice-Fragen** generieren (je Gestaltungsmerkmal: aus Vorlage / aus Brand-Kit / neu) — UI als Karten mit Vorschau-Chips
- [ ] Schrittplan-Generator: KI erstellt Checkliste zum Ziel; jeder Schritt mit Status (offen/KI-Vorschlag liegt vor/angenommen/manuell erledigt)
- [ ] Spracheingabe (Web Speech, de/en) in der KI-Leiste; Mehrfach-Aktionen pro Befehl
- [ ] KI-Verlaufs-Panel (Regel 8)
- **FERTIG WENN:** Kompletter Dialog vom „Worum geht's?" bis zum bestätigten Schrittplan funktioniert — auf allen drei Wegen: ohne jede Vorstellung, mit Vorstellung im Kopf, mit Vorlage.

### Phase 2 — Erzeugung: Bild, Layout, Text
- [ ] Format-Presets je Kanal (Abschnitt 4) als Datenbasis; Job wählt Kanal → korrektes Artefakt-Format inkl. Einheiten (mm/px), Safe-Zones als Overlay
- [ ] `/api/generate-image` mit den 17 Stil-Presets (aus Ad-Creator übernehmen: motiv-neutral, full-bleed) + Format-Ratio; Bild-Varianten (3 auf einmal, eine wählen)
- [ ] `/api/generate-copy`: Headline/Sub/CTA/Caption/Hashtags, je 3 Varianten, Ton wählbar (nüchtern/frech/seriös)
- [ ] Brand-Kits: Farben, Schriften, Logos, Abstände; Import-Funktion für die 48 Verlags-CIs aus dem Ad-Creator (verlage-presets.json)
- [ ] Artefakt-Renderer: Ebenen → Canvas-Vorschau in Echtgröße/Zoom
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
- **FERTIG WENN:** Ein Job liefert druckfertige UND webfertige Abgaben in einem Rutsch, Dateinamen sauber.

### Phase 5 — Kurzvideo
- [ ] Storyboard-Schritt im Dialog (Hook/Kern/CTA, Szenen aus Job-Artefakten vorschlagen)
- [ ] Remotion-Setup + 4 Szenen-Templates: Text-Reveal, Bild mit Ken-Burns, Karussell-Swipe, Logo-Outro; Timeline-UI (Szenen ordnen, Dauern ziehen)
- [ ] Untertitel-Spur (aus Voiceover-Text, eingebrannt, Safe-Zones beachtet)
- [ ] ElevenLabs-Voiceover (`/api/tts`): Stimme wählen, Vorschau, Länge an Szenen anpassen
- [ ] Render-Fluss: 9:16/1:1/16:9 aus denselben Szenen; lokaler Render-Befehl als Ein-Zeilen-Anleitung im Tool
- **FERTIG WENN:** Ein 20–30-s-Reel mit Voiceover und Untertiteln entsteht komplett im Tool und liegt als MP4 vor.

### Phase 6 — Feinschliff & Übergabe
- [ ] Onboarding-Tour (5 Schritte) + „?"-Hilfe je Bereich; alle Texte DE/EN
- [ ] Grafiker-Handbuch als Seite im Tool (Start, Jobs, Kanäle, Exporte, Grenzen der KI)
- [ ] Kosten-Übersicht (KI-Aufrufe je Job, geschätzt)
- [ ] Performance-Check nach Playbook (messen: Start, Job-Wechsel, Save; Budgets als Test festschreiben)
- [ ] Finales Deployment + AGENTS.md im Repo (Architektur, Stolperfallen, Betrieb) + Projekt-Skill `content-creator-projekt` aktualisieren
- **FERTIG WENN:** Ein fachfremder Nutzer legt ohne Hilfe einen Job an und exportiert ein Ergebnis; Andreas hat abgenommen.

---

## 6. Loop-Regeln (bei jedem Durchlauf)

1. Erst dieses Dokument, dann `AGENTS.md` des Repos lesen (sobald vorhanden).
2. Eine Aufgabe pro Durchlauf; nach Umsetzung: im Browser testen (visuell!), dann abhaken und committen.
3. Andreas will **live mitschauen** können — laut mitdenken, sichtbare Zwischenstände.
4. Push/Deploy/Installationen führt Andreas am Mac aus — fertige Ein-Zeilen-Befehle liefern.
5. Neue Erkenntnisse und Entscheidungen sofort unten in „7. Entscheidungs-Log" nachtragen.

## 7. Entscheidungs-Log
- 2026-09-24: Projektstart. Name: ContentCreator2026. Stack analog Ad-Creator (Next 16 + vinext + Cloudflare), Editor Konva.js, Video Remotion, Voice ElevenLabs.
- 2026-09-24: „vinext" = `@opennextjs/cloudflare` (v1). Wrangler-Bindings ASSETS (statisch) + BROWSER (Rendering für Vektor-PDF, Regel 9); Secrets ausschließlich per `wrangler secret put`.
- 2026-09-24: Basic-Auth liegt in `src/proxy.ts` (Next.js 16 nennt die frühere „middleware"-Konvention nun „proxy") und ist **nur aktiv, wenn `APP_PASSWORD` gesetzt ist** — lokale Entwicklung bleibt offen, online schützt es (Regel 5).
- 2026-09-24: `tsconfig.json` wird von Next 16 automatisch nachgezogen (`jsx: "react-jsx"`, `.next/dev/types/**/*.ts` im include) — Änderungen akzeptieren, nicht rückgängig machen.
- 2026-09-24: Ein-Klick-Start `ContentCreator starten.command` mit Self-Setup (npm install beim ersten Start) und Browser-Auto-Open. Einmalig `chmod +x` durch Andreas.
