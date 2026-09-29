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
