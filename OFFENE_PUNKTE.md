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

## 7. OpenAI-Guthaben aufladen (blockiert Bildgenerierung)

Bei der Live-Prüfung meldet die OpenAI-API `insufficient_quota` / `credit_balance_exhausted` — Bildgenerierung geht deshalb noch nicht:
- Aufladen unter https://platform.openai.com/settings/organization/billing/
- Empfehlung für Erprobung: 20 USD Startguthaben (ein `gpt-image-1`-Bild „medium" kostet ca. 0,04 USD, also ≈ 500 Bilder)

Der Code fällt sonst sauber zurück auf `gpt-image-1.5` → `gpt-image-1` und meldet den Fehler an die Oberfläche.

---

## 8. Korrekturportal cross-browser — Cloudflare KV anlegen (Phase 6, lokal fertig)

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

---

## 9. Video-Export ohne Handarbeit — Ein-Klick im Tool (Phase 6, fertig)

Der Knopf **„💾 MP4 erzeugen"** im Video-Studio ist da (siehe `src/components/VideoStudio.tsx`):

- Schickt das echte Job-Storyboard + alle Asset-Blobs als Base64 an `/api/render-video`.
- Die Route (`src/app/api/render-video/route.ts`) schreibt Assets nach `public/remotion/<hash>.<ext>`, bundelt Remotion (`@remotion/bundler`), rendert je gewählter Ratio (9:16 / 1:1 / 16:9) über `@remotion/renderer` und legt die MP4 in `public/renders/` (Download-Link direkt im Tool) + Kopie in `out/` ab.
- Composition `Reel` liest Breite/Höhe/Dauer via `calculateMetadata` aus den `inputProps` — eine Composition reicht für drei Ratios.

**Grenze:** Der Render läuft **nur lokal** (Node-Runtime + headless Chrome). Auf Cloudflare Workers gibt es kein Chromium — die Route meldet dort einen klaren Fehler. Wenn Video-Rendering auch online laufen soll, ist Remotion Lambda der Weg (siehe IDEEN_NAECHSTE_LOOPS.md #27).

Erster Aufruf dauert 30–60 s (Bundling). Danach ist Rendern schnell.

---

## 10. Rufnummern von Yasmina Salah bestätigen (Phase 7)

`public/rufnummern.json` enthält 55 Zeitungen aus den alten Listen (Ad-Creator + monday-Board *2. Projektdetails*). Status im Tool: **„zu bestätigen"**. Vor dem ersten echten Druck bitte einmal mit Yasmina abgleichen und ggf. korrigieren. Auf `/rufnummern` steht ganz oben ein gelbes Warnbanner.

Fehlt eine getrennte Online-Nummer (Handy vs. Laptop/QR)? Die Felder in `rufnummern.json` sind vorbereitet (`online.handy` / `online.laptopQr`) — solange sie `null` sind, warnt das Tool, statt zu erfinden.

Kein Terminal-Befehl nötig — nur JSON-Datei anpassen und committen:
```bash
open -e public/rufnummern.json
```
