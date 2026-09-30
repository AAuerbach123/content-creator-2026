<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# ContentCreator2026 · Betriebshandbuch für Agenten

Willkommen. Wenn du (Claude / anderer Agent) hier arbeitest, lies **zuerst** `LOOP-ContentCreator2026.md` und dann `.claude/skills/content-creator-projekt/SKILL.md`. Diese Datei fasst die Architektur und die Stolperfallen zusammen — die dort dokumentierten „Nicht verhandelbaren Regeln" sind absolut bindend.

## Stack

- **Next.js 16** (App Router, `src/` Verzeichnis) + `@opennextjs/cloudflare` (v1). Andreas nennt das „vinext". Deploy: `npm run build:vinext && npm run deploy:vinext`.
- **Cloudflare Workers** Bindings: `ASSETS` (statische Dateien), `BROWSER` (headless Chrome für Vektor-PDFs; steht in `wrangler.jsonc`).
- **Basic-Auth-Proxy** in `src/proxy.ts` — nur aktiv, wenn Secret `APP_PASSWORD` gesetzt ist. Lokal offen.
- **Client-Persistenz**: Dexie/IndexedDB, DB `ContentCreator2026`, aktuelle Version **4**. Stores:
  - `jobs` (Primärschlüssel `id`, Index `kanal, status, aktualisiertAm, faelligAm`)
  - `assets` (Primärschlüssel = SHA-256-Hash, content-adressiert — Regel 2)
  - `snapshots` (letzte 5 pro Job, Rotation — Regel 3)
  - `kiAktionen` (KI-Verlauf mit Tokens + Kosten — Regel 8)
  - `freigaben` (Korrekturportal-Freigaben mit Pins)
  - `vorlagen` (eigene wiederverwendbare Templates)
- **Ein-Tab-Wächter** via `BroadcastChannel("content-creator-2026:tabguard")` (Regel 4).
- **DE/EN** über React-Context (`SpracheProvider`) + Wörterbuch in `src/lib/i18n.ts`. Jeder sichtbare String bekommt einen Schlüssel. Harte Strings sind verboten (Regel 6).
- **Ein-Klick-Start** via `ContentCreator starten.command`. Nach jeder Änderung an einer `.command`-Datei: `chmod +x` (macOS entfernt das Recht bei manchen Umformungen).

## KI-Anbieter und Routen

Alle Routen in `src/app/api/`:

| Route | Anbieter | Zweck |
|---|---|---|
| `/api/dialog` | Anthropic Claude Sonnet 4.6 | Einstiegs-Router, Briefing, drei Richtungen, MC-Fragen, Schrittplan, Editor-Befehle |
| `/api/analyze-template` | Claude Vision | Vorlagen-Analyse (Farben, Schriften, Textgefäße) |
| `/api/generate-image` | OpenAI gpt-image-2 → 1.5 → 1 | Bildgenerierung, 17 Stil-Presets (`src/lib/stil-presets.ts`) |
| `/api/generate-copy` | Claude | 6 Text-Slots × 3 Varianten, 5 Töne |
| `/api/tts` | ElevenLabs (multilingual v2) | Voiceover + Wortzeitstempel, Standard: Anneke (`m1xJVQ4AuvhAWXoSQdeA`) |
| `/api/tts-voices` | ElevenLabs | Voice-Liste (gecached 5 min) |
| `/api/sfx` | ElevenLabs Sound Effects | Woooosch etc. |

Schlüssel kommen aus `.env.local` (lokal) bzw. Cloudflare Secrets (online). Nie in Code oder Chat.

## Zentrale Komponenten

- `StartScreen` → `KIZentrum` → `JobEditor` (öffnet sich, sobald ein Job aktiv ist).
- `JobEditor` orchestriert:
  - `WegAuswahl` (A/B/C)
  - `KIDialog` (Chat + Web-Speech-Mikro)
  - `RichtungenPanel`, `MCFragenPanel`, `VorlagenUpload`
  - `SchrittplanPanel`, `KIVerlaufPanel`
  - `ArtefaktWerkstatt` (Kern für Phase 2 aufwärts):
    - `ArtefaktRenderer` (Vorschau) / `EditorAnsicht` (Konva-Editor)
    - `BildErzeugung`, `CopyErzeugung`, `VerlagWahl`, `KanalWahl`
    - `VideoStudio` (nur bei Kanal Kurzvideo)
    - `ExportPanel`, `KorrekturportalPanel`, `GrafikerPinAnsicht`
    - `WerkzeugePanel` (QR, UTM, Notizen, Print-Check, Farbschema, Alt-Text, Hashtags, Übersetzung, Vorlagen-Bibliothek)

