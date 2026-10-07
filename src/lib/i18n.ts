// Zentrales DE/EN-Wörterbuch (Regel 6).
// Regel: jeder neue sichtbare String bekommt hier einen Schlüssel; nirgends im Code
// harte Strings, die der Nutzer sieht.

import type { Sprache } from './types'

export type Woerterbuch = Record<string, Record<Sprache, string>>

export const dict = {
  // Kopfbereich
  appName: { de: 'ContentCreator2026', en: 'ContentCreator2026' },
  phaseLabel: { de: 'Phase 1 · KI-Dialog', en: 'Phase 1 · AI Dialog' },

  // KI-Zentrum
  kiPrompt: {
    de: 'Was produzieren wir heute?',
    en: 'What are we producing today?',
  },
  kiPlaceholder: {
    de: 'Beschreib dein Ziel — oder lade eine Vorlage hoch. Ich frage nach, was ich brauche.',
    en: 'Describe your goal — or upload a reference. I will ask what I need.',
  },
  kiSenden: { de: 'Los', en: 'Go' },
  kiVorlage: { de: 'Vorlage hochladen', en: 'Upload reference' },
  kiMikro: { de: 'Sprechen', en: 'Voice' },
  kiMikroAus: { de: 'Mikro aus', en: 'Mic off' },
  kiHinweis: {
    de: 'Ich starte den Dialog und lege einen Job an, sobald du „Los" drückst.',
    en: 'I start the dialog and create a job as soon as you press "Go".',
  },

  // Karten
  cardNewJob: { de: 'Neuer Job', en: 'New Job' },
  cardNewJobHint: { de: 'Frisch mit der KI starten', en: 'Start fresh with the AI' },
  cardActiveJobs: { de: 'Laufende Jobs', en: 'Active Jobs' },
  cardActiveJobsHint: { de: 'Gespeicherte Jobs weiterbearbeiten', en: 'Continue saved jobs' },
  cardBrandKits: { de: 'Brand-Kits', en: 'Brand Kits' },
  cardBrandKitsHint: { de: 'CI: Farben, Schriften, Logos', en: 'CI: colours, fonts, logos' },
  cardTemplates: { de: 'Vorlagen', en: 'Templates' },
  cardTemplatesHint: { de: 'Zeitungs-CIs, Formatvorlagen', en: 'Newspaper CIs, format templates' },
  cardAssets: { de: 'Asset-Bibliothek', en: 'Asset library' },
  cardAssetsHint: { de: 'Bilder, Videos, Audios', en: 'Images, videos, audios' },
  cardExports: { de: 'Exporte', en: 'Exports' },
  cardExportsHint: { de: 'Fertige Abgaben je Kanal', en: 'Finished deliverables per channel' },
  cardRufnummern: { de: 'Rufnummern', en: 'Phone numbers' },
  cardRufnummernHint: {
    de: 'Wissensquiz + Geldregen je Zeitung',
    en: 'Wissensquiz + Geldregen per newspaper',
  },
  cardComingSoon: { de: 'kommt bald', en: 'coming soon' },
  cardSerie: { de: 'Serien-Anzeigen', en: 'Series ads' },
  cardSerieHint: {
    de: 'Spiele-Anzeigen für alle Zeitungen',
    en: 'Game ads for all newspapers',
  },
  cardPraesentation: { de: 'Präsentationen', en: 'Presentations' },
  cardPraesentationHint: {
    de: 'Gewinnspielplan 2027 je Verlag',
    en: 'Prize game plan 2027 per publisher',
  },

  // Seite /praesentationen
  praesTitel: { de: 'Präsentationen', en: 'Presentations' },
  praesUntertitel: {
    de: 'Gewinnspielplan 2027 als PowerPoint erzeugen – je Verlag oder als Varianten-Set.',
    en: 'Generate the 2027 prize game plan as PowerPoint – per publisher or as a variant set.',
  },
  praesModusEinzel: { de: 'Einzelne Präsentation', en: 'Single presentation' },
  praesModusVerlage: { de: 'Verlagsliste (CSV)', en: 'Publisher list (CSV)' },
  praesModusVarianten: { de: 'Varianten (CSV)', en: 'Variants (CSV)' },
  praesVerlag: { de: 'Verlag (optional)', en: 'Publisher (optional)' },
  praesAzs: { de: 'AZS pro Anruf (Cent)', en: 'AZS per call (cents)' },
  praesRsp: { de: 'RSP-Anteil (%)', en: 'RSP share (%)' },
  praesOhneNotizen: { de: 'Ohne Sprechernotizen', en: 'Without speaker notes' },
  praesMitPdf: {
    de: 'Zusätzlich als PDF (benötigt LibreOffice lokal)',
    en: 'Also as PDF (needs LibreOffice locally)',
  },
  praesErzeugen: { de: 'Präsentation erzeugen', en: 'Generate presentation' },
  praesErzeugeMehrere: { de: 'Alle erzeugen (ZIP)', en: 'Generate all (ZIP)' },
  praesHinweisCsv: {
    de: 'Je Zeile ein Verlag im Format Name;AZS-Cent;RSP-Prozent (z. B. „SWMH;33;70“).',
    en: 'One publisher per line as Name;AZS-cents;RSP-percent (e.g. „SWMH;33;70“).',
  },
  praesHinweisVarianten: {
    de: 'Je Zeile eine Kombination AZS-Cent;RSP-Prozent (z. B. „26;60“).',
    en: 'One combination per line AZS-cents;RSP-percent (e.g. „26;60“).',
  },
  praesLade: { de: 'erzeuge…', en: 'generating…' },
  praesFehler: { de: 'Fehler', en: 'Error' },

  // Seite /korrekturen
  korrTitel: { de: 'Korrekturen aus dem Portal', en: 'Portal corrections' },
  korrUntertitel: {
    de: 'Rückmeldungen der Verlage aus dem Wissensquiz-Korrekturportal – KI ordnet jede Rückmeldung einem Feld zu; Telefonnummern und Teilnahmebedingungen bleiben manuell.',
    en: 'Publisher feedback from the Wissensquiz review portal – the AI maps each item to a field; phone numbers and terms remain manual.',
  },
  korrNeuLaden: { de: 'Neu laden', en: 'Reload' },
  korrEinordnen: { de: 'KI einordnen lassen', en: 'Classify with AI' },
  korrFilterOffen: { de: 'offen', en: 'open' },
  korrFilterRueckfrage: { de: 'Rückfrage', en: 'ask back' },
  korrFilterErledigt: { de: 'erledigt', en: 'done' },
  korrFilterAlle: { de: 'alle', en: 'all' },
  korrFehler: { de: 'Fehler', en: 'Error' },
  korrKeine: {
    de: 'Keine Korrekturen – stelle KORREKTURPORTAL_URL und KORREKTURPORTAL_SLUG in .env.local ein, dann „Neu laden“.',
    en: 'No corrections – set KORREKTURPORTAL_URL and KORREKTURPORTAL_SLUG in .env.local, then “Reload”.',
  },
  korrErledigt: { de: 'erledigt', en: 'done' },
  korrRueckfrage: { de: 'als Rückfrage markieren', en: 'mark as ask-back' },
  korrIgnorieren: { de: 'ignorieren', en: 'ignore' },
  korrZurueck: { de: 'wieder offen', en: 'reopen' },
  cardKorrekturen: { de: 'Korrekturen', en: 'Corrections' },
  cardKorrekturenHint: {
    de: 'Rückmeldungen aus dem Korrekturportal',
    en: 'Feedback from the review portal',
  },

  // Startseite (Kopf + Funktionskreis)
  startLogoAlt: { de: 'Telemedia-Logo', en: 'Telemedia logo' },
  startUebersicht: { de: 'Übersicht', en: 'Overview' },
  startTourZeigen: { de: 'Kurz-Tour zeigen', en: 'Show short tour' },
  startKartenAria: { de: 'Startkarten', en: 'Start cards' },
  startKreisAria: {
    de: 'Funktionen rund um die KI-Eingabe',
    en: 'Functions around the AI input',
  },
  startJobsAnzahl: { de: 'gespeicherte Jobs', en: 'saved jobs' },

  // Debug-Sektion (bleibt bis Phase 1 die richtige „Laufende Jobs"-Ansicht liefert)
  debugTitle: { de: 'IndexedDB-Test · Store „jobs"', en: 'IndexedDB test · store "jobs"' },
  debugEmpty: {
    de: 'Noch keine Jobs. Klick oben auf „Neuer Job" — der Eintrag bleibt nach Reload erhalten.',
    en: 'No jobs yet. Click "New Job" above — entries survive a reload.',
  },
  debugDelete: { de: 'Löschen', en: 'Delete' },
  debugError: { de: 'Fehler', en: 'Error' },

  // Tab-Wächter
  tabGuard: {
    de: '⚠ ContentCreator2026 ist bereits in einem anderen Tab dieses Browsers geöffnet. Bitte schließe den anderen Tab, um Datenkonflikte zu vermeiden.',
    en: '⚠ ContentCreator2026 is already open in another tab of this browser. Please close the other tab to avoid data conflicts.',
  },

  // Sprach-Umschalter
  langAria: { de: 'Sprache umschalten', en: 'Switch language' },

  // Job-Editor / KI-Dialog (Phase 1)
  jobZurueck: { de: '← Zur Übersicht', en: '← Back to overview' },
  jobUmbenennen: { de: 'Titel ändern', en: 'Rename' },
  jobTitelPlaceholder: { de: 'Job-Titel', en: 'Job title' },

  wegAuswahlTitel: { de: 'Wie starten wir?', en: 'How do we start?' },
  wegAuswahlHinweis: {
    de: 'Wähle den Einstieg. Ich passe den Dialog an.',
    en: 'Pick your entry. I will adapt the dialog.',
  },
  wegA: { de: 'Nur ein Ziel', en: 'Just a goal' },
  wegAHinweis: {
    de: 'Ich stelle bis zu 5 Fragen und schlage drei Richtungen vor.',
    en: 'I ask up to 5 questions and propose three directions.',
  },
  wegB: { de: 'Vorstellung im Kopf', en: 'Idea in mind' },
  wegBHinweis: {
    de: 'Ich frage, bis deine Vorstellung greifbar ist.',
    en: 'I probe until your idea is concrete.',
  },
  wegC: { de: 'Vorlage hochladen', en: 'Upload reference' },
  wegCHinweis: {
    de: 'Ich analysiere die Vorlage und frage per Multiple Choice.',
    en: 'I analyse the reference and ask via multiple choice.',
  },

  dialogUeberschrift: { de: 'Dialog mit der KI', en: 'AI dialog' },
  dialogPlaceholder: { de: 'Antwort schreiben oder sprechen …', en: 'Type or speak your answer …' },
  dialogSenden: { de: 'Senden', en: 'Send' },
  dialogLaedt: { de: 'KI denkt …', en: 'AI is thinking …' },
  dialogFehler: { de: 'Die KI hat gerade nicht geantwortet.', en: 'The AI did not respond.' },
  dialogRohtext: {
    de: 'Die KI-Antwort war unvollständig. Bitte sende deine letzte Antwort noch einmal.',
    en: 'The AI response was incomplete. Please send your last answer again.',
  },

  richtungenTitel: { de: 'Drei Richtungen zur Wahl', en: 'Three directions to choose' },
  richtungenHinweis: {
    de: 'Klick eine Richtung an — die KI verfeinert sie dann mit Multiple Choice.',
    en: 'Click one direction — the AI refines it via multiple choice.',
  },
  richtungWaehlen: { de: 'Diese Richtung', en: 'Use this' },

  schrittplanTitel: { de: 'Schrittplan', en: 'Step plan' },
  schrittplanLeer: {
    de: 'Noch kein Schrittplan. Die KI erzeugt ihn nach dem Briefing.',
    en: 'No step plan yet. The AI creates it after the briefing.',
  },
  schrittAnnehmen: { de: 'Annehmen', en: 'Accept' },
  schrittAendern: { de: 'Ändern', en: 'Change' },
  schrittSelbst: { de: 'Selbst machen', en: 'DIY' },
  schrittOffen: { de: 'offen', en: 'open' },
  schrittVorschlag: { de: 'Vorschlag da', en: 'proposal ready' },
  schrittAngenommen: { de: 'angenommen', en: 'accepted' },
  schrittManuell: { de: 'manuell', en: 'manual' },

  mcTitel: { de: 'Vorlagen-Analyse', en: 'Reference analysis' },
  mcHinweis: {
    de: 'Bestätige je Merkmal, ob wir aus der Vorlage, aus dem Brand-Kit oder frisch arbeiten.',
    en: 'Confirm per feature whether we take from reference, brand kit, or start fresh.',
  },

  verlaufTitel: { de: 'KI-Verlauf', en: 'AI history' },
  verlaufLeer: { de: 'Noch keine KI-Aktion für diesen Job.', en: 'No AI action for this job yet.' },
  verlaufKosten: { de: 'Kosten (geschätzt)', en: 'Estimated cost' },

  vorlageUploadTitel: { de: 'Vorlage hochladen', en: 'Upload reference' },
  vorlageUploadHinweis: {
    de: 'PNG oder JPG. Die KI erkennt Farben, Schriften und Textgefäße.',
    en: 'PNG or JPG. The AI detects colours, fonts, and text slots.',
  },
  vorlageUploadDrop: { de: 'Datei hier ablegen oder klicken', en: 'Drop file here or click' },
  vorlageAnalysiert: { de: 'Vorlage analysiert.', en: 'Reference analysed.' },
  vorlageAnalyseFehler: { de: 'Analyse fehlgeschlagen.', en: 'Analysis failed.' },

  kanalWahl: { de: 'Kanal wählen', en: 'Pick channel' },
  kanalKeiner: { de: 'noch offen', en: 'not decided' },

  briefingZusammenfassung: { de: 'Briefing-Zusammenfassung', en: 'Briefing summary' },
  briefingWeiter: { de: 'Weiter zu den Richtungen', en: 'Continue to directions' },
  briefingSchrittplan: { de: 'Schrittplan erzeugen', en: 'Generate step plan' },

  // Serien-Anzeigen (/serie)
  serieZurStart: { de: '← Startseite', en: '← Home' },
  serieLaedt: { de: 'Lade …', en: 'Loading …' },
  serieLadeFehler: { de: 'Serien-Daten konnten nicht geladen werden:', en: 'Could not load series data:' },
  serieAuswahl: { de: 'Auswahl', en: 'Selection' },
  serieSpiel: { de: 'Spiel', en: 'Game' },
  serieMonat: { de: 'Monat', en: 'Month' },
  serieSpieltag: { de: 'Spieltag', en: 'Game day' },
  serieVorschlag: { de: 'Vorschlag', en: 'Proposal' },
  serieGewinner: { de: 'Gewinner', en: 'winners' },
  serieVorschauFuer: { de: 'Vorschau für', en: 'Preview for' },
  serieZeitungen: { de: 'Zeitungen', en: 'Newspapers' },
  serieAlle: { de: 'alle', en: 'all' },
  serieKeine: { de: 'keine', en: 'none' },
  serieVorschauTitel: { de: 'Live-Vorschau', en: 'Live preview' },
  serieAmpelLaedt: { de: 'Prüfe …', en: 'Checking …' },
  serieAmpelGruen: { de: 'Prüfung bestanden', en: 'Check passed' },
  serieAmpelGelb: { de: 'Nur Platzhalter/Hinweise', en: 'Placeholders/notes only' },
  serieAmpelRot: { de: 'Hinweise – bitte prüfen', en: 'Issues – please check' },
  serieAmpelKeinErgebnis: { de: 'Keine Prüfung erhalten', en: 'No check result' },
  serieAmpelSkalierung: { de: 'Skalierung', en: 'Scale' },
  serieMusterHinweis: {
    de: 'Muster-Inhalt aus der Präsentation – nicht für den Druck.',
    en: 'Sample content from the presentation – not for print.',
  },
  serieKeineFragen: {
    de: 'Für diesen Monat liegen noch keine Tagesfragen vor – Platzhaltertexte.',
    en: 'No daily questions for this month yet – placeholder texts.',
  },
  serieAbcTitel: { de: '3 Gestaltungsvorschläge vergleichen', en: 'Compare 3 design proposals' },
  serieDiesenWaehlen: { de: 'Diesen wählen', en: 'Choose this' },
  serieGewaehlt: { de: 'Gewählt', en: 'Selected' },
  seriePrueflaufTitel: { de: 'Gewählte Zeitungen prüfen', en: 'Check selected newspapers' },
  seriePrueflaufKnopf: { de: 'Prüflauf starten', en: 'Start check run' },
  serieStopp: { de: 'Anhalten', en: 'Stop' },
  serieOffenTitel: { de: 'Offene Punkte zum Spiel', en: 'Open points for this game' },
  serieOffenKeine: { de: 'Keine offenen Punkte hinterlegt.', en: 'No open points recorded.' },
  serieOffenGeldregen: {
    de: 'Geldregen ist freigegeben (Generator identisch mit dem Python-Werkzeug). Offene Daten erscheinen gelb in der Anzeige.',
    en: 'Geldregen is approved (generator identical to the Python tool). Missing data appears yellow in the ad.',
  },
  serieZusatz: { de: 'Zusatzvorgaben', en: 'Extra instructions' },
  serieKiLaedt: { de: 'KI arbeitet …', en: 'AI working …' },
  serieKiFehler: { de: 'Die KI hat keine verwertbare Antwort geliefert.', en: 'The AI returned no usable answer.' },
  serieKiKurz: { de: 'KI', en: 'AI' },
  serieKiFaktenPruefen: { de: 'KI-Vorschlag – bitte Fakten prüfen', en: 'AI proposal – please check the facts' },
  serieKiVorschlagKlick: { de: 'Vorschlag anklicken, um ihn zu übernehmen:', en: 'Click a proposal to use it:' },
  serieUebernehmen: { de: 'Übernehmen', en: 'Apply' },
  serieMondayPdfTitel: { de: 'Anzeigen-PDFs nach monday hochladen', en: 'Upload ad PDFs to monday' },
  serieMondayPdfHinweis: { de: 'Lädt die fertigen PDFs je Spieltag in die Datei-Spalten „Anzeige (FUNKE) 1 Gewinner“, „Anzeige (FUNKE) 4 Gewinner“ usw. der Items „Anz Spieltag NN · A/B/C“ (ältere Boards: eine Spalte je Verlag). Schon vorhandene Dateien werden übersprungen. Nur lokal auf dem Mac.', en: 'Uploads the finished PDFs per game day into the file columns “Anzeige (FUNKE) 1 Gewinner”, “Anzeige (FUNKE) 4 Gewinner” etc. of the items “Anz Spieltag NN · A/B/C” (older boards: one column per publisher). Files already present are skipped. Local Mac only.' },
  serieMondayPdfKnopf: { de: 'PDFs hochladen', en: 'Upload PDFs' },
  serieMondayPdfAlle: { de: 'PDFs hochladen – alle drei Vorschläge (A, B, C)', en: 'Upload PDFs – all three proposals (A, B, C)' },
  serieMondayPdfBestaetigen: { de: 'PDFs in das Board hochladen? Spieltage:', en: 'Upload PDFs to the board? Game days:' },
  serieMondayPdfHoch: { de: 'Hochgeladen:', en: 'Uploaded:' },
  serieMondayPdfUebersprungen: { de: 'schon vorhanden:', en: 'already present:' },
  serieGewinnerKurz: { de: 'Gewinner', en: 'winner(s)' },
  serieSpieltage: { de: 'Spieltage', en: 'game days' },
  serieAblaufTitel: { de: 'Ablauf: vorproduzieren, dann täglich Gewinner', en: 'Workflow: pre-produce, then add winners daily' },
  serieAblaufHinweis: { de: '1) Einmal den ganzen Monat als Export-Auftrag herunterladen und erstellen lassen. 2) Jeden Tag die Gewinnerinnen und Gewinner eintragen und nur diesen Spieltag als Tages-Update exportieren – es werden nur die geänderten Anzeigen neu gerechnet, die ZIP bleibt vollständig.', en: '1) Download the whole month once as an export job and let it build. 2) Every day add the winners and export only that game day as a daily update – only changed ads are re-rendered, the ZIP stays complete.' },
  serieTagesUpdate: { de: 'Tages-Update:', en: 'Daily update:' },
  serieExportAuftrag: { de: 'Export-Auftrag herunterladen (alle gewählten Zeitungen)', en: 'Download export job (all selected newspapers)' },
  serieExportHinweis: { de: 'Danach im Ordner content-creator-2026 „Serien-Anzeigen erstellen.command“ doppelklicken – erzeugt Vektor-PDFs, ZIPs und Prüfbericht auf dem Schreibtisch.', en: 'Then double-click “Serien-Anzeigen erstellen.command” in the content-creator-2026 folder – creates vector PDFs, ZIPs and a check report on the desktop.' },
  serieGewTitel: { de: 'Gewinnerinnen und Gewinner', en: 'Winners' },
  serieGewName: { de: 'Name', en: 'Name' },
  serieGewOrt: { de: 'Ort', en: 'Town' },
  serieGewBetrag: { de: 'Gewinn', en: 'Prize' },
  serieGewText: { de: 'Text zur Gewinnerin / zum Gewinner', en: 'Text about the winner' },
  serieGewTextZuLang: { de: 'Text zu lang – bitte auf 110 Zeichen kürzen.', en: 'Text too long – please shorten to 110 characters.' },
  serieGewFoto: { de: 'Foto wählen', en: 'Choose photo' },
  serieGewNurDiese: { de: 'nur in dieser Zeitung', en: 'only in this newspaper' },
  serieGewHinzufuegen: { de: 'Hinzufügen', en: 'Add' },
  serieGewKeine: { de: 'Noch keine Gewinner erfasst – die Anzeige zeigt Muster-Porträts.', en: 'No winners yet – the ad shows sample portraits.' },
  serieGewLoeschen: { de: 'Löschen', en: 'Delete' },
  serieGewLoeschenFrage: { de: 'Diesen Eintrag wirklich löschen?', en: 'Really delete this entry?' },
  serieVorschlaegeTitel: { de: 'Gestaltungsvorschläge', en: 'Design proposals' },
  serieVorschlaegeSchliessen: { de: 'Schließen', en: 'Close' },
  serieVorschlaegeOeffnen: { de: 'Vorschläge wieder öffnen', en: 'Reopen proposals' },
  serieNurSpeichern: { de: 'Speichern', en: 'Save' },
  serieAlleSpeichern: { de: 'Alle drei speichern', en: 'Save all three' },
  serieAnwenden: { de: 'Anwenden', en: 'Apply' },
  serieLoeschen: { de: 'Löschen', en: 'Delete' },
  serieVerwerfen: { de: 'Verwerfen', en: 'Discard' },
  serieTextVerbessern: { de: 'Text verbessern (KI)', en: 'Improve text (AI)' },
  serieNeuTitel: { de: 'Neues Spiel aufsetzen (KI)', en: 'Set up a new game (AI)' },
  serieNeuBasis: { de: 'Grundlage:', en: 'Based on:' },
  serieNeuZusatzPlatzhalter: {
    de: 'z. B. jünger, mehr Rot, Titel kürzer …',
    en: 'e.g. younger, more red, shorter title …',
  },
  serieNeuKnopf: { de: '3 Umsetzungsvarianten vorschlagen', en: 'Suggest 3 implementation variants' },
  serieNeuOriginal: { de: 'Originaltexte wiederherstellen', en: 'Restore original texts' },
  serieNeuGeldregen: {
    de: 'Geldregen ist freigegeben und bleibt unverändert. Für KI-Varianten bitte ein Spiel aus dem Katalog wählen.',
    en: 'Geldregen is approved and stays unchanged. For AI variants, please pick a game from the catalogue.',
  },
  serieNeuGespeichert: { de: 'Variante gespeichert.', en: 'Variant saved.' },
  serieNeuTexteBearbeiten: { de: 'Texte selbst bearbeiten', en: 'Edit texts yourself' },
  serieNeuNamePlatzhalter: { de: 'Name der Variante', en: 'Variant name' },
  serieNeuEigeneTexte: { de: 'Eigene Texte', en: 'Own texts' },
  serieNeuManuell: { de: 'manuell', en: 'manual' },
  serieNeuSpeichern: { de: 'Als Variante speichern', en: 'Save as variant' },
  serieNeuGespeicherte: { de: 'Gespeicherte Varianten', en: 'Saved variants' },
  serieNeuKeineGespeicherten: { de: 'Noch keine Variante gespeichert.', en: 'No variant saved yet.' },
  serieNeuLoeschenFrage: { de: 'Diese Variante wirklich löschen?', en: 'Really delete this variant?' },
  serieNeuOverrideAktiv: {
    de: 'Eigene Texte bzw. KI-Variante aktiv – nicht der freigegebene Katalogtext.',
    en: 'Own texts or AI variant active – not the approved catalogue text.',
  },
  serieFeldTitel: { de: 'Titel', en: 'Title' },
  serieFeldUnterzeile: { de: 'Unterzeile', en: 'Subline' },
  serieFeldSchritt: { de: 'Schritt', en: 'Step' },
  serieFeldHinweisTitel: { de: 'Hinweis-Titel', en: 'Info box title' },
  serieFeldHinweisText: { de: 'Hinweis-Text', en: 'Info box text' },
  serieFragenTitel: { de: 'Tagesfragen vorschlagen (KI)', en: 'Suggest daily questions (AI)' },
  serieFragenNurZwei: {
    de: 'Nur für Spiele mit zwei Antworten – dieses Spiel arbeitet mit einem Lösungswort.',
    en: 'Only for games with two answers – this game uses a solution word.',
  },
  serieFragenBilderHinweis: {
    de: 'Achtung: Rätselbilder bzw. Rätselfeld passen nicht automatisch zu KI-Fragen – nur als Ideensammlung nutzen.',
    en: 'Note: puzzle images or puzzle field do not automatically match AI questions – use as ideas only.',
  },
  serieFragenAnzahl: { de: 'Anzahl', en: 'Count' },
  serieFragenZusatzPlatzhalter: { de: 'z. B. Herbst, Natur, leichter …', en: 'e.g. autumn, nature, easier …' },
  serieFragenKnopf: { de: 'Tagesfragen vorschlagen', en: 'Suggest daily questions' },
  serieFragenVerwenden: { de: 'In Vorschau verwenden', en: 'Use in preview' },
  serieFragenJson: { de: 'Als JSON herunterladen', en: 'Download as JSON' },
  serieFragenVerworfen: { de: 'Verworfen (Prüfung nicht bestanden):', en: 'Rejected (failed check):' },
  serieMailKnopf: { de: 'Gestaltungsvorschlag per E-Mail senden', en: 'Send design proposal by e-mail' },
  serieMailLaedt: { de: 'Anhänge werden erzeugt …', en: 'Creating attachments …' },
  serieMailBereit: { de: 'Anhänge bereit:', en: 'Attachments ready:' },
  serieMailNurHtml: {
    de: 'Dieser Browser kann kein Bild aus der Anzeige erzeugen – es wird nur die HTML-Datei angehängt (öffnet in jedem Browser).',
    en: 'This browser cannot render the ad to an image – only the HTML file is attached (opens in any browser).',
  },
  serieMailTeilen: { de: 'Mail-Programm öffnen (Teilen)', en: 'Open mail app (Share)' },
  serieMailFallback: { de: 'Dateien herunterladen + E-Mail-Entwurf', en: 'Download files + e-mail draft' },
  serieMailKeinTeilen: {
    de: 'Teilen mit Anhang wird hier nicht unterstützt – bitte die zweite Möglichkeit nutzen und die Dateien selbst anhängen.',
    en: 'Sharing with attachments is not supported here – use the second option and attach the files yourself.',
  },
  serieMailGeteilt: { de: 'An das Mail-Programm übergeben.', en: 'Handed over to the mail app.' },
  serieMailTeilenFehler: { de: 'Teilen nicht möglich:', en: 'Sharing failed:' },
  serieMailHeruntergeladen: {
    de: 'Dateien heruntergeladen, E-Mail-Entwurf geöffnet – bitte die Dateien anhängen.',
    en: 'Files downloaded, e-mail draft opened – please attach the files.',
  },
  serieMailBetreff: { de: 'Gestaltungsvorschlag', en: 'Design proposal' },
  serieMailAnrede: { de: 'Hallo,', en: 'Hello,' },
  serieMailText: { de: 'anbei der Gestaltungsvorschlag', en: 'please find attached the design proposal' },
  serieMailNurAnsicht: {
    de: 'PDF und PNG sind eine Ansicht zur Abstimmung, keine Druckvorlage.',
    en: 'PDF and PNG are a view for approval, not print-ready files.',
  },
  serieMailBitteAnhaengen: { de: 'Bitte Datei anhängen:', en: 'Please attach the file:' },
  serieMondayTitel: { de: 'Spieltage nach monday übertragen', en: 'Transfer game days to monday' },
  serieMondayBoard: { de: 'Board-ID', en: 'Board ID' },
  serieMondayBoardPlatzhalter: { de: 'Ziffern aus der Board-URL', en: 'Digits from the board URL' },
  serieMondayTestmodus: {
    de: 'Testmodus (privates Board, keine Personen/Benachrichtigungen)',
    en: 'Test mode (private board, no people/notifications)',
  },
  serieMondayTestmodusAus: {
    de: 'Testmodus aus: Board darf geteilt sein, Status-/Dropdown-Spalten werden mit beschrieben. Personen, Updates und Benachrichtigungen schreibt das Tool nie.',
    en: 'Test mode off: board may be shared, status/dropdown columns are filled too. The tool never writes people, updates or notifications.',
  },
  serieMondayTestmodusKurz: { de: 'Testmodus', en: 'test mode' },
  serieMondayVollmodusKurz: { de: 'Testmodus aus', en: 'test mode off' },
  serieMondayAnzahl: { de: 'Spieltage zum Übertragen:', en: 'Game days to transfer:' },
  serieMondayMusterWarnung: {
    de: 'Achtung: enthält Muster- oder Platzhalter-Inhalte.',
    en: 'Note: contains sample or placeholder content.',
  },
  serieMondaySpalten: { de: 'Spalten prüfen', en: 'Check columns' },
  serieMondayUebertragen: { de: 'Spieltage nach monday übertragen', en: 'Transfer game days to monday' },
  serieMondayBestaetigen: {
    de: 'Jetzt Items im Board anlegen? Erneutes Übertragen legt doppelte Items an. Anzahl:',
    en: 'Create items in the board now? Transferring again creates duplicates. Count:',
  },
  serieMondayFeldDatum: { de: 'Datum', en: 'Date' },
  serieMondayFeldFrage: { de: 'Frage', en: 'Question' },
  serieMondayFeldA1: { de: 'Antwort 1', en: 'Answer 1' },
  serieMondayFeldA2: { de: 'Antwort 2', en: 'Answer 2' },
  serieMondayFeldRichtig: { de: 'Richtige Antwort', en: 'Correct answer' },
  serieMondayFeldDatei: { de: 'Dateiname', en: 'File name' },
  serieMondayNichtGefunden: { de: 'keine passende Spalte', en: 'no matching column' },
  serieMondayIgnoriert: { de: 'Nicht beschrieben:', en: 'Not written:' },
  serieMondayAngelegt: { de: 'Items angelegt:', en: 'Items created:' },

  mikroNichtVerfuegbar: {
    de: 'Spracheingabe wird von diesem Browser nicht unterstützt.',
    en: 'Voice input not supported in this browser.',
  },
  mikroFehler: { de: 'Mikro-Fehler', en: 'Mic error' },
} as const satisfies Woerterbuch

export type Schluessel = keyof typeof dict

export function uebersetze(schluessel: Schluessel, sprache: Sprache): string {
  return dict[schluessel][sprache]
}
