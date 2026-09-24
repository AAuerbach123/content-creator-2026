# ContentCreator2026

Werkzeug eines Grafikers, um Inhalte für **Zeitung, Zeitschrift, Web, Social Media und Kurzvideo** zu produzieren — mit KI im Zentrum, Ergebnis immer als editierbare Ebenen.

Stack: **Next.js 16** (App Router) + **@opennextjs/cloudflare** (kurz „vinext") → **Cloudflare Workers**. Canvas-Editor: Konva (später). Video: Remotion (später).

## Lokal starten (Andreas' Mac)

Einmalig — Abhängigkeiten installieren und Dev-Server starten:

```bash
cd ~/Desktop/content-creator-2026 && npm install && npm run dev
```

Danach: http://localhost:3000

Alternativ: Doppelklick auf **`ContentCreator starten.command`** (installiert beim ersten Start selbst, dann öffnet es den Browser). Einmalig vorher:

```bash
chmod +x ~/Desktop/content-creator-2026/"ContentCreator starten.command"
```

## Passwortschutz (nur online, Regel 5)

Ist `APP_PASSWORD` **nicht** gesetzt → offener Betrieb (lokale Entwicklung).
Ist es gesetzt → Basic-Auth für jede Seite.

Setzen als Cloudflare-Secret:

```bash
npx wrangler secret put APP_PASSWORD
```

## Cloudflare-Deploy

```bash
npm run build:vinext && npm run deploy:vinext
```

## Wichtige Regeln
Siehe `LOOP-ContentCreator2026.md`, Abschnitt 2 (Nicht verhandelbare Regeln).
