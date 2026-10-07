// Zentraler Inhalt des Grafiker-Handbuchs (Phase 7).
// Wird von der Seite `/handbuch` UND dem globalen Handbuch-Overlay gelesen.
// Jeder Abschnitt hat einen `anker`, den (i)-Hilfe-Popover per `?handbuch=<anker>`
// direkt anspringen können.

export type HandbuchAbschnitt = {
  anker: string
  titelDe: string
  titelEn: string
  koerperDe: string
  koerperEn: string
}

export const HANDBUCH_ABSCHNITTE: HandbuchAbschnitt[] = [
  {
    anker: 'hilfe',
    titelDe: 'Hilfe im ganzen Tool',
    titelEn: 'Help throughout the tool',
    koerperDe:
      'Ganz oben rechts liegt in jeder Ansicht der Knopf „📖 Handbuch" — er öffnet dieses Handbuch als Overlay, ohne den laufenden Job zu verlassen. An jedem Panel/Fenster steht zusätzlich ein kleines „i"-Symbol: Klick öffnet eine kurze Erklärung (2 – 4 Sätze) plus Link „Mehr im Handbuch →", der direkt an den passenden Abschnitt springt. Escape schließt das Overlay. Die Suche links im Overlay filtert live nach Wörtern.',
    koerperEn:
      'Every view has a "📖 Manual" button in the top right — it opens this manual as an overlay without leaving the current job. Every panel additionally has a small "i" icon: click opens a short explanation (2 – 4 sentences) plus a "More in the manual →" link that jumps to the matching section. Escape closes the overlay. The left-hand search filters live.',
  },
  {
    anker: 'start',
    titelDe: 'Start',
    titelEn: 'Start',
    koerperDe:
      'Doppelklick auf „ContentCreator starten.command". Der Browser öffnet http://localhost:3000. Formuliere im großen Feld „Was produzieren wir heute?" dein Ziel — die KI erkennt selbst, welcher der drei Einstiege passt.',
    koerperEn:
      'Double-click "ContentCreator starten.command". The browser opens http://localhost:3000. In the big field "What are we producing today?" state your goal — the AI detects which of the three entries fits.',
  },
  {
    anker: 'ki-zentrum',
    titelDe: 'KI-Zentrum',
    titelEn: 'AI centre',
    koerperDe:
      'Der große Prompt in der Mitte ist der Einstieg. Text oder Mikro benutzen. Mit „Los" wird ein Job angelegt und die KI erkennt, ob du nur ein Ziel hast, eine Vorstellung im Kopf trägst oder eine Vorlage hochladen willst.',
    koerperEn:
      'The big prompt in the middle is the entry. Type or speak. "Go" creates a job and the AI decides whether you only have a goal, an idea in mind, or want to upload a reference.',
  },
  {
    anker: 'karten',
    titelDe: 'Startkarten',
    titelEn: 'Start cards',
    koerperDe:
      'Sechs Karten unter dem Prompt: Neuer Job, Laufende Jobs, Brand-Kits, Vorlagen, Asset-Bibliothek, Exporte. Grau eingefärbte sind „kommt bald". Der Klick auf „Laufende Jobs" klappt die Liste aus.',
    koerperEn:
      'Six cards under the prompt: New Job, Active Jobs, Brand Kits, Templates, Asset library, Exports. Greyed cards are "coming soon". Click "Active Jobs" to unfold the list.',
  },
  {
    anker: 'drei-einstiege',
    titelDe: 'Drei Einstiege (A/B/C)',
    titelEn: 'Three entries (A/B/C)',
    koerperDe:
      'A · Nur ein Ziel: bis zu 5 offene Fragen, dann drei Richtungen zur Auswahl. B · Vorstellung im Kopf: Interview läuft, bis dein Bild greifbar ist. C · Vorlage hochladen: PDF/PNG/JPG wird analysiert, danach Multiple-Choice-Fragen je Gestaltungsmerkmal.',
    koerperEn:
      'A · Only a goal: up to 5 open questions, then three directions to choose. B · Idea in mind: interview runs until your picture is concrete. C · Upload reference: PDF/PNG/JPG is analysed, then multiple-choice per attribute.',
  },
  {
    anker: 'dialog',
    titelDe: 'KI-Dialog',
    titelEn: 'AI dialog',
    koerperDe:
      'Chatartig — nutzer- und KI-Bubbles, System-Hinweise mittig. Enter sendet, Shift+Enter neue Zeile. Mikro-Knopf spricht per Web-Speech in dein Textfeld. Der Verlauf bleibt beim Job, auch nach Reload.',
    koerperEn:
      'Chat-like — user and AI bubbles, system hints centred. Enter sends, Shift+Enter new line. Mic button dictates via Web Speech into the text field. History stays with the job even after reload.',
  },
  {
    anker: 'richtungen',
    titelDe: 'Drei Richtungen',
    titelEn: 'Three directions',
    koerperDe:
      'Nur Weg A: die KI schlägt drei visuell klar unterschiedliche Karten vor (Layout, Farbwelt, Tonalität, Beispiel-Headline). Ein Klick wählt die Richtung und startet den Schrittplan.',
    koerperEn:
      'Only path A: the AI proposes three visually distinct cards (layout, palette, tone, sample headline). One click picks the direction and starts the step plan.',
  },
  {
    anker: 'vorlage',
    titelDe: 'Vorlagen-Analyse',
    titelEn: 'Reference analysis',
    koerperDe:
      'Weg C: PDF/PNG/JPG per Drop oder Klick. Die KI erkennt Farben, Schrift-Kandidaten und Text-Gefäße. Danach beantwortest du je Merkmal (Farben, Schrift, Layout, Bildstil) per Multiple Choice: aus Vorlage / aus Brand-Kit / neu.',
    koerperEn:
      'Path C: drop or click a PDF/PNG/JPG. The AI detects colours, font candidates and text slots. You then confirm per attribute (colours, font, layout, imagery) via multiple choice: from reference / from brand kit / fresh.',
  },
  {
    anker: 'schrittplan',
    titelDe: 'Schrittplan',
    titelEn: 'Step plan',
    koerperDe:
      'Die KI erstellt eine Checkliste zum Ziel. Je Schritt: Annehmen / Ändern / Selbst machen. Status: offen, KI-Vorschlag, angenommen, manuell. Farbcodiert am linken Rand.',
    koerperEn:
      'The AI creates a checklist for your goal. Per step: Accept / Change / DIY. Status: open, AI proposal, accepted, manual. Colour-coded on the left.',
  },
  {
    anker: 'verlauf',
    titelDe: 'KI-Verlauf',
    titelEn: 'AI history',
    koerperDe:
      'Jede KI-Aktion mit Modell, Prompt-Auszug, Token-Zahlen und geschätzten Kosten. Damit du nachvollziehen kannst, was gerade Geld gekostet hat. Gesamtsumme oben rechts.',
    koerperEn:
      'Every AI call with model, prompt excerpt, tokens and estimated cost — so you can see what just cost money. Total on the top right.',
  },
  {
    anker: 'artefakt',
    titelDe: 'Artefakt-Werkstatt',
    titelEn: 'Artifact workshop',
    koerperDe:
      'Ein Artefakt ist EIN Motiv (Anzeige, Post, Kachel, Video-Rahmen). Ein Job kann mehrere Artefakte enthalten. Umschalter Vorschau ↔ Editor. Der Knopf „✨ KI schlägt komplettes Design vor" füllt Bild + Headline + Sub + CTA in einem Rutsch.',
    koerperEn:
      'An artifact is ONE piece of artwork (ad, post, tile, video frame). A job can hold several artifacts. Toggle preview ↔ editor. "✨ AI proposes complete design" fills image + headline + sub + CTA in one go.',
  },
  {
    anker: 'editor',
    titelDe: 'Editor (Konva)',
    titelEn: 'Editor (Konva)',
    koerperDe:
      'Volles Handwerk: verschieben, skalieren, drehen mit Transformern. Doppelklick auf Text = Inline-Bearbeitung. Cmd/Ctrl+Z zurück, Cmd+Shift+Z vor. Delete löscht die aktive Ebene.',
    koerperEn:
      'Full hand craft: move, scale, rotate via transformers. Double-click text = inline edit. Cmd/Ctrl+Z undo, Cmd+Shift+Z redo. Delete removes the active layer.',
  },
  {
    anker: 'ebenen',
    titelDe: 'Ebenen-Panel',
    titelEn: 'Layers panel',
    koerperDe:
      'Rechts im Editor: alle Ebenen des aktuellen Artefakts. ●/◌ = Sichtbarkeit, ↑/↓ = Reihenfolge, ✕ = löschen. Der Icon-Buchstabe zeigt den Typ (T Text, ▤ Bild, ★ Logo, ◐ Form, ▶ Video-Platz).',
    koerperEn:
      'Right in the editor: all layers of the current artifact. ●/◌ = visibility, ↑/↓ = order, ✕ = delete. The letter shows the type (T text, ▤ image, ★ logo, ◐ shape, ▶ video slot).',
  },
  {
    anker: 'inspektor',
    titelDe: 'Ebenen-Inspektor',
    titelEn: 'Layer inspector',
    koerperDe:
      'Alle Eigenschaften der aktiven Ebene: Position, Größe, Drehung, Text/Farbe/Schrift. CI-Farben stehen im Farbwähler zuerst (Regel „Konva-Editor: CI-Farben zuerst").',
    koerperEn:
      'All properties of the active layer: position, size, rotation, text/colour/font. Brand colours appear first in the picker (rule "Konva editor: brand colours first").',
  },
  {
    anker: 'ki-editor-befehl',
    titelDe: 'KI-Editor-Befehl',
    titelEn: 'AI editor command',
    koerperDe:
      'Freier Sprachbefehl im Editor: „mach die Headline größer und rück das Logo nach rechts". Die KI übersetzt das in konkrete Ebenen-Operationen (skaliere, verschiebe, setzeText, setzeFarbe, aendereReihenfolge, entferne).',
    koerperEn:
      'Freeform command in the editor: „make the headline bigger and push the logo right". The AI translates that into concrete layer operations (scale, move, setText, setColor, reorder, remove).',
  },
  {
    anker: 'bild-erzeugung',
    titelDe: 'Bild erzeugen',
    titelEn: 'Generate image',
    koerperDe:
      'Motiv + Stil-Preset + Orientierung → 3 Varianten. Marken-/IP-Namen werden vom Sanitizer ersetzt (Regel 10). Wähle eine Variante — sie landet content-adressiert im Asset-Store und in der Bild-Ebene.',
    koerperEn:
      'Subject + style preset + orientation → 3 variants. Brand/IP names get sanitised (Rule 10). Pick one — it is stored content-addressed in the asset store and placed on the image layer.',
  },
  {
    anker: 'copy-erzeugung',
    titelDe: 'Text erzeugen',
    titelEn: 'Generate copy',
    koerperDe:
      'Sechs Slots (Headline, Subline, CTA, Body, Caption, Hashtags) × drei Varianten × fünf Töne (nüchtern/frech/seriös/werblich/empathisch). „Nehmen" schreibt den Text in die passende Ebene.',
    koerperEn:
      'Six slots (headline, subline, CTA, body, caption, hashtags) × three variants × five tones (matter-of-fact / cheeky / serious / promotional / empathic). „Use" writes the text into the matching layer.',
  },
  {
    anker: 'kanaele',
    titelDe: 'Kanäle',
    titelEn: 'Channels',
    koerperDe:
      'Zeitung/Zeitschrift in mm (CMYK-Denken, min. 200 dpi), Web-Banner in vier IAB-Größen, Social in IG-Feed 4:5/1:1, Story/Reel 9:16 mit Safe-Zones, LinkedIn/Facebook/X in ihren Standardmaßen, Kurzvideo 9:16/1:1/16:9 mit eingebrannten Untertiteln.',
    koerperEn:
      'Newspaper/magazine in mm (CMYK-friendly, min 200 dpi), web banners in four IAB sizes, social IG feed 4:5/1:1, Story/Reel 9:16 with safe zones, LinkedIn/Facebook/X in their standard sizes, short video 9:16/1:1/16:9 with burnt-in subtitles.',
  },
  {
    anker: 'exporte',
    titelDe: 'Exporte',
    titelEn: 'Exports',
    koerperDe:
      'Raster PNG/JPG/WebP in 1× und 2× (Gewicht direkt sichtbar). Vektor-PDF in mm mit 3 mm Beschnitt + Schnittmarken (druckerei-fertig). Social-Paket ZIP mit allen Artefakten + Captions. Adobe-Paket mit PDF + Anleitung. Job-Backup JSON + Assets-ZIP.',
    koerperEn:
      'Raster PNG/JPG/WebP in 1× and 2× (size shown). Vector PDF in mm with 3 mm bleed + crop marks (print-ready). Social bundle ZIP with all artifacts + captions. Adobe bundle with PDF + instructions. Job backup JSON + assets ZIP.',
  },
  {
    anker: 'korrektur',
    titelDe: 'Korrekturportal (Grafiker)',
    titelEn: 'Correction portal (designer)',
    koerperDe:
      'Erzeugt einen Token-Link (/review/<TOKEN>) und schickt ihn dem Verlag/Kunden. Cross-Browser: die Freigabe liegt auf dem Server (Cloudflare KV online, Datei-Fallback lokal). „Pins neu laden" holt Antworten vom Server; du siehst Status offen/erledigt/abgelehnt.',
    koerperEn:
      'Creates a token link (/review/<TOKEN>) you share with the client. Cross-browser: stored server-side (Cloudflare KV online, file fallback locally). „Refresh pins" pulls responses; you see status open/done/rejected.',
  },
  {
    anker: 'review',
    titelDe: 'Kunden-Review',
    titelEn: 'Customer review',
    koerperDe:
      'Was der Kunde sieht: das Motiv + eine kurze Anleitung. Klick auf eine Stelle setzt einen Pin, im Popup schreibt der Kunde seinen Änderungswunsch. Kein Konto nötig. Der Grafiker sieht die Pins mit Kommentar-Thread und kann antworten.',
    koerperEn:
      'What the client sees: the artwork + short instructions. Click any spot to drop a pin, then type the change request. No account needed. The designer sees the pins with a comment thread and can reply.',
  },
  {
    anker: 'video',
    titelDe: 'Video-Studio',
    titelEn: 'Video studio',
    koerperDe:
      'Sichtbar, sobald der Kanal „Kurzvideo" ist. Fünf Szenen-Templates: Logo-Einflug (2 s + Woooosch), Text-Reveal (Aufzählung fliegt synchron zur Stimme ein), Bild-Ken-Burns, Karussell-Swipe, Logo-Outro. 9:16 / 1:1 / 16:9. Player links, Timeline rechts.',
    koerperEn:
      'Visible when the channel is "Short video". Five templates: logo intro (2 s + whoosh), text reveal (bullets fly in synced to voice), image Ken Burns, carousel swipe, logo outro. 9:16 / 1:1 / 16:9. Player left, timeline right.',
  },
  {
    anker: 'szenen',
    titelDe: 'Szenen-Timeline',
    titelEn: 'Scene timeline',
    koerperDe:
      'Jede Szene mit Typ + Dauer. ↑/↓ verschiebt, ✕ löscht, „+ text-reveal/…" fügt neue Szenen an. Bei Text-Reveal die Aufzählung eintragen — die Elemente fliegen synchron zur Stimme ein.',
    koerperEn:
      'Each scene with type + duration. ↑/↓ reorders, ✕ removes, "+ text-reveal/…" appends. For text-reveal enter the bullet list — items fly in synced to the voice.',
  },
  {
    anker: 'stimmproben',
    titelDe: 'Stimmproben',
    titelEn: 'Voice samples',
    koerperDe:
      'Standardstimme ist Anneke (neutrales Hochdeutsch, kein Hall). „Stimmproben (3+3)" holt drei Frauen- und drei Männerstimmen mit exakt deinem Sprechtext — so vergleichst du direkt. „Nehmen" setzt die gewählte Stimme.',
    koerperEn:
      'Default voice is Anneke (neutral High German, no reverb). "Voice samples (3+3)" fetches three female + three male voices with your exact text — direct comparison. "Use" sets the chosen voice.',
  },
  {
    anker: 'sprechtext',
    titelDe: 'Sprechtext-Assistent',
    titelEn: 'Voiceover script helper',
    koerperDe:
      'Der Voiceover-Text darf höchstens 4 Wörter am Stück mit dem Folientext teilen (nicht ablesen). Jeder Satz nur einmal. Ziellänge in Sekunden setzen — der Live-Zähler schätzt anhand von 2,5 Wörtern/s.',
    koerperEn:
      'Voiceover text may share at most 4 words in a row with the on-screen text (do not read). Each sentence only once. Set a target length — the live counter estimates 2.5 words/s.',
  },
  {
    anker: 'pruefbericht',
    titelDe: 'Prüfbericht',
    titelEn: 'Check report',
    koerperDe:
      'Vor jedem Export klicken. Prüft: Ton-/Video-Sync ≤ 50 ms, Untertitel-Safe-Zone, echte Umlaute/ß (keine Ersatzschreibungen), die „nicht ablesen"-Regel und die Länge gegen dein Ziel. Grün = ok, Gelb = Info, Rot = Warnung.',
    koerperEn:
      'Click before every export. Verifies audio/video sync ≤ 50 ms, subtitle safe zone, real umlauts/ß (no substitutions), the „do not read" rule and length against your target. Green = ok, yellow = info, red = warning.',
  },
  {
    anker: 'mp4',
    titelDe: 'MP4 erzeugen',
    titelEn: 'Render MP4',
    koerperDe:
      'Rendert lokal per Remotion + headless Chrome. Erst dauert das Bundling 30–60 s, dann geht es schnell. Rendert 9:16 / 1:1 / 16:9 aus einer Composition. Ergebnis-Links im Panel, Kopie zusätzlich in out/. Auf Cloudflare Workers nicht verfügbar (kein Chromium).',
    koerperEn:
      'Renders locally via Remotion + headless Chrome. First bundle takes 30–60 s, then fast. Renders 9:16 / 1:1 / 16:9 from one composition. Result links in the panel, copies additionally in out/. Not available on Cloudflare Workers (no Chromium).',
  },
  {
    anker: 'kosten',
    titelDe: 'Kosten-Übersicht',
    titelEn: 'Cost overview',
    koerperDe:
      'Auf /uebersicht: Diesen Monat / Gesamt / Aufrufe. Monats-Budget setzen — grün < 75 %, gelb 75–99 %, rot ≥ 100 %. Aufschlüsselung je Route (dialog, generate-image, tts, sfx …) und je Job. Die Zahlen sind Schätzungen (Bilder Pauschale 0.04 USD, Claude nach Token).',
    koerperEn:
      'On /uebersicht: This month / total / calls. Set a monthly budget — green < 75 %, yellow 75–99 %, red ≥ 100 %. Breakdown per route (dialog, generate-image, tts, sfx …) and per job. Numbers are estimates (images flat 0.04 USD, Claude by tokens).',
  },
  {
    anker: 'performance',
    titelDe: 'Performance-Check',
    titelEn: 'Performance check',
    koerperDe:
      'Auf /uebersicht: „Messen" prüft Start (alle Jobs laden < 200 ms), Job-Wechsel (jobLaden < 150 ms), Save (jobSpeichern + Snapshot < 100 ms). Setzt kurz einen Test-Job an und räumt ihn wieder weg.',
    koerperEn:
      'On /uebersicht: "Measure" checks start (load all jobs < 200 ms), job switch (jobLaden < 150 ms), save (jobSpeichern + snapshot < 100 ms). Briefly adds a test job and cleans it up.',
  },
  {
    anker: 'einstellungen',
    titelDe: 'Einstellungen',
    titelEn: 'Settings',
    koerperDe:
      'Sprache DE/EN oben rechts. Standard ist DE (Phase 6). Onboarding-Tour über den Stern-/Fragezeichen-Knopf im Header. Budget in /uebersicht. Handbuch überall über den Handbuch-Knopf.',
    koerperEn:
      'Language DE/EN in the top right. Default is DE (Phase 6). Onboarding tour via the star / question-mark button in the header. Budget on /uebersicht. Manual everywhere via the manual button.',
  },
  {
    anker: 'rufnummern',
    titelDe: 'Rufnummern je Zeitung',
    titelEn: 'Phone numbers per newspaper',
    koerperDe:
      'Über die Startkarte „Rufnummern" (☎) oder direkt /rufnummern. 55 Zeitungen mit Wissensquiz-Nummern (Endziffern 1–5 = Frage/Gewinnstufe), Servicehotlines und Geldregen-Nummern (MWN Print/Web, xx = Klasse + Endziffer Antwort 1/2). Wählst du im Job einen Verlag, erscheint direkt unter der Wahl das Panel „☎ Rufnummern" mit den passenden Nummern — Klick auf eine Nummer setzt sie in die CTA-Ebene, „Als Notiz speichern" hängt einen Notiz-Eintrag mit allen Nummern an den Job. Alle Nummern haben Status „zu bestätigen" (Yasmina Salah); fehlt eine Nummer, warnt das Tool klar und erfindet nichts.',
    koerperEn:
      'Via the start card „Phone numbers" (☎) or /rufnummern directly. 55 newspapers with Wissensquiz numbers (last digits 1–5 = question/prize), service hotlines and Geldregen numbers (MWN Print/Web, xx = class + last digit answer 1/2). When you pick a publisher inside a job, the „☎ Phone numbers" panel appears right under the choice — click a number to put it into the CTA layer, „Save as note" attaches a note with all numbers to the job. Every number is „to be confirmed" (Yasmina Salah); if a number is missing, the tool warns clearly and invents nothing.',
  },
  {
    anker: 'serie',
    titelDe: 'Serien-Anzeigen',
    titelEn: 'Series ads',
    koerperDe:
      'Über die Startkarte „Serien-Anzeigen“ oder direkt /serie. Links wählst du Spiel (Gewinnspielplan 2027 mit Monat und Modell), Monat, Spieltag, Gestaltungsvorschlag A/B/C, 1 oder 4 Gewinner und die Zeitungen (Mehrfachauswahl, „alle“). Rechts erscheint die echte Anzeige als Live-Vorschau, verkleinert auf die Fensterbreite. Die Ampel zeigt das Ergebnis der eingebauten Prüfung: grün = alles passt, gelb = nur Platzhalter oder Muster-Inhalte (z. B. fehlende Rufnummer), rot = echte Probleme (Überlappung, Text passt nicht, Inhaltsfehler) mit Liste. „3 Gestaltungsvorschläge vergleichen“ zeigt A, B, C nebeneinander. „Prüflauf starten“ prüft die aktuelle Einstellung für alle angehakten Zeitungen. „Offene Punkte“ listet, was beim Spiel noch zu klären ist. Geldregen läuft über den freigegebenen Generator; alle anderen Spiele über die Rahmen-Engine.',
    koerperEn:
      'Via the start card “Series ads” or /serie directly. On the left you pick the game (2027 plan with month and model), month, game day, design proposal A/B/C, 1 or 4 winners and the newspapers (multi-select, “all”). On the right the real ad appears as a live preview, scaled to the window width. The traffic light shows the built-in check: green = all fine, yellow = placeholders or sample content only (e.g. missing phone number), red = real problems (overlap, text does not fit, content errors) with a list. “Compare 3 design proposals” shows A, B, C side by side. “Start check run” tests the current setting for every ticked newspaper. “Open points” lists what is still to be clarified for the game. Geldregen uses the approved generator; all other games use the frame engine.',
  },
  {
    anker: 'serie-ki',
    titelDe: 'Serien-Anzeigen: KI-Funktionen',
    titelEn: 'Series ads: AI functions',
    koerperDe:
      '„Neues Spiel aufsetzen (KI)“: Zusatzvorgaben tippen oder sprechen (z. B. „jünger, mehr Rot, Titel kürzer“) und „3 Umsetzungsvarianten vorschlagen“ klicken. Die KI liefert je eine Variante für die Gestaltungsfamilien A, B, C (Titel, Unterzeile, Schritte, Hinweis-Kasten) – jede als Live-Vorschau mit Ampel. „Übernehmen“ setzt sie in die Hauptvorschau und speichert sie im Browser (gespeicherte Varianten lassen sich später wieder anwenden oder löschen). Unter „Texte selbst bearbeiten“ kannst du jedes Feld ändern und mit „Text verbessern (KI)“ drei Formulierungen holen. „Tagesfragen vorschlagen (KI)“ erzeugt für Spiele mit zwei Antworten je Spieltag eine Frage – immer als KI-Vorschlag markiert, Fakten bitte selbst prüfen. Das Tool lehnt KI-Texte mit erfundenen Beträgen, Telefonnummern, Rechts- oder Kostenaussagen oder Ersatzschreibungen statt Umlauten ab. Jede KI-Aktion steht im KI-Verlauf. Ohne ANTHROPIC_API_KEY erscheint eine klare Meldung; der Rest der Seite funktioniert.',
    koerperEn:
      '“Set up a new game (AI)”: type or speak extra instructions (e.g. “younger, more red, shorter title”) and click “Suggest 3 implementation variants”. The AI returns one variant per design family A, B, C (title, subline, steps, info box) – each as a live preview with traffic light. “Apply” puts it into the main preview and saves it in the browser (saved variants can be re-applied or deleted later). Under “Edit texts yourself” you can change every field and get three wordings via “Improve text (AI)”. “Suggest daily questions (AI)” creates one question per game day for games with two answers – always marked as an AI proposal, please check facts yourself. The tool rejects AI texts with invented amounts, phone numbers, legal or cost claims, or umlaut substitutes. Every AI action appears in the AI history. Without ANTHROPIC_API_KEY you get a clear message; the rest of the page keeps working.',
  },
  {
    anker: 'serie-mail',
    titelDe: 'Serien-Anzeigen: Gestaltungsvorschlag per E-Mail',
    titelEn: 'Series ads: design proposal by e-mail',
    koerperDe:
      '„Gestaltungsvorschlag per E-Mail senden“ erzeugt aus der aktuellen Vorschau die Anhänge: PDF und PNG (Ansicht zur Abstimmung, keine Druckvorlage) und die Anzeige als HTML-Datei mit eingebetteten Bildern. Danach „Mail-Programm öffnen (Teilen)“ – auf dem Mac öffnet sich Mail mit den Anhängen. Kann der Browser keine Dateien teilen, lädt „Dateien herunterladen + E-Mail-Entwurf“ die Dateien herunter und öffnet einen Entwurf mit Betreff und Text – die Dateien dann selbst anhängen. Kann der Browser kein Bild erzeugen, wird nur die HTML-Datei angehängt. Das Tool verschickt nie selbst eine E-Mail.',
    koerperEn:
      '“Send design proposal by e-mail” creates the attachments from the current preview: PDF and PNG (a view for approval, not print-ready) and the ad as an HTML file with embedded images. Then “Open mail app (Share)” – on the Mac, Mail opens with the attachments. If the browser cannot share files, “Download files + e-mail draft” downloads them and opens a draft with subject and text – attach the files yourself. If the browser cannot render an image, only the HTML file is attached. The tool never sends an e-mail itself.',
  },
  {
    anker: 'serie-monday',
    titelDe: 'Serien-Anzeigen: monday.com',
    titelEn: 'Series ads: monday.com',
    koerperDe:
      '„Spieltage nach monday übertragen“ legt im angegebenen Board je Spieltag ein Item an: Name „Spieltag NN“ plus Datum, Frage, Antwort 1, Antwort 2, richtige Antwort und Dateiname. Die Spalten findet das Tool über ihre Titel – lege im Board Spalten mit genau diesen Namen an (Datum als Datums-Spalte, die anderen als Text). „Spalten prüfen“ zeigt die Zuordnung, ohne etwas zu schreiben. Der Testmodus ist standardmäßig an: nur private Boards, nur Text/Datum/Zahl, keine Personen, keine Updates, keine Benachrichtigungen. Erneutes Übertragen legt doppelte Items an. Der Schlüssel MONDAY_API_TOKEN liegt nur auf dem Server (.env.local bzw. Cloudflare-Secret).',
    koerperEn:
      '“Transfer game days to monday” creates one item per game day in the given board: name “Spieltag NN” plus date, question, answer 1, answer 2, correct answer and file name. Columns are matched by their titles – create columns with exactly these German names in the board (Datum as a date column, the others as text). “Check columns” shows the mapping without writing anything. Test mode is on by default: private boards only, only text/date/number, no people, no updates, no notifications. Transferring again creates duplicate items. The MONDAY_API_TOKEN key lives on the server only (.env.local or Cloudflare secret).',
  },
  {
    anker: 'serie-gewinner',
    titelDe: 'Serien-Anzeigen: Gewinnerinnen und Gewinner',
    titelEn: 'Series ads: winners',
    koerperDe:
      'Im Bereich „Gewinnerinnen und Gewinner“ erfasst du je Spieltag Foto, Name, Ort, Gewinn und einen kurzen Text (max. 110 Zeichen). Die Einträge ersetzen in der Anzeige die Muster-Porträts: bei „1 Gewinner“ der erste Eintrag, bei „4 Gewinner“ bis zu vier. „Nur in dieser Zeitung“ beschränkt den Eintrag auf die gerade gezeigte Zeitung. Fotos werden im Browser gespeichert (Assets-Store) und so beschnitten, dass der Kopf sichtbar bleibt.',
    koerperEn:
      'In “Winners” you add photo, name, town, prize and a short text (max. 110 characters) per game day. The entries replace the sample portraits in the ad: “1 winner” shows the first entry, “4 winners” up to four. “Only in this newspaper” limits the entry to the newspaper currently shown. Photos are stored in the browser (assets store) and cropped so the head stays visible.',
  },
  {
    anker: 'korrekturen',
    titelDe: 'Korrekturen aus dem Wissensquiz-Portal',
    titelEn: 'Corrections from the Wissensquiz portal',
    koerperDe:
      'Über die Startkarte „Korrekturen“ oder /korrekturen. Lädt die Verlags-Rückmeldungen aus dem Cloudflare-Pages-Portal (KORREKTURPORTAL_URL + Master-Slug KORREKTURPORTAL_SLUG in .env.local, siehe docs/korrekturportal-anbindung.md). „KI einordnen lassen“ ruft Claude über /api/korrekturen/einordnen auf; für jede Rückmeldung bestimmt die KI Feld (frage/antwort/name/ort/telefon/logo/tnb/format/unklar), Ziel (Zeitung/Monat/Spieltag/Vorschlag), Sicherheit und ob die Übernahme automatisch möglich ist. **Telefonnummern und Teilnahmebedingungen werden nie automatisch angewendet** — rechtlich relevant. Je Rückmeldung lässt sich der Status „offen / Rückfrage / erledigt / ignoriert“ setzen (lokal in localStorage). Das Portal selbst wird nur gelesen; eine Antwort zurück ins Portal geht erst nach Freigabe von Telemedia.',
    koerperEn:
      'Via the start card “Corrections” or /korrekturen. Fetches publisher feedback from the Cloudflare Pages portal (KORREKTURPORTAL_URL + master slug KORREKTURPORTAL_SLUG in .env.local, see docs/korrekturportal-anbindung.md). “Classify with AI” calls Claude via /api/korrekturen/einordnen; for each item the AI picks the field (question/answer/name/town/phone/logo/tnb/format/unknown), target (newspaper/month/day/proposal), confidence and whether an auto-apply is possible. **Phone numbers and terms are never auto-applied** — legally relevant. Per item you can set the status “open / ask back / done / ignored” (stored locally). The portal is read-only here; writing a reply back to the portal only after Telemedia’s approval.',
  },
  {
    anker: 'praesentationen',
    titelDe: 'Präsentationen (Gewinnspielplan 2027)',
    titelEn: 'Presentations (2027 prize game plan)',
    koerperDe:
      'Über die Startkarte „Präsentationen“ oder direkt /praesentationen. Drei Modi: (1) „Einzel“ – ein Verlagsname (optional) + Konditionen (AZS in Cent, RSP-Anteil in %) → eine PPTX. (2) „Verlagsliste (CSV)“ – pro Zeile Name;AZS-Cent;RSP-Prozent → ZIP mit allen Präsentationen plus einer CSV-Übersicht. (3) „Varianten (CSV)“ – pro Zeile AZS-Cent;RSP-Prozent (ohne Verlagsname) → ZIP mit Varianten-PPTX. Optional ohne Sprechernotizen (für PDF-Druck sinnvoll) und optional zusätzlich als PDF (benötigt LibreOffice unter /Applications/LibreOffice.app). Rechenlogik unverändert zum Original: 24 Spieltage + 4 Supertage = 14.000 € Preisgelder, 120.000 Anrufe/Monat, 20 % Anteil für AZS; RSP: 20 % von 1.200.000 × 0,36 € − 20 % × 70.000 €. pptxgenjs@4.0.1 muss einmalig installiert sein (siehe OFFENE_PUNKTE.md #13).',
    koerperEn:
      'Via the start card “Presentations” or /praesentationen. Three modes: (1) “Single” – one publisher name (optional) + terms (AZS in cents, RSP share in %) → one PPTX. (2) “Publisher list (CSV)” – one line per publisher Name;AZS-cents;RSP-percent → ZIP with all PPTX plus a CSV overview. (3) “Variants (CSV)” – one line per combination AZS-cents;RSP-percent (no publisher name) → ZIP of variant PPTX. Optional without speaker notes (good for PDF printing) and optional PDF (needs LibreOffice at /Applications/LibreOffice.app). Calculation stays identical to the original: 24 game days + 4 super days = 14,000 € prize money, 120,000 calls/month, 20 % share for AZS; RSP: 20 % of 1,200,000 × 0.36 € − 20 % × 70,000 €. pptxgenjs@4.0.1 must be installed once (see OFFENE_PUNKTE.md #13).',
  },
  {
    anker: 'grenzen',
    titelDe: 'Grenzen der KI',
    titelEn: 'AI limits',
    koerperDe:
      'Bilder mit vielen Personen oder komplexen Zählungen selbst prüfen. Schattenbilder: KI verwechselt Fußpunkte — im Zweifel manuell setzen. Marken/IP-Namen im Prompt werden ersetzt (gewollt). ElevenLabs zählt Zeichen — jeder Voiceover-Neustart kostet. OpenAI-Guthaben aufladen, wenn „insufficient_quota" gemeldet wird.',
    koerperEn:
      'Images with many people or complex counts — inspect yourself. Shadow placements: AI confuses foot points — set manually if in doubt. Brand/IP names in prompts get sanitised (intentional). ElevenLabs charges per character — every voiceover restart costs. Top up OpenAI credit if "insufficient_quota" pops up.',
  },
]

export function abschnittFinden(anker: string | undefined): HandbuchAbschnitt | undefined {
  if (!anker) return undefined
  return HANDBUCH_ABSCHNITTE.find((a) => a.anker === anker)
}
