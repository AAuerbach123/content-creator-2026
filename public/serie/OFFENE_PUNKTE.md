# Geldregen 2027 – offene Punkte (Stand 07.10.2026)

Diese Punkte sind in den Anzeigen **gelb markiert** oder als Annahme umgesetzt. Nicht im Loop erfinden – nur hier nachtragen, wenn bestätigt.

## Offen

| # | Zeitung | Offener Punkt | Umsetzung bis zur Klärung |
|---|---|---|---|
| 1 | Esslinger / Cannstatter Zeitung | Telefonnummer fehlt in der Excel-Liste (Muster spricht für 01378 40 87 xx – **nicht bestätigt**) | gelb „NUMMER FOLGT“ |
| 2 | Kreiszeitung Böblinger Bote | Telefonnummer fehlt (Muster spricht für 01378 40 88 xx – **nicht bestätigt**) | gelb „NUMMER FOLGT“ |
| 3 | Fränkische Landeszeitung | Telefonnummer fehlt; 2026 lief FLZ in der Nürnberger Anzeige mit. Format angenommen 280 × 219 | gelb „NUMMER FOLGT“ |
| 4 | Saarbrücker Zeitung, Trierischer Volksfreund, Pfälzischer Merkur | Hotline-Satz und Datenschutz-Hinweis fehlen (keine Geldregen-Anzeige 2026 vorhanden) | gelb „[Hotline-Satz folgt]“ / „[Datenschutz-Hinweis folgt]“ |
| 5 | „Pfälzischer Kurier“ (Excel) | Gemeint vermutlich „Pfälzischer Merkur“ (nur dieses Logo vorhanden) | Logo Pfälzischer Merkur |
| 6 | „beige“ (Excel) | Welche Zeitung? Angenommen wie BEIG-Anzeige 2026 (278 × 190, sh:z-Logo, sh:z-Hotline) | wie sh:z |
| 7 | SÜDWEST PRESSE | Kein Logo vorhanden (2026 ohne Logo). Hausfarbe #00539F angenommen | ohne Logo |
| 10 | alle | Feiertage: 1.11. (Allerheiligen, u. a. BW/BY/SL), 24.–26.12., 31.12. – erscheinen alle Zeitungen? | jeder Kalendertag Mo–Fr = 1 Spieltag, Sa+So = 1 Spieltag |
| 11 | Hausfarben | Bei schwarzen Logos gewählt: Esslinger Weinrot #8C1D40, Böblingen Stahlblau #2F5D8A, Schwarzwälder Bote Grün #3D7A2A (grüne Linie im Logo). Helle Logofarben für Lesbarkeit abgedunkelt (Neue Presse, VNP) | wie `zeitungen.json` |
| 12 | Gewinner | Namen und Fotos sind Dummies (KI-Porträts) | Dummies |
| 13 | alle | Gewinner-Zeile „GEWINNER VOM {n−1}. SPIELTAG“ – „Heute startet der Geldregen!“ steht **nur am 1. Spieltag einer Aktion**. Die Anzeige heisst dann „ohne-Gewinner“ und liegt in monday in beiden Spalten (1 und 4 Gewinner). Status 07.10.2026: Umsetzung korrekt, aber bitte final mit Telemedia abgleichen (soll n−1 bleiben oder n−2?). | n−1 (Dummy); 1. Spieltag ohne Gewinner |
| 15 | SWP | SWP-Hotline-Satz: Yasminas Vorlage setzt zwischen Rufnummer und „Keine Gewinnspielteilnahme“ einen **Zeilenumbruch**, aktueller Datenstand nutzt dort „ · “. **Erst nach Telemedia-Freigabe ändern** – danach müssen die SWP-Anzeigen neu erstellt werden. | aktuell „ · “ |
| 16 | Juli-Spiele | Anmeldefrist von **8 Wochen** vor Aktionsstart (Folie 6 der Präsentation) – gilt sie auch für die Juli-Zeitschienen-Spiele? Telemedia fragen. | offen |

## Erledigt

| # | Punkt | Erledigt am | Beleg |
|---|---|---|---|
| 8 | Liste der teilnehmenden Verlage in den TNB **bestätigt** (Vorlage Yasmina, Geldregen März/April 2026). Für **2027 kommt FUNKE Medien Thüringen GmbH dazu** (bereits in `zeitungen.json → tnb_gruppen`). | 07.10.2026 | Yasmina Salah, Vorlage März/April 2026 |
| 9 | Nov + Dez 2027 sind **ein durchgehender Geldregen**. Aktionszeitraum **01.11.–31.12.2027** (`zeitungen.json → aktionszeitraum`). Die Dezember-Spieltage zählen weiter (27–53). | 07.10.2026 | Telemedia (Spieltage-Durchnummerierung) |
| 14 | Spieltag 1 mit 4 Gewinnern zeigt „UNSERE GLÜCKSPILZE“ (Dummy aus früheren Aktionen). | — | so belassen |
| 17 | **Vorzählfaktor** aus den Teilnahmebedingungen entfernt für Juli (Mechanik `jackpot`) und Kreuz & Quer April (Mechanik `geldpakete`). Juli-TNB nutzt Geldregen-Wortlaut (Spielname + Spielwoche als Aktionszeitraum + Jackpot-Fussnote wie in `jul_postkarte.html`). Kreuz & Quer April bekommt den Zeitfenster-Satz nach dem Wochenende-Satz (wie in `kq_b4.html`). | 07.10.2026 | Jenny Wiegandt, Yasmina Salah; `src/lib/serie/spiele/tnb.ts`; automatische Prüfung `pruefeKeinVorzaehlfaktor()` in `_test_juli.mjs` und `_test_kreuzquer.mjs` |
| 18 | **Schatten entfernt** aus `src/lib/serie/spiele/rahmen.ts` (`.ant`, `.lw`, `.tile.tp`, `.hot`, `.rt`, familieC `.hl text-shadow`) und `juli.ts` (Postkarte `.pk`, `.pk-sonne`). Chrome rastert `box-shadow` ins PDF, die Mac-Vorschau zeigt sie als graue Kästen. Automatische Prüfung `pruefeKeineSchatten()` in allen `_test_*`-Skripten. | 06.–07.10.2026 | Andreas G.; `src/lib/serie/pruefen.ts` |
