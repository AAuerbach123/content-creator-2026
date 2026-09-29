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
