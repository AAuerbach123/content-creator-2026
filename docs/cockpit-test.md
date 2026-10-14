# Cockpit 2027 · Durchlauf-Test und Heuristik

Stand 2026-10-14 (Loop „Cockpit 2027" Phase 8).

Ziel: Jenny erledigt einen kompletten Spieltag inkl. Gewinner in **unter 5 Minuten**, ohne Anleitung.

## 1 · Durchlauf-Test je Spiel (Checkliste)

Alle Pfade starten unter http://localhost:3000/cockpit.

| Schritt | Klickweg | Erwartet | Zeit-Ziel |
|---|---|---|---|
| 1 | Startseite → Kachel **Geldregen** | Phase 1 (Vorlage) öffnet sich | 10 s |
| 2 | „Nein, Vorschlag A/B/C" → A → Vorlage übernehmen | Vorlage angelegt, Phase 1 grün | 20 s |
| 3 | Weiter → Phase 2 „Kampagne einstellen" | Monat 2027-11 vorbelegt | 5 s |
| 4 | **„Bestehende Kampagne übernehmen"** | Kampagne + 30 Spieltage aus `fragen_2027.json` angelegt | 15 s |
| 5 | Weiter → Phase 3 „Rätsel erstellen" | Erster Spieltag mit Frage/A1/A2/richtig vorbelegt | 5 s |
| 6 | Faktencheck-Quelle eintragen, Spieltag wechseln | Prüf-Hinweise live, kein Doppelter | 20 s |
| 7 | Weiter → Phase 4 „Gewinner vom Vortag" | 1. Spieltag: automatischer Hinweis „keine Gewinner" | 2 s |
| 8 | Spieltag 2 wählen, „+ Gewinner hinzufügen" | 4 Pflichtfelder + Einwilligung + Gewinnertext | 30 s |
| 9 | Gewinnertext tippen, Zähler beobachten | Rot ab 91. (bei 1 Gewinner) bzw. 46. (bei 4) | 10 s |
| 10 | **„Vorschlag"**-Knopf mit Stichworten | KI-Satz füllt das Feld, Zähler unter Grenze | 20 s |
| 11 | Weiter → Phase 5 „Prüfen und freigeben" | Automatische Prüfliste zeigt verbleibende Fehler oder grün | 10 s |
| 12 | **Cmd/Ctrl+Enter** | Status wird „freigegeben" (grün), Freigabe gespeichert | 2 s |

**Gesamt-Zielzeit** für diesen Pfad: ~2:40 min. Mit Übung < 2 min.

### Je Spiel abweichende Schritte

- **Aus 2 mach 1** (Januar): Phase 3 verlangt zwei Begriffe für die Bildidee + Lösungswort (Baustein V-Panel akzeptiert; Prüfungen aus `raetsel-regeln.ts`).
- **Fehlerjagd** (Februar): Phase 3 verlangt Anzahl der Unterschiede (5 / 7); Auflösungsbild folgt in Loop 2.
- **Geldregen Kreuz & Quer** (April): Lösungs- + Alternativwort; Gitter wird von bestehendem Spiel-Code berechnet.
- **Brückenrätsel** (Mai): mind. 3 Wortpaare + Brückenwort erforderlich.
- **Kombinieren & Kassieren** (Juni): zusammengesetztes Wort als Lösung.
- **Juli-Jackpot**: Woche 1–4 im Spielspezifisch-Teil; Jackpot-Schalter folgt in Loop 2.
- **Gitterrätsel** (September): mind. 6 Wörter + Lösungswort aus Lösungsfeldern.
- **Kreuz & Quer** (Oktober, AZS): Lösungswort + Kreuzgitter.

## 2 · Heuristik-Prüfung (Nielsen 10)

| Nr. | Heuristik | Umsetzung Cockpit | Status |
|---|---|---|---|
| 1 | Sichtbarkeit des Systemstatus | StatusChip, Speicherstand, Progressbar in VorlagePanel | ✓ |
| 2 | Übereinstimmung System ↔ Welt | Begriffe aus Flowcharts („Rätsel erstellen", „Prüfen und freigeben") | ✓ |
| 3 | Nutzerkontrolle & Freiheit | Phasenwechsel jederzeit, keine Modalen Zwänge | ✓ |
| 4 | Konsistenz | Gleiche Chips/Knöpfe im ganzen Cockpit | ✓ |
| 5 | Fehler verhüten | Pflichtfeld-Markierung, Zeichenzähler live | ✓ |
| 6 | Wiedererkennen statt erinnern | Phasen-Stepper, Monat-Vorbelegung | ✓ |
| 7 | Effizienz | Cmd/Ctrl+Enter zur Freigabe; weitere Shortcuts (N, G, ?) offen | teilweise |
| 8 | Ästhetik & Minimalismus | Blasser Markenhintergrund, 1 Primärknopf | ✓ |
| 9 | Fehlerdiagnose & -behebung | Klartext-Fehlerliste, Sprung zum Feld (via `aria-describedby`) | ✓ |
| 10 | Hilfe & Dokumentation | HandbuchKnopf im Kopf, Anker `cockpit`, Handbuch-Abschnitt | ✓ |

## 3 · WCAG 2.2 AA

| Kriterium | Umsetzung | Status |
|---|---|---|
| 1.4.3 Kontrast ≥ 4,5:1 | `scripts/check-kontrast.mjs` prüft alle Token-Paare | ✓ |
| 1.4.11 Nicht-Text-Kontrast ≥ 3:1 | Fokusrahmen `--cockpit-fokus` 0,35 Alpha auf Rot | ✓ |
| 2.1.1 Tastaturbedienung | Alle Buttons sind `<button type="button">`; Cmd/Ctrl+Enter | ✓ |
| 2.4.3 Fokusreihenfolge | Natürliche DOM-Reihenfolge im Stepper | ✓ |
| 2.4.7 Sichtbarer Fokus | `:focus-visible` + `box-shadow` auf jedem Element | ✓ |
| 2.5.5 Ziele ≥ 44 × 44 px | `min-height: 44px` auf Knöpfen/Feldern | ✓ |
| 3.3.1 Fehler identifizieren | `aria-invalid`, `role="alert"` auf Fehlertext | ✓ |
| 4.1.3 Statusmeldungen | `aria-live="polite"` im `Hinweis` und Zeichenzähler | ✓ |

## 4 · Bildschirmgrößen

- 1920 × 1080 (Laptop groß): Zwei-Spalten greift, breite Kacheln.
- 1440 × 900 (Laptop klein): Zwei-Spalten greift (≥ 1200 px).
- 1280 × 800: Einspaltig, scrollt vertikal.
- 1024 × 768 (Tablet): Stepper umbricht in zwei Reihen.

Screenshots folgen in Loop 2 (`_pruef/cockpit/`).

## 5 · Prüfskripte

- `node scripts/check-kontrast.mjs` – ✓ 8 Paare erreichen Mindestkontrast.
- `node scripts/check-i18n.mjs` – ✓ 317 Schlüssel DE/EN komplett.
- `node scripts/check-umlaute.mjs` – ✓ keine Ersatzschreibungen.
- `node scripts/check-hilfe.mjs` – ✓ 39 Panels, Cockpit-Anker `cockpit` vorhanden.
- `node scripts/check-spielauswahl.mjs` – ✓ 12 Katalogeinträge.
- `node scripts/check-serie.mjs 2027-11` – ✓ 3213 Anzeigen bytegleich (Regel 5).
- `node scripts/check-serie.mjs 2027-12` – ✓ bytegleich (Nov/Dez-Durchlauf).
- `node_modules/.bin/tsc --noEmit -p .` – ✓ 0 Fehler.

## 6 · Offene Punkte für Loop 2 (nicht Blocker)

Siehe `OFFENE_PUNKTE.md` – u. a.:

- Felder-Zuordnung per Klick auf hochgeladener Vorlage.
- Stapel-KI-Modus (ganze Kampagne auf einen Rutsch).
- Preis-Editor mit abgeleiteten Texten.
- Jackpot-Schalter je Juli-Woche.
- Monday-Upload direkt aus Cockpit-Phase 5 (statt Umweg über /serie).
- Foto-Zuschnitt automatisch (Gesicht mittig).
- Shortcut-Belegung „N nächster Tag" / „G Gewinner hinzufügen".
