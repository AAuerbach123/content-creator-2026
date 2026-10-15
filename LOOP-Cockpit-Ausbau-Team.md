# LOOP · Cockpit-Ausbau „Team, Kunden, monday“ (Stand 14.10.2026)

> Autonomer Loop. Keine Rückfragen an Andreas. Entscheidungen ins **Entscheidungs-Log** unten, offene Punkte nach `OFFENE_PUNKTE.md`, Demo-Stände nach `ZWISCHENSTAENDE.md`. Andreas ist im Tagesgeschäft NICHT beteiligt – das Cockpit muss ohne ihn funktionieren.

## Ziel

Das Cockpit 2027 (`/cockpit`) wird das gemeinsame Arbeitswerkzeug von Telemedia:

1. **Alle Eingeloggten sehen denselben Stand** (zentraler Speicher statt nur Browser).
2. **Anmeldung über Cloudflare Access** (E-Mail + Einmal-Code), Rollen im Cockpit, Protokoll „wer hat wann was geändert“.
3. **Kunden-Korrekturportal**: jeder Verlag(sgruppe) bekommt einen festen, sperrbaren Link, sieht nur die eigenen Anzeigen, setzt Korrekturen und gibt frei.
4. **monday bleibt synchron**: Das Cockpit führt; es legt die Board-Sätze (a–d) an und hält sie aktuell. Freigabe- und Auszahlungsstatus, die jemand in monday setzt, kommen zurück ins Cockpit.
5. **Neun Bedien-Verbesserungen** (siehe Phasen 3–8).

## Entscheidungen von Andreas (14.10.2026, verbindlich)

| Thema | Entscheidung |
|---|---|
| monday | Cockpit führt, monday wird automatisch synchron gehalten |
| Login Telemedia | Cloudflare Access (E-Mail + Code); erlaubte Adressen pflegt Andreas bei Cloudflare |
| Kundenzugang | fester geheimer Link je Verlagsgruppe, jederzeit sperrbar, kein Konto |
| Auszahlung | nur Auszahlungs-Status + Gewinner-Excel als Datei; **keine Bankdaten, keine SEPA-Dateien** |

## Nicht verhandelbare Regeln

1. **Geldregen bytegleich:** `node scripts/check-serie.mjs 2027-11` und `2027-12` müssen „0 abweichend“ melden. `generator.ts` nur ändern, wenn ein leerer/fehlender neuer Wert exakt die alte Ausgabe erzeugt.
2. **Keine neuen npm-Pakete.** Vorhanden: next 16, react 19, dexie, jszip, pdf-lib, qrcode, konva. JWT-Prüfung per WebCrypto selbst.
3. **Keine Schlüssel/Passwörter** in Code, Chat, Git. Nur `process.env.*`; Beispielwerte leer in `.env.local.example` / `.dev.vars.example`.
4. **monday-Schutz:** Schreibzugriffe nur auf Boards, deren Name mit `TEST` beginnt – ausser `MONDAY_LIVE=1` ist gesetzt. Keine Personen-Zuweisungen, keine Updates/Benachrichtigungen, keine Automationen anlegen. Während des Loops **keine** echten monday-Schreibaufrufe ausführen.
5. **Datenschutz:** Gewinner-Daten nur Name, Ort, Betrag, Zusatztext, Foto, Einwilligung, Auszahlungs-Status. Keine IBAN, keine Adresse, keine Telefonnummer der Gewinner. Kundenportal liefert nur Daten der eigenen Verlagsgruppe.
6. **Öffentliche Routen** (ohne Login): nur `/portal/<token>`, `/api/portal`, `/review/<token>`, `/api/freigabe`. Alles andere hinter Access bzw. Basic-Auth.
7. **Lokal muss alles weiter laufen** (`npm run dev`, ohne Cloudflare): Speicher-Fallback in Dateien (`.cockpit-daten/`, gitignored), Benutzer = „lokal (Andreas)“ mit Rolle Admin.
8. **DE/EN** über `T()` bzw. `sprache === 'de' ? … : …` wie im bestehenden Cockpit; echte Umlaute (check-umlaute).
9. **Barrierefreiheit** WCAG 2.2 AA (check-kontrast), Fokus sichtbar, Tastatur bedienbar, Ziele ≥ 44 px.
10. **Nichts erfinden:** keine Fristen, Rechtsaussagen, Kontaktdaten. Fristen (11:00 Anruf, 14:00 Foto) stammen aus Flowchart Ablauf 2 und sind je Kampagne änderbar.
11. Nach **jeder Phase**: `tsc --noEmit`, check-i18n, check-umlaute, check-hilfe, check-kontrast, check-spielauswahl, check-serie 11+12. Rot → zuerst reparieren.

## Architektur (Vorgabe)

