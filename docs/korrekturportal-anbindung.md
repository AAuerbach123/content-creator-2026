# Korrekturportal (Wissensquiz) – Anbindung an ContentCreator2026

**Stand 07.10.2026** – Portal-Quelle: `~/Downloads/Wissensquiz/` (Build-Skript `make_portal.py`, Deploy-Ordner `korrekturportal-deploy/`). Im Portal-Ordner wird **nichts geändert**; wir binden es nur als Daten-Quelle an.

## Architektur des Portals (reine Beschreibung)

- Build-Skript `make_portal.py` extrahiert aus dem neuesten `Alle_Gruppen_PDF_*.zip` je Spielanzeige ein JPG (Thumbnail + Lightbox-Variante), berechnet Flags (`weissraum`, `logo`), erzeugt statisches HTML und legt es nach `korrekturportal-deploy/public/`.
- Pro Verlagsgruppe gibt es ein HTML (eigener Slug, siehe unten). Innerhalb des HTMLs liegen die Anzeigen als Karten mit `data-key`, `data-paper`, `data-variant`, `data-winner`. Darunter ein Formular, das Kommentare via API absetzt.
- Zusätzlich pro Verlag eine Rubrik „Titelanzeigen & Griffecken“ (optional – nur bei vorhandenem Ordner `teaser_anzeigen/<Verlag>/`).

### Cloudflare Pages Functions

`korrekturportal-deploy/functions/api/comment.js` – `POST /api/comment`

```ts
Body: {
  key: string,          // interner Pfad-Key der Karte
  paper: string,        // Zeitungs-Dateiname (ohne .pdf)
  variant: '1' | '2',
  winner: 'mit' | 'ohne',
  g: string,            // 10-stelliger Slug der Verlagsgruppe
  kategorie: 'Text' | 'Logo' | 'Farbe' | 'Bild' | 'Layout' | 'Sonstiges' | '',
  status: 'ok' | 'change',
  text: string,
  autor: string,
  ts: number
}
```

Speichert einen Datensatz in Cloudflare D1 `quiz_reviews.comments(grp, paper, variant, winner, kategorie, status, text, autor, created)`.

`korrekturportal-deploy/functions/api/comments.js` – `GET /api/comments?g=<slug>`

Antwort:

```json
{ "comments": [
  { "grp": "SWMH", "paper": "…", "variant": "1", "winner": "mit",
    "kategorie": "Text", "status": "change", "text": "…", "autor": "…", "ts": 1728… }
]}
```

Mit dem Master-Slug `be5ff27040` liefert die Route alle Kommentare aller Gruppen (bis 5000). Ein Verlags-Slug liefert nur dessen Kommentare (bis 2000).

### Slug-Map (fest, SALT = `wq-2026-portal-v1`)

| Slug | Verlagsgruppe |
|---|---|
| `bea8dc0622` | Augsburger Allgemeine |
| `1e69874591` | Funke Medien Thüringen |
| `cf1c3dabc4` | HCSB |
| `8f02f08ebb` | Ippen |
| `76fd61278d` | Neue Westfälische |
| `1ebc9db3e8` | SAAR (Saarbrücker Zeitung, Trierischer Volksfreund, Pfälzischer Merkur) |
| `d3c334dd9c` | SHZ |
| `c55f5efe46` | SWMH |
| `1b54159db3` | SWP |
| `728cf57a02` | Schwabo |
| `be5ff27040` | MASTER (alle Kommentare) |

## Konfiguration im ContentCreator

`.env.local`:

```ini
# öffentliche URL des Portals (Cloudflare-Pages-Domain)
KORREKTURPORTAL_URL=https://quiz-review.pages.dev
# Master-Slug für die Übernahme in den ContentCreator
KORREKTURPORTAL_SLUG=be5ff27040
```

Das Token/der Slug ist kein Secret im eigentlichen Sinn (die URL ist öffentlich, der Slug steckt auch in den Portal-HTMLs). Trotzdem gehört er nur in `.env.local`, nie ins Repo oder in Chat/Fehlerausgabe.

## API-Route im ContentCreator

`GET /api/korrekturen` – lädt die Kommentare und normalisiert sie:

```ts
Antwort: {
  korrekturen: Array<{
    id: string,          // deterministisch aus grp+paper+variant+winner+ts
    grp: string,
    paper: string,
    variant: '1' | '2',
    winner: 'mit' | 'ohne',
    kategorie: Kategorie,
    status: 'ok' | 'change',
    text: string,
    autor: string,
    ts: number,
  }>,
  stand: number
}
```

`POST /api/korrekturen/einordnen` – nimmt eine Liste von Korrekturen, lässt `/api/dialog` (Claude) je Eintrag klassifizieren:

```ts
Body: { korrekturen: Korrektur[] }
Antwort: Array<{
  id: string,
  feld: 'frage' | 'antwort' | 'name' | 'ort' | 'telefon' | 'logo' | 'tnb' | 'format' | 'unklar',
  ziel: { zeitung?: string, monat?: string, spieltag?: number, vorschlag?: 'A'|'B'|'C' },
  sicherheit: number, // 0..1
  automatisch: boolean, // true nur wenn sicherheit ≥ 0.9 UND nicht telefon/tnb
}>
```

## Umsetzung im UI

- Seite `/korrekturen`: Liste der Korrekturen, nach Verlag/Datum sortiert; je Eintrag die KI-Einordnung mit Status-Ampel.
- **Automatisch anwendbar** (grün): „Übernehmen“ erzeugt das Tages-Update (`serie-export.mjs` mit `auftrag.tage`) und – auf Wunsch – schickt es nach monday (`/api/monday-dateien` mit `ersetzen: true`).
- **Rückfrage** (gelb): Antwortfeld + „Rückfrage absenden“. Diese Antwort landet (vorerst) nur im lokalen Zustand – das Portal selbst wird nicht beschrieben, bis Telemedia das freigibt.
- **Nur zur Kenntnis** (`status === 'ok'`): wird als „passt so“ geloggt.
- **Niemals automatisch:** `feld === 'telefon'` und `feld === 'tnb'` → immer Rückfrage, egal wie hoch die Sicherheit ist.
- **Verlauf** je Korrektur: wer hat was wann übernommen, mit Rückgängig.

## Grenzen (bewusst)

- Wir lesen das Portal nur. Das Zurückschreiben einer Antwort an den/die Verlag/Autor:in ist nicht Teil der Anbindung (bis Telemedia das freigibt).
- Die Übernahme in die Seriendaten ist kein Automat über alle Spiele hinweg: Wir ändern nur das konkrete Spiel/Datum/Zeitung, die die KI (sicher) erkannt hat. Für alles andere kommt die Rückfrage.
- Telefonnummern und Teilnahmebedingungen sind **immer** manuell abzunicken – rechtlich relevant.
