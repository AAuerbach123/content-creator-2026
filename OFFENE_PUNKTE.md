# Offene Punkte — ContentCreator2026

> Was **Andreas** an seinem Mac ausführen muss. Immer **eine kopierbare Zeile** je Punkt.
> Claude selbst führt keine Deploys, Pushes oder Secret-Änderungen aus.

---

## 1. Erst-Einrichtung (einmalig)

### 1.1 .env.local prüfen (lokal, für `npm run dev`)
`.env.local` liegt bereits mit `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`.
Falls ein Schlüssel neu ist, ersetzen — nicht committen (steht in `.gitignore`).

### 1.2 .dev.vars für den Wrangler-Preview anlegen (optional)
Nur wenn du `npm run preview:vinext` lokal testest:
```bash
cp .dev.vars.example .dev.vars && open -e .dev.vars
```

---

## 2. Cloudflare-Secrets setzen (einmalig pro Schlüssel)

Vor dem ersten `deploy:vinext` diese Befehle nacheinander im Repo-Ordner ausführen — jeder öffnet einen Prompt, in den du den Wert einfügst:

```bash
npx wrangler secret put APP_PASSWORD && npx wrangler secret put ANTHROPIC_API_KEY && npx wrangler secret put OPENAI_API_KEY && npx wrangler secret put ELEVENLABS_API_KEY
```

---

## 3. Erstes leeres Deployment auf Cloudflare Workers

Nachdem die Secrets gesetzt sind:
```bash
npm run build:vinext && npm run deploy:vinext
```

Danach zeigt Wrangler die Worker-URL. Beim Aufruf verlangt der Browser den Passwortschutz (Basic-Auth) — Nutzer beliebig, Passwort = `APP_PASSWORD`.

---

## 4. GitHub-Push (nach jedem Loop-Commit)

```bash
git push
```

*(Voraussetzung: Remote `origin` ist eingerichtet. Falls nicht: `git remote add origin <URL> && git branch -M main && git push -u origin main`.)*

---

## 5. Nach jeder Änderung an einer `.command`-Datei

macOS entfernt bei bestimmten Neuschreibungen das Ausführrecht — einmal drüberlaufen lassen:
```bash
chmod +x "ContentCreator starten.command" "ContentCreator weiterbauen.command" "Beide Tools starten.command"
```

---

## 6. Node-Module frisch installieren (nur bei Plattform-Konflikten)

Wenn nach einem `git pull` Fehler kommen wie „Cannot find module" oder ein natives Paket streikt:
```bash
rm -rf node_modules package-lock.json && npm install
```

---

## 7. ✅ ERLEDIGT (02.10.2026) – OpenAI-Guthaben aufgeladen

Test mit `OpenAI testen.command` erfolgreich (gpt-image-1 liefert Bilder). Bei künftigen Problemen denselben Test erneut starten.

<details><summary>Alter Text</summary>


