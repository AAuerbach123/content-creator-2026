# Cockpit 2027 – Einrichtung: Speicher, Login, Kunden, PDFs, E-Mail, monday

Stand 14.10.2026. Reihenfolge einhalten. Die Bezeichnungen im Cloudflare-Dashboard können leicht abweichen.
**Schlüssel und Passwörter gibst du immer selbst ein – nie in den Chat, nie in Dateien.**

---

## Schritt 1 · Zentralen Speicher anlegen (Pflicht, 5 Minuten)

1. Doppelklick auf **„Cockpit-Server einrichten.command“**.
2. Falls ein Browserfenster aufgeht: bei Cloudflare anmelden, „Allow“ klicken.
3. Das Skript legt die Datenbank **cockpit-db** und den Speicher **COCKPIT_ASSETS** an und trägt beides in `wrangler.jsonc` ein.
4. Die Frage nach den Secrets kannst du beim ersten Mal mit Enter überspringen (siehe Schritte 2–5).
5. Danach **„ContentCreator online stellen.command“**.

> Ohne Schritt 1 meldet das Cockpit online: „Der zentrale Speicher ist noch nicht eingerichtet“.

---

## Schritt 2 · Anmeldung für Telemedia (Cloudflare Access, kostenlos bis 50 Personen)

> **Erledigt am 15.10.2026** (Schritte 2 und 3): Team `snowy-band-06c6`, Login per E-Mail-Code (One-time PIN),
> Policy „Telemedia“ (alle `@telemedia-interactive.de` + aauerbach1234@gmail.com), Worker komplett geschützt,
> Application „Cockpit oeffentlich (Kundenportal, Foto-Link)“ mit Bypass für die Pfade aus Schritt 3 (+ `/review/*`, `/api/freigabe` für das alte Korrekturportal).
> Team-Domain, AUD-Tag und `COCKPIT_ADMINS` stehen als `vars` in `wrangler.jsonc` (keine Secrets nötig).
> Weitere Personen ausserhalb von @telemedia-interactive.de: Zero Trust → Access controls → Policies → „Telemedia“ → E-Mail ergänzen.

1. dash.cloudflare.com → **Zero Trust** (beim ersten Mal einen Team-Namen wählen, z. B. `telemedia` → ergibt die *Team-Domain* `telemedia.cloudflareaccess.com`; Free-Plan reicht).
2. **Access → Applications → Add an application → Self-hosted**
   - Name: `Cockpit`
   - Domain: die Adresse der App (heute `content-creator-2026.aauerbach1234.workers.dev`).
     Für `*.workers.dev` muss Access beim Worker eingeschaltet sein: **Workers & Pages → content-creator-2026 → Settings → Domains & Routes → workers.dev → Cloudflare Access aktivieren**.
   - Login-Methode: **One-time PIN** (E-Mail + Code).
   - Policy „Telemedia“: *Allow* · *Emails ending in* `@telemedia-interactive.de` (plus einzelne weitere Adressen, z. B. deine).
3. Nach dem Speichern in der Application den **Application Audience (AUD) Tag** kopieren.
4. Secrets setzen (im Skript aus Schritt 1 mit „j“, oder einzeln im Terminal `npx wrangler secret put NAME`):
   - `CF_ACCESS_TEAM_DOMAIN` = z. B. `telemedia.cloudflareaccess.com`
   - `CF_ACCESS_AUD` = der kopierte AUD-Tag
   - `COCKPIT_ADMINS` = Admin-Adressen, Komma-getrennt (mindestens Jenny und du)
5. Das alte gemeinsame Passwort wird dann nicht mehr gebraucht: `npx wrangler secret delete APP_PASSWORD` (optional).
6. Rollen vergibst du danach im Cockpit unter **Mehr → Team & Einstellungen**.

---

## Schritt 3 · Öffentliche Ausnahmen (Pflicht für Kundenportal und Foto-Link)

Kunden und Gewinner melden sich nicht an. Damit sie ihre Links öffnen können, braucht Access **Ausnahmen (Bypass)**.
In Zero Trust → Access → Applications je Pfad eine Self-hosted-Application mit Policy **Action: Bypass · Include: Everyone**:

| Pfad | Wofür |
|---|---|
| `/portal/*` | Kundenportal-Seite |
| `/api/portal` | Daten + PDF für den Verlag (nur mit gültigem Link) |
| `/foto/*` | Foto-Seite für Gewinner |
| `/api/foto` | Foto-Upload (nur mit gültigem Link) |
| `/_next/*` | Programm-Dateien der Seiten |
| `/serie/assets/*` | Bilder, Logos, Schriften der Anzeigen |
| `/serie/zeitungen.json` und `/serie/zeitungen-weitere.json` | Zeitungsdaten (stehen ohnehin in den Anzeigen) |
| `/telemedia-logo.png` | Logo |

**Nicht freigeben:** `/serie/fragen_2027.json` (künftige Rätsel und Lösungen!) und alles andere.

> Bitte prüfen (ungeklärt): Statische Dateien werden bei Cloudflare möglicherweise ausgeliefert, bevor das Passwort abgefragt wird. Test: die Adresse `…/serie/fragen_2027.json` in einem privaten Browserfenster öffnen. Erscheinen die Fragen ohne Passwortabfrage, sind sie öffentlich – mit Cloudflare Access (Schritt 2) sind sie in jedem Fall geschützt.

---

## Schritt 4 · Druck-PDFs online (Cloudflare Browser Rendering)

Lokal auf dem Mac erzeugt das Cockpit PDFs mit Chrome. Online braucht es den Cloudflare-Dienst:
1. dash.cloudflare.com → rechts **Account ID** kopieren → Secret `CF_ACCOUNT_ID`.
2. **My Profile → API Tokens → Create Token → Custom**: Berechtigung *Account · Browser Rendering · Edit* → Token → Secret `CF_BROWSER_TOKEN`.
(Kosten: laut Cloudflare abhängig vom Plan/Kontingent – bitte im Dashboard prüfen.)

---

## Schritt 5 · E-Mail-Benachrichtigungen (freiwillig)

Ohne diesen Schritt erscheinen alle Meldungen nur über die **Glocke** im Cockpit.
- Anbieter: **Resend** (resend.com). Absender-Domain dort bestätigen (DNS-Einträge macht die IT von Telemedia).
- Secrets: `RESEND_API_KEY` und `MAIL_ABSENDER` (z. B. `Cockpit <adresse@eure-domain>` – Adresse von Telemedia festlegen lassen).
- Empfänger Telemedia: im Cockpit **Mehr → Team & Einstellungen → Benachrichtigungen**.
- Empfänger je Verlag: im Cockpit **Kundenportal → Links** (Feld unter „aktiv seit …“).
- Microsoft Teams (freiwillig): eingehenden Webhook im Teams-Kanal anlegen → Secret `TEAMS_WEBHOOK_URL`.

---

## Schritt 6 · monday

1. `MONDAY_API_TOKEN` muss online gesetzt sein (falls noch nicht: im Skript „j“).
2. Im Cockpit **Mehr → monday**: Kampagne wählen → Arbeitsbereich → Ordner → Zuordnung speichern.
3. Erst mit **„Nur lesen“** abgleichen und das Ergebnis prüfen.
4. Solange `MONDAY_LIVE` **nicht** gesetzt ist, schreibt das Cockpit nur in private oder „TEST …“-Boards.
   Wenn alles passt: Secret `MONDAY_LIVE` = `1` setzen und neu online stellen.

---

## Schritt 7 · Kunden einladen

Im Cockpit **Kundenportal**: je Verlagsgruppe „Link erzeugen“ → „Kopieren“ → per E-Mail an den Verlag. Gesperrt wird mit „Sperren“, ein neuer Link macht den alten automatisch ungültig.

---

## Was noch Telemedia liefern muss

- Teilnahmebedingungen, Hotline- und Datenschutz-Text für IPPEN, Augsburger Allgemeine, Neue Westfälische (ZVNW) und Rhein-Zeitung (erscheinen bis dahin als gelbe Platzhalter).
- Format, Logo und Hausfarbe der Rhein-Zeitung; richtige Logos für „Karl Sasse“ und „Kreiszeitung“ (in der Ad-Creator-Vorlage steht das der Wildeshauser Zeitung).
- Geprüfter Einwilligungstext für den Foto-Link (Mehr → Team & Einstellungen).