- **Server-Speicher** `src/lib/server/speicher.ts`
  - Online: Cloudflare **D1** (Binding `COCKPIT_DB`), Tabelle `dokumente(typ, id, daten TEXT JSON, version INT, aktualisiert_am INT, aktualisiert_von TEXT)` + `protokoll(id, zeit, wer, typ, dok_id, aktion, zusammenfassung)`.
  - Dateien/Fotos: Cloudflare **KV** (Binding `COCKPIT_ASSETS`, Schlüssel = SHA-256 → unveränderlich, daher Eventual Consistency unkritisch).
  - Lokal: JSON-Dateien unter `.cockpit-daten/` (gleiche Schnittstelle).
  - Optimistisches Sperren über `version` (409 bei Konflikt → Oberfläche lädt neu und meldet „Inzwischen von X geändert“).
- **Dokument-Typen:** `kampagne`, `spieltag`, `cockpitVorlage`, `stamm` (Zeitungen & Rufnummern je Spiel, Einführungstexte), `serienGewinner`, `portalLink`, `portalStatus`, `benutzer`, `mondayKarte` (Board-IDs je Kampagne), `einstellung`.
- **API:** `/api/cockpit/daten` (GET Liste/Einzeln, PUT mit version, DELETE), `/api/cockpit/assets` (PUT Blob → Hash, GET Hash), `/api/cockpit/ich` (aktueller Benutzer + Rolle), `/api/cockpit/protokoll`, `/api/cockpit/monday/*`, `/api/portal`.
- **Client:** `src/lib/cockpit/daten-client.ts` – gleiche Funktionsnamen wie bisher in `db.ts` (kampagneSpeichern, spieltageLaden, …, stammLaden, serienGewinner…, assetSpeichern/Laden), intern Server-API. Dexie bleibt nur für Job-Editor & Altdaten. Einmalige Übernahme „Daten aus diesem Browser hochladen“.
- **Login:** `src/lib/server/zugang.ts` prüft `Cf-Access-Jwt-Assertion` (RS256, Zertifikate von `https://<CF_ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs`, `aud` = `CF_ACCESS_AUD`). Ohne diese Variablen: lokaler Modus. Rollen aus Dokument `benutzer`; `COCKPIT_ADMINS` (Komma-Liste E-Mails) sind immer Admin.
- **Rollen:** Admin (alles + Benutzer/Links/monday), Redaktion (Rätsel, Gewinner, Texte), Grafik (Vorlagen, Gestaltung), Prüfer (Freigabe), Lesen.

## Phasen

- [x] **Phase 0 – Bestand:** Dexie-Funktionen des Cockpits und des Serien-Modus auflisten, die auf den Server müssen. Entscheidungs-Log füllen.
- [x] **Phase 1 – Zentraler Speicher:** speicher.ts (D1/KV/Datei), API-Routen, daten-client.ts; Cockpit + Serien-Modus (Gewinner, Fotos, Stamm, Einführung) umstellen; Übernahme-Knopf für Browser-Daten; Konflikt-Meldung.
- [x] **Phase 2 – Login, Rollen, Protokoll:** zugang.ts, proxy anpassen (Access-Modus ersetzt Basic-Auth; öffentliche Routen), `/cockpit/team` (Benutzer + Rollen, nur Admin), Protokoll-Seite `/cockpit/protokoll`, Anzeige „angemeldet als …“ im Kopf.
- [x] **Phase 3 – Heute zu tun + Fristen + Kalender** (Vorschläge 1, 2, 5): Startseite mit echten Spieltagen je laufender Kampagne (Ampel: Rätsel / Gewinner n/m / Fotos / Einwilligung / Freigabe / Verlage), Countdown-Chips (Anruf 11:00, Foto 14:00, Deadline aus Kampagne), Monatskalender je Spiel mit Status-Farben.
- [x] **Phase 4 – Live-Vorschau + Gesamtprüfung** (Vorschläge 3, 4): Vorschau-Spalte im Spiel (echte Anzeige über `anzeigeHtml`, Umschalter Zeitung / 1–4 Gewinner / Vorschlag A–C), Knopf „Alle Zeitungen prüfen“ (iframe-Prüfung wie Serien-Modus, nur Probleme listen, Sprung zur Stelle). Freigabe erst bei grüner Prüfung (Admin kann übersteuern, wird protokolliert).
- [x] **Phase 5 – Foto zuschneiden** (Vorschlag 6): Canvas-Zuschneider (Zoom, Verschieben, runde Maske wie in der Anzeige), Ausgabe JPEG 800 × 800, Original bleibt erhalten.
- [x] **Phase 6 – Kunden-Korrekturportal:** Verlagsgruppen aus `zeitungen.json` (`hotline`) + monday-Gruppen (FUNKE, SWMH, SWP, Nürnberg, ZVNW, Augsburg, IPPEN, SHZ, SAAR); `/cockpit/portal` (Links erzeugen/sperren/kopieren, QR); öffentliche Seite `/portal/<token>` (Spieltage-Liste, Anzeige je Zeitung, Pins + Kommentar, „Freigeben“/„Fehler melden“); Status je Spieltag × Gruppe im Ablauf wie monday: *TMI: erstellen → Grafik: prüfen → TMI: prüfen → TMI: Korrektur OK → Verlag: OK / Verlag: Fehler*.
- [x] **Phase 7 – monday-Sync:** Board-Satz für Kampagne anlegen (Vorlage = bestehender Board-Satz duplizieren, Struktur ohne Elemente, Ordner im Arbeitsbereich), Zuordnung über Spaltentitel; Push: Projektplan (Spieltag, Deadline, Status, Klassen), Fragen (Spielfrage, Lösungswort, Status), Vorlagen-Texte, Anzeigen-Dateien + Status je Gruppe, Gewinner (Name, Verlag/Titel, Foto, Info, Auszahlungs-Status); Pull: Status „Verlag OK/Fehler“ und „Gewinnauszahlung“. Seite `/cockpit/monday` mit Sync-Stand, Fehlern, Knopf „Jetzt abgleichen“, TEST/LIVE-Anzeige. Auszahlungs-Status als Feld im Gewinner-Formular.
- [x] **Phase 8 – Einführungstour + Hilfe** (Vorschlag 9): 5–6 Schritte beim ersten Öffnen (je Benutzer gemerkt), jederzeit über „?“ startbar; Handbuch-Einträge.
- [x] **Phase 9 – Einrichtung für Andreas:** `Cockpit-Server einrichten.command` (wrangler: D1 + KV anlegen, Tabellen anlegen, IDs in `wrangler.jsonc`), `docs/einrichtung-login-und-kunden.md` (Cloudflare Access Schritt für Schritt inkl. Ausnahme für `/portal/*`, `/api/portal`), Secrets-Liste.
- [x] **Phase 10 – Abschluss:** alle Prüfungen, Bericht in `ZWISCHENSTAENDE.md`, offene Punkte, Skill-Notiz.