Bei der Live-Prüfung meldet die OpenAI-API `insufficient_quota` / `credit_balance_exhausted` — Bildgenerierung geht deshalb noch nicht:
- Aufladen unter https://platform.openai.com/settings/organization/billing/
- Empfehlung für Erprobung: 20 USD Startguthaben (ein `gpt-image-1`-Bild „medium" kostet ca. 0,04 USD, also ≈ 500 Bilder)

Der Code fällt sonst sauber zurück auf `gpt-image-1.5` → `gpt-image-1` und meldet den Fehler an die Oberfläche.

</details>

---

## 8. Korrekturportal cross-browser — KV ✅ angelegt (02.10.2026), nur noch online stellen

KV-Namespace `content-creator-2026-FREIGABEN` (id `9557d28444cb4d09a2084b5f550da63a`) ist angelegt und in `wrangler.jsonc` als Binding `FREIGABEN` eingetragen. **Offen:** Doppelklick auf `ContentCreator online stellen.command` (baut, deployt, committet, pusht).

<details><summary>Alter Text</summary>


Der Server-Store liegt fertig im Code (`src/lib/freigabe-store.ts` + `/api/freigabe`). **Lokal (`npm run dev`) funktioniert alles ohne weiteres Setup** — Freigaben landen in `.freigaben/<token>.json`. Für das Cloudflare-Deployment fehlt der KV-Namespace:

```bash
npx wrangler kv namespace create FREIGABEN
```

Wrangler gibt eine `id` aus. Diese in `wrangler.jsonc` als Binding eintragen:

```jsonc
"kv_namespaces": [
  { "binding": "FREIGABEN", "id": "<HIER_DIE_ID_EINFUEGEN>" }
]
```

Danach `npm run build:vinext && npm run deploy:vinext`. Der Code erkennt das Binding automatisch (`getCloudflareContext().env.FREIGABEN`) und nutzt es statt der Datei.

</details>

---

## 9. Video-Export ohne Handarbeit — Ein-Klick im Tool (Phase 6, fertig)

Der Knopf **„💾 MP4 erzeugen"** im Video-Studio ist da (siehe `src/components/VideoStudio.tsx`):

- Schickt das echte Job-Storyboard + alle Asset-Blobs als Base64 an `/api/render-video`.
- Die Route (`src/app/api/render-video/route.ts`) schreibt Assets nach `public/remotion/<hash>.<ext>`, bundelt Remotion (`@remotion/bundler`), rendert je gewählter Ratio (9:16 / 1:1 / 16:9) über `@remotion/renderer` und legt die MP4 in `public/renders/` (Download-Link direkt im Tool) + Kopie in `out/` ab.
- Composition `Reel` liest Breite/Höhe/Dauer via `calculateMetadata` aus den `inputProps` — eine Composition reicht für drei Ratios.

**Grenze:** Der Render läuft **nur lokal** (Node-Runtime + headless Chrome). Auf Cloudflare Workers gibt es kein Chromium — die Route meldet dort einen klaren Fehler. Wenn Video-Rendering auch online laufen soll, ist Remotion Lambda der Weg (siehe IDEEN_NAECHSTE_LOOPS.md #27).

Erster Aufruf dauert 30–60 s (Bundling). Danach ist Rendern schnell.

---

## 10. ESLint einrichten (Prüf-Loop 2026-09-30)

Next 16 hat `next lint` entfernt. Aktuell macht `npm run pruefen` alles Wichtige (Typecheck, Custom-Checks, Build). Wenn ESLint gewünscht ist, einmalig auf dem Mac:

```bash
npm i -D eslint @eslint/js typescript-eslint eslint-plugin-react eslint-plugin-react-hooks && printf "%s\n" "import js from '@eslint/js'" "import tseslint from 'typescript-eslint'" "export default [js.configs.recommended, ...tseslint.configs.recommended]" > eslint.config.mjs && npx eslint src
```

Danach in `package.json` das `lint`-Skript auf `eslint src` umstellen und in `pruefen` einbinden.

---

## 11. Rufnummern von Yasmina Salah bestätigen (Phase 7)

`public/rufnummern.json` enthält 55 Zeitungen aus den alten Listen (Ad-Creator + monday-Board *2. Projektdetails*). Status im Tool: **„zu bestätigen"**. Vor dem ersten echten Druck bitte einmal mit Yasmina abgleichen und ggf. korrigieren. Auf `/rufnummern` steht ganz oben ein gelbes Warnbanner.

Fehlt eine getrennte Online-Nummer (Handy vs. Laptop/QR)? Die Felder in `rufnummern.json` sind vorbereitet (`online.handy` / `online.laptopQr`) — solange sie `null` sind, warnt das Tool, statt zu erfinden.

Kein Terminal-Befehl nötig — nur JSON-Datei anpassen und committen:
```bash
open -e public/rufnummern.json
```

---

## 12. Serien-Anzeigen: PDF-Rendering der 11 Spiele (Phase 3 Oktober-Loop)

Die PDF-Begutachtung je Spiel macht Andreas am Mac (headless Chrome braucht lokalen Puppeteer-Pfad):

```bash
node scripts/serie-export.mjs 2027-02 fehlerjagd ta 1,2 && pdftoppm -r 110 _export/*.pdf _export/preview && open _export/
```

Für die zehn weiteren Spiele den `<id>` tauschen: `aus2mach1`, `kreuzquer-april`, `brueckenraetsel`, `kombinieren`, `sommer-postkarte`, `wahr-oder-erfunden`, `sprichwort-raetsel`, `schattenraetsel`, `gitterraetsel`, `kreuzquer-oktober`.

---

## 13. Präsentationen per Knopfdruck – `pptxgenjs` (Phase 5 Oktober-Loop)

Vor dem ersten Export „Gewinnspielplan 2027“ als PPTX muss die Bibliothek `pptxgenjs` auf dem Mac installiert werden:

```bash
npm i pptxgenjs@4.0.1 && cp -R _quellen_loop_2026-10/praesentation/gsp_bilder public/praesentation/
```

Für den PDF-Export aus dem Tool wird LibreOffice im Standardpfad erwartet. Falls nicht vorhanden:

```bash
brew install --cask libreoffice
```

---

## 14. Serien-Anzeigen: monday.com-Schlüssel (für „Spieltage nach monday übertragen“)

Persönlichen API-Token in monday holen (Profilbild → Developers → My access tokens), dann lokal in `.env.local` eintragen (Vorlage: `.env.local.example`) und den Server neu starten:
```bash
open -e .env.local
```
Online (Cloudflare) einmalig:
```bash
npx wrangler secret put MONDAY_API_TOKEN
```
Zum Testen ein **privates** Board mit den Spalten „Datum“ (Datum), „Frage“, „Antwort 1“, „Antwort 2“, „Richtige Antwort“, „Dateiname“ (Text) anlegen; Board-ID steht in der URL nach `/boards/`. Testmodus bleibt an.

---

## 15. Cockpit 2027 im Browser prüfen (Loop „Cockpit 2027")

```bash
npm run dev
```
→ Startseite öffnet sich. Neue Karte **„Cockpit 2027 (einfach)"** (Position 1 im Kreis) klicken, oder direkt `http://localhost:3000/cockpit` öffnen.

Schnell-Test für Geldregen (sollte unter 3 Minuten dauern):
1. Kachel **Geldregen** → Phase 1 „Nein, Vorschlag A/B/C" → **Vorlage übernehmen**.
2. Phase 2 → **„Bestehende Kampagne übernehmen"** (nimmt automatisch 2027-11 mit 30 Spieltagen aus `fragen_2027.json`).
3. Phase 3 → beim gewählten Spieltag die Quelle eintragen (ohne Quelle meldet die Prüfung „Flowchart Seite 4 Pflicht").
4. Phase 4 → Spieltag 2 öffnen, „+ Gewinner hinzufügen", Felder füllen, Gewinnertext tippen (Zähler beobachten). Optional **„Vorschlag"**-Knopf mit Stichworten testen.
5. Phase 5 → **Cmd/Ctrl+Enter** = Prüfen und freigeben.

## 16. Cockpit 2027 online stellen (nach erfolgreichem Browser-Test)

Kein neuer Secret, kein neues Paket – nur bauen und deployen:
```bash
npm run build:vinext && npm run deploy:vinext
```

## 17. Dexie-Migration auf v7 (automatisch beim ersten Browser-Start)

Wenn du das Cockpit zum ersten Mal öffnest, legt Dexie die neuen Stores `kampagnen`, `spieltage` und `cockpitVorlagen` an. Vorhandene Daten (Jobs, Assets, Serien-Gewinner usw.) bleiben erhalten – geprüft gegen die vorherigen Versionen 1 bis 6. Zum Zurücksetzen (nur falls jemals nötig):

```bash
# Chrome Dev-Tools öffnen → Application → IndexedDB → ContentCreator2026 → Delete database
```

## 18. Shortcut im Cockpit

- `Cmd+Enter` (Mac) bzw. `Ctrl+Enter` (Windows/Linux) in Phase 5 löst „Prüfen und freigeben" aus.
- Weitere Shortcuts (`N` nächster Tag, `G` Gewinner, `?` Hilfe) sind in `docs/cockpit-test.md` als Loop-2-Punkt eingetragen und noch nicht belegt.

## 19. Prüfläufe nach Code-Änderungen am Cockpit

```bash
node scripts/check-kontrast.mjs && node scripts/check-i18n.mjs && node scripts/check-umlaute.mjs && node scripts/check-hilfe.mjs && node scripts/check-spielauswahl.mjs && node_modules/.bin/tsc --noEmit -p . && node scripts/check-serie.mjs 2027-11 && node scripts/check-serie.mjs 2027-12
```

Alle müssen grün melden; `check-serie 2027-11/12` muss weiterhin **3213 identisch** (Nov) bzw. die Dez-Anzahl zeigen, damit Regel 5 (Geldregen Nov/Dez bytegleich) eingehalten ist.
