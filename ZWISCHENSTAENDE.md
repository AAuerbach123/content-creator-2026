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