## Datenmodell

Kernstruktur in `src/lib/types.ts`. Wichtige Erweiterungen:

- `Job.videoStoryboard` (Storyboard aus `src/lib/video-types.ts`)
- `Job.notizen` (interne Grafiker-Notizen)
- `Job.faelligAm` (für Redaktionsplan-Ansicht)
- `Job.hashtags` (Hashtag-Vorschläge)
- `Artefakt.ebenen` — jede Ebene hat `x/y/breite/hoehe/drehung/eigenschaften/assetHash/sichtbar`
- Assets werden **NIE** ins Job-JSON eingebettet. Nur Hash-Referenzen.

## Renderer für Video

- Web-Preview: `@remotion/player` im `RemotionPlayerWrapper`. Ersetzt `asset://<hash>` durch Blob-URLs.
- Lokaler CLI-Render: `src/remotion/index.tsx` → `Root.tsx` → `VideoKomposition.tsx`. Der CLI-Render nutzt derzeit das Beispiel-Storyboard in `Root.tsx`; für echte Jobs siehe `OFFENE_PUNKTE.md` #9.
- Fünf Szenen-Templates in `VideoKomposition.tsx`: Logo-Einflug (2 s spring), Text-Reveal (synchron zu Wortzeitstempeln), Bild-Ken-Burns, Karussell-Swipe, Logo-Outro.

## Exporte

- Client-seitig: `src/lib/export-raster.ts` (Canvas), `src/lib/export-pdf.ts` (pdf-lib, echte Vektor-Texte), `src/lib/export-paket.ts` (jszip für Social-Paket, Job-Backup, Adobe-Paket).
- Vektor-PDF in mm mit optionalem 3 mm Beschnitt + Schnittmarken (LOOP Regel 9).

## Korrekturportal

- Route `/review/[token]`. Kunde platziert Pins (0..1-Koordinaten) mit Kommentar. Grafiker sieht Pins in `GrafikerPinAnsicht` mit Kommentar-Thread und Status.
- **Grenze:** Freigaben liegen aktuell in IndexedDB → nur Same-Browser. Für Cross-Browser: Cloudflare KV, siehe `OFFENE_PUNKTE.md` #8.

## Stolperfallen (aus Ad-Creator + Telemedia gelernt)

1. **`npm install`** läuft NUR auf Andreas' Mac (native Pakete brechen in Sandbox — siehe Regel 1). Heilmittel: `rm -rf node_modules package-lock.json && npm install` auf dem Mac.
2. **Große Binärdaten** NIE in Job-JSON — immer via `assetSpeichern(blob)` in den Assets-Store (Regel 2).
3. **Ein zweiter Tab** löst Konflikte in IndexedDB aus → Warnbanner via BroadcastChannel (Regel 4).
4. **Bild-Prompts** motiv-neutral + full-bleed formulieren (Regel 10). Die 17 Presets sind bereits richtig.
5. **CSP** auf Workers verbietet Inline-Skripte — deshalb alles als React-Komponenten, kein `dangerouslySetInnerHTML` mit `<script>`.
6. **`sharp` und andere native Pakete** nur auf dem Mac ausführen; nicht im Cloudflare-Worker-Bundle nutzen.
7. **Umlaute:** Ersatzschreibungen wie „nachzaehlen" sind für Zeitungen inakzeptabel. Der Video-Prüfbericht warnt automatisch.
8. **ElevenLabs:** Schlüssel braucht Text-to-Speech + Voices (Read) + Sound Effects. Bei 401 „missing_permissions" den Key neu erstellen.
9. **OpenAI:** Bei „insufficient_quota" nicht die Fallback-Kette weiterjagen — Guthaben aufladen.
10. **Nichts erfinden** (keine Kontaktdaten, Rechtsaussagen, Preisversprechen). Unbestätigtes markieren.

## Was Andreas selbst macht

- `git push` und `wrangler deploy`.
- `wrangler secret put ...` für `APP_PASSWORD`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`.
- `chmod +x` für `.command`-Dateien nach Änderungen.
- Screenshots im Browser (Handy-, Tablet-, Laptop-Größe).

Ein-Zeilen-Befehle dafür liegen in `OFFENE_PUNKTE.md`.

## Weiterentwicklung

Ideen für die nächsten Loops stehen in `IDEEN_NAECHSTE_LOOPS.md` — priorisiert nach „passt zu Andreas' Alltag". Zwischenstände immer in `ZWISCHENSTAENDE.md` festhalten.