## Entscheidungs-Log

| Datum | Phase | Entscheidung | Grund |
|---|---|---|---|
| 14.10. | 1 | Speicher: D1 (Dokumente+Protokoll) + KV (Dateien); lokal immer Dateien unter `.cockpit-daten/` | Lokal ohne Cloudflare lauffähig; Tabellen legen sich selbst an |
| 14.10. | 1 | Speichern je Dokument in Warteschlange, optimistische Sperre über `version` | Tippen erzeugt keine Konflikte; echte Konflikte → Hinweis „neu laden“ |
| 14.10. | 2 | JWT-Prüfung selbst per WebCrypto; ohne Eintrag Rolle „Redaktion“; `COCKPIT_ADMINS` immer Admin | Keine neue Bibliothek; Tagesarbeit ohne Admin möglich |
| 14.10. | 3 | „Heute zu tun“ = überfällige + nächster offener Spieltag ab morgen + Spieltage mit Kundenkorrektur | Anzeige wird am Vortag fertiggestellt (Flowchart Ablauf 2) |
| 14.10. | 3 | Standard-Fristen 11:00 / 14:00 aus Flowchart; Freigabe-Deadline nur aus monday oder Kampagne – nicht erfunden | Regel 10 |
| 14.10. | 4 | Freigabe erst bei grüner Gesamtprüfung des aktuellen Inhalts (Stempel); Admin kann übersteuern | Fehler vor dem Druck finden |
| 14.10. | 4 | Nach Freigabe: alle Verlagsgruppen „TMI: Korrektur OK“ | Entspricht monday-Ablauf, Verlag prüft danach |
| 14.10. | 6 | Kundendaten nur freigegebene Spieltage + nur Zeitungen der eigenen Gruppe; PDF serverseitig gebaut | Kein fremdes HTML, kein Datenleck zwischen Verlagen |
| 14.10. | 6 | `/serie/fragen_2027.json` bleibt geschützt (nicht in den öffentlichen Ausnahmen) | Künftige Rätsel/Lösungen |
| 14.10. | 7 | monday: Dreiwege-Vergleich für Status (Verlag, Auszahlung); Inhalte führt das Cockpit; Mutationen gebündelt (20/Anfrage) | Cloudflare-Grenze Unteranfragen |
| 14.10. | 7 | Schreibschutz: nur private/TEST-Boards ohne `MONDAY_LIVE=1`; während des Loops nur lesend gegen TEST-Boards getestet | Regel 4 |
| 14.10. | 7 | PDFs online über Cloudflare Browser Rendering (REST, kein Paket), lokal Chrome via puppeteer-core des Ad-Creators | Keine neuen npm-Pakete |
| 14.10. | Extra | Zeitungs-Pool: zeitungen.json (unverändert) + zeitungen-weitere.json (29 Wissensquiz-Juli-Titel aus Ad-Creator-Vorlagen); Standard: Geldregen 21, andere Spiele 46 | Andreas 14.10.: „alle Zeitungen vom Wissensquiz Juli“ |
| 14.10. | Extra | Geldregen Nov+Dez als eine durchgehende Kampagne (53 Spieltage, feste IDs), automatisch angelegt | Andreas 14.10. |
| 14.10. | Extra | „Erweitert“ aus dem Cockpit entfernt; alte Oberfläche nur noch über /erweitert | Andreas 14.10. |
| 14.10. | Extra | Foto-Link für Gewinner (7 Tage), Einwilligungstext einstellbar und als „rechtlich prüfen lassen“ markiert | Keine Rechtstexte erfinden |
| 14.10. | Extra | Teams-Webhook nur als Secret (nicht in der Datenbank) | Wirkt wie ein Passwort |
